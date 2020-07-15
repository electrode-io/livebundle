import { expect } from "chai";
import fs from "fs-extra";
import "mocha";
import path from "path";
import program from "../src/program";

describe("program", () => {
  it("should return package version", () => {
    const packageVersion = fs.readJSONSync(
      path.resolve(__dirname, "../package.json"),
    ).version;
    const sut = program().exitOverride();
    expect(() =>
      sut.parse(["node", "livebundle-github-consumer", "--version"]),
    ).to.throw(packageVersion);
  });
});
