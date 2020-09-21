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
      const tmpPath = tmp.dirSync({ unsafeCleanup: true }).name;
      const tmpFilePath = path.join(tmpPath, "tmp.file");
      await fs.writeFile(tmpFilePath, "abcd", { encoding: "utf-8" });
      const config = storageConfig();
      const sut = new FsStorageImpl(config);
      await sut.storeFile(tmpFilePath, "test.file");
      expect(fs.existsSync(path.join(config.storageDir!, "test.file")));
    });
  });
});
