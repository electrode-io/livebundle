import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { parseAssetsFile } from "../src/parseAssetsFile";

describe("parseAssetsFile", () => {
  it("should return the parsed file", async () => {
    const res = await parseAssetsFile(
      path.join(__dirname, "fixtures/assets.json.multiline"),
    );
    const expected = fs.readJSONSync(
      path.join(__dirname, "fixtures/assets.json"),
    );
    expect(res).deep.equal(expected);
  });
});
