import commander, { Command } from "commander";
import fs from "fs-extra";
import { loadConfig } from "livebundle-utils";
import { ChannelFactoryProducerImpl } from "livebundle-utils/src/ChannelFactoryProducerImpl";
import { ConnectionFactoryImpl } from "livebundle-utils/src/ConnectionFactoryImpl";
import path from "path";
import { GitHubAppServer } from "./GitHubAppServer";
import { JobProducerImpl } from "./JobProducerImpl";
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
        defaultFileName: "livebundle-github-producer",
        schema: configSchema,
      });
      const jobProducer = await JobProducerImpl.init(
        conf.queue,
        new ChannelFactoryProducerImpl(),
        new ConnectionFactoryImpl(),
      );
      return new GitHubAppServer(conf.server, jobProducer).start();
    });
}
