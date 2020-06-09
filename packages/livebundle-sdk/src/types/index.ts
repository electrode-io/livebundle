import type { Package, Platform } from "livebundle-store";

export interface CliBundle {
  dev: boolean;
  platform: Platform;
  sourceMapPath: string;
  bundlePath: string;
}

export interface UploadTask {
  url: string;
}

export interface BundleTask {
  dev: boolean;
  entry: string;
  platform: Platform;
}

export interface PrepareTask {
  steps: string[];
}

export interface LiveBundleTask {
  prepare?: PrepareTask;
  bundle: BundleTask[];
  upload: UploadTask;
}

export interface ReactNativeAsset {
  files: string[];
  hash: string;
}

export interface TaskRunner {
  execTask(
    task: LiveBundleTask,
    {
      bundlingStarted,
      bundlingCompleted,
      uploadStarted,
      cwd,
    }: {
      bundlingStarted?: (bundle: BundleTask) => void;
      bundlingCompleted?: (bundle: BundleTask) => void;
      uploadStarted?: ({ bundles }: { bundles: CliBundle[] }) => void;
      cwd?: string;
    },
  ): Promise<Package>;
}
