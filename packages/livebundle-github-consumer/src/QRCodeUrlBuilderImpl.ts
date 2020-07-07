import qs from "querystring";
import { QrCodeServiceConfig, QRCodeUrlBuilder } from "./types";

export class QRCodeUrlBuilderImpl implements QRCodeUrlBuilder {
  private query = "";

  public constructor(private readonly config: QrCodeServiceConfig) {
    const { margin, width } = config;
    this.query = qs.stringify({ margin, width });
  }

  public buildUrl(qrContent: string): string {
    return `${this.config.url}/${qrContent}?${this.query}`;
  }
}
