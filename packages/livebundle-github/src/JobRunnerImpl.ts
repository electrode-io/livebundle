import debug from "debug";
import fs from "fs-extra";
import {
  Config as CliConfig,
  configSchema as cliConfigSchema,
} from "livebundle";
import {
  BundleTask,
  LiveBundleTask,
  TaskRunner,
  taskSchema,
} from "livebundle-sdk";
import { createTmpDir, loadConfig } from "livebundle-utils";
import micromatch from "micromatch";
import path from "path";
import shell from "shelljs";
import { GitHubApi, Job, JobRunner, QRCodeUrlBuilder } from "./types";

const log = debug("livebundle-github:JobRunner");

export class JobRunnerImpl implements JobRunner {
  public constructor(
    private readonly gitHubApi: GitHubApi,
    private readonly qrCodeUrlBuilder: QRCodeUrlBuilder,
    private readonly task: LiveBundleTask,
    private readonly taskRunner: TaskRunner,
    private readonly ignore: string[],
  ) {}

  public async run(job: Job): Promise<void> {
    const { installationId, owner, prNumber, repo } = job;

    const tmpDir = createTmpDir();
    shell.pushd(tmpDir);

    try {
      await this.gitHubApi.cloneRepoAndCheckoutPr(job);

      const userConfigFile = fs.existsSync("livebundle.yml")
        ? "livebundle.yml"
        : fs.existsSync("livebundle.yaml")
        ? "livebundle.yaml"
        : undefined;

      let taskToRun = this.task;
      let ignoreGlobs = this.ignore;
      if (userConfigFile) {
        const userConfig = await loadConfig<CliConfig>({
          configPath: path.resolve(userConfigFile),
          refSchemas: [taskSchema],
          schema: cliConfigSchema,
        });
        if (userConfig?.github?.task) {
          taskToRun = userConfig.github.task;
        }
        if (userConfig?.github?.ignore) {
          ignoreGlobs = userConfig?.github?.ignore;
        }
      }

      if (ignoreGlobs?.length > 0) {
        const prChangedFiles = await this.gitHubApi.getPrChangedFiles({
          installationId,
          owner,
          repo,
          pull_number: prNumber,
        });
        const nonIgnoredFiles = micromatch.not(prChangedFiles, ignoreGlobs);
        if (nonIgnoredFiles.length === 0) {
          log(`Skipping bundling as all changed files from PR are ignored`);
          return;
        }
      }

      log(`taskToRun : ${JSON.stringify(taskToRun, null, 2)}`);
      await this.gitHubApi.createComment({
        installationId,
        owner,
        repo,
        issueNumber: prNumber,
        comment: `:robot: Packaging your on demand bundles :package:`,
      });
      const r = await this.taskRunner.execTask(taskToRun, { cwd: tmpDir });
      const bundlesStr = taskToRun.bundle
        .map((c: BundleTask) => `${c.platform} ${c.dev ? "dev" : "prod"}`)
        .join(", ");
      const qrCodeUrl = this.qrCodeUrlBuilder.buildUrl(r.id);
      const deepLinkUrl = `livebundle://packages?id=${r.id}`;
      await this.gitHubApi.createComment({
        installationId,
        owner,
        repo,
        issueNumber: prNumber,
        comment: `<img src="${qrCodeUrl}" alt="${qrCodeUrl}" />

*Deep Link URL*
\`\`\`
${deepLinkUrl}
\`\`\`
*This bundle store package includes the following bundles :*
***${bundlesStr}***`,
      });
    } catch (e) {
      log(`Error: ${e}`);
      throw new Error(e);
    } finally {
      shell.popd();
      shell.rm("-rf", tmpDir);
    }
  }
}
