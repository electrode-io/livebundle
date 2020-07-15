import { expect } from "chai";
import "mocha";

describe("index", () => {
  it("should not fail importing index", () => {
    expect(() => {
      require("../src/index");
    }).to.not.throw();
  });
});
