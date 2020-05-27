import fs from "fs-extra";
import readline from "readline";
import { ReactNativeAsset } from "./types";

export async function parseAssetsFile(
  filePath: string,
): Promise<ReactNativeAsset[]> {
  return new Promise((resolve) => {
    const res: ReactNativeAsset[] = [];
    readline
      .createInterface({
        input: fs.createReadStream(filePath),
      })
      .on("line", (line: string) => {
        res.push(JSON.parse(line));
      })
      .on("close", () => {
        resolve(res);
      });
  });
}
