import { ReactNativeAsset } from "livebundle-sdk";
import fs from "fs-extra";
import path from "path";
import { BundleAssetsResolver } from "./types";

type MatchedAsset = {
  httpServerLocation: string;
  hash: string;
  scales: string;
  fileLocation: string;
  name: string;
  type: string;
};

export class BundleAssetsResolverImpl implements BundleAssetsResolver {
  public readonly re = /registerAsset\({[\s]*"?__packager_asset"?:( true|!0),[\s]*"?httpServerLocation"?:\s?"(?<httpServerLocation>[^"]+)",(\s|.)+?scales"?:\s?\[(?<scales>[^\]]+)],[\s]*"?hash"?:\s?"(?<hash>[^"]+)",[\s]*"?name"?:\s?"(?<name>[^"]+)",[\s]*"?type"?:\s?"(?<type>[^"]+)"[\s]*\}\)/gm;
  public readonly ngre = new RegExp(this.re, "m");

  public async resolveAssets(
    bundlePath: string,
    { cwd = process.cwd() }: { cwd?: string } = {},
  ): Promise<ReactNativeAsset[]> {
    const registerAssetStatements = await this.findRegisterAssetStatements(
      bundlePath,
    );
    return this.mapRegisterAssetStatements(registerAssetStatements, {
      cwd,
    });
  }

  public mapRegisterAssetStatements(
    registerAssetStatements: string[],
    { cwd = process.cwd() }: { cwd?: string } = {},
  ): ReactNativeAsset[] {
    if (!fs.pathExistsSync(cwd)) {
      throw new Error(`cwd path does not exist: ${cwd}`);
    }
    return registerAssetStatements
      .filter((x) => this.ngre.test(x))
      .map((x) => x.match(this.ngre)?.groups)
      .map((x: MatchedAsset) => ({
        ...x,
        fileLocation: path.resolve(cwd, x.httpServerLocation.substring(8)),
      }))
      .map((x: MatchedAsset) => ({
        hash: x.hash,
        files: x.scales
          .split(",")
          .map((scale) =>
            path.join(
              x.fileLocation,
              `${x.name}${scale === "1" ? "" : `@${scale}x`}.${x.type}`,
            ),
          ),
      }));
  }

  public async findRegisterAssetStatements(
    bundlePath: string,
  ): Promise<string[]> {
    if (!fs.pathExistsSync(bundlePath)) {
      throw new Error(`bundlePath does not exist: ${bundlePath}`);
    }
    const bundle = await fs.readFile(bundlePath, { encoding: "utf8" });
    const result = bundle.match(this.re);
    return result ?? [];
  }
}
