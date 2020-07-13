import debug from "debug";
import express from "express";
import http from "http";
import { AddressInfo } from "net";
import qrcode from "qrcode";
import { Config } from "./types";

export class QRCodeServer {
  private readonly app: express.Application;
  private server: http.Server;

  private readonly log = debug("livebundle-qrcode:QRCodeServer");

  constructor(private readonly config: Config) {
    this.log(`Server config : ${JSON.stringify(config, null, 2)}`);
    this.app = express();
    this.createAppRoutes();
  }

  public get address(): string {
    if (!this.server) {
      throw new Error("Server is not started");
    }
    return (this.server.address() as AddressInfo).address;
  }

  public get port(): number {
    if (!this.server) {
      throw new Error("Server is not started");
    }
    return (this.server.address() as AddressInfo).port;
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      const { host, port } = this.config.server;
      this.server =
        this.server ??
        this.app.listen(port, host, () => {
          this.log(`QRCode server started on ${host}:${port}`);
          resolve();
        });
    });
  }

  public stop(): void {
    this.server && this.server.close();
  }

  private createAppRoutes() {
    this.app.get("/:content", (req, res) => {
      const { content } = req.params;
      const { margin, width }: { margin?: string; width?: string } = req.query;
      const { margin: defaultMargin, width: defaultWidth } = this.config.qrcode;
      this.log(`Encoding ${content}`);
      res.writeHead(200, {
        "Cache-Control": "public, max-age=604800, immutable",
        "Content-Type": "image/png",
      });
      qrcode.toFileStream(res, content, {
        margin: margin ? parseInt(margin, 10) : defaultMargin,
        width: width ? parseInt(width, 10) : defaultWidth,
      });
      res.on("close", () => res.end());
    });
  }
}
