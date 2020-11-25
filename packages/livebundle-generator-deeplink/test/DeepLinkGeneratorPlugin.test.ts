import { expect } from "chai";
import "mocha";
import DeepLinkGeneratorPlugin from "../src";
import { v4 as uuidv4 } from "uuid";
import { LiveBundleContentType } from "livebundle-sdk";

describe("DeepLinkGeneratorPlugin", () => {
  describe("create", () => {
    it("should return an instance of DeepLinkGeneratorPlugin", async () => {
      const res = await DeepLinkGeneratorPlugin.create({host: "io.livebundle"});
      expect(res).instanceOf(DeepLinkGeneratorPlugin);
    });
  });

  describe("generate", () => {
    it("should generate a LiveBundle package DeepLink", async () => {
      const sut = new DeepLinkGeneratorPlugin({host: "io.livebundle"});
      const id = uuidv4();
      const result = await sut.generate({
        id,
        type: LiveBundleContentType.PACKAGE,
      });
      expect(result.deepLinkUrl).eql(`livebundle://io.livebundle/packages?id=${id}`);
    });

    it("should generate a LiveBundle session DeepLink", async () => {
      const sut = new DeepLinkGeneratorPlugin({host: "io.livebundle"});
      const id = uuidv4();
      const result = await sut.generate({
        id,
        type: LiveBundleContentType.SESSION,
      });
      expect(result.deepLinkUrl).eql(`livebundle://io.livebundle/sessions?id=${id}`);
    });
  });
});
