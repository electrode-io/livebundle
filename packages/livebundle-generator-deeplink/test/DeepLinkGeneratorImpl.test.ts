import { expect } from "chai";
import "mocha";
import DeepLinkGeneratorImpl from "../src";
import { v4 as uuidv4 } from "uuid";
import { LiveBundleContentType } from "livebundle-sdk";

describe("DeepLinkGeneratorImpl", () => {
  describe("create", () => {
    it("should return an instance of DeepLinkGeneratorImpl", async () => {
      const res = await DeepLinkGeneratorImpl.create();
      expect(res).instanceOf(DeepLinkGeneratorImpl);
    });
  });

  describe("generate", () => {
    it("should generate a LiveBundle package DeepLink", async () => {
      const sut = new DeepLinkGeneratorImpl();
      const id = uuidv4();
      const result = await sut.generate({
        id,
        type: LiveBundleContentType.PACKAGE,
      });
      expect(result.deepLinkUrl).eql(`livebundle://packages?id=${id}`);
    });

    it("should generate a LiveBundle session DeepLink", async () => {
      const sut = new DeepLinkGeneratorImpl();
      const id = uuidv4();
      const result = await sut.generate({
        id,
        type: LiveBundleContentType.SESSION,
      });
      expect(result.deepLinkUrl).eql(`livebundle://sessions?id=${id}`);
    });
  });
});
