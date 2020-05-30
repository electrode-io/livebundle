import { doesNotReject } from "assert";
import { loadConfig } from "livebundle-utils";
import "mocha";
import path from "path";
import { configSchema } from "../src/schemas";

describe("config", () => {
  it("should not fail loading default config", async () => {
    await doesNotReject(
      loadConfig({
        configPath: path.resolve(__dirname, "../config/default.yaml"),
        schema: configSchema,
      }),
    );
  });
});
