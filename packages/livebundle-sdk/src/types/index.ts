import type { Platform } from "livebundle-store";

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
