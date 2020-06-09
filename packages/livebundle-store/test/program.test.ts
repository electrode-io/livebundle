import { expect } from "chai";
import fs from "fs-extra";
import "mocha";
import path from "path";
import sinon from "sinon";
import * as LiveBundleStore from "../src/LiveBundleStore";
import program from "../src/program";

describe("cli", () => {
  it("should return package version", () => {
    const packageVersion = fs.readJSONSync(
      path.resolve(__dirname, "../package.json"),
    ).version;
    const sut = program().exitOverride();
    expect(() => sut.parse(["node", "livebundle-store", "--version"])).to.throw(
      packageVersion,
    );
  });

  it("should start the QRCodeServer", (done) => {
    const s = sinon.stub(LiveBundleStore, "LiveBundleStore").callsFake(() => {
      return {
        start: () => {
          s.restore();
          done();
        },
      };
    });
    const sut = program();
    sut.parse(["node", "livebundle-store"]);
  });
});
