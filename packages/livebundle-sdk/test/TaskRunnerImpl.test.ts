import sinon from "sinon";
import { LiveBundleSdk, TaskRunnerImpl } from "../src";

describe("TaskRunnerImpl", () => {
  describe("execTask", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("should succeed", async () => {
      const a = sandbox.stub();
      const b = sandbox.createStubInstance(LiveBundleSdk);
      const sut = new TaskRunnerImpl((b as unknown) as LiveBundleSdk, {
        exec: a,
      });

      await sut.execTask(
        {
          prepare: { steps: ["yarn install"] },
          bundle: [
            {
              dev: true,
              entry: "index.js",
              platform: "android",
            },
          ],
          upload: {
            url: "http://livebundle-store:3000",
          },
        },
        {
          bundlingCompleted: sandbox.stub(),
          bundlingStarted: sandbox.stub(),
          uploadStarted: sandbox.stub(),
          parseAssetsFunc: sandbox.stub().resolves([]),
        },
      );
    });
  });
});
