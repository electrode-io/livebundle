export interface LocalBundle {
  dev: boolean;
  platform: Platform;
  sourceMapPath: string;
  bundlePath: string;
  assets: ReactNativeAsset[];
}

export interface LiveBundleConfig {
  bundler: Record<string, unknown>;
  server: Record<string, unknown>;
  storage: Record<string, unknown>;
  generators: Record<string, unknown>;
  notifiers: Record<string, unknown>;
}

export interface Uploader {
  upload({ bundles }: { bundles: LocalBundle[] }): Promise<Package>;
}

export type Platform = "android" | "ios";

export interface Bundle {
  id: string;
  dev: boolean;
  platform: Platform;
  sourceMap: string;
}

export interface Package {
  id: string;
  bundles: Bundle[];
  timestamp: number;
}

export enum LiveBundleContentType {
  PACKAGE,
  SESSION,
}

export interface LiveBundle {
  upload(config: LiveBundleConfig): Promise<void>;
  live(config: LiveBundleConfig, opts?: ServerOpts): Promise<void>;
}

export interface ReactNativeAsset {
  files: string[];
  hash: string;
}

export interface PluginLoader {
  loadBundlerPlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedBundlerPlugin>;
  loadServerPlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedServerPlugin>;
  loadGeneratorPlugin(
    name: string,
    config: Record<string, unknown>,
    storage: StoragePlugin,
  ): Promise<NamedGeneratorPlugin>;
  loadNotifierPlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedNotifierPlugin>;
  loadStoragePlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedStoragePlugin>;
  loadAllPlugins(config: LiveBundleConfig): Promise<{
    bundler: NamedBundlerPlugin;
    server: NamedServerPlugin;
    storage: NamedStoragePlugin;
    generators: NamedGeneratorPlugin[];
    notifiers: NamedNotifierPlugin[];
    uploader: Uploader;
  }>;
}

export interface Named {
  name: string;
}

export interface PluginClass<T> {
  create: (config: Record<string, unknown>, storage?: StoragePlugin) => T;
  readonly envVarToConfigKey: Record<string, string>;
  readonly schema: Record<string, unknown>;
  readonly defaultConfig: Record<string, unknown>;
}

export interface BundlerPlugin {
  bundle(): Promise<LocalBundle[]>;
}

export interface ServerPlugin {
  launchServer(opts?: ServerOpts): Promise<void>;
}

export interface ServerOpts {
  host?: string;
  port?: number;
  rest?: string[];
}

export interface GeneratorPlugin {
  generate({
    id,
    type,
  }: {
    id: string;
    type: LiveBundleContentType;
  }): Promise<Record<string, unknown>>;
}

export interface StoragePlugin {
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
export interface NotifierPlugin {
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

export type NamedBundlerPlugin = BundlerPlugin & Named;
export type NamedStoragePlugin = StoragePlugin & Named;
export type NamedGeneratorPlugin = GeneratorPlugin & Named;
export type NamedNotifierPlugin = NotifierPlugin & Named;
export type NamedServerPlugin = ServerPlugin & Named;
