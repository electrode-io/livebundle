import {
  LiveBundleHttpCli,
  LiveBundleSdk,
  TaskRunnerImpl,
} from "livebundle-sdk";
import type { Package } from "livebundle-store";
import emoji from "node-emoji";
import ora from "ora";
import { Config } from "./types";

export async function upload(
  conf: Config,
  { enableSpinners = true }: { enableSpinners?: boolean } = {},
): Promise<Package> {
  const httpCli = new LiveBundleHttpCli(conf.task.upload.url);
  const sdk = new LiveBundleSdk(httpCli);
  let spinner: ora.Ora | undefined;

  const res = await new TaskRunnerImpl(sdk).execTask(conf.task, {
    bundlingStarted: (bundle) => {
      spinner = ora({ isEnabled: !!enableSpinners });
      spinner.start(
        `Creating ${bundle.platform} ${bundle.dev ? "dev" : "prod"} bundle`,
      );
    },
    bundlingCompleted: (bundle) => {
      spinner?.stopAndPersist({
        symbol: emoji.get("package"),
        text: `Created ${bundle.platform} ${
          bundle.dev ? "dev" : "prod"
        } bundle`,
      });
    },
    uploadStarted: () => {
      spinner = ora({ isEnabled: !!enableSpinners });
      spinner.start("Uploading LiveBundle package");
    },
  });

  spinner?.stopAndPersist({
    symbol: emoji.get("rocket"),
    text: `Uploaded LiveBundle package`,
  });

  return res;
}
