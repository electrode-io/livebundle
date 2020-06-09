import { Octokit } from "@octokit/rest";
import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import { GitHubApiImpl, OctokitFactory } from "../src";
import { ExecCmd, JWTIssuer } from "../src/types";

class OctokitFactoryStubImpl implements OctokitFactory {
  constructor(private readonly spy: sinon.SinonSpy) {}
  create(installationId: number): Promise<Octokit> {
    return Promise.resolve(({
      issues: { createComment: this.spy },
    } as unknown) as Octokit);
  }
}

class ExecCmdNullImpl implements ExecCmd {
  exec(...cmds: string[]): void {
    return;
  }
}

class JWTIssuerNullImpl implements JWTIssuer {
  public createJWT(installationId: number): Promise<string> {
    return Promise.resolve("jwt");
  }
}

describe("GitHubApiImplTest", () => {
  describe("createComment", () => {
    it("should call octokit.issues.createComment", async () => {
      const spy = sinon.spy();
      const factory = new OctokitFactoryStubImpl(spy);
      const gh = new GitHubApiImpl(
        new JWTIssuerNullImpl(),
        factory,
        new ExecCmdNullImpl(),
      );
      await gh.createComment({
        installationId: 1234,
        owner: "foo",
        repo: "bar",
        issueNumber: 1234,
        comment: "est",
      });
      expect(spy.calledOnce).true;
    });
  });

  describe("cloneRepoAndCheckoutPr", () => {
    it("should exec the correct commands", async () => {
      const stub = sinon.createStubInstance(ExecCmdNullImpl);
      const gh = new GitHubApiImpl(
        new JWTIssuerNullImpl(),
        new OctokitFactoryStubImpl(sinon.stub()),
        stub,
      );
      await gh.cloneRepoAndCheckoutPr({
        installationId: 1234,
        owner: "foo",
        repo: "bar",
        prNumber: 4567,
      });
      expect(
        stub.exec.calledOnceWith(
          `git clone https://x-access-token:jwt@github.com/foo/bar.git .`,
          `git fetch origin pull/4567/head`,
          "git checkout FETCH_HEAD",
        ),
      ).true;
    });
  });
});
