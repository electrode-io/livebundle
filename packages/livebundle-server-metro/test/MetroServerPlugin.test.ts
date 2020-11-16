import "mocha";
import MetroServerPlugin from "../src";
import sinon from "sinon";
import { ReactNativeAsset } from "livebundle-sdk";
import { expect } from "chai";
import { rejects } from "assert";
import fs from "fs-extra";

describe("MetroServerPlugin", () => {
  const sandbox = sinon.createSandbox();

  const onCloseEvent = (code: number) => (
    e: string,
    cb: (code: number) => void,
  ) => {
    if (e === "close") {
      cb(code);
    }
  };

  const onDataEvent = (e: string, cb: (data: string) => void) => {
    if (e === "data") {
      cb("foo");
    }
  };

  const spawnRes = {
    stdout: {
      on: onDataEvent,
    },
    stderr: {
      on: onDataEvent,
    },
    on: onCloseEvent(0),
  };

  afterEach(() => {
    sandbox.restore();
  });

  describe("create", () => {
    it("should return an instance of MetroServerPlugin", async () => {
      const res = await MetroServerPlugin.create();
      expect(res).instanceOf(MetroServerPlugin);
    });
  });

  describe("buildCommandArgs", () => {
    it("should return the constructed command args [host/port provided]", () => {
      const spawn = sandbox.stub().returns(spawnRes);
      const sut = new MetroServerPlugin({ spawn });
      const args = sut.buildCommandArgs({ host: "1.2.3.4", port: 8086 });
      expect(args).deep.equal(["--host", "1.2.3.4", "--port", "8086"]);
    });

    it("should return the constructed command args [rest provided]", () => {
      const spawn = sandbox.stub().returns(spawnRes);
      const sut = new MetroServerPlugin({ spawn });
      const args = sut.buildCommandArgs({
        rest: ["--reset-cache", "--max-workers", "10"],
      });
      expect(args).deep.equal(["--reset-cache", "--max-workers", "10"]);
    });

    it("should return the constructed command args [host/port/rest provided]", () => {
      const spawn = sandbox.stub().returns(spawnRes);
      const sut = new MetroServerPlugin({ spawn });
      const args = sut.buildCommandArgs({
        host: "1.2.3.4",
        port: 8086,
        rest: ["--reset-cache", "--max-workers", "10"],
      });
      expect(args).deep.equal([
        "--reset-cache",
        "--max-workers",
        "10",
        "--host",
        "1.2.3.4",
        "--port",
        "8086",
      ]);
    });
  });

  describe("createPackagerScript", () => {
    it("should write the correct script content", async () => {
      const spawn = sandbox.stub().returns(spawnRes);
      const sut = new MetroServerPlugin({ spawn });
      const scriptPath = await sut.createStartPackagerScript({
        cwd: process.cwd(),
        args: ["--port", "8086", "--reset-cache"],
        scriptFileName: "packager.sh",
      });
      const scriptContent = await fs.readFile(scriptPath, "utf-8");
      expect(scriptContent).equal(`cd ${process.cwd()}
echo "Running npx react-native start --port 8086 --reset-cache"
npx react-native start --port 8086 --reset-cache
`);
    });
  });

  describe("darwinStartPackagerInNewWindow", () => {
    it("should go through", async () => {
      const spawn = sandbox.stub().returns(spawnRes);
      const sut = new MetroServerPlugin({ spawn });
      await sut.darwinStartPackagerInNewWindow();
    });
  });

  describe("launchServer", () => {
    it("should go through", async () => {
      const spawn = sandbox.stub().returns(spawnRes);
      const sut = new MetroServerPlugin({ spawn });
      await sut.launchServer();
    });
  })

  // describe("bundle", () => {

  //   it("should go through", async () => {
  //     const spawn = sandbox.stub().returns(spawnRes);
  //     const sut = new MetroBundlerPlugin(bundlerConfig, {
  //       bundleAssetsResolver: new NullBundleAssetsResolver(),
  //       spawn,
  //     });
  //     await sut.bundle();
  //   });

  //   it("should throw if react-native bundle command exits with a non 0 exit code", async () => {
  //     const spawn = sandbox
  //       .stub()
  //       .returns({ ...spawnRes, on: onCloseEvent(1) });
  //     const sut = new MetroBundlerPlugin(bundlerConfig, {
  //       bundleAssetsResolver: new NullBundleAssetsResolver(),
  //       spawn,
  //     });
  //     await rejects(sut.bundle());
  //   });
  // });
});
