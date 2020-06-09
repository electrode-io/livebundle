import chalk from "chalk";
import commander, { Command } from "commander";
import debug from "debug";
import fs from "fs-extra";
import { taskSchema } from "livebundle-sdk";
import { loadConfig } from "livebundle-utils";
import open from "open";
import path from "path";
import qrcode from "qrcode";
import { configSchema } from "./schemas";
import { Config } from "./types";
import { upload } from "./upload";

const pJsonPath = path.resolve(__dirname, "..", "package.json");
const pJson = fs.readJSONSync(pJsonPath);

const log = debug("livebundle");

export default function program({
  op = open,
}: { op?: typeof open } = {}): commander.Command {
  const command = new Command();

  command.version(pJson.version);

  const cmd = new Command();
  cmd
    .name("upload")
    .option("--config", "Path to config file")
    .description("bundle and upload resulting bundles")
    .action(async ({ config }: { config?: string }) => {
      const defaultConfigPath = path.resolve(
        __dirname,
        "../config/default.yaml",
      );

      const conf = await loadConfig<Config>({
        configPath: config,
        defaultConfigPath,
        defaultFileName: "livebundle",
        refSchemas: [taskSchema],
        schema: configSchema,
      });

      log(`Configuration:\n${JSON.stringify(conf, null, 2)}`);

      const res = await upload(conf);

      console.log(
        `${chalk.bold.blue("Deep Link URL:")} ${chalk.bold(
          `livebundle://packages?id=${res.id}`,
        )}`,
      );

      if (conf.qrcode.term.generate) {
        qrcode.toString(res.id, { type: "terminal" }, function (err, code) {
          console.log(code);
        });
      }

      if (conf.qrcode.image.generate) {
        await fs.ensureDir(".livebundle");
        const qrCodeImagePath = path.resolve(".livebundle/qrcode.png");
        qrcode.toFile(qrCodeImagePath, res.id, {
          margin: conf.qrcode.image.margin,
          width: conf.qrcode.image.width,
        });
        if (conf.qrcode.image.open) {
          op(qrCodeImagePath);
        }
      }
    });

  return command.addCommand(cmd);
}
