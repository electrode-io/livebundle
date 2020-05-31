import cp from "child_process";
import debug from "debug";
import type { Package } from "livebundle-store";
import path from "path";
import tmp from "tmp";
import util from "util";
import { LiveBundleSdk } from "./LiveBundleSdk";
import { parseAssetsFile } from "./parseAssetsFile";
import { BundleTask, CliBundle, LiveBundleTask, TaskRunner } from "./types";

const log = debug("livebundle-sdk:TaskRunner");

const execAsync = util.promisify(cp.exec);

export class TaskRunnerImpl implements TaskRunner {
  private readonly exec = execAsync;

  public constructor(
    private readonly sdk: LiveBundleSdk,
    { exec }: { exec?: typeof execAsync } = {},
  ) {
    if (exec) {
      this.exec = exec;
    }
  }

  public async execTask(
    task: LiveBundleTask,
    {
      bundlingStarted,
      bundlingCompleted,
      uploadStarted,
      cwd = process.cwd(),
      parseAssetsFunc = parseAssetsFile,
    }: {
      bundlingStarted?: (bundle: BundleTask) => void;
      bundlingCompleted?: (bundle: BundleTask) => void;
      uploadStarted?: ({ bundles }: { bundles: CliBundle[] }) => void;
      cwd?: string;
      parseAssetsFunc?: typeof parseAssetsFile;
    } = {},
  ): Promise<Package> {
    //
    // PREPARE
    for (const step of task.prepare?.steps || []) {
      log(`Running ${step}`);
      await this.exec(step, { cwd });
    }

    //
    // BUNDLE
    const bundles: CliBundle[] = [];
    for (const bundle of task.bundle) {
      if (bundlingStarted) {
        bundlingStarted(bundle);
      }
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      const bundlePath = path.join(tmpDir, "index.bundle");
      const sourceMapPath = path.join(tmpDir, "index.map");
      const { dev, entry, platform } = bundle;
      const cmd = `npx react-native bundle \
--bundle-output ${bundlePath} \
--dev ${dev} \
--entry-file ${entry} \
--platform ${platform} \
--sourcemap-output ${sourceMapPath}`;
      log(`Running ${cmd}`);
      await this.exec(cmd, { cwd });
      const assets = await parseAssetsFunc(
        path.resolve(".livebundle/assets.json"),
      );
      await this.sdk.uploadAssets(assets);
      bundles.push({
        bundlePath,
        dev,
        platform,
        sourceMapPath,
      });
      if (bundlingCompleted) {
        bundlingCompleted(bundle);
      }
    }

    //
    // UPLOAD
    if (uploadStarted) {
      uploadStarted({ bundles });
    }

    return this.sdk.uploadPackage({ bundles });
  }
}
