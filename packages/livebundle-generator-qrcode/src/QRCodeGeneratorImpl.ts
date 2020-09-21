import debug from "debug";
import { QrCodeGeneratorConfig, QrCodeGeneratorResult } from "./types";
import { LiveBundleContentType, Storage, Generator } from "livebundle-sdk";
import { configSchema } from "./schemas";
import path from "path";
import qrcode from "qrcode";

const log = debug("livebundle-generator-qrcode:QRCodeGeneratorImpl");

export class QRCodeGeneratorImpl implements Generator {
  public constructor(
    private readonly config: QrCodeGeneratorConfig,
    private readonly storage: Storage,
  ) {}

  public static readonly defaultConfig: Record<
    string,
    unknown
  > = require("../config/default.json");

  public static readonly schema: Record<string, unknown> = configSchema;

  public static async create(
    config: QrCodeGeneratorConfig,
    storage: Storage,
  ): Promise<QRCodeGeneratorImpl> {
    return new QRCodeGeneratorImpl(config, storage);
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
    const localImagePath = path.resolve(this.config.image.path);
    qrcode.toFile(localImagePath, pkgId, {
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
    await this.storage.storeFile(localImagePath, qrcodePath, {
      contentType: "image/png",
    });
    const remoteImagePath = `${this.storage.baseUrl}/${qrcodePath}`;

    return {
      localImagePath,
      remoteImagePath,
      terminalImage,
    };
  }
}
