import { expect } from "chai";
import fs from "fs-extra";
import "mocha";
import path from "path";
import sinon from "sinon";
import program from "../src/program";
import { LiveBundleConfig, LiveBundle } from "livebundle-sdk";
import tmp from "tmp";
import { resolveConfigPath } from "../src";

describe("resolveConfigPath", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  [
    path.resolve("livebundle.yml"),
    path.resolve("livebundle.yaml"),
    "/etc/livebundle/livebundle.yml",
    "/etc/livebundle/livebundle.yaml",
    `${process.env.HOME}/livebundle.yml`,
    `${process.env.HOME}/livebundle.yaml`,
  ].forEach((p) =>
    it(`should try each config path and return it if it exist [${p}]`, () => {
      sandbox.stub(fs, "pathExistsSync").withArgs(p).returns(true);
      const res = resolveConfigPath();
      expect(res).equals(p);
    }),
  );

  it("should return undefined if no config path was found", () => {
    sandbox.stub(fs, "pathExistsSync").returns(false);
    const res = resolveConfigPath();
    expect(res).undefined;
  });
});
