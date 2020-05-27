#!/usr/bin/env node
import chalk from "chalk";
import { program } from "commander";
import debug from "debug";
import fs from "fs-extra";
import { TaskRunner } from "livebundle-sdk";
import { loadConfig } from "livebundle-utils";
import emoji from "node-emoji";
import open from "open";
import ora from "ora";
import path from "path";
import qrcodepng from "qrcode";
import qrcodeterm from "qrcode-terminal";
import { Config } from "./types";

const pJsonPath = path.resolve(__dirname, "..", "package.json");
const pJson = fs.readJSONSync(pJsonPath);

const dlog = debug("livebundle-cli");

program.version(pJson.version);

program
  .command("upload")
  .option("--config", "Path to config file")
  .description("bundle and upload resulting bundles")
  .action(async ({ config }: { config?: string }) => {
    const defaultConfigPath = path.resolve(__dirname, "../config/default.yaml");

    const conf = loadConfig<Config>({
      configPath: config,
      defaultConfigPath,
      defaultFileName: "livebundle",
    });

    dlog(`Configuration:\n${JSON.stringify(conf, null, 2)}`);

    let spinner: ora.Ora | undefined;
    const res = await TaskRunner.execTask(conf.task, {
      bundlingStarted: (bundle) => {
        spinner = ora(
          `Creating ${bundle.platform} ${bundle.dev ? "dev" : "prod"} bundle`,
        ).start();
      },
      bundlingCompleted: (bundle) => {
        spinner?.stopAndPersist({
          symbol: emoji.get("package"),
          text: `Created ${bundle.platform} ${
            bundle.dev ? "dev" : "prod"
          } bundle`,
        });
      },
      uploadStarted: () => {
        spinner = ora("Uploading LiveBundle package").start();
      },
    });

    spinner?.stopAndPersist({
      symbol: emoji.get("rocket"),
      text: `Uploaded LiveBundle package`,
    });

    console.log(
      `${chalk.bold.blue("Deep Link URL:")} ${chalk.bold(
        `livebundle://packages?id=${res.id}`,
      )}`,
    );

    if (conf.qrcode.term.generate) {
      qrcodeterm.generate(
        res.id,
        { small: conf.qrcode.term.small },
        (code: string) => {
          console.log(code);
        },
      );
    }

    if (conf.qrcode.image.generate) {
      await fs.ensureDir(".livebundle");
      const qrCodeImagePath = path.resolve(".livebundle/qrcode.png");
      qrcodepng.toFile(qrCodeImagePath, res.id, {
        margin: conf.qrcode.image.margin,
        width: conf.qrcode.image.width,
      });
      if (conf.qrcode.image.open) {
        open(qrCodeImagePath);
      }
    }
  });

(async () => {
  await program.parseAsync(process.argv);
})();
