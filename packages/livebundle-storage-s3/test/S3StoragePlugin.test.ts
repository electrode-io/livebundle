import "mocha";
import { S3 } from "aws-sdk";
import S3StoragePlugin, { S3StorageConfig } from "../src";
import { expect } from "chai";
import sinon from "sinon";
import { rejects } from "assert";
import tmp from "tmp";
import fs from "fs-extra";
import path from "path";

describe("S3StoragePlugin", () => {
  const accessKeyId = "";
  const secretAccessKey = "";
  const sessionToken = "";
  const bucketName = "foo";
  const region = "bar";

  const sandbox = sinon.createSandbox();
  const stubs = {
    s3: sinon.stub(S3) as any,
    putObject: sandbox.stub(),
    headObject: sandbox.stub(),
    getObject: sandbox.stub(),
    promise: sandbox.stub(),
    promiseWithBody: sandbox.stub(),
    buffer: sandbox.stub().resolves(Buffer.from("", "utf8")),
  };

  const storageConfig: S3StorageConfig = {
    bucketName,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
  };

  beforeEach(() => {
    stubs.promiseWithBody.returns({
      Body: stubs.buffer
    });
    stubs.putObject.returns({
      promise: stubs.promise,
    });
    stubs.headObject.returns({
      promise: stubs.promise,
    });
    stubs.getObject.returns({
      promise: stubs.promiseWithBody,
    });
    stubs.s3.putObject = stubs.putObject;
    stubs.s3.headObject = stubs.headObject;
    stubs.s3.getObject = stubs.getObject;
  });

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
      const sut = new S3StoragePlugin(storageConfig, {
        s3: stubs.s3,
      });
      const params = {
        Bucket: bucketName,
        Key: targetPath,
        Body: content,
        ContentLength: contentLength,
      };
      await sut.store(content, contentLength, targetPath);
      sinon.assert.calledOnceWithExactly(stubs.putObject, params);
      sinon.assert.calledOnceWithExactly(stubs.promise);
    });

    it("should throw if it fails to upload content", async () => {
      const targetPath = "/target/file2";
      const content = "foo";
      const contentLength = 3;
      const sut = new S3StoragePlugin(storageConfig, {
        s3: stubs.s3,
      });
      stubs.putObject.rejects();
      await rejects(sut.store(content, contentLength, targetPath));
    });
  });

  describe("storeFile", () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    const tmpFilePath = path.join(tmpDir, "tmpfile");
    fs.writeFileSync(tmpFilePath, "foo", { encoding: "utf8" });
    const fileData = Buffer.from("foo", "utf8");

    it("should upload the file [without content type]", async () => {
      const targetPath = "/target/file3";
      const sut = new S3StoragePlugin(storageConfig, {
        s3: stubs.s3,
      });
      const params = {
        Bucket: bucketName,
        Key: targetPath,
        Body: fileData,
        ContentType: undefined,
      };
      await sut.storeFile(tmpFilePath, targetPath);
      sinon.assert.calledOnceWithExactly(stubs.putObject, params);
      sinon.assert.calledOnceWithExactly(stubs.promise);
    });

    it("should upload the file [with content type]", async () => {
      const targetPath = "/target/file4";
      const contentType = "image/png";
      const sut = new S3StoragePlugin(storageConfig, {
        s3: stubs.s3,
      });
      const params = {
        Bucket: bucketName,
        Key: targetPath,
        Body: fileData,
        ContentType: contentType,
      };
      await sut.storeFile(tmpFilePath, targetPath, {
        contentType,
      });
      sinon.assert.calledOnceWithExactly(stubs.putObject, params);
      sinon.assert.calledOnceWithExactly(stubs.promise);
    });

    it("should throw if it fails to upload content", async () => {
      const targetPath = "/target/file5";
      const sut = new S3StoragePlugin(storageConfig, {
        s3: stubs.s3,
      });
      stubs.putObject.rejects();
      await rejects(sut.storeFile(tmpFilePath, targetPath));
    });
  });

  describe("hasFile", () => {
    it("should return true if the file exists", async () => {
      const targetPath = "/target/file6";
      const sut = new S3StoragePlugin(storageConfig, {
        s3: stubs.s3,
      });
      const params = {
        Bucket: bucketName,
        Key: targetPath,
      };
      await sut.hasFile(targetPath);
      sinon.assert.calledOnceWithExactly(stubs.headObject, params);
      sinon.assert.calledOnceWithExactly(stubs.promise);
    });

    it("should return false if the file does not exists", async () => {
      const targetPath = "/target/file7";
      const sut = new S3StoragePlugin(storageConfig);
      const result = await sut.hasFile(targetPath);
      expect(result).false;
    });

    it("should return false if it fails to check file", async () => {
      const targetPath = "/target/file8";
      const sut = new S3StoragePlugin(storageConfig, {
        s3: stubs.s3,
      });
      stubs.headObject.rejects();
      const result = await sut.hasFile(targetPath);
      expect(result).false;
    });
  });

  describe("downloadFile", () => {
    it("should return the download file as a Buffer", async () => {
      const targetPath = "/target/file9";
      const sut = new S3StoragePlugin(storageConfig, {
        s3: stubs.s3,
      });
      const params = {
        Bucket: bucketName,
        Key: targetPath,
      };
      await sut.downloadFile(targetPath);
      sinon.assert.calledOnceWithExactly(stubs.getObject, params);
      sinon.assert.calledOnceWithExactly(stubs.promiseWithBody);
    });

    it("should throw if it fails to download file", async () => {
      const targetPath = "/target/file10";
      const sut = new S3StoragePlugin(storageConfig, {
        s3: stubs.s3,
      });
      stubs.getObject.rejects();
      await rejects(sut.downloadFile(targetPath));
    });
  });
});
