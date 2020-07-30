import { expect } from "chai";
import fs from "fs-extra";
import "mocha";
import path from "path";
import sinon from "sinon";
import * as GitHubAppServer from "../src/GitHubAppServer";
import { JobProducerImpl } from "../src/JobProducerImpl";
import program from "../src/program";
import { Job } from "../src/types";

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
    expect(() =>
      sut.parse(["node", "livebundle-github-producer", "--version"]),
    ).to.throw(packageVersion);
  });

  it("should start the GitHubAppServer", (done) => {
    sandbox
      .stub(JobProducerImpl, "init")
      .resolves({ queue: (job: Job) => Promise.resolve() });
    const s = sandbox.stub(GitHubAppServer, "GitHubAppServer").callsFake(() => {
      return {
        start: () => {
          s.restore();
          done();
        },
      };
    });
    const sut = program();
    const configPath = path.resolve(__dirname, "../config/sample.yaml");
    sut.parse(["node", "livebundle-github-producer", "--config", configPath]);
  });
});
