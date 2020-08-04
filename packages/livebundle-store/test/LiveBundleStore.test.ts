import { rejects } from "assert";
import chai, { expect } from "chai";
import chaiHttp from "chai-http";
import fs from "fs";
import "mocha";
import path from "path";
import shell from "shelljs";
import tmp from "tmp";
import { LiveBundleStore } from "../src/LiveBundleStore";
import { Config, StackFrame } from "../src/types";

describe("server", () => {
  tmp.setGracefulCleanup();
  chai.use(chaiHttp);

  const fixturesPath = path.resolve(__dirname, "fixtures");
  const storeFixturePath = path.join(fixturesPath, "store");

  function createTmpDir() {
    return tmp.dirSync({ unsafeCleanup: true }).name;
  }

  const defaultServer = {
    host: "localhost",
    port: 3000,
  };

  function createServer(config?: Config) {
    const tmpStoreDir = createTmpDir();
    return new LiveBundleStore(
      config || {
        accessKeys: [],
        server: {
          host: "localhost",
          port: 3000,
        },
        store: {
          path: tmpStoreDir,
        },
      },
    );
  }

  // eslint-disable-next-line
  function binaryParser(res: any, callback: any) {
    res.setEncoding("binary");
    res.data = "";
    res.on("data", (chunk: string) => {
      res.data += chunk;
    });
    res.on("end", () => {
      callback(null, Buffer.from(res.data, "binary"));
    });
  }

  describe("constructor", () => {
    it("should create the directories", () => {
      const sut = createServer();
      expect(fs.existsSync(path.join(sut.config.store.path, "assets")));
      expect(fs.existsSync(path.join(sut.config.store.path, "packages")));
    });

    it("should have default config [default port]", () => {
      const sut = createServer();
      expect(sut.config.server.port).equal(3000);
    });
  });

  describe("extractSegmentsFromPackageUrl", () => {
    it("should throw if the url does not contain the proper segments", () => {
      const sut = createServer();
      expect(() =>
        sut.extractSegmentsFromPackageUrl("http://a/b/c"),
      ).to.throw();
    });

    it("should return the matched segments", () => {
      const sut = createServer();
      expect(
        sut.extractSegmentsFromPackageUrl(
          "http://localhost:3000/packages/8fba3f82-90ae-11ea-b22c-bb90cd699313/index.bundle?dev=true&platform=android",
        ),
      ).to.deep.equal({
        packageId: "8fba3f82-90ae-11ea-b22c-bb90cd699313",
        platform: "android",
        dev: true,
      });
    });
  });

  describe("getSourceMap", () => {
    it("should throw if the bundle does not exist in package", async () => {
      const sut = createServer({
        accessKeys: [],
        store: { path: storeFixturePath },
        server: defaultServer,
      });
      await rejects(
        sut.getSourceMap({
          packageId: "8fba3f82-90ae-11ea-b22c-bb90cd699313",
          platform: "ios",
          dev: false,
        }),
      );
    });

    it("should return expected sourcemap [android dev]", async () => {
      const sut = createServer({
        accessKeys: [],
        store: { path: storeFixturePath },
        server: defaultServer,
      });
      const sm = await sut.getSourceMap({
        packageId: "8fba3f82-90ae-11ea-b22c-bb90cd699313",
        platform: "android",
        dev: true,
      });
      expect(sm).equal("SOURCEMAPA");
    });

    it("should return expected sourcemap [android dev]", async () => {
      const sut = createServer({
        accessKeys: [],
        store: { path: storeFixturePath },
        server: defaultServer,
      });
      const sm = await sut.getSourceMap({
        packageId: "8fba3f82-90ae-11ea-b22c-bb90cd699313",
        platform: "android",
        dev: false,
      });
      expect(sm).equal("SOURCEMAPB");
    });
  });

  describe("getPathToBundle", () => {
    it("should return correct path", () => {
      const sut = createServer();
      const pkgId = "8fba3f82-90ae-11ea-b22c-bb90cd699313";
      const bundleId = "9e122bee-9a90-4158-9205-6759751d80dd";
      const pathToBundle = path.join(
        sut.config.store.path,
        "packages",
        pkgId,
        bundleId,
      );
      expect(sut.getPathToBundle(pkgId, bundleId)).equal(pathToBundle);
    });
  });

  describe("getPathToSourceMap", () => {
    it("should return correct path", () => {
      const sut = createServer();
      const pkgId = "8fba3f82-90ae-11ea-b22c-bb90cd699313";
      const sourceMapId = "4a1aaa5b-89ae-477f-b6d7-9747131750d7";
      const pathToSourceMap = path.join(
        sut.config.store.path,
        "packages",
        pkgId,
        sourceMapId,
      );
      expect(sut.getPathToSourceMap(pkgId, sourceMapId)).equal(pathToSourceMap);
    });
  });

  describe("symbolicate", () => {
    it("should return the symbolicated frames", async () => {
      const sut = createServer();
      const stack: StackFrame[] = [
        {
          arguments: undefined,
          column: 12,
          file: "http://localhost:3000/index.js",
          lineNumber: 1,
          methodName: "test",
        },
      ];
      const map = fs.readFileSync(
        path.resolve(__dirname, "./fixtures/sourcemap/index.map"),
        { encoding: "utf-8" },
      );
      const res = await sut.symbolicate(stack, map);
      expect(res).deep.equal([
        {
          arguments: undefined,
          column: 12,
          file: "index.ts",
          lineNumber: 1,
          methodName: "test",
        },
      ]);
    });

    it("should return the original frames [missing file]", async () => {
      const sut = createServer();
      const stack: StackFrame[] = [
        {
          arguments: undefined,
          column: 12,
          file: undefined,
          lineNumber: 1,
          methodName: "test",
        },
      ];
      const map = fs.readFileSync(
        path.resolve(__dirname, "./fixtures/sourcemap/index.map"),
        { encoding: "utf-8" },
      );
      const res = await sut.symbolicate(stack, map);
      expect(res).deep.equal(stack);
    });
  });

  describe("unzipPackage", () => {
    it("should throw if the zip file does not exist", async () => {
      const sut = createServer();
      const tmpDir = createTmpDir();
      const packageZipPath = path.join(tmpDir, "package.zip");
      const tmpOutDir = createTmpDir();
      await rejects(sut.unzipPackage(packageZipPath, tmpOutDir), (err) => {
        expect(err.message).eql(
          `ENOENT: no such file or directory, open '${packageZipPath}'`,
        );
        return true;
      });
    });

    it("should throw if the zip file is invalid", async () => {
      const sut = createServer();
      const tmpDir = createTmpDir();
      const invalidZipPath = path.join(tmpDir, "invalid.zip");
      shell.cp(path.join(fixturesPath, "invalid.zip"), invalidZipPath);
      const tmpOutDir = createTmpDir();
      await rejects(sut.unzipPackage(invalidZipPath, tmpOutDir), (err) => {
        expect(err.message).eql(
          "end of central directory record signature not found",
        );
        return true;
      });
    });

    it("should unzip the package", async () => {
      const sut = createServer();
      const tmpDir = createTmpDir();
      const tmpOutDir = createTmpDir();
      const packageZipPath = path.join(tmpDir, "package.zip");
      shell.cp(path.join(fixturesPath, "package.zip"), packageZipPath);
      const res = await sut.unzipPackage(packageZipPath, tmpOutDir);
      expect(res.bundles).deep.equal([
        {
          id: "790f95fd-2b02-4774-bb78-5de4b7dc73b8",
          dev: true,
          platform: "android",
          sourceMap: "f7117cff-efc8-4201-a297-6e571f309c2c",
        },
        {
          id: "9e122bee-9a90-4158-9205-6759751d80dd",
          dev: false,
          platform: "android",
          sourceMap: "4a1aaa5b-89ae-477f-b6d7-9747131750d7",
        },
      ]);
      expect(res.id).not.undefined;
      [
        "790f95fd-2b02-4774-bb78-5de4b7dc73b8",
        "9e122bee-9a90-4158-9205-6759751d80dd",
        "4a1aaa5b-89ae-477f-b6d7-9747131750d7",
        "f7117cff-efc8-4201-a297-6e571f309c2c",
        "metadata.json",
      ].forEach((file) => {
        const filePath = path.join(tmpOutDir, res.id, file);
        expect(fs.existsSync(filePath), filePath).true;
      });
    });
  });

  describe("unzipAssets", () => {
    it("should throw if the zip file does not exist", async () => {
      const sut = createServer();
      const tmpDir = createTmpDir();
      const assetsZipPath = path.join(tmpDir, "assets.zip");
      const tmpOutDir = createTmpDir();
      await rejects(sut.unzipAssets(assetsZipPath, tmpOutDir), (err) => {
        expect(err.message).eql(
          `ENOENT: no such file or directory, open '${assetsZipPath}'`,
        );
        return true;
      });
    });

    it("should throw if the zip file is invalid", async () => {
      const sut = createServer();
      const tmpDir = createTmpDir();
      const invalidZipPath = path.join(tmpDir, "invalid.zip");
      shell.cp(path.join(fixturesPath, "invalid.zip"), invalidZipPath);
      const tmpOutDir = createTmpDir();
      await rejects(sut.unzipAssets(invalidZipPath, tmpOutDir), (err) => {
        expect(err.message).eql(
          "end of central directory record signature not found",
        );
        return true;
      });
    });

    it("should unzip the assets", async () => {
      const sut = createServer();
      const tmpDir = createTmpDir();
      const tmpOutDir = createTmpDir();
      const assetsZipPath = path.join(tmpDir, "assets.zip");
      shell.cp(path.join(fixturesPath, "assets.zip"), assetsZipPath);
      await sut.unzipAssets(assetsZipPath, tmpOutDir);
      expect(
        fs.existsSync(path.join(tmpOutDir, "47ce6e77f039020ee2e76a10c1e988e9")),
      ).true;
      expect(
        fs.existsSync(
          path.join(tmpOutDir, "47ce6e77f039020ee2e76a10c1e988e9", "logo.png"),
        ),
      ).true;
    });

    it("should return the assets hashes", async () => {
      const sut = createServer();
      const tmpDir = createTmpDir();
      const tmpOutDir = createTmpDir();
      const assetsZipPath = path.join(tmpDir, "assets.zip");
      shell.cp(path.join(fixturesPath, "assets.zip"), assetsZipPath);
      const hashes = await sut.unzipAssets(assetsZipPath, tmpOutDir);
      expect(hashes).deep.equal([
        "ffc71969f5f0d7b4142f729a755bc50a",
        "f6264846f4b8b90b34bbccf0c0ec38b1",
        "47ce6e77f039020ee2e76a10c1e988e9",
      ]);
    });

    it("should delete the assets zip once done", async () => {
      const sut = createServer();
      const tmpDir = createTmpDir();
      const tmpOutDir = createTmpDir();
      const assetsZipPath = path.join(tmpDir, "assets.zip");
      shell.cp(path.join(fixturesPath, "assets.zip"), assetsZipPath);
      await sut.unzipAssets(assetsZipPath, tmpOutDir);
      expect(fs.existsSync(assetsZipPath)).false;
    });
  });

  describe("get address", () => {
    it("should throw if the server is not started", () => {
      const sut = createServer();
      expect(() => sut.address).to.throw();
    });
  });

  describe("get port", () => {
    it("should throw if the server is not started", () => {
      const sut = createServer();
      expect(() => sut.port).to.throw();
    });
  });

  describe("functional tests", () => {
    const defaultConfig = {
      accessKeys: [],
      server: {
        host: "localhost",
        port: 3000,
      },
      store: {
        path: createTmpDir(),
      },
    };

    async function test(
      config: Config,
      func: (req: ChaiHttp.Agent, server: LiveBundleStore) => Promise<void>,
    ) {
      const serv = new LiveBundleStore(config);
      try {
        await serv.start();
        await func(chai.request(`http://${serv.address}:${serv.port}`), serv);
      } finally {
        serv.stop();
      }
    }

    describe("GET /status", () => {
      it("should return HTTP 200", async () => {
        await test(defaultConfig, async (req) => {
          const res = await req.get("/status");
          expect(res).to.have.status(200);
        });
      });

      it("should return 'packager-status:running' text", async () => {
        await test(defaultConfig, async (req) => {
          const res = await req.get("/status");
          expect(res.text).eql("packager-status:running");
        });
      });

      it("should use chunked Transfer-Encoding", async () => {
        await test(defaultConfig, async (req) => {
          const res = await req.get("/status");
          expect(res).to.have.header("Transfer-Encoding", "chunked");
        });
      });
    });

    describe("GET /assets/*", () => {
      it("should return HTTP 404 if asset is not found", async () => {
        await test(defaultConfig, async (req) => {
          const res = await req.get(
            "/assets/img/notfound.png?platform=android&hash=6efcef727ae7b1a1408e7085efec5df9",
          );
          expect(res).to.have.status(404);
        });
      });

      it("should return the asset if found", async () => {
        await test(
          {
            accessKeys: [],
            store: { path: storeFixturePath },
            server: defaultConfig.server,
          },
          async (req) => {
            const expectedAsset = fs.readFileSync(
              path.join(
                storeFixturePath,
                "assets",
                "70d6fbba5502a18a0c052b6f6cb3fc32",
                "img@2x.png",
              ),
            );
            const res = await req
              .get(
                "/assets/img/img@2x.png?platform=android&hash=70d6fbba5502a18a0c052b6f6cb3fc32",
              )
              .buffer(true)
              .parse(binaryParser);
            expect(Buffer.compare(res.body, expectedAsset)).equal(0);
          },
        );
      });
    });

    describe("GET /packages/:packageId/index.bundle", () => {
      it("should return HTTP 404 if the package does not exit in store", async () => {
        await test(
          {
            accessKeys: [],
            store: { path: storeFixturePath },
            server: defaultConfig.server,
          },
          async (req) => {
            const res = await req
              .get(
                "/packages/11111111-90ae-11ea-b22c-bb90cd699313/index.bundle",
              )
              .query({ dev: false, platform: "android" })
              .buffer(true)
              .parse(binaryParser);
            expect(res).to.have.status(404);
          },
        );
      });

      it("should return the bundle [platform=android&dev=false]", async () => {
        await test(
          {
            accessKeys: [],
            store: { path: storeFixturePath },
            server: defaultConfig.server,
          },
          async (req) => {
            const expectedBundle = fs.readFileSync(
              path.join(
                storeFixturePath,
                "packages",
                "8fba3f82-90ae-11ea-b22c-bb90cd699313",
                "9e122bee-9a90-4158-9205-6759751d80dd",
              ),
            );
            const res = await req
              .get(
                "/packages/8fba3f82-90ae-11ea-b22c-bb90cd699313/index.bundle",
              )
              .query({ dev: false, platform: "android" })
              .buffer(true)
              .parse(binaryParser);
            expect(Buffer.compare(res.body, expectedBundle)).equal(0);
          },
        );
      });

      it("should return the bundle [platform=android&dev=true]", async () => {
        await test(
          {
            accessKeys: [],
            store: { path: storeFixturePath },
            server: defaultConfig.server,
          },
          async (req) => {
            const expectedBundle = fs.readFileSync(
              path.join(
                storeFixturePath,
                "packages",
                "8fba3f82-90ae-11ea-b22c-bb90cd699313",
                "790f95fd-2b02-4774-bb78-5de4b7dc73b8",
              ),
            );
            const res = await req
              .get(
                "/packages/8fba3f82-90ae-11ea-b22c-bb90cd699313/index.bundle",
              )
              .query({ dev: true, platform: "android" })
              .buffer(true)
              .parse(binaryParser);
            expect(Buffer.compare(res.body, expectedBundle)).equal(0);
          },
        );
      });
    });

    describe("GET /packages/:packageId/index.map", () => {
      it("should return HTTP 404 if the package does not exit in store", async () => {
        await test(
          {
            accessKeys: [],
            store: { path: storeFixturePath },
            server: defaultConfig.server,
          },
          async (req) => {
            const res = await req
              .get("/packages/11111111-90ae-11ea-b22c-bb90cd699313/index.map")
              .query({ dev: false, platform: "android" })
              .buffer(true)
              .parse(binaryParser);
            expect(res).to.have.status(404);
          },
        );
      });

      it("should return the source map [platform=android&dev=false]", async () => {
        await test(
          {
            accessKeys: [],
            store: { path: storeFixturePath },
            server: defaultConfig.server,
          },
          async (req) => {
            const expectedMap = fs.readFileSync(
              path.join(
                storeFixturePath,
                "packages",
                "8fba3f82-90ae-11ea-b22c-bb90cd699313",
                "4a1aaa5b-89ae-477f-b6d7-9747131750d7",
              ),
            );
            const res = await req
              .get("/packages/8fba3f82-90ae-11ea-b22c-bb90cd699313/index.map")
              .query({ dev: false, platform: "android" })
              .buffer(true)
              .parse(binaryParser);
            expect(Buffer.compare(res.body, expectedMap)).equal(0);
          },
        );
      });
    });

    describe("POST /packages", () => {
      it("shoud add the package to the store", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: [],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const packageRs = fs.createReadStream(
              path.join(fixturesPath, "package.zip"),
            );

            const res = await req
              .post("/packages")
              .attach("package", packageRs);
            expect(res).to.be.json;
            expect(res.body.id).not.undefined;
          },
        );
      });

      it("shoud return HTTP 201", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: [],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const packageRs = fs.createReadStream(
              path.join(fixturesPath, "package.zip"),
            );

            const res = await req
              .post("/packages")
              .attach("package", packageRs);
            expect(res).to.have.status(201);
          },
        );
      });

      it("shoud return HTTP 500 if the zip file is invalid", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: [],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const packageRs = fs.createReadStream(
              path.join(fixturesPath, "invalid.zip"),
            );

            const res = await req
              .post("/packages")
              .attach("package", packageRs);
            expect(res).to.have.status(500);
          },
        );
      });

      it("should fail with HTTP 400 if access key is missing from request headers", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: ["test-access-key"],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const packageRs = fs.createReadStream(
              path.join(fixturesPath, "package.zip"),
            );

            const res = await req
              .post("/packages")
              .attach("package", packageRs);
            expect(res).to.have.status(400);
          },
        );
      });

      it("should fail with HTTP 403 if access key is invalid", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: ["test-access-key"],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const packageRs = fs.createReadStream(
              path.join(fixturesPath, "package.zip"),
            );

            const res = await req
              .post("/packages")
              .set("LB-Access-Key", "invalid-access-key")
              .attach("package", packageRs);
            expect(res).to.have.status(403);
          },
        );
      });

      it("should succeed with HTTP 201 if access key is valid", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: ["test-access-key"],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const packageRs = fs.createReadStream(
              path.join(fixturesPath, "package.zip"),
            );

            const res = await req
              .post("/packages")
              .set("LB-Access-Key", "test-access-key")
              .attach("package", packageRs);
            expect(res).to.have.status(201);
          },
        );
      });
    });

    describe("POST /assets", () => {
      it("should return HTTP 201", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: [],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const assetsZipRs = fs.createReadStream(
              path.join(fixturesPath, "assets.zip"),
            );
            const res = await req.post("/assets").attach("assets", assetsZipRs);
            expect(res).to.have.status(201);
          },
        );
      });

      it("should return HTTP 500 if zip file is invalid", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: [],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const assetsZipRs = fs.createReadStream(
              path.join(fixturesPath, "invalid.zip"),
            );
            const res = await req.post("/assets").attach("assets", assetsZipRs);
            expect(res).to.have.status(500);
          },
        );
      });

      it("should fail with HTTP 400 if access key is missing from request headers", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: ["test-access-key"],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const assetsZipRs = fs.createReadStream(
              path.join(fixturesPath, "assets.zip"),
            );
            const res = await req.post("/assets").attach("assets", assetsZipRs);
            expect(res).to.have.status(400);
          },
        );
      });

      it("should fail with HTTP 403 if access key is invalid", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: ["test-access-key"],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const assetsZipRs = fs.createReadStream(
              path.join(fixturesPath, "assets.zip"),
            );
            const res = await req
              .post("/assets")
              .set("LB-Access-Key", "invalid-access-key")
              .attach("assets", assetsZipRs);
            expect(res).to.have.status(403);
          },
        );
      });

      it("should succeed with HTTP 201 if access key is valid", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: ["test-access-key"],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const assetsZipRs = fs.createReadStream(
              path.join(fixturesPath, "assets.zip"),
            );
            const res = await req
              .post("/assets")
              .set("LB-Access-Key", "test-access-key")
              .attach("assets", assetsZipRs);
            expect(res).to.have.status(201);
          },
        );
      });

      it("should return the hashes of the assets that have been added to the store", async () => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        await test(
          {
            accessKeys: [],
            store: { path: tmpDir },
            server: defaultConfig.server,
          },
          async (req) => {
            const assetsZipRs = fs.createReadStream(
              path.join(fixturesPath, "assets.zip"),
            );
            const res = await req.post("/assets").attach("assets", assetsZipRs);
            expect(res).to.be.json;
            expect(res.body).deep.equal([
              "ffc71969f5f0d7b4142f729a755bc50a",
              "f6264846f4b8b90b34bbccf0c0ec38b1",
              "47ce6e77f039020ee2e76a10c1e988e9",
            ]);
          },
        );
      });
    });

    describe("POST /assets/delta", () => {
      it("should return HTTP 200", async () => {
        await test(
          {
            accessKeys: [],
            store: { path: storeFixturePath },
            server: defaultConfig.server,
          },
          async (req) => {
            const res = await req.post("/assets/delta").send({ assets: [] });
            expect(res).to.have.status(200);
          },
        );
      });

      it("should return the assets ids that are not already in the store", async () => {
        await test(
          {
            accessKeys: [],
            store: { path: storeFixturePath },
            server: defaultConfig.server,
          },
          async (req) => {
            const assetIdsInStore = [
              "47ce6e77f039020ee2e76a10c1e988e9",
              "70d6fbba5502a18a0c052b6f6cb3fc32",
            ];
            const assetIdsNotInStore = ["32d6f43a5542a18a04352b6f6cb3fc948"];
            const res = await req.post("/assets/delta").send({
              assets: [...assetIdsInStore, ...assetIdsNotInStore],
            });
            expect(res).to.be.json;
            expect(res.body).to.deep.equal(assetIdsNotInStore);
          },
        );
      });
    });

    describe("POST /symbolicate", () => {
      it("should return HTTP 200", async () => {
        await test(
          {
            accessKeys: [],
            store: { path: storeFixturePath },
            server: defaultConfig.server,
          },
          async (req) => {
            const res = await req
              .post("/symbolicate")
              .set("Content-Type", "text/plain")
              .send(
                JSON.stringify({
                  stack: [
                    {
                      arguments: undefined,
                      column: 12,
                      file:
                        "http://localhost:3000/packages/8fba3f82-90ae-11ea-b22c-bb90cd699313/index.bundle?platform=ios&dev=true",
                      lineNumber: 1,
                      methodName: "test",
                    },
                  ],
                }),
              );
            expect(res.text).equal(
              '{"stack":[{"column":12,"file":"index.ts","lineNumber":1,"methodName":"test"}]}',
            );
          },
        );
      });
    });

    describe("GET /healthz", () => {
      it("should return HTTP 200", async () => {
        await test(defaultConfig, async (req) => {
          const res = await req.get("/healthz");
          expect(res).to.have.status(200);
        });
      });

      it("should return 'ok' text", async () => {
        await test(defaultConfig, async (req) => {
          const res = await req.get("/healthz");
          expect(res.text).eql("ok");
        });
      });
    });
  });
});
