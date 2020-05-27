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

export interface Config {
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
