import "mocha";
import MetroBundlerImpl, { MetroBundlerConfig } from "../src";
import { v4 as uuidv4 } from "uuid";
import sinon from "sinon";
import {
  LocalBundle,
  Package,
  Uploader,
  ReactNativeAsset,
} from "livebundle-sdk";
import { expect } from "chai";
import { rejects } from "assert";

class NullUploader implements Uploader {
  uploadPackage({ bundles }: { bundles: LocalBundle[] }): Promise<Package> {
    return Promise.resolve({
      id: uuidv4(),
      bundles: [],
      timestamp: Date.now(),
    });
  }
  uploadAssets(assets: ReactNativeAsset[]): Promise<void> {
    return Promise.resolve();
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
      const res = await MetroBundlerImpl.create(
        bundlerConfig,
        new NullUploader(),
      );
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

      const sut = new MetroBundlerImpl(bundlerConfig, new NullUploader(), {
        spawn,
        parseAssetsFunc: async () => Promise.resolve([]),
      });
      await sut.bundle();
    });

    it("should throw if react-native bundle command exits with a non 0 exit code", async () => {
      const spawn = sandbox
        .stub()
        .returns({ ...spawnRes, on: onCloseEvent(1) });

      const sut = new MetroBundlerImpl(bundlerConfig, new NullUploader(), {
        spawn,
        parseAssetsFunc: async () => Promise.resolve([]),
      });
      await rejects(sut.bundle());
    });
  });
});
