import { expect } from "chai";
import fs from "fs-extra";
import "mocha";
import path from "path";
import sinon from "sinon";
import program from "../src/program";
import * as up from "../src/upload";

describe("program", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("should return package version", () => {
    const packageVersion = fs.readJSONSync(
      path.resolve(__dirname, "../package.json"),
    ).version;
    const sut = program().exitOverride();
    expect(() => sut.parse(["node", "livebundle", "--version"])).to.throw(
      packageVersion,
    );
  });

  it("should go through", async () => {
    const stub = sandbox.stub(up, "upload");
    stub.resolves({
      id: "c1150afc-a9c3-11ea-ae16-6781412c6775",
      bundles: [
        {
          dev: true,
          platform: "android",
          sourceMap: "d7234084-a9c3-11ea-96eb-8b7599b91a40",
          id: "ddfc3672-a9c3-11ea-9994-0b1552c573a2",
        },
      ],
      links: {
        qrcode: "https://qrcode.png",
        metadata: "https://metadata.json",
      },
      timestamp: 1591646945250,
    });
    sandbox.stub(console, "log");
    const sut = program({ op: sandbox.stub() }).exitOverride();
    await sut.parseAsync([
      "node",
      "livebundle",
      "upload",
      "--config",
      "config/sample.yaml",
    ]);
  });
});
