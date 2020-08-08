import {
  AzureStorageImpl,
  GitHubNotifierImpl,
  Notifier,
  Package,
  TaskRunnerImpl,
  UploaderImpl,
} from "livebundle-sdk";
import emoji from "node-emoji";
import ora from "ora";
import { Config } from "./types";

export async function upload(
  conf: Config,
  { enableSpinners = true }: { enableSpinners?: boolean } = {},
): Promise<Package> {
  const azureStorage = new AzureStorageImpl(conf.task.upload.azure);

  let notifier: Notifier | undefined;
  if (conf.task.notify?.github) {
    if (!conf.task.notify.github.token) {
      if (!process.env["LB_NOTIFY_GITHUB_TOKEN"]) {
        throw new Error("Missing GitHub token");
      }
      conf.task.notify.github.token = process.env["LB_NOTIFY_GITHUB_TOKEN"];
    }

    notifier = new GitHubNotifierImpl(conf.task.notify.github);
  }

  const uploader = new UploaderImpl(azureStorage);
  let spinner: ora.Ora | undefined;

  const res = await new TaskRunnerImpl(uploader, notifier).execTask(conf.task, {
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
