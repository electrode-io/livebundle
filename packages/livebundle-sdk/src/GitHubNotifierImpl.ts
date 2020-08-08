import { Octokit } from "@octokit/rest";
import fs from "fs-extra";
import { GitHubNotifierConfig, Notifier, Package } from "./types";
export class GitHubNotifierImpl implements Notifier {
  private readonly octokit: Octokit;

  public constructor(private readonly config: GitHubNotifierConfig) {
    this.octokit = new Octokit({
      auth: config.token,
      baseUrl: config.baseUrl,
    });
  }

  public async notify(pkg: Package): Promise<void> {
    const deepLinkUrl = `livebundle://packages?id=${pkg.id}`;
    const body = `### LiveBundle

*QR Code*
<img src="${pkg.links.qrcode}" alt="${pkg.links.qrcode}" />

*Deep Link URL*
\`\`\`
${deepLinkUrl}
\`\`\`
`;

    if (process.env.LB_NOTIFY_GITHUB_PRURL) {
      // Using LB_NOTIFY_GITHUB_PRURL env var
      // In case GitHub actions are not used
      //
      // PR URL format
      // https://github.com/owner/repo/pull/1234
      const re = /^https:\/\/.+\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/;
      const reMatch = process.env.LB_NOTIFY_GITHUB_PRURL.match(re);
      if (reMatch) {
        await this.octokit.issues.createComment({
          owner: reMatch[1],
          repo: reMatch[2],
          issue_number: parseInt(reMatch[3]),
          body,
        });
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
