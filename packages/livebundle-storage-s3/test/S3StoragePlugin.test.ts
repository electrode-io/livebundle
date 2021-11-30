import "mocha";
import S3StoragePlugin, { S3StorageConfig } from "../src";
import { expect } from "chai";
import sinon from "sinon";
import tmp from "tmp";
import fs from "fs-extra";
import path from "path";

describe("S3StoragePlugin", () => {
  const bucketName = "";
  const accessKeyId = "";
  const secretAccessKey = "";
  const sessionToken = "";
  const region = "";

  const sandbox = sinon.createSandbox();

  const storageConfig: S3StorageConfig = {
    bucketName,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
  };

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  describe("create", () => {
    it("should return an instance of S3StoragePlugin", async () => {
      const res = await S3StoragePlugin.create(storageConfig);
      expect(res).instanceOf(S3StoragePlugin);
    });
  });

  describe("get baseUrl", () => {
    it("should return the base url including container", () => {
      const sut = new S3StoragePlugin(storageConfig);
      expect(sut.baseUrl).equal(
        `https://${bucketName}.s3.${region}.amazonaws.com`,
      );
    });
  });

  describe("getFilePathUrl", () => {
    it("should return the correct url", () => {
      const sut = new S3StoragePlugin(storageConfig);
      const path = "foo/file";
      expect(sut.getFilePathUrl(path)).equal(
        `https://${bucketName}.s3.${region}.amazonaws.com/${path}`,
      );
    });
  });

  describe("store", () => {
    it("should upload the content", async () => {
      const targetPath = "/target/file1";
      const content = "foo";
      const contentLength = 3;
      const sut = new S3StoragePlugin(storageConfig);
      const url = await sut.store(content, contentLength, targetPath);
      sinon.assert.match(url, sut.getFilePathUrl(targetPath));
    });
  });

  describe("storeFile", () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    const tmpFilePath = path.join(tmpDir, "tmpfile");
    fs.writeFileSync(tmpFilePath, "foo", { encoding: "utf8" });
    const fileData = Buffer.from("foo", "utf8");

    it("should upload the file [without content type]", async () => {
      const targetPath = "/target/file3";
      const sut = new S3StoragePlugin(storageConfig);
      const url = await sut.storeFile(tmpFilePath, targetPath);
      sinon.assert.match(url, sut.getFilePathUrl(targetPath));
    });

    it("should upload the file [with content type]", async () => {
      const targetPath = "/target/file4";
      const contentType = "image/png";
      const sut = new S3StoragePlugin(storageConfig);
      const url = await sut.storeFile(tmpFilePath, targetPath, {
        contentType,
      });
      sinon.assert.match(url, sut.getFilePathUrl(targetPath));
    });
  });

  describe("hasFile", () => {
    it("should return true if the file exists", async () => {
      const targetPath = "/target/file1";
      const sut = new S3StoragePlugin(storageConfig);
      const result = await sut.hasFile(targetPath);
      expect(result).true;
    });

    it("should return false if the file does not exists", async () => {
      const targetPath = "/target/file9";
      const sut = new S3StoragePlugin(storageConfig);
      const result = await sut.hasFile(targetPath);
      expect(result).false;
    });
  });

  describe("downloadFile", () => {
    it("should return the download file as a Buffer", async () => {
      const targetPath = "/target/file1";
      const sut = new S3StoragePlugin(storageConfig);
      const result = await sut.downloadFile(targetPath);
      expect(result.toString()).equals("foo");
    });
  });
});
