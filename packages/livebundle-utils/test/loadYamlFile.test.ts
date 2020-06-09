import { rejects } from "assert";
import fs from "fs-extra";
import path from "path";
import { createTmpDir, loadYamlFile } from "../src";

describe("loadYamlFile", () => {
  it("should throw if file does not exist", async () => {
    await rejects(loadYamlFile("/path/does/not/exist/config.yaml"));
  });

  it("should throw if the file is not valid yaml", async () => {
    const filePath = path.join(createTmpDir(), "invalid.yaml");
    fs.writeFileSync(filePath, "}");
    await rejects(loadYamlFile(filePath));
  });
});
