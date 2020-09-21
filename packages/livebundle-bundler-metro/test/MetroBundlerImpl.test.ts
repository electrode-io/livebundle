import "mocha";
import MetroBundlerImpl, { MetroBundlerConfig } from "../src";
import { v4 as uuidv4 } from "uuid";
import sinon from "sinon";
import {
  LocalBundle,
  Package,
  Uploader,
  ReactNativeAsset,
} from "livebundle-sdk";
import { expect } from "chai";

class NullUploader implements Uploader {
  uploadPackage({ bundles }: { bundles: LocalBundle[] }): Promise<Package> {
    return Promise.resolve({
      id: uuidv4(),
      bundles: [],
      timestamp: Date.now(),
    });
  }
  uploadAssets(assets: ReactNativeAsset[]): Promise<void> {
    return Promise.resolve();
  }
  getAssetsTemplateLiteral(): string {
    return "";
  }
}

describe("MetroBundlerImpl", () => {
  const sandbox = sinon.createSandbox();

  const bundlerConfig: MetroBundlerConfig = {
    bundles: [{ dev: true, entry: "index.js", platform: "android" }],
  };

  afterEach(() => {
    sandbox.restore();
  });

  describe("create", () => {
    it("should return an instance of MetroBundlerImpl", async () => {
      const res = await MetroBundlerImpl.create(
        bundlerConfig,
        new NullUploader(),
      );
      expect(res).instanceOf(MetroBundlerImpl);
    });
  });

  describe("bundle", () => {
    it("should work", async () => {
      const a = sandbox.stub();
      const sut = new MetroBundlerImpl(bundlerConfig, new NullUploader(), {
        exec: a,
        parseAssetsFunc: async () => Promise.resolve([]),
      });
      await sut.bundle();
    });
  });
});
