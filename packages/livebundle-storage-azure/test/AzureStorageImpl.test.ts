import "mocha";
import AzureStorageImpl, { AzureBlobStorageConfig } from "../src";
import { expect } from "chai";
import sinon from "sinon";
import { BlobServiceClient } from "@azure/storage-blob";
import { rejects } from "assert";
import tmp from "tmp";
import fs from "fs-extra";
import path from "path";

describe("AzureStorageImpl", () => {
  const sandbox = sinon.createSandbox();
  const stubs = {
    blobServiceClient: sinon.stub(BlobServiceClient) as any,
    upload: sandbox.stub(),
    uploadFile: sandbox.stub(),
    getBlockBlobClient: sandbox.stub(),
    getContainerClient: sinon.stub(),
    exists: sandbox.stub().resolves(true),
    downloadToBuffer: sandbox.stub().resolves(Buffer.from("", "utf8")),
  };

  const accountUrl = "https://foo.blob.core.windows.net";
  const container = "bar";

  const storageConfig: AzureBlobStorageConfig = {
    accountUrl,
    container,
  };

  beforeEach(() => {
    stubs.getContainerClient.returns({
      getBlockBlobClient: stubs.getBlockBlobClient,
    });
    stubs.getBlockBlobClient.returns({
      upload: stubs.upload,
      uploadFile: stubs.uploadFile,
      exists: stubs.exists,
      downloadToBuffer: stubs.downloadToBuffer,
    });
    stubs.blobServiceClient.getContainerClient = stubs.getContainerClient;
  });

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  describe("create", () => {
    it("should return an instance of AzureStorageImpl", async () => {
      const res = await AzureStorageImpl.create(storageConfig);
      expect(res).instanceOf(AzureStorageImpl);
    });
  });

  describe("get baseUrl", () => {
    it("should return the base url including container", () => {
      const sut = new AzureStorageImpl(storageConfig);
      expect(sut.baseUrl).equal(`${accountUrl}/${container}`);
    });
  });

  describe("getFilePathUrl", () => {
    it("should return the correct url [without reads sas token]", () => {
      const sut = new AzureStorageImpl(storageConfig);
      const p = "foo/file";
      expect(sut.getFilePathUrl(p)).equal(`${accountUrl}/${container}/${p}`);
    });

    it("should return the correct url [with reads sas token]", () => {
      const sasTokenReads = "?dummyToken";
      const sut = new AzureStorageImpl({ ...storageConfig, sasTokenReads });
      const p = "foo/file";
      expect(sut.getFilePathUrl(p)).equal(
        `${accountUrl}/${container}/${p}${sasTokenReads}`,
      );
    });
  });

  describe("store", () => {
    it("should create a BlockBlobClient instance for the target path", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      await sut.store("foo", 3, targetPath);
      sinon.assert.calledOnceWithExactly(stubs.getBlockBlobClient, targetPath);
    });

    it("should upload the content", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      await sut.store("foo", 3, targetPath);
      sinon.assert.calledOnceWithExactly(stubs.upload, "foo", 3);
    });

    it("should throw if it fails to upload content", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      stubs.upload.rejects();
      await rejects(sut.store("foo", 3, targetPath));
    });
  });

  describe("storeFile", () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    const tmpFilePath = path.join(tmpDir, "tmpfile");
    fs.writeFileSync(tmpFilePath, "foo", { encoding: "utf8" });

    it("should create a BlockBlobClient instance for the target path", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      await sut.storeFile(tmpFilePath, targetPath);
      sinon.assert.calledOnceWithExactly(stubs.getBlockBlobClient, targetPath);
    });

    it("should upload the file [without content type]", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      await sut.storeFile(tmpFilePath, targetPath);
      sinon.assert.calledOnceWithExactly(stubs.uploadFile, tmpFilePath, {
        blobHTTPHeaders: {
          blobContentType: undefined,
        },
      });
    });

    it("should upload the file [with content type]", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      await sut.storeFile(tmpFilePath, targetPath, {
        contentType: "image/png",
      });
      sinon.assert.calledOnceWithExactly(stubs.uploadFile, tmpFilePath, {
        blobHTTPHeaders: {
          blobContentType: "image/png",
        },
      });
    });

    it("should throw if it fails to upload content", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      stubs.uploadFile.rejects();
      await rejects(sut.storeFile(tmpFilePath, targetPath));
    });
  });

  describe("hasFile", () => {
    it("should return true if the file exists", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      stubs.exists.resolves(true);
      const result = await sut.hasFile(targetPath);
      expect(result).true;
    });

    it("should return false if the file does not exists", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      stubs.exists.resolves(false);
      const result = await sut.hasFile(targetPath);
      expect(result).false;
    });
  });

  describe("downloadFile", () => {
    it("should return the download file as a Buffer", async () => {
      const targetPath = "/target/file";
      const sut = new AzureStorageImpl(storageConfig, {
        blobServiceClient: stubs.blobServiceClient,
      });
      stubs.downloadToBuffer.resolves(Buffer.from("foo", "utf8"));
      const result = await sut.downloadFile(targetPath);
      expect(result.toString()).equals("foo");
    });
  });
});
