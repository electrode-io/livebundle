/// <reference types="../types/express/index" />

import debug from "debug";
import express from "express";
import expressWs from "express-ws";
import fs from "fs-extra";
import http from "http";
import _ from "lodash";
import multer from "multer";
import { AddressInfo } from "net";
import path from "path";
import querystring from "querystring";
import shell from "shelljs";
import { SourceMapConsumer } from "source-map";
import { v4 as uuidv4 } from "uuid";
import yauzl from "yauzl";
import { Bundle, Config, Package, StackFrame } from "./types";

export class LiveBundleStore {
  private readonly app: express.Application;
  private readonly wsInstance: expressWs.Instance;
  private readonly storage: multer.StorageEngine;
  private readonly assetsPath: string;
  private readonly packagesPath: string;
  private readonly assets: Set<string>;
  private server: http.Server;

  private readonly log = debug("livebundle-store:LiveBundleStore");

  constructor(public readonly config: Config) {
    this.config = config;
    this.config.store.path = path.resolve(this.config.store.path);
    this.log(`Resolved store path : ${this.config.store.path}`);
    this.assetsPath = path.join(this.config.store.path, "assets");
    this.packagesPath = path.join(this.config.store.path, "packages");
    this.createDirectories();
    this.app = express();
    this.wsInstance = expressWs(this.app);
    this.setupMiddlewares();
    this.storage = this.createMulterStorage();
    this.createAppRoutes();
    this.assets = new Set(fs.readdirSync(this.assetsPath));
  }

  public get address(): string {
    if (!this.server) {
      throw new Error("Server is not started");
    }
    return (this.server.address() as AddressInfo).address;
  }

  public get port(): number {
    if (!this.server) {
      throw new Error("Server is not started");
    }
    return (this.server.address() as AddressInfo).port;
  }

  // Sample url:
  // http://localhost:3000/packages/ae62082f-cb4d-400e-8943-83ff8cdd1b56/index.bundle?platform=android&dev=true&minify=false
  public extractSegmentsFromPackageUrl(
    url: string,
  ): {
    packageId: string;
    platform: string;
    dev: boolean;
  } {
    const re = /packages\/([^/]+)\/[^?]+\?(.+)$/;
    if (!re.test(url)) {
      throw new Error(`Package url ${url} does not match regex`);
    }

    const reArr = re.exec(url) as RegExpExecArray;
    const [, packageId, qs] = reArr;
    const pqs = querystring.parse(qs);
    return {
      packageId,
      platform: pqs.platform as string,
      dev: pqs.dev === "true",
    };
  }

  public async symbolicate(
    stack: StackFrame[],
    sourceMap: string,
  ): Promise<StackFrame[]> {
    const consumer = await new SourceMapConsumer(JSON.parse(sourceMap));
    try {
      return stack.map((frame: StackFrame) => {
        if (
          frame.file &&
          frame.file.startsWith("http") &&
          frame.column &&
          frame.lineNumber
        ) {
          const originalPos = consumer.originalPositionFor({
            column: frame.column,
            line: frame.lineNumber,
          });
          return {
            arguments: frame.arguments,
            column: originalPos.column || undefined,
            file: originalPos.source || undefined,
            lineNumber: originalPos.line || undefined,
            methodName: frame.methodName,
          };
        } else {
          return frame;
        }
      });
    } finally {
      consumer.destroy();
    }
  }

  public async unzipAssets(
    zipFilePath: string,
    targetDir: string,
  ): Promise<string[]> {
    const newAssets: Set<string> = new Set<string>();
    try {
      await new Promise((resolve, reject) =>
        yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipfile) => {
          if (!zipfile) {
            return reject(err);
          }
          zipfile.readEntry();
          zipfile.on("entry", (entry) => {
            newAssets.add(path.dirname(entry.fileName));
            const filePath = path.join(targetDir, entry.fileName);
            shell.mkdir("-p", path.dirname(filePath));
            zipfile.openReadStream(entry, (e, readStream) => {
              const writeStream = fs.createWriteStream(filePath);
              readStream?.pipe(writeStream);
              readStream?.on("end", () => zipfile.readEntry());
            });
          });
          zipfile.on("close", () => resolve());
        }),
      );
    } finally {
      shell.rm(zipFilePath);
    }
    return Array.from(newAssets);
  }

  public async unzipPackage(
    packagePath: string,
    targetDir: string,
  ): Promise<Package> {
    try {
      const packageId = uuidv4();
      const dir = path.join(targetDir, packageId);
      await new Promise((resolve, reject) =>
        yauzl.open(packagePath, { lazyEntries: true }, (err, zipfile) => {
          if (!zipfile) {
            return reject(err);
          }
          zipfile.readEntry();
          zipfile.on("entry", (entry) => {
            const filePath = path.join(dir, entry.fileName);
            shell.mkdir("-p", path.dirname(filePath));
            zipfile.openReadStream(entry, (e, readStream) => {
              const writeStream = fs.createWriteStream(filePath);
              readStream?.pipe(writeStream);
              readStream?.on("end", () => zipfile.readEntry());
            });
          });
          zipfile.on("close", () => resolve());
        }),
      );
      const metadataPath = path.join(dir, "metadata.json");
      const metadata: { bundles: Bundle[] } = await fs.readJSON(metadataPath);
      const pkg = {
        id: packageId,
        bundles: metadata.bundles,
        timestamp: Date.now(),
      };
      await fs.writeJSON(metadataPath, pkg, { spaces: 2 });
      this.log(`Added new package (${pkg.id}) to the store`);
      return pkg;
    } finally {
      shell.rm(packagePath);
    }
  }

  public async getSourceMap({
    packageId,
    dev,
    platform,
  }: {
    packageId: string;
    dev: boolean;
    platform: string;
  }): Promise<string> {
    const pkg = await this.getPackage(packageId);
    const bundle = _.find(
      pkg.bundles,
      (b) => b.dev === dev && b.platform === platform,
    );
    if (!bundle) {
      throw new Error(
        `Cannot find ${platform} ${dev} bundle in package ${packageId}`,
      );
    }
    const sourceMapPath = this.getPathToSourceMap(packageId, bundle.sourceMap);
    return fs.readFile(sourceMapPath, { encoding: "utf8" });
  }

  public getPackage(packageId: string): Promise<Package> {
    return fs.readJSONSync(
      path.join(this.getPackagePath(packageId), "metadata.json"),
    );
  }

  public getPackagePath(packageId: string): string {
    return path.join(this.packagesPath, packageId);
  }

  public getPathToBundle(packageId: string, bundleId: string): string {
    return path.join(this.packagesPath, packageId, bundleId);
  }

  public getPathToSourceMap(packageId: string, sourceMap: string): string {
    return path.join(this.packagesPath, packageId, sourceMap);
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      const { host, port } = this.config.server;
      this.server =
        this.server ??
        this.app.listen(port, host, () => {
          this.log(`LiveBundle Store server started on ${host}:${port}`);
          resolve();
        });
    });
  }

  public stop(): void {
    this.server && this.server.close();
  }

  private createDirectories() {
    shell.mkdir("-p", this.assetsPath, this.packagesPath);
  }

  private setupMiddlewares() {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      if (req.is("text/*")) {
        req.text = "";
        req.setEncoding("utf8");
        req.on("data", (chunk) => (req.text += chunk));
        req.on("end", next);
      } else {
        next();
      }
    });
  }

  private createMulterStorage() {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        if (file.fieldname === "assets") {
          cb(null, this.assetsPath);
        } else if (file.fieldname === "package") {
          cb(null, this.packagesPath);
        }
      },
      filename: (req, file, cb) => {
        if (file.fieldname === "assets") {
          cb(null, `${uuidv4()}.zip`);
        } else if (file.fieldname === "package") {
          cb(null, `${uuidv4()}.zip`);
        }
      },
    });
  }

  // eslint-disable-next-line
  private addPackageToReq(req: any, res: any, next: any) {
    const { packageId }: { packageId: string } = req.params;
    try {
      req.pkg = this.getPackage(packageId);
    } catch (err) {
      return res.status(404).send(`Package ${packageId} not found`);
    }
    next();
  }

  private createAppRoutes() {
    const upload = multer({ storage: this.storage });

    this.wsInstance.app.ws("*", () => {
      // Swallow
    });

    this.app.get("*/status", (req, res) => {
      res.writeHead(200, {
        "Transfer-Encoding": "chunked",
      });
      res.write("packager-status:running");
      res.end();
    });

    this.app.get("/assets/*", (req, res) => {
      const { hash } = req.query;
      const pathToFile = path.join(
        this.assetsPath,
        hash as string,
        path.basename(req.path),
      );
      if (fs.existsSync(pathToFile)) {
        res.writeHead(200, {
          "Transfer-Encoding": "chunked",
        });
        const readabale = fs.createReadStream(pathToFile);
        readabale.pipe(res);
      } else {
        res.sendStatus(404);
      }
    });

    this.app.post("/symbolicate", async (req, res) => {
      const stack = JSON.parse(req.text).stack;
      const bundleUrl = _.find(stack, (frame) => frame.file.startsWith("http"))
        .file;
      const purl = this.extractSegmentsFromPackageUrl(bundleUrl);
      const sourceMap = await this.getSourceMap(purl);
      const symbolicated = await this.symbolicate(stack, sourceMap);
      res.writeHead(200, {
        "Content-Type": "text/plain",
        "Transfer-Encoding": "chunked",
      });
      res.write(JSON.stringify({ stack: symbolicated }));
      res.end();
    });

    this.app.get(
      "/packages/:packageId/index.bundle",
      this.addPackageToReq.bind(this),
      (req, res) => {
        const { packageId } = req.params;
        const { platform } = req.query;
        const dev = req.query.dev === "true";
        const bundle = _.find(
          req.pkg.bundles,
          (p) => p.platform === platform && p.dev === dev,
        );
        res.sendFile(this.getPathToBundle(packageId, bundle.id), {
          headers: {
            "Content-Type": "application/javascript",
          },
        });
      },
    );

    this.app.get(
      "/packages/:packageId/index.map",
      this.addPackageToReq.bind(this),
      (req, res) => {
        const { packageId } = req.params;
        const { platform } = req.query;
        const dev = req.query.dev === "true";
        const bundle = _.find(
          req.pkg.bundles,
          (b) => b.platform === platform && b.dev === dev,
        );
        res.sendFile(this.getPathToSourceMap(packageId, bundle.sourceMap));
      },
    );

    // ============================================================================
    // Bundle Store Endpoints
    // ============================================================================

    this.app.post(
      "/assets",
      upload.single("assets").bind(this),
      async (req, res, next) => {
        try {
          const zippedAssetsPath = path.join(
            req.file.destination,
            req.file.filename,
          );
          const newAssets = await this.unzipAssets(
            zippedAssetsPath,
            this.assetsPath,
          );
          newAssets.forEach((asset) => this.assets.add(asset));
          res.status(201).send(newAssets);
        } catch (err) {
          next(err);
        }
      },
    );

    this.app.post("/assets/delta", (req, res) => {
      const { assets } = req.body;
      const newAssets = _.difference(assets, Array.from(this.assets));
      res.json(newAssets);
    });

    this.app.post(
      "/packages",
      upload.single("package").bind(this),
      async (req, res, next) => {
        try {
          const zippedPackagePath = path.join(
            req.file.destination,
            req.file.filename,
          );
          const pkg = await this.unzipPackage(
            zippedPackagePath,
            this.packagesPath,
          );
          res.status(201).json(pkg);
        } catch (err) {
          next(err);
        }
      },
    );
  }
}
