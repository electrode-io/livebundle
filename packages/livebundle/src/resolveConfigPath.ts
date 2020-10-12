import fs from "fs-extra";
import _ from "lodash";
import path from "path";

export function resolveConfigPath(): string | undefined {
  const paths = [
    path.resolve("livebundle.yml"),
    path.resolve("livebundle.yaml"),
    "/etc/livebundle/livebundle.yml",
    "/etc/livebundle/livebundle.yaml",
    `${process.env.HOME}/livebundle.yml`,
    `${process.env.HOME}/livebundle.yaml`,
  ];

  return _.find(paths, (p) => fs.pathExistsSync(p));
}
