import fs from "fs-extra";
import yaml from "js-yaml";

export async function loadYamlFile<T extends Record<string, unknown>>(
  filePath: string,
): Promise<T> {
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`Path to yaml file does not exist (${filePath})`);
  }

  const file = await fs.readFile(filePath, {
    encoding: "utf8",
  });

  try {
    return yaml.safeLoad(file) as T;
  } catch (e) {
    throw new Error(`YAML file load failed (${filePath}): ${e.message}`);
  }
}
