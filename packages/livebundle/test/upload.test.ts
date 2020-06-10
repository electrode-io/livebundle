import { expect } from "chai";
import * as sdk from "livebundle-sdk";
import { BundleTask, CliBundle, parseAssetsFile } from "livebundle-sdk";
import type { Package } from "livebundle-store";
import { loadConfig } from "livebundle-utils";
import "mocha";
import path from "path";
import sinon from "sinon";
import { Config } from "../src/types";
import { upload } from "../src/upload";

describe("upload", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it("should go through", async () => {
    const defaultConfigPath = path.resolve(__dirname, "../config/default.yaml");

    const conf = await loadConfig<Config>({
      defaultConfigPath,
      defaultFileName: "livebundle",
    });

    const pkg: Package = {
      id: "c1150afc-a9c3-11ea-ae16-6781412c6775",
      bundles: [
        {
          dev: true,
          platform: "android",
          sourceMap: "d7234084-a9c3-11ea-96eb-8b7599b91a40",
          id: "ddfc3672-a9c3-11ea-9994-0b1552c573a2",
        },
      ],
      timestamp: 1591646945250,
    };
    sandbox.stub(sdk.TaskRunnerImpl.prototype, "execTask").callsFake(
      (
        task,
        {
          bundlingStarted,
          bundlingCompleted,
          uploadStarted,
          cwd = process.cwd(),
          parseAssetsFunc = parseAssetsFile,
        }: {
          bundlingStarted?: (bundle: BundleTask) => void;
          bundlingCompleted?: (bundle: BundleTask) => void;
          uploadStarted?: ({ bundles }: { bundles: CliBundle[] }) => void;
          cwd?: string;
          parseAssetsFunc?: typeof parseAssetsFile;
        },
      ) => {
        const tsk: BundleTask = {
          dev: true,
          entry: "index.js",
          platform: "android",
        };
        bundlingStarted && bundlingStarted(tsk);
        bundlingCompleted && bundlingCompleted(tsk);
        uploadStarted && uploadStarted({ bundles: [] });
        return Promise.resolve(pkg);
      },
    );

    const res = await upload(conf, {
      enableSpinners: false,
    });
    expect(res).deep.equal(pkg);
  });
});
