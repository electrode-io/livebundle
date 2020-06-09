import { expect } from "chai";
import "mocha";
import sinon from "sinon";

describe("index", () => {
  it("should not fail importing cli", () => {
    const argv = process.argv;
    process.argv = ["node", "livebundle-github", "--help"];
    const exit = process.exit;
    sinon.stub(process, "exit").callsFake(() => {
      throw new Error("test");
    });
    expect(() => {
      require("../src/cli");
    }).to.throw("test");
    process.argv = argv;
    process.exit = exit;
  });
});
