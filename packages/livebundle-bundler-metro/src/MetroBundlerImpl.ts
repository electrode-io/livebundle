import debug from "debug";
import { MetroBundlerConfig } from "./types";
import {
  Bundler,
  Uploader,
  LocalBundle,
  parseAssetsFile,
} from "livebundle-sdk";
import { configSchema } from "./schemas";
import tmp from "tmp";
import path from "path";
import cp from "child_process";

const log = debug("livebundle-bundler-metro:MetroBundlerImpl");

export class MetroBundlerImpl implements Bundler {
  private readonly spawn;
  private readonly parseAssetsFunc = parseAssetsFile;

  public constructor(
    private readonly config: MetroBundlerConfig,
    private readonly uploader: Uploader,
    {
      spawn,
      parseAssetsFunc,
    }: {
      spawn?: typeof cp.spawn;
      parseAssetsFunc?: typeof parseAssetsFile;
    } = {},
  ) {
    this.spawn = spawn ?? cp.spawn;
    this.parseAssetsFunc = parseAssetsFunc ?? parseAssetsFile;
  }

  public static async create(
    config: MetroBundlerConfig,
    uploader: Uploader,
  ): Promise<MetroBundlerImpl> {
    return new MetroBundlerImpl(config, uploader);
  }

  public static readonly defaultConfig: Record<
    string,
    unknown
  > = require("../config/default.json");

  public static readonly schema: Record<string, unknown> = configSchema;

  public async bundle(): Promise<LocalBundle[]> {
    log(`bundle()`);
    const bundles: LocalBundle[] = [];
    for (const bundle of this.config.bundles) {
      /*if (bundlingStarted) {
        bundlingStarted(bundle);
      }*/
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      const bundlePath = path.join(tmpDir, "index.bundle");
      const sourceMapPath = path.join(tmpDir, "index.map");
      const { dev, entry, platform } = bundle;

      const cmdArgs = `react-native bundle \
--bundle-output ${bundlePath} \
--dev ${dev} \
--entry-file ${entry} \
--platform ${platform} \
--sourcemap-output ${sourceMapPath}`.split(" ");
      log(`Running npx ${cmdArgs}`);
      await new Promise((resolve, reject) => {
        const npx = this.spawn("npx", cmdArgs, { cwd: process.cwd() });
        npx.stdout.on("data", (data) => {
          log(data.toString());
        });

        npx.stderr.on("data", (data) => {
          log(`stderr: ${data.toString()}`);
        });

        npx.on("close", (code) => {
          if (code !== 0) {
            reject(`npx ${cmdArgs} failed with exit code ${code}`);
          } else {
            resolve();
          }
        });
      });
      const assets = await this.parseAssetsFunc(
        path.resolve(".livebundle/assets.json"),
      );
      await this.uploader.uploadAssets(assets);
      bundles.push({
        bundlePath,
        dev,
        platform,
        sourceMapPath,
      });
      /*if (bundlingCompleted) {
        bundlingCompleted(bundle);
      }*/
    }
    return bundles;
  }
}
