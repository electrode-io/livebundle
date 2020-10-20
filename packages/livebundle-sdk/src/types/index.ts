export interface LocalBundle {
  dev: boolean;
  platform: Platform;
  sourceMapPath: string;
  bundlePath: string;
  assets: ReactNativeAsset[];
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
  storage: Record<string, unknown>;
}

export interface LiveBundleConfig {
  bundler: Record<string, unknown>;
  storage: Record<string, unknown>;
  generators: Record<string, unknown>;
  notifiers: Record<string, unknown>;
}

export interface Bundler {
  bundle(): Promise<LocalBundle[]>;
}

export interface Generator {
  generate({
    id,
    type,
  }: {
    id: string;
    type: LiveBundleContentType;
  }): Promise<Record<string, unknown>>;
}

export interface Uploader {
  upload({ bundles }: { bundles: LocalBundle[] }): Promise<Package>;
}

export interface Storage {
  store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<string>;
  storeFile(
    filePath: string,
    targetPath: string,
    options?: {
      contentType?: string;
    },
  ): Promise<string>;
  hasFile(filePath: string): Promise<boolean>;
  downloadFile(filePath: string): Promise<Buffer>;
  readonly baseUrl: string;
}
export interface Notifier {
  notify({
    generators,
    pkg,
    type,
  }: {
    generators: Record<string, Record<string, unknown>>;
    pkg?: Package;
    type: LiveBundleContentType;
  }): Promise<void>;
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
  timestamp: number;
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

export enum LiveBundleContentType {
  PACKAGE,
  SESSION,
}

export interface LiveBundle {
  upload(config: LiveBundleConfig): Promise<void>;
  live(config: LiveBundleConfig): Promise<void>;
}

export interface ReactNativeAsset {
  files: string[];
  hash: string;
}

export interface PluginLoader {
  loadBundlerPlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedBundler>;
  loadGeneratorPlugin(
    name: string,
    config: Record<string, unknown>,
    storage: Storage,
  ): Promise<NamedGenerator>;
  loadNotifierPlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedNotifier>;
  loadStoragePlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedStorage>;
  loadAllPlugins(
    config: LiveBundleConfig,
  ): Promise<{
    bundler: NamedBundler;
    storage: NamedStorage;
    generators: NamedGenerator[];
    notifiers: NamedNotifier[];
    uploader: Uploader;
  }>;
}

export interface Named {
  name: string;
}

export type NamedBundler = Bundler & Named;
export type NamedStorage = Storage & Named;
export type NamedGenerator = Generator & Named;
export type NamedNotifier = Notifier & Named;
