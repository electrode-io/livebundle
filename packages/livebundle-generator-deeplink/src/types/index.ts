export interface DeepLinkGeneratorResult extends Record<string, unknown> {
  deepLinkUrl: string;
}
export interface DeepLinkGeneratorConfig extends Record<string, unknown> {
  host: string;
}
