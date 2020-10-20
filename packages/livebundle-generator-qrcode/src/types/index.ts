export interface QrCodeGeneratorConfig {
  image: QrCodeGeneratorImageConfig;
}

export interface QrCodeGeneratorImageConfig {
  margin: number;
  width: number;
  path: string;
}

export interface QrCodeGeneratorResult extends Record<string, unknown> {
  localImagePath: string;
  remoteImagePath: string;
  terminalImage: string;
}
