import debug from "debug";
import fs from "fs-extra";
import type { Bundle, Package, PackageCli } from "livebundle-store";
import { createTmpDir } from "livebundle-utils";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import yazl from "yazl";
import { LiveBundleCli } from "./LiveBundleCli";
import { CliBundle, ReactNativeAsset } from "./types";

export class LiveBundleSdk {
  public readonly sdk: LiveBundleCli;

  private readonly log = debug("livebundle-sdk:LiveBundleSdk");

  constructor(public readonly host: string) {
    this.sdk = new LiveBundleCli(host);
  }

  public async uploadPackage({
    bundles,
  }: {
    bundles: CliBundle[];
  }): Promise<Package> {
    const pkg: PackageCli = {
      bundles: [],
    };
    const zipfile = new yazl.ZipFile();
    const tmpDir = createTmpDir();
    const tmpZipPath = path.join(tmpDir, "package.zip");
    const s = fs.createWriteStream(tmpZipPath);
    zipfile.outputStream.pipe(s);
    for (const bundle of bundles) {
      const { dev, platform, bundlePath, sourceMapPath } = bundle;
      const bundleMetadata: Bundle = {
        id: uuidv4(),
        dev,
        platform,
        sourceMap: uuidv4(),
      };
      pkg.bundles.push(bundleMetadata);
      zipfile.addFile(bundlePath, bundleMetadata.id);
      zipfile.addFile(sourceMapPath, bundleMetadata.sourceMap);
    }
    const metadataPath = path.join(tmpDir, "metadata.json");
    await fs.writeJSON(path.join(tmpDir, "metadata.json"), pkg);
    zipfile.addFile(metadataPath, path.basename(metadataPath));
    zipfile.end();

    const packageProm = new Promise((resolve) => {
      s.on("close", () => {
        resolve();
      });
    });

    await packageProm;

    const res = await this.sdk.uploadPackage(tmpZipPath);
    return res;
  }

  public async uploadAssets(assets: ReactNativeAsset[]): Promise<void> {
    const newAssets = await this.sdk.assetsDelta(assets.map((a) => a.hash));

    if (newAssets.length > 0) {
      this.log(`Uploading ${newAssets.length} new asset(s)`);

      const zipfile = new yazl.ZipFile();
      const tmpZipPath = path.join(createTmpDir(), "assets.zip");
      const s = fs.createWriteStream(tmpZipPath);
      zipfile.outputStream.pipe(s);
      for (const asset of assets) {
        for (const file of asset.files) {
          const hash = asset.hash;
          zipfile.addFile(file, path.join(hash, path.basename(file)));
        }
      }
      zipfile.end();

      const assetsProm = new Promise((resolve) => {
        s.on("close", () => {
          resolve();
        });
      });

      await assetsProm;
      await this.sdk.uploadAssets(tmpZipPath);
    } else {
      this.log("No new assets !");
    }
  }
}
