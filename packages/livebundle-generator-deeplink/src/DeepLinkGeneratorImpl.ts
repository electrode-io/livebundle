import debug from "debug";
import { DeepLinkGeneratorResult } from "./types";
import { LiveBundleContentType, GeneratorPlugin } from "livebundle-sdk";

const log = debug("livebundle-generator-deeplink:DeepLinkGeneratorImpl");

export class DeepLinkGeneratorImpl implements GeneratorPlugin {
  public static async create(): Promise<DeepLinkGeneratorImpl> {
    return new DeepLinkGeneratorImpl();
  }

  async generate({
    id,
    type,
  }: {
    id: string;
    type: LiveBundleContentType;
  }): Promise<DeepLinkGeneratorResult> {
    log(`generate(id: ${id}, type: ${type})`);
    return type === LiveBundleContentType.PACKAGE
      ? { deepLinkUrl: `livebundle://packages?id=${id}` }
      : { deepLinkUrl: `livebundle://sessions?id=${id}` };
  }
}
