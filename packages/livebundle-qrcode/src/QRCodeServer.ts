import debug from "debug";
import express from "express";
import qrcode from "qrcode";
import { Config } from "./types";

const log = debug("livebundle-qrcode:QRCodeServer");

export class QRCodeServer {
  public readonly app: express.Application;
  public readonly config: Config;

  constructor(public readonly conf: Config) {
    log(`Server config : ${JSON.stringify(conf, null, 2)}`);
    this.config = conf;
    this.app = express();
    this.createAppRoutes();
  }

  public start(): void {
    const { host, port } = this.config.server;
    this.app.listen(port, host, () => {
      log(`QRCode server started on ${host}:${port}`);
    });
  }

  private createAppRoutes() {
    this.app.get("/:content", (req, res) => {
      const { content } = req.params;
      const { margin, width }: { margin?: string; width?: string } = req.query;
      const { margin: defaultMargin, width: defaultWidth } = this.config.qrcode;
      log(`Encoding ${content}`);
      res.writeHead(200, {
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
