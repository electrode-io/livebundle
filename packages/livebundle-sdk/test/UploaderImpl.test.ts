import "mocha";
import { UploaderImpl } from "../src";
import sinon from "sinon";
import {
  StoragePlugin,
  LocalBundle,
  Package,
  ReactNativeAsset,
} from "livebundle-sdk";
import { expect } from "chai";
import path from "path";
import fs from "fs-extra";
import tmp from "tmp";

class FakeStoragePlugin implements StoragePlugin {
  hasFile(filePath: string): Promise<boolean> {
    return Promise.resolve(true);
  }
  downloadFile(filePath: string): Promise<Buffer> {
    return Promise.resolve(Buffer.from("[]", "utf8"));
  }
  store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<string> {
    return Promise.resolve("");
  }
  storeFile(
    filePath: string,
    targetPath: string,
    options?: { contentType?: string | undefined },
  ): Promise<string> {
    return Promise.resolve("");
  }
  baseUrl: string;
}

describe("UploaderImpl", () => {
  const sandbox = sinon.createSandbox();

  const stubs = {
    storage: sandbox.createStubInstance(FakeStoragePlugin),
  };

  const assets: ReactNativeAsset[] = [
    {
      files: [path.join(__dirname, "fixtures/loader.png")],
      hash: "d881b69b0aca33bcf5dbc7dc5c448cc2",
    },
  ];

  const bundles: LocalBundle[] = [
    {
      assets,
      dev: true,
      platform: "android",
      sourceMapPath: path.join(__dirname, "fixtures/index.android.map"),
      bundlePath: path.join(__dirname, "fixtures/index.android.bundle"),
    },
    {
      assets,
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

  describe("upload", () => {
    it("should return the resulting Package", async () => {
      const sut = new UploaderImpl(stubs.storage);
      const res: Package = await sut.upload({ bundles });
      expect(res).not.undefined;
    });

    it("should store the resulting bundles", async () => {
      const sut = new UploaderImpl(stubs.storage);
      await sut.upload({ bundles });
      sinon.assert.called(stubs.storage.storeFile);
    });

    it("should store the resulting metadata file", async () => {
      const sut = new UploaderImpl(stubs.storage);
      await sut.upload({ bundles });
      sinon.assert.called(stubs.storage.store);
    });
  });

  describe("getExistingAssetsHashesFromStorage", () => {
    it("should return an empty array if the assets metadata file does not exist in storage", async () => {
      stubs.storage.hasFile.resolves(false);
      const sut = new UploaderImpl(stubs.storage);
      const result = await sut.getExistingAssetsHashesFromStorage();
      expect(result).to.be.an("array").empty;
    });

    it("should return an array containing the existing assets md5 hashes if the assets metadata file exist", async () => {
      const assetsHashes = [
        "a69fa1c2dd77bd4d143b4b77b1d98b88",
        "45be446141257a3b182e4da7425360b0",
      ];
      stubs.storage.hasFile.resolves(true);
      stubs.storage.downloadFile.resolves(
        Buffer.from(JSON.stringify(assetsHashes), "utf-8"),
      );
      const sut = new UploaderImpl(stubs.storage);
      const result = await sut.getExistingAssetsHashesFromStorage();
      expect(result).to.deep.equal(assetsHashes);
    });
  });

  describe("uploadAssets", () => {
    it("should store asset files in the storage", async () => {
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      const assetsFileNames = ["a.png", "b.ios.png", "b.android.png"];
      const assetsFilePaths = assetsFileNames.map((n: string) =>
        path.join(tmpDir, n),
      );
      assetsFilePaths.forEach((p: string) => fs.writeFileSync(p, "content"));
      const assets: ReactNativeAsset[] = [
        {
          files: [path.join(tmpDir, "a.png")],
          hash: "45be446141257a3b182e4da7425360b0",
        },
        {
          files: [path.join(tmpDir, "b.png")],
          hash: "a69fa1c2dd77bd4d143b4b77b1d98b88",
        },
        {
          files: [path.join(tmpDir, "c.png")],
          hash: "39539caee5093eab0c43d8eb43e8cb1a",
        },
      ];
      const sut = new UploaderImpl(stubs.storage);
      await sut.uploadAssets(assets);
      sinon.assert.callCount(stubs.storage.storeFile, 4);
      sinon.assert.calledWithExactly(
        stubs.storage.storeFile.getCall(0),
        path.join(tmpDir, "a.png"),
        "assets/45be446141257a3b182e4da7425360b0/a.android.png",
      );
      sinon.assert.calledWithExactly(
        stubs.storage.storeFile.getCall(1),
        path.join(tmpDir, "a.png"),
        "assets/45be446141257a3b182e4da7425360b0/a.ios.png",
      );
      sinon.assert.calledWithExactly(
        stubs.storage.storeFile.getCall(2),
        path.join(tmpDir, "b.android.png"),
        "assets/a69fa1c2dd77bd4d143b4b77b1d98b88/b.android.png",
      );
      sinon.assert.calledWithExactly(
        stubs.storage.storeFile.getCall(3),
        path.join(tmpDir, "b.ios.png"),
        "assets/a69fa1c2dd77bd4d143b4b77b1d98b88/b.ios.png",
      );
    });
  });

  describe("uploadAssetsMetadata", () => {
    it("should generate and upload the assets/metadata.json file", async () => {
      const assetsHashes = [
        "a69fa1c2dd77bd4d143b4b77b1d98b88",
        "45be446141257a3b182e4da7425360b0",
      ];
      const stringified = JSON.stringify(assetsHashes);
      const sut = new UploaderImpl(stubs.storage);
      await sut.uploadAssetsMetadata(assetsHashes);
      sinon.assert.calledOnceWithExactly(
        stubs.storage.store,
        stringified,
        stringified.length,
        "assets/metadata.json",
      );
    });
  });

  describe("getNewAssets", () => {
    it("should return an empty array if all assets are already in storage", () => {
      const sut = new UploaderImpl(stubs.storage);
      const result = sut.getNewAssets(
        [
          { files: ["/foo/bar.png"], hash: "a69fa1c2dd77bd4d143b4b77b1d98b88" },
          { files: ["/foo/baz.png"], hash: "45be446141257a3b182e4da7425360b0" },
        ],
        [
          "a69fa1c2dd77bd4d143b4b77b1d98b88",
          "45be446141257a3b182e4da7425360b0",
        ],
      );
      expect(result).to.be.an("array").empty;
    });

    it("should return an array containing the assets that are not yet in storage", () => {
      const sut = new UploaderImpl(stubs.storage);
      const result = sut.getNewAssets(
        [
          { files: ["/foo/bar.png"], hash: "a69fa1c2dd77bd4d143b4b77b1d98b88" },
          { files: ["/foo/baz.png"], hash: "45be446141257a3b182e4da7425360b0" },
        ],
        ["45be446141257a3b182e4da7425360b0"],
      );
      expect(result).to.deep.equal([
        { files: ["/foo/bar.png"], hash: "a69fa1c2dd77bd4d143b4b77b1d98b88" },
      ]);
    });
  });
});
