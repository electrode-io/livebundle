import { expect } from "chai";
import { schemaValidate } from "../src";

describe("schemaValidate", () => {
  it("should throw if the schema is invalid", () => {
    expect(() =>
      schemaValidate({
        data: {},
        schema: {
          properties: {
            foo: {
              $async: true,
              type: "string",
              maxLength: 3,
            },
          },
        },
      }),
    ).to.throw();
  });

  it("should throw if the data does not match the schema", () => {
    expect(() =>
      schemaValidate({
        data: { a: 0 },
        schema: {
          properties: {
            a: {
              type: "string",
            },
          },
        },
      }),
    ).to.throw();
  });
});
