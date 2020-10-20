import "mocha";
import { reconciliateConfig, getErrorMessage } from "../src";
import { expect } from "chai";

describe("reconciliateConfig", () => {
  const envVarToConfigKey: Record<string, string> = {
    LB_TEST_PROPA: "propA",
    LB_TEST_PROPB: "propB",
  };

  const finalConfig = {
    propA: "foo",
    propB: "bar",
    propC: "gaz",
  };

  it("should reconciliate missing properties with env vars", () => {
    try {
      process.env.LB_TEST_PROPB = "bar";
      const res = reconciliateConfig({
        curConfig: {
          propA: "foo",
          propC: "gaz",
        },
        envVarToConfigKey,
      });
      expect(res.config).deep.equal(finalConfig);
    } finally {
      delete process.env.LB_TEST_PROPB;
    }
  });

  it("should work if property is present in config but not set as env var", () => {
    const res = reconciliateConfig({
      curConfig: finalConfig,
      envVarToConfigKey,
    });
    expect(res.config).deep.equal(finalConfig);
  });

  it("should not throw if property is missing from config and not set as env var", () => {
    expect(() =>
      reconciliateConfig({
        curConfig: {
          propA: "foo",
          propC: "gaz",
        },
        envVarToConfigKey,
      }),
    ).to.not.throw();
  });

  it("should throw if property is present in config and also set as env var", () => {
    try {
      process.env.LB_TEST_PROPB = "bar";
      expect(() =>
        reconciliateConfig({
          curConfig: finalConfig,
          envVarToConfigKey,
        }),
      ).to.throw();
    } finally {
      delete process.env.LB_TEST_PROPB;
    }
  });
});

describe("getErrorMessage", () => {
  it("should return the correct error message [ambiguous props]", () => {
    const errorMessage = getErrorMessage({
      ambiguousConfigProps: [["LB_TEST_PROPA", "propA"]],
    });
    expect(errorMessage).equal(`=== Ambiguous configuration properties ===
- propA is defined in config as well as environment variable LB_TEST_PROPA
`);
  });

  it("should return the correct error message [no ambiguous props]", () => {
    const errorMessage = getErrorMessage({
      ambiguousConfigProps: [],
    });
    expect(errorMessage).equal("");
  });
});
