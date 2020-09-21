import { Platform } from "livebundle-sdk";

export interface MetroBundlerConfig extends Record<string, unknown> {
  bundles: Bundle[];
}

export interface Bundle {
  dev: boolean;
  entry: string;
  platform: Platform;
}
