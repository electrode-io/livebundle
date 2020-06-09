import { expect } from "chai";
import { QRCodeUrlBuilderImpl } from "../src";

describe("QRCodeUrlBuilderImpl", () => {
  describe("buildUrl", () => {
    it("should return the correct url", () => {
      const config = { margin: 1, width: 250, url: "http://localhost:1234" };
      const sut = new QRCodeUrlBuilderImpl(config);
      const res = sut.buildUrl("qrCodeContent");
      expect(res).eql("http://localhost:1234/qrCodeContent?margin=1&width=250");
    });
  });
});
