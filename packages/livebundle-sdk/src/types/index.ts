import { StoragePipelineOptions } from "@azure/storage-blob";

export interface LocalBundle {
  dev: boolean;
  platform: Platform;
  sourceMapPath: string;
  bundlePath: string;
}

export interface UploadTask {
  azure: AzureBlobStorageConfig;
}

export interface NotifyTask {
  github: GitHubNotifierConfig;
}

export interface GitHubNotifierConfig {
  baseUrl: string;
  token: string;
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
  notify: NotifyTask;
}

export interface AzureBlobStorageConfig {
  account: string;
  container: string;
  sasToken: string;
  options?: StoragePipelineOptions;
  [key: string]: any;
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
      uploadStarted?: ({ bundles }: { bundles: LocalBundle[] }) => void;
      cwd?: string;
    },
  ): Promise<Package>;
}

export interface Uploader {
  uploadPackage({ bundles }: { bundles: LocalBundle[] }): Promise<Package>;
  uploadAssets(assets: ReactNativeAsset[]): Promise<void>;
  getAssetsTemplateLiteral(): string;
}

export interface Storage {
  store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<void>;
  storeFile(
    filePath: string,
    targetPath: string,
    options?: {
      contentType?: string;
    },
  ): Promise<void>;
  readonly baseUrl: string;
}

export interface Notifier {
  notify(pkg: Package, opts?: Record<string, unknown>): Promise<void>;
}

export type Platform = "android" | "ios";

export interface StackFrame {
  arguments?: string[];
  column?: number;
  file?: string;
  lineNumber?: number;
  methodName: string;
}

export interface Bundle {
  id: string;
  dev: boolean;
  platform: Platform;
  sourceMap: string;
}

export type BundleCli = Omit<Bundle, "id">;

export interface Package {
  id: string;
  bundles: Bundle[];
  links: PackageLinks;
  timestamp: number;
}

export interface PackageLinks {
  metadata: string;
  qrcode: string;
}

export interface PackageCli {
  bundles: Bundle[];
}

export interface ServerPaths {
  assets: string;
  packages: string;
}

export interface Config extends Record<string, unknown> {
  accessKeys: string[];
  server: ServerConfig;
  store: StoreConfig;
}

export interface ServerConfig {
  host: string;
  port: number;
}

export interface StoreConfig {
  path: string;
}
