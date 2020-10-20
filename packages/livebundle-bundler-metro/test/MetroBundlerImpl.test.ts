import "mocha";
import MetroBundlerImpl, {
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

describe("MetroBundlerImpl", () => {
  const sandbox = sinon.createSandbox();

  const bundlerConfig: MetroBundlerConfig = {
    bundles: [{ dev: true, entry: "index.js", platform: "android" }],
  };

  afterEach(() => {
    sandbox.restore();
  });

  describe("create", () => {
    it("should return an instance of MetroBundlerImpl", async () => {
      const res = await MetroBundlerImpl.create(bundlerConfig);
      expect(res).instanceOf(MetroBundlerImpl);
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
      const sut = new MetroBundlerImpl(bundlerConfig, {
        bundleAssetsResolver: new NullBundleAssetsResolver(),
        spawn,
      });
      await sut.bundle();
    });

    it("should throw if react-native bundle command exits with a non 0 exit code", async () => {
      const spawn = sandbox
        .stub()
        .returns({ ...spawnRes, on: onCloseEvent(1) });
      const sut = new MetroBundlerImpl(bundlerConfig, {
        bundleAssetsResolver: new NullBundleAssetsResolver(),
        spawn,
      });
      await rejects(sut.bundle());
    });
  });
});
