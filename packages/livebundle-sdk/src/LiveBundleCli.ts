import FormData from "form-data";
import * as fs from "fs";
import got from "got";
import { Package } from "livebundle-store";

export class LiveBundleCli {
  constructor(public readonly storeUrl: string) {}

  public async uploadPackage(zipPath: string): Promise<Package> {
    try {
      const packageRs = fs.createReadStream(zipPath);
      const form = new FormData();
      form.append("package", packageRs);
      const res = await got.post(`${this.storeUrl}/packages`, {
        body: form,
      });
      return JSON.parse(res.body);
    } catch (err) {
      throw new Error(err.response?.text ?? err.message);
    }
  }

  public async uploadAssets(zipPath: string): Promise<void> {
    try {
      const zippedAssetsFileRs = fs.createReadStream(zipPath);
      const form = new FormData();
      form.append("assets", zippedAssetsFileRs);
      await got.post(`${this.storeUrl}/assets`, {
        body: form,
      });
    } catch (err) {
      throw new Error(err.response?.text ?? err.message);
    }
  }

  public async assetsDelta(assets: string[]): Promise<string[]> {
    try {
      const { body } = await got.post<string[]>(
        `${this.storeUrl}/assets/delta`,
        {
          json: { assets },
          responseType: "json",
        },
      );
      return body;
    } catch (err) {
      throw new Error(err.response?.text ?? err.message);
    }
  }
}
