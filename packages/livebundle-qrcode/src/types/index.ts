export interface Config extends Record<string, unknown> {
  server: ServerConfig;
  qrcode: QRCodeConfig;
}

export interface ServerConfig {
  host: string;
  port: number;
}

export interface QRCodeConfig {
  margin: number;
  width: number;
}
