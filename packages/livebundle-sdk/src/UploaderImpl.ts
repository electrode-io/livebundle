import fs from "fs";
import path from "path";
import tmp from "tmp";
import { v4 as uuidv4 } from "uuid";
import yazl from "yazl";
import { Bundle, LocalBundle, Package, Storage, Uploader } from "./types";

export class UploaderImpl implements Uploader {
  constructor(private readonly storage: Storage) {}

  public async upload({
    bundles,
  }: {
    bundles: LocalBundle[];
  }): Promise<Package> {
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

      for (const asset of bundle.assets) {
        for (const file of asset.files) {
          await this.storage.storeFile(
            file,
            `assets/${asset.hash}/${path.basename(file)}`,
          );
        }
      }
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
}
