import debug from "debug";
import { DeepLinkGeneratorResult, DeepLinkGeneratorConfig } from "./types";
import { LiveBundleContentType, GeneratorPlugin } from "livebundle-sdk";
import { configSchema } from "./schemas";

const log = debug("livebundle-generator-deeplink:DeepLinkGeneratorPlugin");

export class DeepLinkGeneratorPlugin implements GeneratorPlugin {
  public constructor(private readonly config: DeepLinkGeneratorConfig) {}

  public static async create(
    config: DeepLinkGeneratorConfig,
  ): Promise<DeepLinkGeneratorPlugin> {
    return new DeepLinkGeneratorPlugin(config);
  }

  public static readonly defaultConfig: Record<
    string,
    unknown
  > = require("../config/default.json");

  public static readonly schema: Record<string, unknown> = configSchema;

  async generate({
    id,
    type,
  }: {
    id: string;
    type: LiveBundleContentType;
  }): Promise<DeepLinkGeneratorResult> {
    log(`generate(id: ${id}, type: ${type})`);
    return type === LiveBundleContentType.PACKAGE
      ? { deepLinkUrl: `livebundle://${this.config.host}/packages?id=${id}` }
      : { deepLinkUrl: `livebundle://${this.config.host}/sessions?id=${id}` };
  }
}
