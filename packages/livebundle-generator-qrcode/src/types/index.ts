import { ServerConfig } from "livebundle-sdk/src";

export interface QrCodeGeneratorConfig {
  image: QrCodeGeneratorImageConfig;
}

export interface QrCodeGeneratorImageConfig {
  margin: number;
  width: number;
  path: string;
}

export interface QrCodeGeneratorResult {
  localImagePath: string;
  remoteImagePath: string;
  terminalImage: string;
}
