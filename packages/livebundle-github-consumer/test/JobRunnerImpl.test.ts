import { rejects } from "assert";
import { expect } from "chai";
import fs from "fs-extra";
import {
  BundleTask,
  CliBundle,
  LiveBundleTask,
  TaskRunner,
} from "livebundle-sdk";
import type { Package } from "livebundle-store";
import "mocha";
import path from "path";
import sinon from "sinon";
import { JobRunnerImpl } from "../src";
import { GitHubApi, QRCodeUrlBuilder } from "../src/types";

describe("JobRunnerImpl", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  const testJob = {
    installationId: 123456,
    owner: "foo",
    repo: "bar",
    prNumber: 245645,
  };

  describe("run", () => {
    it("should clone the repository and checkout the pull request", async () => {
      const {
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        taskRunnerStub,
      } = prepareStubs();
      const sut = new JobRunnerImpl(
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        { bundle: [], upload: { url: "http://test" } },
        taskRunnerStub,
        [],
      );

      await sut.run(testJob);
      expect(gitHubApiStub.cloneRepoAndCheckoutPr.calledOnceWith(testJob)).true;
    });

    it("should post a pull request comment to to inform about packaging started", async () => {
      const {
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        taskRunnerStub,
      } = prepareStubs();
      const sut = new JobRunnerImpl(
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        { bundle: [], upload: { url: "http://test" } },
        taskRunnerStub,
        [],
      );

      await sut.run(testJob);
      expect(
        gitHubApiStub.createComment.calledWith({
          installationId: testJob.installationId,
          owner: testJob.owner,
          repo: testJob.repo,
          issueNumber: testJob.prNumber,
          comment: sinon.match(/Packaging your on demand bundles/),
        }),
      ).true;
    });

    it("should post a pull request comment with the qrcode and deeplink", async () => {
      const {
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        taskRunnerStub,
      } = prepareStubs();
      const sut = new JobRunnerImpl(
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        { bundle: [], upload: { url: "http://test" } },
        taskRunnerStub,
        [],
      );

      await sut.run(testJob);
      expect(
        gitHubApiStub.createComment.calledWith({
          installationId: testJob.installationId,
          owner: testJob.owner,
          repo: testJob.repo,
          issueNumber: testJob.prNumber,
          comment: sinon.match(
            (val: string) =>
              val.match(
                /livebundle:\/\/packages\?id=7c17af66-a51f-11ea-9369-03812e4536bc/,
              ) &&
              val.match(/http:\/\/localhost:3000\/content\?margin=1&width=250/),
          ),
        }),
      ).true;
    });

    it("should run the task defined in repository livebundle.yml configuration", async () => {
      const {
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        taskRunnerStub,
      } = prepareStubs({
        cloneRepoAndCheckoutPrStub: sandbox
          .stub<
            [
              {
                installationId: number;
                owner: string;
                repo: string;
                prNumber: number;
              },
            ],
            Promise<void>
          >()
          .callsFake(() => {
            fs.writeFileSync(
              path.resolve(process.cwd(), "livebundle.yaml"),
              `# GitHub task configuration
github:
  task:
    bundle:
      - dev: true
        entry: index-test.js
        platform: ios

    # Store configuration
    upload:
      # LiveBundle store server url
      url: http://localhost:3000`,
            );
            return Promise.resolve();
          }),
      });
      const sut = new JobRunnerImpl(
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        { bundle: [], upload: { url: "http://test" } },
        taskRunnerStub,
        [],
      );
      await sut.run(testJob);
      expect(
        taskRunnerStub.execTask.calledWith(
          {
            bundle: [{ dev: true, entry: "index-test.js", platform: "ios" }],
            upload: { url: "http://localhost:3000" },
          } as LiveBundleTask,
          { cwd: sinon.match.string },
        ),
      );
    });

    it("should throw if cloneRepoAndCheckoutPr fails", async () => {
      const {
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        taskRunnerStub,
      } = prepareStubs({
        cloneRepoAndCheckoutPrStub: sandbox
          .stub<
            [
              {
                installationId: number;
                owner: string;
                repo: string;
                prNumber: number;
              },
            ],
            Promise<void>
          >()
          .rejects("Fail"),
      });
      const sut = new JobRunnerImpl(
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        { bundle: [], upload: { url: "http://test" } },
        taskRunnerStub,
        [],
      );

      await rejects(sut.run(testJob));
    });

    const defaultIgnoreList = [
      "android/**",
      "ios/**",
      "__tests__/**",
      ".buckconfig",
      ".eslintrc.js",
      ".flowconfig",
      ".gitignore",
      ".prettierrc.js",
      "**/*.md",
    ];

    [
      // 0
      {
        ignore: defaultIgnoreList,
        changedPrFiles: ["App.js"],
        shouldSkipBundling: false,
      },
      // 1
      {
        ignore: defaultIgnoreList,
        changedPrFiles: ["android/build.gradle"],
        shouldSkipBundling: true,
      },
      // 2
      {
        ignore: defaultIgnoreList,
        changedPrFiles: ["README.md"],
        shouldSkipBundling: true,
      },
      // 3
      {
        ignore: defaultIgnoreList,
        changedPrFiles: ["README.md", "App.js"],
        shouldSkipBundling: false,
      },
      // 4
      {
        ignore: defaultIgnoreList,
        changedPrFiles: ["a/b/c/README.md"],
        shouldSkipBundling: true,
      },
      // 5
      {
        ignore: defaultIgnoreList,
        changedPrFiles: ["App.js", "src/foo/bar.js"],
        shouldSkipBundling: false,
      },
    ].forEach(
      (
        scenario: {
          ignore: string[];
          changedPrFiles: string[];
          shouldSkipBundling: boolean;
        },
        scenarioIdx,
      ) => {
        it(`should skip or not skip bundling based on ignore globs [scenario ${scenarioIdx}]`, async () => {
          const {
            gitHubApiStub,
            qrCodeUrlBuilderStub,
            taskRunnerStub,
          } = prepareStubs({
            getPrChangedFilesStub: sandbox
              .stub<
                [
                  {
                    installationId: number;
                    owner: string;
                    repo: string;
                    pull_number: number;
                  },
                ],
                Promise<string[]>
              >()
              .resolves(scenario.changedPrFiles),
          });
          const sut = new JobRunnerImpl(
            gitHubApiStub,
            qrCodeUrlBuilderStub,
            { bundle: [], upload: { url: "http://test" } },
            taskRunnerStub,
            scenario.ignore,
          );
          await sut.run(testJob);
          expect(
            scenario.shouldSkipBundling
              ? taskRunnerStub.execTask.notCalled
              : taskRunnerStub.execTask.called,
          ).true;
        });
      },
    );

    it("should use the ignore list from repository livebundle.yml configuration, if set", async () => {
      const {
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        taskRunnerStub,
      } = prepareStubs({
        cloneRepoAndCheckoutPrStub: sandbox
          .stub<
            [
              {
                installationId: number;
                owner: string;
                repo: string;
                prNumber: number;
              },
            ],
            Promise<void>
          >()
          .callsFake(() => {
            fs.writeFileSync(
              path.resolve(process.cwd(), "livebundle.yaml"),
              `# GitHub configuration
github:
  ignore: ["foo.js"]`,
            );
            return Promise.resolve();
          }),
        getPrChangedFilesStub: sandbox
          .stub<
            [
              {
                installationId: number;
                owner: string;
                repo: string;
                pull_number: number;
              },
            ],
            Promise<string[]>
          >()
          .resolves(["foo.js"]),
      });
      const sut = new JobRunnerImpl(
        gitHubApiStub,
        qrCodeUrlBuilderStub,
        { bundle: [], upload: { url: "http://test" } },
        taskRunnerStub,
        [],
      );
      await sut.run(testJob);
      expect(taskRunnerStub.execTask.notCalled).true;
    });
  });

  function prepareStubs({
    createCommentStub = sandbox.stub(),
    cloneRepoAndCheckoutPrStub = sandbox.stub(),
    getPrChangedFilesStub = sandbox.stub(),
    buildUrlStub = sandbox
      .stub<[string], string>()
      .returns("http://localhost:3000/content?margin=1&width=250"),
    execTaskStub = sandbox
      .stub<
        [
          LiveBundleTask,
          {
            bundlingStarted?: (bundle: BundleTask) => void;
            bundlingCompleted?: (bundle: BundleTask) => void;
            uploadStarted?: ({ bundles }: { bundles: CliBundle[] }) => void;
            cwd?: string;
          },
        ],
        Promise<Package>
      >()
      .resolves({
        id: "7c17af66-a51f-11ea-9369-03812e4536bc",
        bundles: [],
        timestamp: 12345689,
      }),
  }: {
    createCommentStub?: sinon.SinonStub<
      [
        {
          installationId: number;
          owner: string;
          repo: string;
          issueNumber: number;
          comment: string;
        },
      ],
      Promise<void>
    >;
    cloneRepoAndCheckoutPrStub?: sinon.SinonStub<
      [
        {
          installationId: number;
          owner: string;
          repo: string;
          prNumber: number;
        },
      ],
      Promise<void>
    >;
    getPrChangedFilesStub?: sinon.SinonStub<
      [
        {
          installationId: number;
          owner: string;
          repo: string;
          pull_number: number;
        },
      ],
      Promise<string[]>
    >;
    buildUrlStub?: sinon.SinonStub<[string], string>;
    execTaskStub?: sinon.SinonStub<
      [
        LiveBundleTask,
        {
          bundlingStarted?: (bundle: BundleTask) => void;
          bundlingCompleted?: (bundle: BundleTask) => void;
          uploadStarted?: ({ bundles }: { bundles: CliBundle[] }) => void;
          cwd?: string;
        },
      ],
      Promise<Package>
    >;
  } = {}): {
    taskRunnerStub: sinon.SinonStubbedInstance<TaskRunner>;
    gitHubApiStub: sinon.SinonStubbedInstance<GitHubApi>;
    qrCodeUrlBuilderStub: sinon.SinonStubbedInstance<QRCodeUrlBuilder>;
  } {
    return {
      taskRunnerStub: sandbox.createStubInstance(TaskRunnerNullImpl, {
        execTask: execTaskStub,
      }),
      gitHubApiStub: sandbox.createStubInstance(GitHubApiNullImpl, {
        createComment: createCommentStub,
        cloneRepoAndCheckoutPr: cloneRepoAndCheckoutPrStub,
        getPrChangedFiles: getPrChangedFilesStub,
      }),
      qrCodeUrlBuilderStub: sandbox.createStubInstance(
        QRCodeUrlBuilderNullImpl,
        {
          buildUrl: buildUrlStub,
        },
      ),
    };
  }
});

class GitHubApiNullImpl implements GitHubApi {
  getPrChangedFiles({
    installationId,
    owner,
    repo,
    pull_number,
  }: {
    installationId: number;
    owner: string;
    repo: string;
    pull_number: number;
  }): Promise<string[]> {
    throw new Error("Method not implemented.");
  }
  public async createComment({
    installationId,
    owner,
    repo,
    issueNumber,
    comment,
  }: {
    installationId: number;
    owner: string;
    repo: string;
    issueNumber: number;
    comment: string;
  }): Promise<void> {
    return Promise.resolve();
  }

  public async cloneRepoAndCheckoutPr({
    installationId,
    owner,
    repo,
    prNumber,
  }: {
    installationId: number;
    owner: string;
    repo: string;
    prNumber: number;
  }): Promise<void> {
    return Promise.resolve();
  }
}

class QRCodeUrlBuilderNullImpl implements QRCodeUrlBuilder {
  public buildUrl(qrContent: string): string {
    return "http://localhost:3000/content?margin=1&width=250";
  }
}

class TaskRunnerNullImpl implements TaskRunner {
  public async execTask(
    task: LiveBundleTask,
    {
      bundlingStarted,
      bundlingCompleted,
      uploadStarted,
      cwd,
    }: {
      bundlingStarted?: (bundle: BundleTask) => void;
      bundlingCompleted?: (bundle: BundleTask) => void;
      uploadStarted?: ({ bundles }: { bundles: CliBundle[] }) => void;
      cwd?: string;
    },
  ): Promise<Package> {
    return { id: "123456", bundles: [], timestamp: 12345689 };
  }
}
