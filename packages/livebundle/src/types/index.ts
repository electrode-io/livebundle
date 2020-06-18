import { LiveBundleTask } from "livebundle-sdk";

export interface Config {
  qrcode: QRCodeConfig;
  task: LiveBundleTask;
  github?: GitHubConfig;
}
export interface QRCodeConfig {
  term: QRCodeTermConfig;
  image: QRCodeImageConfig;
}

export interface QRCodeTermConfig {
  generate: boolean;
  small: boolean;
}

export interface GitHubConfig {
  ignore?: string[];
  task: LiveBundleTask;
}

export interface QRCodeImageConfig {
  open: boolean;
  generate: boolean;
  margin: number;
  width: number;
}
