#!/usr/bin/env node
import program from "commander";
import fs from "fs-extra";
import { loadConfig } from "livebundle-utils";
import path from "path";
import { LiveBundleStore } from "./LiveBundleStore";
import { Config } from "./types";

const pJsonPath = path.resolve(__dirname, "..", "package.json");
const pJson = fs.readJSONSync(pJsonPath);

program.version(pJson.version);

program
  .option("--config <string>", "path to the config")
  .parse(process.argv)
  .action(({ config }: { config?: string }) => {
    const defaultConfigPath = path.resolve(__dirname, "../config/default.yaml");
    const conf = loadConfig<Config>({
      configPath: config,
      defaultConfigPath,
      defaultFileName: "livebundle-store",
    });
    new LiveBundleStore(conf).start();
  })
  .parse(process.argv);
