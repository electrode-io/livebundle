import { expect } from "chai";
import fs from "fs-extra";
import "mocha";
import path from "path";
import sinon from "sinon";
import program from "../src/program";
import { LiveBundleConfig, LiveBundle } from "livebundle-sdk";
import tmp from "tmp";

class FakeLiveBundle implements LiveBundle {
  public async upload(config: LiveBundleConfig): Promise<void> {
    return Promise.resolve();
  }
  public async live(config: LiveBundleConfig): Promise<void> {
    return Promise.resolve();
  }
}

describe("program", () => {
  const sandbox = sinon.createSandbox();
  let initialCwd: string;

  beforeEach(() => {
    initialCwd = process.cwd();
  });

  afterEach(() => {
    try {
      fs.unlinkSync(path.join(process.cwd(), "livebundle.yaml"));
    } catch (e) {
      // noop
    }
    process.chdir(initialCwd);
    sandbox.restore();
  });

  it("should return package version", () => {
    const packageVersion = fs.readJSONSync(
      path.resolve(__dirname, "../package.json"),
    ).version;
    const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
    expect(() => sut.parse(["node", "livebundle", "--version"])).to.throw(
      packageVersion,
    );
  });

  describe("upload command", () => {
    it("should go through", async () => {
      sandbox.stub(console, "log");
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "upload",
        "--config",
        "config/default.yaml",
      ]);
    });

    it("should not throw if the config is invalid", async () => {
      sandbox.stub(console, "error");
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "upload",
        "--config",
        path.join(__dirname, "fixtures/invalid.config.yaml"),
      ]);
    });

    it("should log an error to the console if the config is invalid", async () => {
      const consoleErrorStub = sandbox.stub(console, "error");
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "upload",
        "--config",
        path.join(__dirname, "fixtures/invalid.config.yaml"),
      ]);
      sinon.assert.calledOnce(consoleErrorStub);
    });

    it("should log an error to the console if the config is missing", async () => {
      const consoleErrorStub = sandbox.stub(console, "error");
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync(["node", "livebundle", "upload"]);
      sinon.assert.calledOnce(consoleErrorStub);
    });

    it("should load the configuration from cwd if config is not explicitely supplied", async () => {
      fs.writeFileSync(
        path.join(process.cwd(), "livebundle.yaml"),
        fs.readFileSync(path.resolve(__dirname, "../config/default.yaml")),
      );
      sandbox.stub(console, "log");
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync(["node", "livebundle", "upload"]);
    });

    it("should not throw if the livebundle upload fails", async () => {
      const lbStub = sandbox.createStubInstance(FakeLiveBundle);
      lbStub.upload.rejects("boom");
      const sut = program({ livebundle: lbStub }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "upload",
        "--config",
        "config/default.yaml",
      ]);
    });

    it("should use user supplied cwd (--cwd option)", async () => {
      sandbox.stub(console, "log");
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "upload",
        "--config",
        "config/default.yaml",
        "--cwd",
        tmpDir,
      ]);
      expect(fs.realpathSync(process.cwd())).eql(fs.realpathSync(tmpDir));
    });
  });

  describe("live command", () => {
    it("should go through", async () => {
      sandbox.stub(console, "log");
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "live",
        "--config",
        "config/default.yaml",
      ]);
    });

    it("should not throw if the config is invalid", async () => {
      sandbox.stub(console, "error");
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "live",
        "--config",
        path.join(__dirname, "fixtures/invalid.config.yaml"),
      ]);
    });

    it("should log an error to the console if the config is invalid", async () => {
      const consoleErrorStub = sandbox.stub(console, "error");
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "live",
        "--config",
        path.join(__dirname, "fixtures/invalid.config.yaml"),
      ]);
      sinon.assert.calledOnce(consoleErrorStub);
    });

    it("should not throw if the livebundle upload fails", async () => {
      const lbStub = sandbox.createStubInstance(FakeLiveBundle);
      lbStub.live.rejects("boom");
      const sut = program({ livebundle: lbStub }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "live",
        "--config",
        "config/default.yaml",
      ]);
    });

    it("should use user supplied cwd (--cwd option)", async () => {
      sandbox.stub(console, "log");
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "live",
        "--config",
        "config/default.yaml",
        "--cwd",
        tmpDir,
      ]);
      expect(fs.realpathSync(process.cwd())).eql(fs.realpathSync(tmpDir));
    });
  });

  describe("init command", () => {
    it("should create a livebundle.yaml config", async () => {
      sandbox.stub(console, "log");
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;

      process.chdir(tmpDir);
      const sut = program({
        livebundle: new FakeLiveBundle(),
      }).exitOverride();
      await sut.parseAsync(["node", "livebundle", "init"]);
      expect(fs.existsSync(path.join(tmpDir, "livebundle.yaml"))).true;
    });

    it("should log to console.error if livebundle.yaml already exist", async () => {
      const consoleErrorStub = sandbox.stub(console, "error");
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      fs.writeFileSync(path.join(tmpDir, "livebundle.yaml"), "");

      process.chdir(tmpDir);
      const sut = program({
        livebundle: new FakeLiveBundle(),
      }).exitOverride();
      await sut.parseAsync(["node", "livebundle", "init"]);
      sinon.assert.calledOnce(consoleErrorStub);
    });

    it("should use user supplied cwd (--cwd option)", async () => {
      sandbox.stub(console, "log");
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      const sut = program({ livebundle: new FakeLiveBundle() }).exitOverride();
      await sut.parseAsync([
        "node",
        "livebundle",
        "init",
        "--cwd",
        tmpDir,
      ]);
      expect(fs.realpathSync(process.cwd())).eql(fs.realpathSync(tmpDir));
    });
  });
});
