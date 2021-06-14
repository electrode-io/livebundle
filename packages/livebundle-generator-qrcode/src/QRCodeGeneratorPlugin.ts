import { QrCodeGeneratorConfig, QrCodeGeneratorResult } from "./types";
import {
  LiveBundleContentType,
  StoragePlugin,
  GeneratorPlugin,
} from "livebundle-sdk";
import debug from "debug";
import fs from "fs-extra";
import { configSchema } from "./schemas";
import path from "path";
import qrcode from "qrcode";

const log = debug("livebundle-generator-qrcode:QRCodeGeneratorPlugin");

export class QRCodeGeneratorPlugin implements GeneratorPlugin {
  public constructor(
    private readonly config: QrCodeGeneratorConfig,
    private readonly storage: StoragePlugin,
  ) {}

  public static readonly defaultConfig: Record<
    string,
    unknown
  > = require("../config/default.json");

  public static readonly schema: Record<string, unknown> = configSchema;

  public static async create(
    config: QrCodeGeneratorConfig,
    storage: StoragePlugin,
  ): Promise<QRCodeGeneratorPlugin> {
    return new QRCodeGeneratorPlugin(config, storage);
  }

  async generate({
    id,
    type,
  }: {
    id: string;
    type: LiveBundleContentType;
  }): Promise<QrCodeGeneratorResult> {
    log(`generate(id: ${id}, type: ${type})`);

    const pkgId = type === LiveBundleContentType.PACKAGE ? id : `s:${id}`;

    //
    // Generate as local png image file
    await fs.ensureDir(path.dirname(this.config.image.path));
    const localImagePath = path.resolve(this.config.image.path);
    await qrcode.toFile(localImagePath, pkgId, {
      margin: this.config.image.margin,
      width: this.config.image.width,
    });

    //
    // Generate as terminal image (ASCII)
    const terminalImage = await new Promise<string>((resolve) => {
      qrcode.toString(pkgId, { type: "terminal" }, function (err, code) {
        resolve(code);
      });
    });

    //
    // Store in remote storage
    const qrcodePath = `${
      type === LiveBundleContentType.PACKAGE ? "packages" : "sessions"
    }/${id}/qrcode.png`;
    const remoteImagePath = await this.storage.storeFile(
      localImagePath,
      qrcodePath,
      {
        contentType: "image/png",
      },
    );

    return {
      localImagePath,
      remoteImagePath,
      terminalImage,
    };
  }
}
