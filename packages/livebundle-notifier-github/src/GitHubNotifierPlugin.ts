import debug from "debug";
import { GitHubNotifierConfig } from "./types";
import { LiveBundleContentType, Package, NotifierPlugin } from "livebundle-sdk";
import fs from "fs-extra";
import { Octokit } from "@octokit/rest";

const log = debug("livebundle-notifier-github:GitHubNotifierPlugin");

export class GitHubNotifierPlugin implements NotifierPlugin {
  private readonly octokit: Octokit;

  public constructor(
    private readonly config: GitHubNotifierConfig,
    { octokit }: { octokit?: Octokit } = {},
  ) {
    this.octokit =
      octokit ??
      new Octokit({
        auth: config.token,
        baseUrl: config.baseUrl,
      });
  }

  public static readonly envVarToConfigKey: Record<string, string> = {
    LB_NOTIFIER_GITHUB_TOKEN: "token",
  };

  public static async create(
    config: GitHubNotifierConfig,
  ): Promise<GitHubNotifierPlugin> {
    return new GitHubNotifierPlugin(config);
  }

  public async notify({
    generators,
    pkg,
    type,
  }: {
    generators: Record<string, Record<string, unknown>>;
    pkg?: Package;
    type: LiveBundleContentType;
  }): Promise<void> {
    log(
      `notify(generators: ${JSON.stringify(
        generators,
        null,
        2,
      )}, pkg: ${JSON.stringify(pkg, null, 2)}, type: ${type})`,
    );

    if (type === LiveBundleContentType.SESSION) {
      return Promise.resolve();
    }

    const deepLinkUrl = generators.deeplink?.deepLinkUrl;
    const qrCodeImageUrl = generators.qrcode?.remoteImagePath;

    let qrcodeContent;
    if (qrCodeImageUrl) {
      qrcodeContent = `*QR Code*
<img src="${qrCodeImageUrl}" alt="${qrCodeImageUrl}" />`;
    }

    let deepLinkContent;
    if (deepLinkUrl) {
      deepLinkContent = `*Deep Link URL*
\`\`\`
${deepLinkUrl}
\`\`\`
`;
    }

    const body = `### LiveBundle
${qrcodeContent ?? ""}
${deepLinkContent ?? ""}
`;

    if (process.env.LB_NOTIFIER_GITHUB_PRURL) {
      // Using LB_NOTIFIER_GITHUB_PRURL env var
      // In case GitHub actions are not used
      //
      // PR URL format
      // https://github.com/owner/repo/pull/1234
      const re = /^https:\/\/.+\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/;
      const reMatch = process.env.LB_NOTIFIER_GITHUB_PRURL.match(re);
      if (reMatch) {
        await this.octokit.issues.createComment({
          owner: reMatch[1],
          repo: reMatch[2],
          issue_number: parseInt(reMatch[3]),
          body,
        });
      } else {
        console.error(
          `Invalid LB_NOTIFIER_GITHUB_PRURL format : ${process.env.LB_NOTIFIER_GITHUB_PRURL}
Skipping GitHub PR notification`,
        );
      }
    } else if (process.env.GITHUB_EVENT_PATH) {
      // Using GITHUB_EVENT_PATH env var
      // In case GitHub actions are used
      const eventJson = await fs.readFile(process.env.GITHUB_EVENT_PATH, {
        encoding: "utf8",
      });
      const event = JSON.parse(eventJson);
      const { repository, number } = event;
      await this.octokit.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: number,
        body,
      });
    }
  }
}
