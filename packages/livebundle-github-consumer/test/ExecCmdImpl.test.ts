import { expect } from "chai";
import child_process from "child_process";
import sinon from "sinon";
import { ExecCmdImpl } from "../src/ExecCmdImpl";

describe("ExecCmdImpl", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("exec", () => {
    it("should exec all provided commands", () => {
      const stub = sandbox
        .stub(child_process, "execSync")
        .callsFake(() => Buffer.from(""));
      const sut = new ExecCmdImpl();
      const cmds = ["echo hello", "echo world"];
      sut.exec(...cmds);
      expect(stub.getCall(0).calledWith(cmds[0])).true;
      expect(stub.getCall(1).calledWith(cmds[1])).true;
    });
  });
});
