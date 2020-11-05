import { Config, Dependency } from "@react-native-community/cli-types";
import fs from "fs-extra";
import path from "path";

function isValidRNDependency(dep: Dependency) {
  return (
    Object.keys(dep.platforms).filter((key) => Boolean(dep.platforms[key]))
      .length !== 0 ||
    (dep.hooks && Object.keys(dep.hooks).length !== 0) ||
    (dep.assets && dep.assets.length !== 0) ||
    (dep.params && dep.params.length !== 0)
  );
}

function filterConfig(config: Config) {
  const filtered = { ...config };
  Object.keys(filtered.dependencies).forEach((item) => {
    if (!isValidRNDependency(filtered.dependencies[item])) {
      delete filtered.dependencies[item];
    }
  });
  return filtered;
}

export async function getNativeModules(): Promise<Record<string, string>> {
  const loadConfig = await import(
    `${process.cwd()}/node_modules/@react-native-community/cli/build/tools/config`
  );
  const conf = filterConfig(loadConfig.default());
  const res: Record<string, string> = {};
  for (const k of Object.keys(conf.dependencies)) {
    const name = conf.dependencies[k].name;
    const pJson = await fs.readJSON(
      path.resolve(conf.dependencies[k].root, "package.json"),
    );
    const version = pJson.version;
    res[name] = version;
  }
  return res;
}
