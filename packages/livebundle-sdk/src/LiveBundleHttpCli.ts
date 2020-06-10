import FormData from "form-data";
import * as fs from "fs";
import got, { Got } from "got";
import type { Package } from "livebundle-store";

export class LiveBundleHttpCli {
  private readonly cli: Got;

  constructor(
    private readonly storeUrl: string,
    { accessKey }: { accessKey?: string } = {},
  ) {
    this.cli = got.extend(
      accessKey ? { headers: { "LB-Access-Key": accessKey } } : {},
    );
  }

  public async uploadPackage(zipPath: string): Promise<Package> {
    try {
      const packageRs = fs.createReadStream(zipPath);
      const form = new FormData();
      form.append("package", packageRs);
      const res = await this.cli.post(`${this.storeUrl}/packages`, {
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
      await this.cli.post(`${this.storeUrl}/assets`, {
        body: form,
      });
    } catch (err) {
      throw new Error(err.response?.text ?? err.message);
    }
  }

  public async assetsDelta(assets: string[]): Promise<string[]> {
    try {
      const { body } = await this.cli.post<string[]>(
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
