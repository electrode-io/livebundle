import commander, { Command } from "commander";
import fs from "fs-extra";
import {
  LiveBundleHttpCli,
  LiveBundleSdk,
  TaskRunnerImpl,
  taskSchema,
} from "livebundle-sdk";
import { loadConfig } from "livebundle-utils";
import path from "path";
import { ExecCmdImpl } from "./ExecCmdImpl";
import { GitHubApiImpl } from "./GitHubApiImpl";
import { JobDequeuerImpl } from "./JobDequeuerImpl";
import { JobRunnerImpl } from "./JobRunnerImpl";
import { JWTIssuerImpl } from "./JWTIssuerImpl";
import { OctokitFactoryImpl } from "./OctokitFactoryImpl";
import { QRCodeUrlBuilderImpl } from "./QRCodeUrlBuilderImpl";
import {
  getErrorMessage,
  reconciliateGitHubAppConfig,
} from "./reconciliateGitHubAppConfig";
import { configSchema } from "./schemas";
import { Config } from "./types";

const pJsonPath = path.resolve(__dirname, "..", "package.json");
const pJson = fs.readJSONSync(pJsonPath);

export default function program(): commander.Command {
  const command = new Command();

  command.version(pJson.version);

  return command
    .option("--config <string>", "path to the config")
    .action(async ({ config }: { config?: string }) => {
      const defaultConfigPath = path.resolve(
        __dirname,
        "../config/default.yaml",
      );
      const conf = await loadConfig<Config>({
        configPath: config,
        defaultConfigPath,
        defaultFileName: "livebundle-github-consumer",
        refSchemas: [taskSchema],
        schema: configSchema,
      });
      const recGitHubAppConfig = reconciliateGitHubAppConfig(conf.github);
      if (!recGitHubAppConfig.config) {
        throw new Error(getErrorMessage(recGitHubAppConfig));
      }
      console.log(JSON.stringify(conf, null, 2));
      const jwtIssuer = new JWTIssuerImpl(recGitHubAppConfig.config!);
      const gitHubApi = new GitHubApiImpl(
        jwtIssuer,
        new OctokitFactoryImpl(jwtIssuer),
        new ExecCmdImpl(),
      );
      const qrCodeUrlBuilder = new QRCodeUrlBuilderImpl(conf.qrcode);
      const httpCli = new LiveBundleHttpCli(conf.task.upload.url, {
        accessKey: conf.task.upload.accessKey,
      });
      const sdk = new LiveBundleSdk(httpCli);
      const taskRunner = new TaskRunnerImpl(sdk);
      const jobRunner = new JobRunnerImpl(
        gitHubApi,
        qrCodeUrlBuilder,
        conf.task,
        taskRunner,
        conf.ignore,
      );
      const jobDequeuer = new JobDequeuerImpl(conf.queue, jobRunner);
      jobDequeuer.start();
    });
}