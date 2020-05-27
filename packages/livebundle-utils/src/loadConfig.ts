import debug from "debug";
import fs from "fs-extra";
import yaml from "js-yaml";
import _ from "lodash";
import path from "path";

const log = debug("livebundle-utils:loadConfig");

export function loadConfig<T>({
  config,
  configPath,
  defaultConfig,
  defaultConfigPath,
  defaultFileName,
}: {
  config?: T;
  configPath?: string;
  defaultConfig?: T;
  defaultConfigPath?: string;
  defaultFileName?: string;
}): T {
  log(`
config: ${JSON.stringify(config, null, 2)}
configPath: ${configPath}
defaultConfig: ${JSON.stringify(config, null, 2)}
defaultConfigPath: ${defaultConfigPath}
defaultFileName: ${defaultFileName}`);

  if (!defaultConfig && defaultConfigPath) {
    const defaultConfigFile = fs.readFileSync(defaultConfigPath, {
      encoding: "utf8",
    });
    defaultConfig = yaml.safeLoad(defaultConfigFile);
  }

  let userConfig = config ?? {};
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

  if (!config && resolvedConfigPath) {
    const userConfigFile = fs.readFileSync(resolvedConfigPath, {
      encoding: "utf8",
    });
    userConfig = yaml.safeLoad(userConfigFile);
  }

  return _.mergeWith({}, defaultConfig ?? {}, userConfig, (objVal, srcVal) => {
    // Do not merge arrays
    if (_.isArray(objVal)) {
      return srcVal;
    }
  }) as T;
}
