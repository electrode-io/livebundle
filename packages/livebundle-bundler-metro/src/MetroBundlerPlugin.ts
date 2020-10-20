import debug from "debug";
import { MetroBundlerConfig, BundleAssetsResolver } from "./types";
import { BundlerPlugin, LocalBundle, ReactNativeAsset } from "livebundle-sdk";
import { configSchema } from "./schemas";
import tmp from "tmp";
import path from "path";
import cp from "child_process";
import { BundleAssetsResolverImpl } from "./BundleAssetsResolverImpl";

const log = debug("livebundle-bundler-metro:MetroBundlerPlugin");

export class MetroBundlerPlugin implements BundlerPlugin {
  private readonly spawn;
  private readonly bundleAssetsResolver;

  public constructor(
    private readonly config: MetroBundlerConfig,
    {
      bundleAssetsResolver = new BundleAssetsResolverImpl(),
      spawn = cp.spawn,
    }: {
      bundleAssetsResolver?: BundleAssetsResolver;
      spawn?: typeof cp.spawn;
    } = {},
  ) {
    this.bundleAssetsResolver = bundleAssetsResolver;
    this.spawn = spawn;
  }

  public static async create(
    config: MetroBundlerConfig,
  ): Promise<MetroBundlerPlugin> {
    return new MetroBundlerPlugin(config);
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
      const assets: ReactNativeAsset[] = await this.bundleAssetsResolver.resolveAssets(
        bundlePath,
      );
      bundles.push({
        assets,
        bundlePath,
        dev,
        platform,
        sourceMapPath,
      });
    }
    return bundles;
  }
}
