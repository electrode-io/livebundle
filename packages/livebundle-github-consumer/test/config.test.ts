import { doesNotReject } from "assert";
import { taskSchema } from "livebundle-sdk";
import { loadConfig } from "livebundle-utils";
import "mocha";
import path from "path";
import { configSchema } from "../src/schemas";

describe("config", () => {
  it("should not fail loading default config", async () => {
    await doesNotReject(
      loadConfig({
        configPath: path.resolve(__dirname, "../config/default.yaml"),
        refSchemas: [taskSchema],
        schema: configSchema,
      }),
    );
  });

  it("should not fail loading sample config", async () => {
    await doesNotReject(
      loadConfig({
        configPath: path.resolve(__dirname, "../config/sample.yaml"),
        refSchemas: [taskSchema],
        schema: configSchema,
      }),
    );
  });
});
