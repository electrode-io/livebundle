import "mocha";
import sinon from "sinon";

describe("index", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it("should not fail importing cli", async () => {
    const argv = process.argv;
    process.argv = ["node", "livebundle", "--help"];
    sandbox.stub(process, "exit");
    require("../src/cli");
    process.argv = argv;
  });
});
