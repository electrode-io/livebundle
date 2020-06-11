import { doesNotReject, rejects } from "assert";
import { expect } from "chai";
import "mocha";
import nock from "nock";
import path from "path";
import { LiveBundleHttpCli } from "../src";

describe("LiveBundleHttpCli", () => {
  const url = "http://livebundle-store";
  const fixturesPath = path.join(__dirname, "fixtures");

  afterEach(() => {
    nock.cleanAll();
  });

  describe("uploadPackage", () => {
    const pkg = {
      id: "91b4e994-a5f4-11ea-bc6a-cbdbd91887aa",
      bundles: [
        {
          id: "adc74460-a5f4-11ea-a82a-d76c0b568838",
          dev: true,
          platform: "android",
          sourceMap: "ba2f6570-a5f4-11ea-b084-ab85345da8df",
        },
      ],
      timestamp: 1591228064,
    };

    it("should return server response", async () => {
      nock(url).post("/packages").reply(200, pkg);
      const sut = new LiveBundleHttpCli(url);
      const assetsZipPath = path.join(fixturesPath, "package.zip");
      const res = await sut.uploadPackage(assetsZipPath);
      expect(res).deep.equal(pkg);
    });

    it("should throw if request fails", async () => {
      nock(url).post("/packages").replyWithError("fail");
      const sut = new LiveBundleHttpCli(url);
      const assetsZipPath = path.join(fixturesPath, "package.zip");
      await rejects(sut.uploadPackage(assetsZipPath), (err) => {
        expect(err.message).eql("fail");
        return true;
      });
    });

    it("should not set the LB-Access-Key header if no access key is set", async () => {
      nock(url, { badheaders: ["LB-Access-Key"] })
        .post("/packages")
        .reply(200, pkg);
      const sut = new LiveBundleHttpCli(url);
      const assetsZipPath = path.join(fixturesPath, "package.zip");
      const res = await sut.uploadPackage(assetsZipPath);
      expect(res).deep.equal(pkg);
    });

    it("should set the LB-Access-Key header if an access key is set", async () => {
      nock(url)
        .post("/packages")
        .matchHeader("LB-Access-Key", "test-access-key")
        .reply(200, pkg);
      const sut = new LiveBundleHttpCli(url, { accessKey: "test-access-key" });
      const assetsZipPath = path.join(fixturesPath, "package.zip");
      const res = await sut.uploadPackage(assetsZipPath);
      expect(res).deep.equal(pkg);
    });
  });

  describe("uploadAssets", () => {
    it("should not throw", async () => {
      nock(url).post("/assets").reply(200);
      const sut = new LiveBundleHttpCli(url);
      const assetsZipPath = path.join(fixturesPath, "assets.zip");
      await doesNotReject(sut.uploadAssets(assetsZipPath));
    });

    it("should throw if request fails", async () => {
      nock(url).post("/assets").replyWithError("fail");
      const sut = new LiveBundleHttpCli(url);
      const assetsZipPath = path.join(fixturesPath, "assets.zip");
      await rejects(sut.uploadAssets(assetsZipPath), (err) => {
        expect(err.message).eql("fail");
        return true;
      });
    });

    it("should not set the LB-Access-Key header if no access key is set", async () => {
      nock(url, { badheaders: ["LB-Access-Key"] })
        .post("/assets")
        .reply(200);
      const sut = new LiveBundleHttpCli(url);
      const assetsZipPath = path.join(fixturesPath, "assets.zip");
      await doesNotReject(sut.uploadAssets(assetsZipPath));
    });

    it("should set the LB-Access-Key header if an access key is set", async () => {
      nock(url)
        .post("/assets")
        .matchHeader("LB-Access-Key", "test-access-key")
        .reply(200);
      const sut = new LiveBundleHttpCli(url, { accessKey: "test-access-key" });
      const assetsZipPath = path.join(fixturesPath, "assets.zip");
      await doesNotReject(sut.uploadAssets(assetsZipPath));
    });
  });

  describe("assetsDelta", () => {
    it("should return server response", async () => {
      nock(url).post("/assets/delta").reply(200, ["a"]);
      const sut = new LiveBundleHttpCli(url);
      const res = await sut.assetsDelta(["a", "b", "c"]);
      expect(res).deep.equal(["a"]);
    });

    it("should throw if request fails", async () => {
      nock(url).post("/assets/delta").replyWithError("fail");
      const sut = new LiveBundleHttpCli(url);
      await rejects(sut.assetsDelta(["a", "b", "c"]), (err) => {
        expect(err.message).eql("fail");
        return true;
      });
    });
  });
});
