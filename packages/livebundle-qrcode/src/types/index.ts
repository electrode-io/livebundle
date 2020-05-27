export interface Config {
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
