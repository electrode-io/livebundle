import { expect } from "chai";
import "mocha";
import path from "path";
import sinon from "sinon";
import { loadConfig } from "../src/loadConfig";
import { Config } from "./fixtures/config.type";

describe("loadConfig", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  const fixturesPath = path.join(__dirname, "fixtures");
  const fixtureConfigPath = path.join(fixturesPath, "config.yaml");
  const confA = { foo: { a: 2, b: "yo", c: ["x", "y", "z"] } };
  const confB = { foo: { a: 3, b: "ya", c: ["z", "y", "x"] } };

  it("should return expected config [config and defaultConfig]", async () => {
    const res = await loadConfig<Config>({
      defaultConfig: confA,
      config: confB,
    });
    expect(res).deep.equal(confB);
  });
});
