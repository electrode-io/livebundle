import "mocha";
import { Client } from "minio";
import MinIOStoragePlugin, { MinIOStorageConfig } from "../src";
import { expect } from "chai";
import sinon from "sinon";
import { rejects } from "assert";
import tmp from "tmp";
import fs from "fs-extra";
import path from "path";
import { PassThrough } from "stream";

class MockStream {
  private readonly events: any = {};
  constructor() {
    this.events = {};
  }
  on(event: string, func: () => {}) {
    this.events[event] = func;
    return this;
  }
  pipe(file: any) {
    return this;
  }
  emit(event: string, err?: Error) {
    this.events[event](err);
  }
}

describe("MinIOStorageConfig", () => {
  const endPoint = "foo";
  const port = 9000;
  const bucketName = "bucket";
  const useSSL = false;
  const accessKey = "foo";
  const secretKey = "bar";

  // specifically for the download / getObject
  const downloadStream = new MockStream();

  const sandbox = sinon.createSandbox();
  const stubs = {
    mio: sinon.stub(Client) as any,
    putObject: sandbox.stub(),
    statObject: sandbox.stub(),
    getObject: sandbox.stub(),
    promise: sandbox.stub(),
    promiseWithBody: sandbox.stub(),
    buffer: sandbox.stub().resolves(Buffer.from("", "utf8")),
  };

  const storageConfig: MinIOStorageConfig = {
    endPoint,
    port,
    useSSL,
    accessKey,
    secretKey,
    bucketName,
  };

  beforeEach(() => {
    stubs.promiseWithBody.returns({
      Body: stubs.buffer,
    });
    stubs.putObject.returns({
      promise: stubs.promise,
    });
    stubs.getObject.returns(downloadStream);
    stubs.statObject.returns({
      promise: stubs.promise,
    });
    stubs.mio.putObject = stubs.putObject;
    stubs.mio.statObject = stubs.statObject;
    stubs.mio.getObject = stubs.getObject;
  });

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  describe("create", () => {
    it("should return an instance of MinIOStorageConfig", async () => {
      const res = await MinIOStoragePlugin.create(storageConfig);
      expect(res).instanceOf(MinIOStoragePlugin);
    });
  });

  describe("get baseUrl", () => {
    it("should return the base url including container", () => {
      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
      });
      const prefix = useSSL ? "https://" : "http://";
      expect(sut.baseUrl).equal(`${prefix}${endPoint}`);
    });
  });

  describe("store", () => {
    it("should upload the content", async () => {
      const targetPath = "/target/file1";
      const content = "foo";
      const contentLength = 3;
      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
      });
      await sut.store(content, contentLength, targetPath);
      sinon.assert.calledOnceWithExactly(
        stubs.mio.putObject,
        bucketName,
        targetPath,
        Buffer.from(content),
        contentLength,
      );
    });

    it("should throw if it fails to upload content", async () => {
      const targetPath = "/target/file2";
      const content = "foo";
      const contentLength = 3;
      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
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

    it("should upload the file", async () => {
      const targetPath = "/target/file3";
      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
      });
      await sut.storeFile(tmpFilePath, targetPath);
      sinon.assert.calledOnceWithExactly(
        stubs.putObject,
        bucketName,
        targetPath,
        fileData,
      );
    });

    it("should throw if it fails to upload content", async () => {
      const targetPath = "/target/file5";
      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
      });
      stubs.putObject.rejects();
      await rejects(sut.storeFile(tmpFilePath, targetPath));
    });
  });

  describe("hasFile", () => {
    it("should return true if the file exists", async () => {
      const targetPath = "/target/file6";
      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
      });
      await sut.hasFile(targetPath);
      sinon.assert.calledOnceWithExactly(
        stubs.statObject,
        bucketName,
        targetPath,
      );
    });

    it("should return false if the file does not exists", async () => {
      const targetPath = "/target/file7";
      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
      });
      const result = await sut.hasFile(targetPath);
      expect(result).false;
    });

    it("should return false if it fails to check file", async () => {
      const targetPath = "/target/file8";
      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
      });
      stubs.statObject.rejects();
      const result = await sut.hasFile(targetPath);
      expect(result).false;
    });
  });

  describe("downloadFile", () => {
    it("should return the download file as a Buffer", async () => {
      const targetPath = "/target/file9";

      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
      });

      setTimeout(() => {
        downloadStream.emit("end");
        // force delay
      }, 1200);

      await sut.downloadFile(targetPath);

      sinon.assert.calledOnceWithExactly(
        stubs.getObject,
        bucketName,
        targetPath,
      );
    });

    it("should throw if it fails to download file", async () => {
      const targetPath = "/target/file10";
      const sut = new MinIOStoragePlugin(storageConfig, {
        mio: stubs.mio,
      });
      stubs.getObject.rejects();
      await rejects(sut.downloadFile(targetPath));
    });
  });
});
