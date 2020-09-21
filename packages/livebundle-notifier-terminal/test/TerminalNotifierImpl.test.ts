import "mocha";
import TerminalNotifierImpl from "../src";
import sinon from "sinon";
import { v4 as uuidv4 } from "uuid";
import { LiveBundleContentType } from "livebundle-sdk/src";
import { expect } from "chai";

describe("TerminalNotifierImpl", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("create", () => {
    it("should return an instance of TerminalNotifierImpl", async () => {
      const res = await TerminalNotifierImpl.create();
      expect(res).instanceOf(TerminalNotifierImpl);
    });
  });

  describe("notify", () => {
    it("should log the QRCode if qrcode generator was used", async () => {
      const consoleStub = sandbox.stub(console);
      const sut = new TerminalNotifierImpl(consoleStub);
      const notifyPayload = {
        generators: { qrcode: { terminalImage: "fake-ascii-qrcode" } },
        pkg: { id: uuidv4(), bundles: [], timestamp: Date.now() },
        type: LiveBundleContentType.PACKAGE,
      };
      await sut.notify(notifyPayload);
      sinon.assert.calledOnceWithExactly(
        consoleStub.log,
        sinon.match(notifyPayload.generators.qrcode.terminalImage),
      );
    });

    it("should log the deep link if deeplink generator was used", async () => {
      const consoleStub = sandbox.stub(console);
      const sut = new TerminalNotifierImpl(consoleStub);
      const notifyPayload = {
        generators: { deeplink: { deepLinkUrl: "livebundle://fakeurl" } },
        pkg: { id: uuidv4(), bundles: [], timestamp: Date.now() },
        type: LiveBundleContentType.PACKAGE,
      };
      await sut.notify(notifyPayload);
      sinon.assert.calledOnceWithExactly(
        consoleStub.log,
        sinon.match(notifyPayload.generators.deeplink.deepLinkUrl),
      );
    });
  });
});
