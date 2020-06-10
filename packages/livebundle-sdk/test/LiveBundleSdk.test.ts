import { expect } from "chai";
import type { Platform } from "livebundle-store";
import path from "path";
import sinon from "sinon";
import { LiveBundleHttpCli, LiveBundleSdk } from "../src";

describe("LiveBundleSdk", () => {
  const sandbox = sinon.createSandbox();
  const fixturesPath = path.join(__dirname, "fixtures/LiveBundleSdk");

  afterEach(() => {
    sandbox.restore();
  });

  describe("uploadPackage", () => {
    it("should succeed", async () => {
      const httpCli = sandbox.createStubInstance(LiveBundleHttpCli);

      const uploadRes = {
        id: "4a1aaa5b-89ae-477f-b6d7-9747131750d7",
        bundles: [
          {
            dev: true,
            platform: "ios" as Platform,
            id: "6cfa3d3d-98cd-4190-be85-a4ea0f72eceb",
            sourceMap: "e32a4e30-3f5f-4306-92ee-da2bde9e560c",
          },
          {
            dev: true,
            platform: "ios" as Platform,
            id: "4eb72caf-a8f8-4a3b-abe9-35d4021af3c4",
            sourceMap: "8270703c-bbc7-4eee-9edd-df5c6ea37eab",
          },
        ],
        timestamp: 1591640289863,
      };
      httpCli.uploadPackage.resolves(uploadRes);
      const sut = new LiveBundleSdk((httpCli as unknown) as LiveBundleHttpCli);
      const res = await sut.uploadPackage({
        bundles: [
          {
            dev: true,
            platform: "android" as Platform,
            bundlePath: path.join(fixturesPath, "index.android.bundle"),
            sourceMapPath: path.join(fixturesPath, "index.android.map"),
          },
          {
            dev: true,
            platform: "ios" as Platform,
            bundlePath: path.join(fixturesPath, "index.ios.bundle"),
            sourceMapPath: path.join(fixturesPath, "index.ios.map"),
          },
        ],
      });
      expect(res).deep.equal(uploadRes);
    });
  });

  describe("uploadAssets", () => {
    it("should succeed if there is new assets", async () => {
      const httpCli = sandbox.createStubInstance(LiveBundleHttpCli);
      httpCli.assetsDelta.resolves(["46d1173c53d96832e868151c1648ea42"]);
      const sut = new LiveBundleSdk((httpCli as unknown) as LiveBundleHttpCli);
      await sut.uploadAssets([
        {
          files: [path.join(fixturesPath, "loader.png")],
          hash: "46d1173c53d96832e868151c1648ea42",
        },
      ]);
    });

    it("should succeed if there is no new assets", async () => {
      const httpCli = sandbox.createStubInstance(LiveBundleHttpCli);
      httpCli.assetsDelta.resolves([]);
      const sut = new LiveBundleSdk((httpCli as unknown) as LiveBundleHttpCli);
      await sut.uploadAssets([
        {
          files: [path.join(fixturesPath, "loader.png")],
          hash: "46d1173c53d96832e868151c1648ea42",
        },
      ]);
    });
  });
});
