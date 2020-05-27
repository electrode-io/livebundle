import cp from "child_process";
import debug from "debug";
import { Package } from "livebundle-store";
import path from "path";
import tmp from "tmp";
import util from "util";
import { LiveBundleSdk } from "./LiveBundleSdk";
import { parseAssetsFile } from "./parseAssetsFile";
import { BundleTask, CliBundle, LiveBundleTask } from "./types";

const exec = util.promisify(cp.exec);

const log = debug("livebundle-sdk:TaskRunner");

export class TaskRunner {
  public static async execTask(
    task: LiveBundleTask,
    {
      bundlingStarted,
      bundlingCompleted,
      uploadStarted,
      cwd = process.cwd(),
    }: {
      bundlingStarted?: (bundle: BundleTask) => void;
      bundlingCompleted?: (bundle: BundleTask) => void;
      uploadStarted?: ({ bundles }: { bundles: CliBundle[] }) => void;
      cwd?: string;
    } = {},
  ): Promise<Package> {
    const sdk = new LiveBundleSdk(task.upload.url);

    //
    // PREPARE
    for (const step of task.prepare?.steps || []) {
      log(`Running ${step}`);
      await exec(step, { cwd });
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
      await exec(cmd, { cwd });
      const assets = await parseAssetsFile(
        path.resolve(".livebundle/assets.json"),
      );
      await sdk.uploadAssets(assets);
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

    return sdk.uploadPackage({ bundles });
  }
}
