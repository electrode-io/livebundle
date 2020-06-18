import { Octokit } from "@octokit/rest";
import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import { GitHubApiImpl, OctokitFactory } from "../src";
import { ExecCmd, JWTIssuer } from "../src/types";

class OctokitFactoryStubImpl implements OctokitFactory {
  public createCommentSpy = sinon.spy();
  public listFilesStub = sinon.stub().resolves({ data: [] });
  create(installationId: number): Promise<Octokit> {
    return Promise.resolve(({
      issues: { createComment: this.createCommentSpy },
      pulls: { listFiles: this.listFilesStub },
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
      const factory = new OctokitFactoryStubImpl();
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
      expect(factory.createCommentSpy.calledOnce).true;
    });
  });

  describe("cloneRepoAndCheckoutPr", () => {
    it("should exec the correct commands", async () => {
      const stub = sinon.createStubInstance(ExecCmdNullImpl);
      const gh = new GitHubApiImpl(
        new JWTIssuerNullImpl(),
        new OctokitFactoryStubImpl(),
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

  describe("getPrChangedFiles", () => {
    it("should call octokit.pulls.listFiles", async () => {
      const factory = new OctokitFactoryStubImpl();
      const gh = new GitHubApiImpl(
        new JWTIssuerNullImpl(),
        factory,
        new ExecCmdNullImpl(),
      );
      await gh.getPrChangedFiles({
        installationId: 1234,
        owner: "foo",
        repo: "bar",
        pull_number: 1,
      });
      expect(factory.listFilesStub.calledOnce).true;
    });

    it("should return changed files names", async () => {
      const factory = new OctokitFactoryStubImpl();
      const changedFiles = ["index.js", "README.md", "foo/bar.txt"];
      const changedFilesPage1 = [changedFiles[0], changedFiles[1]];
      const changedFilesPage2 = [changedFiles[2]];
      factory.listFilesStub = sinon
        .stub()
        .callsFake(
          ({
            owner,
            repo,
            pull_number,
            per_page,
            page,
          }: {
            owner: string;
            repo: string;
            pull_number: number;
            per_page: number;
            page: number;
          }) => {
            if (page === 1) {
              return {
                data: changedFilesPage1.map((f: string) => ({
                  filename: f,
                })),
              };
            } else if (page === 2) {
              return {
                data: changedFilesPage2.map((f: string) => ({
                  filename: f,
                })),
              };
            } else {
              return { data: [] };
            }
          },
        );
      const gh = new GitHubApiImpl(
        new JWTIssuerNullImpl(),
        factory,
        new ExecCmdNullImpl(),
      );
      const res = await gh.getPrChangedFiles({
        installationId: 1234,
        owner: "foo",
        repo: "bar",
        pull_number: 1,
      });
      expect(res).deep.equal(changedFiles);
    });
  });
});
