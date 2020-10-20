import "mocha";
import MetroBundlerPlugin, {
  BundleAssetsResolver,
  MetroBundlerConfig,
} from "../src";
import sinon from "sinon";
import { ReactNativeAsset } from "livebundle-sdk";
import { expect } from "chai";
import { rejects } from "assert";

class NullBundleAssetsResolver implements BundleAssetsResolver {
  resolveAssets(bundlePath: string): Promise<ReactNativeAsset[]> {
    return Promise.resolve([]);
  }
}

describe("MetroBundlerPlugin", () => {
  const sandbox = sinon.createSandbox();

  const bundlerConfig: MetroBundlerConfig = {
    bundles: [{ dev: true, entry: "index.js", platform: "android" }],
  };

  afterEach(() => {
    sandbox.restore();
  });

  describe("create", () => {
    it("should return an instance of MetroBundlerPlugin", async () => {
      const res = await MetroBundlerPlugin.create(bundlerConfig);
      expect(res).instanceOf(MetroBundlerPlugin);
    });
  });

  describe("bundle", () => {
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

    it("should go through", async () => {
      const spawn = sandbox.stub().returns(spawnRes);
      const sut = new MetroBundlerPlugin(bundlerConfig, {
        bundleAssetsResolver: new NullBundleAssetsResolver(),
        spawn,
      });
      await sut.bundle();
    });

    it("should throw if react-native bundle command exits with a non 0 exit code", async () => {
      const spawn = sandbox
        .stub()
        .returns({ ...spawnRes, on: onCloseEvent(1) });
      const sut = new MetroBundlerPlugin(bundlerConfig, {
        bundleAssetsResolver: new NullBundleAssetsResolver(),
        spawn,
      });
      await rejects(sut.bundle());
    });
  });
});
