import { doesNotReject, rejects } from "assert";
import { expect } from "chai";
import fs from "fs-extra";
import "mocha";
import path from "path";
import sinon from "sinon";
import { JobConsumerImpl } from "../src/JobConsumerImpl";
import program from "../src/program";

describe("program", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
    delete process.env.LIVEBUNDLE_GITHUB_APPIDENTIFIER;
    delete process.env.LIVEBUNDLE_GITHUB_CLIENTID;
    delete process.env.LIVEBUNDLE_GITHUB_CLIENTSECRET;
    delete process.env.LIVEBUNDLE_GITHUB_PRIVATEKEY;
  });

  it("should return package version", () => {
    const packageVersion = fs.readJSONSync(
      path.resolve(__dirname, "../package.json"),
    ).version;
    const sut = program().exitOverride();
    expect(() =>
      sut.parse(["node", "livebundle-github-consumer", "--version"]),
    ).to.throw(packageVersion);
  });

  it("should start the GitHubAppServer", () => {
    sandbox.stub(JobConsumerImpl);
    const sut = program();
    const configPath = path.resolve(__dirname, "../config/sample.yaml");
    sut.parse(["node", "livebundle-github-consumer", "--config", configPath]);
  });

  it("should fail if GitHub app configuration is not set (not in config nor as env vars) ", async () => {
    const sut = program();
    await rejects(sut.parseAsync(["node", "livebundle-github-consumer"]));
  });

  it("should not fail if GitHub app configuration is set (env vars) ", async () => {
    const sut = program();
    process.env.LIVEBUNDLE_GITHUB_APPIDENTIFIER = "65645";
    process.env.LIVEBUNDLE_GITHUB_CLIENTID = "Iv1.04849b1cb72ad0fa";
    process.env.LIVEBUNDLE_GITHUB_CLIENTSECRET =
      "14c640bb4946970807366672ba6bb077c7de7009";
    process.env.LIVEBUNDLE_GITHUB_PRIVATEKEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA3ddwHEVpGM3OXYNY2jro2bDZWzzuNEzwRxl7pgqwG7eWXEGe
-----END RSA PRIVATE KEY-----`;
    await doesNotReject(sut.parseAsync(["node", "livebundle-github-consumer"]));
  });
});
