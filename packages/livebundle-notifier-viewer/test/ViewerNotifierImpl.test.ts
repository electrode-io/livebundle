import "mocha";
import ViewerNotifierImpl from "../src";
import { v4 as uuidv4 } from "uuid";
import { LiveBundleContentType } from "livebundle-sdk";
import sinon from "sinon";
import { expect } from "chai";

describe("ViewerNotifierImpl", () => {
  describe("create", () => {
    it("should return an instance of ViewerNotifierImpl", async () => {
      const res = await ViewerNotifierImpl.create();
      expect(res).instanceOf(ViewerNotifierImpl);
    });
  });

  describe("notify", () => {
    it("should open the local QRCode image", async () => {
      const notifyPayload = {
        generators: { qrcode: { localImagePath: "/fake/path" } },
        pkg: { id: uuidv4(), bundles: [], timestamp: Date.now() },
        type: LiveBundleContentType.PACKAGE,
      };
      const openStub = sinon.stub();
      const sut = new ViewerNotifierImpl(openStub);
      await sut.notify(notifyPayload);
      sinon.assert.calledOnceWithExactly(
        openStub,
        notifyPayload.generators.qrcode.localImagePath,
      );
    });

    it("should not fail if no QRCode generator was used", async () => {
      const notifyPayload = {
        generators: {},
        pkg: { id: uuidv4(), bundles: [], timestamp: Date.now() },
        type: LiveBundleContentType.PACKAGE,
      };
      const openStub = sinon.stub();
      const sut = new ViewerNotifierImpl(openStub);
      await sut.notify(notifyPayload);
    });
  });
});
