import { expect } from "chai";
import "mocha";
import QRCodeGeneratorPlugin, { QrCodeGeneratorConfig } from "../src";
import { v4 as uuidv4 } from "uuid";
import { LiveBundleContentType } from "livebundle-sdk";
import FsStoragePlugin from "livebundle-storage-fs";
import tmp from "tmp";
import path from "path";
import fs from "fs-extra";

describe("QRCodeGeneratorPlugin", () => {
  const generatorConfig = (): QrCodeGeneratorConfig => ({
    image: {
      margin: 1,
      width: 250,
      path: path.join(tmp.dirSync({ unsafeCleanup: true }).name, "qrcode.png"),
    },
  });

  describe("create", () => {
    it("should return an instance of QRCodeGeneratorPlugin", async () => {
      const res = await QRCodeGeneratorPlugin.create(
        generatorConfig(),
        new FsStoragePlugin({}),
      );
      expect(res).instanceOf(QRCodeGeneratorPlugin);
    });
  });

  describe("generate", () => {
    [LiveBundleContentType.PACKAGE, LiveBundleContentType.SESSION].forEach(
      (lbContentType) => {
        it(`should generate a local QR code image [${lbContentType}]`, async () => {
          const storage = new FsStoragePlugin({});
          const sut = new QRCodeGeneratorPlugin(generatorConfig(), storage);
          const res = await sut.generate({
            id: uuidv4(),
            type: lbContentType,
          });
          expect(fs.existsSync(res.localImagePath)).true;
        });

        it(`should generate a terminal friendly image [${lbContentType}]`, async () => {
          const storage = new FsStoragePlugin({});
          const sut = new QRCodeGeneratorPlugin(generatorConfig(), storage);
          const res = await sut.generate({
            id: uuidv4(),
            type: lbContentType,
          });
          expect(res.terminalImage).to.be.a("string").not.empty;
        });

        it(`should store the image to the storage [${lbContentType}]`, async () => {
          const storage = new FsStoragePlugin({});
          const sut = new QRCodeGeneratorPlugin(generatorConfig(), storage);
          const res = await sut.generate({
            id: uuidv4(),
            type: lbContentType,
          });
          expect(fs.existsSync(res.remoteImagePath)).true;
        });
      },
    );
  });
});
