import "mocha";
import ViewerNotifierPlugin from "../src";
import { v4 as uuidv4 } from "uuid";
import { LiveBundleContentType } from "livebundle-sdk";
import sinon from "sinon";
import { expect } from "chai";

describe("ViewerNotifierPlugin", () => {
  describe("create", () => {
    it("should return an instance of ViewerNotifierPlugin", async () => {
      const res = await ViewerNotifierPlugin.create();
      expect(res).instanceOf(ViewerNotifierPlugin);
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
      // @ts-ignore
      const sut = new ViewerNotifierPlugin(openStub);
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
      // @ts-ignore
      const sut = new ViewerNotifierPlugin(openStub);
      await sut.notify(notifyPayload);
    });
  });
});
