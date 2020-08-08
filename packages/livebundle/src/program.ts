import chalk from "chalk";
import commander, { Command } from "commander";
import fs from "fs-extra";
import { Package, taskSchema, AzureStorageImpl } from "livebundle-sdk";
import { loadConfig } from "livebundle-utils";
import open from "open";
import path from "path";
import qrcode from "qrcode";
import {
  getErrorMessage,
  reconciliateAzureConfig,
} from "./reconciliateAzureConfig";
import { configSchema } from "./schemas";
import { Config } from "./types";
import { upload } from "./upload";
import ip from "ip";
import { v4 as uuidv4 } from "uuid";

const pJsonPath = path.resolve(__dirname, "..", "package.json");
const pJson = fs.readJSONSync(pJsonPath);

export default function program({
  op = open,
}: { op?: typeof open } = {}): commander.Command {
  const command = new Command();

  command.version(pJson.version);

  const uploadCommand = new Command();
  uploadCommand
    .name("upload")
    .option("--config <string>", "Path to config file")
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
      const recAzureConfig = reconciliateAzureConfig(conf.task.upload?.azure);
      if (!recAzureConfig.config) {
        throw new Error(getErrorMessage(recAzureConfig));
      }
      conf.task.upload.azure = recAzureConfig.config;

      const res: Package = await upload(conf);

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

  const liveCommand = new Command();
  liveCommand.name("live").action(async () => {
    const defaultConfigPath = path.resolve(__dirname, "../config/default.yaml");

    const conf = await loadConfig<Config>({
      configPath: undefined,
      defaultConfigPath,
      defaultFileName: "livebundle",
      refSchemas: [taskSchema],
      schema: configSchema,
    });
    const recAzureConfig = reconciliateAzureConfig(conf.task.upload?.azure);
    if (!recAzureConfig.config) {
      throw new Error(getErrorMessage(recAzureConfig));
    }
    conf.task.upload.azure = recAzureConfig.config;
    const azureStorage = new AzureStorageImpl(conf.task.upload.azure);
    const metadata = JSON.stringify({
      host: `${ip.address()}:8081`,
    });
    const sessionId = uuidv4();
    await azureStorage.store(
      metadata,
      metadata.length,
      `sessions/${sessionId}/metadata.json`,
    );
    if (conf.qrcode.image.generate) {
      await fs.ensureDir(".livebundle");
      const qrCodeImagePath = path.resolve(".livebundle/qrcode.png");
      qrcode.toFile(qrCodeImagePath, `s:${sessionId}`, {
        margin: conf.qrcode.image.margin,
        width: conf.qrcode.image.width,
      });
      if (conf.qrcode.image.open) {
        op(qrCodeImagePath);
      }
    }
    console.log(
      `${chalk.bold.blue("Deep Link URL:")} ${chalk.bold(
        `livebundle://sessions?id=${sessionId}`,
      )}`,
    );
    await Promise.resolve(true);
  });

  return command.addCommand(uploadCommand).addCommand(liveCommand);
}
