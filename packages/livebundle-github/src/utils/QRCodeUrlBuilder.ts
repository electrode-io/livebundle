import qs from "querystring";
import { QrCodeServiceConfig } from "../types";

export class QRCodeUrlBuilder {
  private query = "";

  public constructor(private readonly config: QrCodeServiceConfig) {
    const { margin, width } = config;
    this.query = qs.stringify({ margin, width });
  }

  public buildUrl(qrContent: string): string {
    return `${this.config.url}/${qrContent}?${this.query}`;
  }
}
