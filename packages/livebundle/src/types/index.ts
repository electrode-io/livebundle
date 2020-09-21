export interface Config extends Record<string, unknown> {
  bundler: Record<string, unknown>;
  storage: Record<string, unknown>;
  generators: Record<string, unknown>;
  notifiers: Record<string, unknown>;
}
