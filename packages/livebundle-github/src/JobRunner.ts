import { Octokit } from "@octokit/rest";
import debug from "debug";
import fs from "fs-extra";
import type { Config as CliConfig } from "livebundle-cli";
import { BundleTask, LiveBundleTask, TaskRunner } from "livebundle-sdk";
import { createTmpDir, loadConfig } from "livebundle-utils";
import path from "path";
import shell from "shelljs";
import { Job } from "./types";
import exec from "./utils/exec";
import { JWTIssuer } from "./utils/JWTIssuer";
import { QRCodeUrlBuilder } from "./utils/QRCodeUrlBuilder";

const log = debug("livebundle-github:JobRunner");

export class JobRunner {
  public constructor(
    private readonly task: LiveBundleTask,
    private readonly jwtIssuer: JWTIssuer,
    private readonly qrCodeUrlBuilder: QRCodeUrlBuilder,
  ) {}

  public async run(job: Job): Promise<void> {
    const { installationId, owner, prNumber, repo } = job;

    const tmpDir = createTmpDir();
    shell.pushd(tmpDir);

    try {
      const jwt = await this.jwtIssuer.createJWT(installationId);
      const octokit = new Octokit({ auth: `Bearer ${jwt}` });
      exec(
        `git clone https://x-access-token:${jwt}@github.com/${owner}/${repo}.git .`,
      );
      exec(`git fetch origin pull/${prNumber}/head`);
      exec("git checkout FETCH_HEAD");

      const userConfigFile = fs.existsSync("livebundle.yml")
        ? "livebundle.yml"
        : fs.existsSync("livebundle.yaml")
        ? "livebundle.yaml"
        : undefined;

      let taskToRun = this.task;
      if (userConfigFile) {
        const userConfig = loadConfig<CliConfig>({
          configPath: path.resolve(userConfigFile),
        });
        if (userConfig?.github?.task) {
          taskToRun = loadConfig<LiveBundleTask>({
            config: userConfig.github.task,
            defaultConfig: this.task,
          });
        }
      }

      log(`taskToRun : ${JSON.stringify(taskToRun, null, 2)}`);
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `:robot: Packaging your on demand bundles :package:`,
      });
      const r = await TaskRunner.execTask(taskToRun, { cwd: tmpDir });
      const bundlesStr = this.task.bundle
        .map((c: BundleTask) => `${c.platform} ${c.dev ? "dev" : "prod"}`)
        .join(", ");
      const qrCodeUrl = this.qrCodeUrlBuilder.buildUrl(r.id);
      const deepLinkUrl = `livebundle://packages?id=${r.id}`;
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: `<img src="${qrCodeUrl}" alt="${qrCodeUrl}" />

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
