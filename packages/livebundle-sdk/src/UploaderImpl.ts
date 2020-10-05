import fs from "fs";
import path from "path";
import tmp from "tmp";
import { v4 as uuidv4 } from "uuid";
import yazl from "yazl";
import {
  Bundle,
  LocalBundle,
  Package,
  Storage,
  Uploader,
  ReactNativeAsset,
} from "./types";
import debug from "debug";

const log = debug("livebundle-sdk:UploaderImpl");

export class UploaderImpl implements Uploader {
  constructor(private readonly storage: Storage) {}

  public async upload({
    bundles,
  }: {
    bundles: LocalBundle[];
  }): Promise<Package> {
    log(`upload`);

    const pkg: Package = {
      id: uuidv4(),
      bundles: [],
      timestamp: Date.now(),
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
      await new Promise((resolve) => {
        zippedBundleFile.outputStream
          .pipe(fs.createWriteStream(zippedBundlePath))
          .on("close", () => {
            this.storage.storeFile(
              zippedBundlePath,
              `packages/${pkg.id}/${bundleMetadata.id}`,
            );
            resolve();
          });
      });
      pkg.bundles.push(bundleMetadata);

      const assetsInStorage = await this.getExistingAssetsHashesFromStorage();
      const newAssets = this.getNewAssets(bundle.assets, assetsInStorage);
      await this.uploadAssets(newAssets);
      await this.uploadAssetsMetadata(bundle.assets.map((a) => a.hash));
    }

    const stringifiedMetadata = JSON.stringify(pkg);
    const metadataPath = `packages/${pkg.id}/metadata.json`;
    await this.storage.store(
      stringifiedMetadata,
      stringifiedMetadata.length,
      metadataPath,
    );

    return pkg;
  }

  public async getExistingAssetsHashesFromStorage(): Promise<string[]> {
    const assetsMetadataFile = "assets/metadata.json";
    const hasFile = await this.storage.hasFile(assetsMetadataFile);
    log(`hasFile: ${hasFile}`);
    return (await this.storage.hasFile(assetsMetadataFile))
      ? this.storage
          .downloadFile(assetsMetadataFile)
          .then((f) => JSON.parse(f.toString()))
      : [];
  }

  public getNewAssets(
    assets: ReactNativeAsset[],
    existingAssetsHashes: string[],
  ): ReactNativeAsset[] {
    return assets.filter((a) => !existingAssetsHashes.includes(a.hash));
  }

  public async uploadAssets(assets: ReactNativeAsset[]): Promise<void> {
    log(`uploadAssets(assets: ${JSON.stringify(assets, null, 2)})`);
    for (const asset of assets) {
      for (const file of asset.files) {
        await this.storage.storeFile(
          file,
          `assets/${asset.hash}/${path.basename(file)}`,
        );
      }
    }
  }

  public async uploadAssetsMetadata(metadata: string[]): Promise<string> {
    log(`uploadAssetsMetadata(metadata: ${JSON.stringify(metadata, null, 2)})`);
    const stringified = JSON.stringify(metadata);
    return this.storage.store(
      stringified,
      stringified.length,
      "assets/metadata.json",
    );
  }
}
