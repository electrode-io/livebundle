import commander, { Command } from "commander";
import fs from "fs-extra";
import { loadConfig, LiveBundle, LiveBundleConfig } from "livebundle-sdk";
import path from "path";
import { configSchema } from "./schemas";
import { Config } from "./types";
import emoji from "node-emoji";
import ora from "ora";
import { resolveConfigPath } from "./resolveConfigPath";

const pJsonPath = path.resolve(__dirname, "..", "package.json");
const pJson = fs.readJSONSync(pJsonPath);

export default function program({
  livebundle,
}: {
  livebundle: LiveBundle;
}): commander.Command {
  const command = new Command();

  command.version(pJson.version);

  const uploadCommand = new Command();
  uploadCommand
    .name("upload")
    .option("--config <string>", "Path to config file")
    .option("--cwd <string>", "Set current working directory")
    .description("bundle and upload resulting bundles")
    .action(async ({ config, cwd }: { config?: string; cwd?: string }) => {
      let conf;
      try {
        if (cwd) {
          process.chdir(cwd);
        }
        const resolvedConfigPath = resolveConfigPath();
        if (!config && !resolvedConfigPath) {
          return console.error(`No LiveBundle configuration file found.
- To create a new configuration file you can use 'livebundle init' command
- To use an existing configuration file from a specific location you can use the '--config' option`);
        }
        conf = await loadConfig<Config>({
          configPath: config ?? resolvedConfigPath,
          schema: configSchema,
        });
      } catch (e) {
        return console.error(`Invalid configuration.\n${e.message}`);
      }

      const spinner: ora.Ora = ora(`Running LiveBundle`);
      spinner.start();
      try {
        await livebundle.upload((conf as unknown) as LiveBundleConfig);
        spinner.stopAndPersist({
          symbol: emoji.get("rocket"),
          text: `Shipped LiveBundle package`,
        });
      } catch (e) {
        spinner.fail(`LiveBundle failure\n${e.message}`);
      }
    });

  const liveCommand = new Command();
  liveCommand
    .name("live")
    .option("--config <string>", "Path to config file")
    .description("start a live session")
    .action(async ({ config }: { config?: string }) => {
      let conf;
      try {
        conf = await loadConfig<Config>({
          configPath: config,
          schema: configSchema,
        });
      } catch (e) {
        return console.error(`Invalid configuration.\n${e.message}`);
      }

      const spinner: ora.Ora = ora(`Creating LiveBundle sessions`);
      spinner.start();
      try {
        await livebundle.live((conf as unknown) as LiveBundleConfig);
        spinner.stopAndPersist({
          symbol: emoji.get("rocket"),
          text: `LiveBundle session started`,
        });
      } catch (e) {
        spinner.fail(`LiveBundle failure\n${e.message}`);
      }
    });

  const initCommand = new Command();
  initCommand
    .name("init")
    .description("generates a default livebundle.yaml configuration file")
    .action(async () => {
      if (await fs.pathExists("livebundle.yaml")) {
        return console.error(`A livebundle.yaml configuration already exists`);
      }
      await fs.copyFile(
        path.resolve(__dirname, "../config/default.yaml"),
        "livebundle.yaml",
      );
      console.log("Generated livebundle.yaml");
    });

  return command
    .addCommand(uploadCommand)
    .addCommand(liveCommand)
    .addCommand(initCommand);
}
