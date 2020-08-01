import debug from "debug";
import fs from "fs-extra";
import _ from "lodash";
import path from "path";
import { loadYamlFile } from "./loadYamlFile";
import { schemaValidate } from "./schemaValidate";

const log = debug("livebundle-utils:loadConfig");

export async function loadConfig<T extends Record<string, unknown>>({
  config,
  configPath,
  defaultConfig,
  defaultConfigPath,
  defaultFileName,
  refSchemas = [],
  schema,
}: {
  config?: T;
  configPath?: string;
  defaultConfig?: T;
  defaultConfigPath?: string;
  defaultFileName?: string;
  refSchemas?: Record<string, unknown>[];
  schema?: Record<string, unknown>;
}): Promise<T> {
  log(`config: ${JSON.stringify(config, null, 2)}
configPath: ${configPath}
defaultConfig: ${JSON.stringify(defaultConfig, null, 2)}
defaultConfigPath: ${defaultConfigPath}
defaultFileName: ${defaultFileName}
refSchemas: ${refSchemas.map((s) => s["$id"])}
schema: ${schema && schema["$id"]}`);

  const resolvedDefaultConfig: T =
    defaultConfig ??
    (defaultConfigPath
      ? await loadYamlFile(defaultConfigPath as string)
      : ({} as T));

  const paths = configPath
    ? [configPath]
    : [
        path.resolve(`${defaultFileName}.yml`),
        path.resolve(`${defaultFileName}.yaml`),
        `/etc/livebundle/${defaultFileName}.yml`,
        `/etc/livebundle/${defaultFileName}.yaml`,
        `${process.env.HOME}/${defaultFileName}.yml`,
        `${process.env.HOME}/${defaultFileName}.yaml`,
      ];

  const resolvedConfigPath = _.find(paths, (p) => fs.pathExistsSync(p));
  log(`resolvedConfigPath: ${resolvedConfigPath}`);

  const resolvedConfig: T =
    config ??
    (resolvedConfigPath
      ? await loadYamlFile(resolvedConfigPath as string)
      : ({} as T));
  if (schema) {
    schemaValidate({ data: resolvedConfig, refSchemas, schema });
  }

  return _.mergeWith(
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
}
