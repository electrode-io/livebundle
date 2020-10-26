import { expect } from "chai";
import { iteratee } from "lodash";
import { untildifyPath } from "../src";
import os from "os";
import path from "path";

describe("untildifyPath", () => {
  it("should untidlify the supplied tidled path", () => {
    expect(untildifyPath(path.join("~", "foo"))).equals(path.join(os.homedir(), "foo"));
  });

  it("should return the supplied path as-is if it is not a tidled path", () => {
    expect(untildifyPath(path.resolve("/foo/bar"))).equals(path.resolve("/foo/bar"));
  });
});
