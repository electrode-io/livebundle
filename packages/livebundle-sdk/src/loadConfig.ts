import debug from "debug";
import _ from "lodash";
import { loadYamlFile } from "./loadYamlFile";
import { schemaValidate } from "./schemaValidate";

const log = debug("livebundle-sdk:loadConfig");

export async function loadConfig<T extends Record<string, unknown>>({
  config,
  configPath,
  defaultConfig,
  defaultConfigPath,
  refSchemas = [],
  schema,
}: {
  config?: T;
  configPath?: string;
  defaultConfig?: T;
  defaultConfigPath?: string;
  refSchemas?: Record<string, unknown>[];
  schema?: Record<string, unknown>;
}): Promise<T> {
  log(`config: ${JSON.stringify(config, null, 2)}
configPath: ${configPath}
defaultConfig: ${JSON.stringify(defaultConfig, null, 2)}
defaultConfigPath: ${defaultConfigPath}
refSchemas: ${refSchemas.map((s) => s["$id"])}
schema: ${schema && schema["$id"]}`);

  const resolvedDefaultConfig: T =
    defaultConfig ??
    (defaultConfigPath
      ? await loadYamlFile(defaultConfigPath as string)
      : ({} as T));

  const resolvedConfig: T =
    config ??
    (configPath ? await loadYamlFile(configPath as string) : ({} as T));

  const finalConfig: T = _.mergeWith(
    {},
    resolvedDefaultConfig,
    resolvedConfig,
    (objVal, srcVal) => {
      // Do not merge arrays
      if (_.isArray(objVal)) {
        return srcVal;
      }
    },
  ) as T;

  if (schema) {
    schemaValidate({ data: finalConfig, refSchemas, schema });
  }

  return finalConfig;
}
