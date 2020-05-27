#!/usr/bin/env node
import program from "commander";
import fs from "fs-extra";
import { loadConfig } from "livebundle-utils";
import path from "path";
import { GitHubAppServer } from "./GitHubAppServer";
import { JobManager } from "./JobManager";
import { JobRunner } from "./JobRunner";
import log from "./log";
import { Config } from "./types";
import { JWTIssuer } from "./utils/JWTIssuer";
import { QRCodeUrlBuilder } from "./utils/QRCodeUrlBuilder";

const pJsonPath = path.resolve(__dirname, "..", "package.json");
const pJson = fs.readJSONSync(pJsonPath);

program.version(pJson.version);

program
  .option("--config <string>", "path to the config")
  .action(({ config }: { config?: string }) => {
    const defaultConfigPath = path.resolve(__dirname, "../config/default.yaml");
    const conf = loadConfig<Config>({
      configPath: config,
      defaultConfigPath,
      defaultFileName: "livebundle-github",
    });
    log(`conf: ${JSON.stringify(conf, null, 2)}`);
    const jwtIssuer = new JWTIssuer(conf.github);
    const qrCodeUrlBuilder = new QRCodeUrlBuilder(conf.qrcode);
    const jobRunner = new JobRunner(conf.task, jwtIssuer, qrCodeUrlBuilder);
    const jobManager = new JobManager(conf.jobManager, jobRunner);
    new GitHubAppServer(conf.server, jobManager).start();
  })
  .parse(process.argv);
