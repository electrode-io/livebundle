import commander, { Command } from "commander";
import fs from "fs-extra";
import { loadConfig } from "livebundle-utils";
import path from "path";
import { LiveBundleStore } from "./LiveBundleStore";
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
        defaultFileName: "livebundle-store",
        schema: configSchema,
      });
      new LiveBundleStore(conf).start();
    });
}
