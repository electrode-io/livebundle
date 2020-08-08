import cp from "child_process";
import debug from "debug";
import fs from "fs-extra";
import path from "path";
import tmp from "tmp";
import util from "util";
import { parseAssetsFile } from "./parseAssetsFile";
import {
  BundleTask,
  LiveBundleTask,
  LocalBundle,
  Notifier,
  Package,
  TaskRunner,
} from "./types";
import { UploaderImpl } from "./UploaderImpl";

const log = debug("livebundle-sdk:TaskRunner");

const execAsync = util.promisify(cp.exec);

export class TaskRunnerImpl implements TaskRunner {
  private readonly exec = execAsync;

  public constructor(
    private readonly uploader: UploaderImpl,
    private readonly notifier?: Notifier,
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
      uploadStarted?: ({ bundles }: { bundles: LocalBundle[] }) => void;
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
    const bundles: LocalBundle[] = [];
    for (const bundle of task.bundle) {
      if (bundlingStarted) {
        bundlingStarted(bundle);
      }
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      const bundlePath = path.join(tmpDir, "index.bundle");
      const sourceMapPath = path.join(tmpDir, "index.map");
      const { dev, entry, platform } = bundle;

      // PATCH ENTRY FILE
      // Not really clean should find a better approach if one exist
      const patchedEntryFile = path.join(path.dirname(entry), "livebundle.js");
      let entryFileContent = await fs.readFile(entry, { encoding: "utf8" });
      entryFileContent = `import {setCustomSourceTransformer} from 'react-native/Libraries/Image/resolveAssetSource';
      setCustomSourceTransformer((resolver) => {
        const res = resolver.scaledAssetPath();
        const {hash, name, type} = resolver.asset;
        res.uri = ${this.uploader.getAssetsTemplateLiteral()};
        return res;
      });
      ${entryFileContent}`;
      await fs.writeFile(patchedEntryFile, entryFileContent);

      const cmd = `npx react-native bundle \
--bundle-output ${bundlePath} \
--dev ${dev} \
--entry-file ${patchedEntryFile} \
--platform ${platform} \
--sourcemap-output ${sourceMapPath}`;
      log(`Running ${cmd}`);
      await this.exec(cmd, { cwd });
      const assets = await parseAssetsFunc(
        path.resolve(".livebundle/assets.json"),
      );
      await this.uploader.uploadAssets(assets);
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

    const res = await this.uploader.uploadPackage({ bundles });

    //
    // Notify
    if (this.notifier) {
      await this.notifier.notify(res);
    }

    return res;
  }
}
