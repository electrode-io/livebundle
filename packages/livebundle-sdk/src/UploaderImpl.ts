import fs from "fs";
import path from "path";
import qrcode from "qrcode";
import tmp from "tmp";
import { v4 as uuidv4 } from "uuid";
import yazl from "yazl";
import {
  Bundle,
  LocalBundle,
  Package,
  ReactNativeAsset,
  Storage,
  Uploader,
} from "./types";

export class UploaderImpl implements Uploader {
  constructor(private readonly storage: Storage) {}

  public getAssetsTemplateLiteral(): string {
    return `\`${this.storage.baseUrl}/assets/\${hash}/\${name}.\${type}\``;
  }

  public async uploadPackage({
    bundles,
  }: {
    bundles: LocalBundle[];
  }): Promise<Package> {
    const pkg: Package = {
      id: uuidv4(),
      bundles: [],
      timestamp: Date.now(),
      links: {
        metadata: "",
        qrcode: "",
      },
    };

    const tmpZippedBundlesDir = tmp.dirSync({ unsafeCleanup: true }).name;
    for (const bundle of bundles) {
      const { dev, platform, bundlePath } = bundle;
      const bundleMetadata: Bundle = {
        id: uuidv4(),
        dev,
        platform,
        sourceMap: uuidv4(),
      };

      const zippedBundlePath = path.join(
        tmpZippedBundlesDir,
        bundleMetadata.id,
      );
      const zippedBundleFile = new yazl.ZipFile();
      zippedBundleFile.addFile(bundlePath, bundleMetadata.id);
      zippedBundleFile.end();
      zippedBundleFile.outputStream
        .pipe(fs.createWriteStream(zippedBundlePath))
        .on("close", () => {
          this.storage.storeFile(
            zippedBundlePath,
            `packages/${pkg.id}/${bundleMetadata.id}`,
          );
        });

      pkg.bundles.push(bundleMetadata);
    }

    const stringifiedMetadata = JSON.stringify(pkg);
    const metadataPath = `packages/${pkg.id}/metadata.json`;
    await this.storage.store(
      stringifiedMetadata,
      stringifiedMetadata.length,
      metadataPath,
    );
    pkg.links.metadata = `${this.storage.baseUrl}/${metadataPath}`;

    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    const qrCodeFile = path.join(tmpDir, "qrcode.png");
    await qrcode.toFile(qrCodeFile, pkg.id, { width: 200 });
    const qrcodePath = `packages/${pkg.id}/qrcode.png`;
    await this.storage.storeFile(qrCodeFile, qrcodePath, {
      contentType: "image/png",
    });
    pkg.links.qrcode = `${this.storage.baseUrl}/${qrcodePath}`;

    return pkg;
  }

  public async uploadAssets(assets: ReactNativeAsset[]): Promise<void> {
    for (const asset of assets) {
      for (const file of asset.files) {
        await this.storage.storeFile(
          file,
          `assets/${asset.hash}/${path.basename(file)}`,
        );
      }
    }
  }
}
