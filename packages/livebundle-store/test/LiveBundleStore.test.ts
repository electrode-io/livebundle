import chai, { expect } from "chai";
import chaiHttp from "chai-http";
import fs from "fs";
import "mocha";
import path from "path";
import shell from "shelljs";
import tmp from "tmp";
import { LiveBundleStore } from "../src/LiveBundleStore";
import { Config } from "../src/types";

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

    it("should create the multer storage instance", () => {
      const sut = createServer();
      expect(sut.storage).not.undefined;
    });

    it("should have default config [default port]", () => {
      const sut = createServer();
      expect(sut.config.server.port).equal(3000);
    });
  });

  describe("extractSegmentsFromBundleUrl", () => {
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
    it("should return expected sourcemap [android dev]", async () => {
      const sut = createServer({
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

  describe("unzipPackage", () => {
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

  describe("functional tests", () => {
    describe("GET /status", () => {
      it("should return HTTP 200", (done) => {
        const sut = createServer();
        chai
          .request(sut.app)
          .get("/status")
          .end((err, res) => {
            expect(res).to.have.status(200);
            done();
          });
      });

      it("should return 'packager-status:running' text", (done) => {
        const sut = createServer();
        chai
          .request(sut.app)
          .get("/status")
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res.text).eql("packager-status:running");
            done();
          });
      });

      it("should use chunked Transfer-Encoding", (done) => {
        const sut = createServer();
        chai
          .request(sut.app)
          .get("/status")
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res).to.have.header("Transfer-Encoding", "chunked");
            done();
          });
      });
    });

    describe("GET /assets/*", () => {
      it("should return HTTP 404 if asset is not found", (done) => {
        const sut = createServer();
        chai
          .request(sut.app)
          .get(
            "/assets/img/notfound.png?platform=android&hash=6efcef727ae7b1a1408e7085efec5df9",
          )
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res).to.have.status(404);
            done();
          });
      });

      it("should return the asset if found", (done) => {
        const sut = createServer({
          store: { path: storeFixturePath },
          server: defaultServer,
        });
        const expectedAsset = fs.readFileSync(
          path.join(
            storeFixturePath,
            "assets",
            "70d6fbba5502a18a0c052b6f6cb3fc32",
            "img@2x.png",
          ),
        );
        chai
          .request(sut.app)
          .get(
            "/assets/img/img@2x.png?platform=android&hash=70d6fbba5502a18a0c052b6f6cb3fc32",
          )
          .buffer(true)
          .parse(binaryParser)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(Buffer.compare(res.body, expectedAsset)).equal(0);
            done();
          });
      });
    });

    describe("GET /packages/:packageId/index.bundle", () => {
      it("should return the bundle [platform=android&dev=false]", (done) => {
        const sut = createServer({
          store: { path: storeFixturePath },
          server: defaultServer,
        });
        const expectedBundle = fs.readFileSync(
          path.join(
            storeFixturePath,
            "packages",
            "8fba3f82-90ae-11ea-b22c-bb90cd699313",
            "9e122bee-9a90-4158-9205-6759751d80dd",
          ),
        );
        chai
          .request(sut.app)
          .get("/packages/8fba3f82-90ae-11ea-b22c-bb90cd699313/index.bundle")
          .query({ dev: false, platform: "android" })
          .buffer(true)
          .parse(binaryParser)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(Buffer.compare(res.body, expectedBundle)).equal(0);
            done();
          });
      });

      it("should return the bundle [platform=android&dev=true]", (done) => {
        const sut = createServer({
          store: { path: storeFixturePath },
          server: defaultServer,
        });
        const expectedBundle = fs.readFileSync(
          path.join(
            storeFixturePath,
            "packages",
            "8fba3f82-90ae-11ea-b22c-bb90cd699313",
            "790f95fd-2b02-4774-bb78-5de4b7dc73b8",
          ),
        );
        chai
          .request(sut.app)
          .get("/packages/8fba3f82-90ae-11ea-b22c-bb90cd699313/index.bundle")
          .query({ dev: true, platform: "android" })
          .buffer(true)
          .parse(binaryParser)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(Buffer.compare(res.body, expectedBundle)).equal(0);
            done();
          });
      });
    });

    describe("POST /packages", () => {
      it("shoud add the package to the store", (done) => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        const sut = createServer({
          store: { path: tmpDir },
          server: defaultServer,
        });
        const packageRs = fs.createReadStream(
          path.join(fixturesPath, "package.zip"),
        );
        chai
          .request(sut.app)
          .post("/packages")
          .attach("package", packageRs)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res).to.be.json;
            expect(res.body.id).not.undefined;
            done();
          });
      });

      it("shoud return HTTP 201", (done) => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        const sut = createServer({
          store: { path: tmpDir },
          server: defaultServer,
        });
        const packageRs = fs.createReadStream(
          path.join(fixturesPath, "package.zip"),
        );
        chai
          .request(sut.app)
          .post("/packages")
          .attach("package", packageRs)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res).to.have.status(201);
            done();
          });
      });
    });

    describe("POST /assets", () => {
      it("should return HTTP 201", (done) => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        const sut = createServer({
          store: { path: tmpDir },
          server: defaultServer,
        });
        const assetsZipRs = fs.createReadStream(
          path.join(fixturesPath, "assets.zip"),
        );
        chai
          .request(sut.app)
          .post("/assets")
          .attach("assets", assetsZipRs)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res).to.have.status(201);
            done();
          });
      });

      it("should return the hashes of the assets that have been added to the store", (done) => {
        const tmpDir = createTmpDir();
        shell.cp("-rf", path.join(storeFixturePath, "*"), tmpDir);
        const sut = createServer({
          store: { path: tmpDir },
          server: defaultServer,
        });
        const assetsZipRs = fs.createReadStream(
          path.join(fixturesPath, "assets.zip"),
        );
        chai
          .request(sut.app)
          .post("/assets")
          .attach("assets", assetsZipRs)
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res).to.be.json;
            expect(res.body).deep.equal([
              "ffc71969f5f0d7b4142f729a755bc50a",
              "f6264846f4b8b90b34bbccf0c0ec38b1",
              "47ce6e77f039020ee2e76a10c1e988e9",
            ]);
            done();
          });
      });
    });

    describe("POST /assets/delta", () => {
      it("should return HTTP 200", (done) => {
        const sut = createServer({
          store: { path: storeFixturePath },
          server: defaultServer,
        });
        chai
          .request(sut.app)
          .post("/assets/delta")
          .send({ assets: [] })
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res).to.have.status(200);
            done();
          });
      });

      it("should return the assets ids that are not already in the store", (done) => {
        const sut = createServer({
          store: { path: storeFixturePath },
          server: defaultServer,
        });
        const assetIdsInStore = [
          "47ce6e77f039020ee2e76a10c1e988e9",
          "70d6fbba5502a18a0c052b6f6cb3fc32",
        ];
        const assetIdsNotInStore = ["32d6f43a5542a18a04352b6f6cb3fc948"];
        chai
          .request(sut.app)
          .post("/assets/delta")
          .send({
            assets: [...assetIdsInStore, ...assetIdsNotInStore],
          })
          .end((err, res) => {
            if (err) {
              return done(err);
            }
            expect(res).to.be.json;
            expect(res.body).to.deep.equal(assetIdsNotInStore);
            done();
          });
      });
    });
  });
});
