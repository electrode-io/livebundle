import "mocha";
import { UploaderImpl } from "../src";
import sinon from "sinon";
import {
  Storage,
  LocalBundle,
  Package,
  ReactNativeAsset,
} from "livebundle-sdk";
import { expect } from "chai";
import path from "path";

class FakeStorageImpl implements Storage {
  store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<void> {
    return Promise.resolve();
  }
  storeFile(
    filePath: string,
    targetPath: string,
    options?: { contentType?: string | undefined },
  ): Promise<void> {
    return Promise.resolve();
  }
  baseUrl: string;
}

describe("UploaderImpl", () => {
  const sandbox = sinon.createSandbox();

  const stubs = {
    storage: sandbox.createStubInstance(FakeStorageImpl),
  };

  const assets: ReactNativeAsset[] = [
    {
      files: [path.join(__dirname, "fixtures/loader.png")],
      hash: "d881b69b0aca33bcf5dbc7dc5c448cc2",
    },
  ];

  const bundles: LocalBundle[] = [
    {
      dev: true,
      platform: "android",
      sourceMapPath: path.join(__dirname, "fixtures/index.android.map"),
      bundlePath: path.join(__dirname, "fixtures/index.android.bundle"),
    },
    {
      dev: true,
      platform: "ios",
      sourceMapPath: path.join(__dirname, "fixtures/index.ios.map"),
      bundlePath: path.join(__dirname, "fixtures/index.ios.bundle"),
    },
  ];

  beforeEach(() => {
    stubs.storage.store = sandbox.stub();
    stubs.storage.storeFile = sandbox.stub();
    stubs.storage.baseUrl = "https://foo/bar";
  });

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  describe("getAssetsTemplateLiteral", () => {
    it("should return the correct template litteral string", () => {
      const sut = new UploaderImpl(stubs.storage);
      expect(sut.getAssetsTemplateLiteral()).equal(
        `\`${stubs.storage.baseUrl}/assets/\${hash}/\${name}.\${type}\``,
      );
    });
  });

  describe("uploadPackage", () => {
    it("should return the resulting Package", async () => {
      const sut = new UploaderImpl(stubs.storage);
      const res: Package = await sut.uploadPackage({ bundles });
      expect(res).not.undefined;
    });

    it("should store the resulting bundles", async () => {
      const sut = new UploaderImpl(stubs.storage);
      const res: Package = await sut.uploadPackage({ bundles });
      sinon.assert.calledTwice(stubs.storage.storeFile);
    });

    it("should store the resulting metadata file", async () => {
      const sut = new UploaderImpl(stubs.storage);
      const res: Package = await sut.uploadPackage({ bundles });
      sinon.assert.calledOnce(stubs.storage.store);
    });
  });

  describe("uploadAssets", () => {
    it("should store each asset", async () => {
      const sut = new UploaderImpl(stubs.storage);
      await sut.uploadAssets(assets);
      sinon.assert.calledOnce(stubs.storage.storeFile);
    });
  });
});
