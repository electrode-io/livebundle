import "mocha";
import FsStorageImpl, { FsStorageConfig } from "../src";
import { expect } from "chai";
import tmp from "tmp";
import fs from "fs-extra";
import path from "path";

describe("FsStorageImpl", () => {
  const storageConfig = (): FsStorageConfig => ({
    storageDir: tmp.dirSync({ unsafeCleanup: true }).name,
  });

  const writeTmpFile = async (content: string): Promise<string> => {
    const tmpPath = tmp.dirSync({ unsafeCleanup: true }).name;
    const tmpFilePath = path.join(tmpPath, "tmp.file");
    await fs.writeFile(tmpFilePath, content, { encoding: "utf-8" });
    return tmpFilePath;
  };

  describe("baseUrl getter", () => {
    it("should return the root directory of the storage", () => {
      const config = storageConfig();
      const sut = new FsStorageImpl(config);
      expect(sut.baseUrl).equal(config.storageDir);
    });
  });

  describe("create", () => {
    it("should return an instance of FsStorageImpl", async () => {
      const res = await FsStorageImpl.create(storageConfig());
      expect(res).instanceOf(FsStorageImpl);
    });
  });

  describe("store", () => {
    it("should store the content to target file location", async () => {
      const config = storageConfig();
      const sut = new FsStorageImpl(config);
      await sut.store("abcd", 4, "test.file");
      expect(fs.existsSync(path.join(config.storageDir!, "test.file")));
    });
  });

  describe("storeFile", () => {
    it("should store the file in target file location", async () => {
      const tmpFilePath = await writeTmpFile("foo");
      const config = storageConfig();
      const sut = new FsStorageImpl(config);
      await sut.storeFile(tmpFilePath, "test.file");
      expect(fs.existsSync(path.join(config.storageDir!, "test.file")));
    });
  });

  describe("hasFile", () => {
    it("should returrn true if the file exists", async () => {
      const config = storageConfig();
      const sut = new FsStorageImpl(config);
      await fs.writeFile(path.join(config.storageDir!, "test.file"), "foo", {
        encoding: "utf-8",
      });
      const result = await sut.hasFile("test.file");
      expect(result).true;
    });

    it("should returrn false if the file does not exists", async () => {
      const sut = new FsStorageImpl(storageConfig());
      const result = await sut.hasFile("test.file");
      expect(result).false;
    });
  });

  describe("downloadFile", () => {
    it("should return the downloaded file as a Buffer", async () => {
      const config = storageConfig();
      const sut = new FsStorageImpl(config);
      await fs.writeFile(path.join(config.storageDir!, "test.file"), "foo", {
        encoding: "utf-8",
      });
      const result = await sut.downloadFile("test.file");
      expect(result.toString()).equal("foo");
    });
  });
});
