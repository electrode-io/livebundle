import { ExecCmd, GitHubApi, JWTIssuer, OctokitFactory } from "./types";

export class GitHubApiImpl implements GitHubApi {
  public constructor(
    private readonly jwtIssuer: JWTIssuer,
    private readonly octokitFactory: OctokitFactory,
    private readonly execCmd: ExecCmd,
  ) {}

  public async getPrChangedFiles({
    installationId,
    owner,
    repo,
    pull_number,
  }: {
    installationId: number;
    owner: string;
    repo: string;
    pull_number: number;
  }): Promise<string[]> {
    const octokit = await this.octokitFactory.create(installationId);
    let result: string[] = [];
    for (let page = 1; page <= 30; page++) {
      const response = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number,
        per_page: 100,
        page,
      });
      const changedFiles = response.data;
      if (!changedFiles || changedFiles.length === 0) {
        break;
      }
      result = result.concat(response.data.map((x) => x.filename));
    }
    return result;
  }

  public async createComment({
    installationId,
    owner,
    repo,
    issueNumber,
    comment,
  }: {
    installationId: number;
    owner: string;
    repo: string;
    issueNumber: number;
    comment: string;
  }): Promise<void> {
    const octokit = await this.octokitFactory.create(installationId);
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body: comment,
    });
  }

  public async cloneRepoAndCheckoutPr({
    installationId,
    owner,
    repo,
    prNumber,
  }: {
    installationId: number;
    owner: string;
    repo: string;
    prNumber: number;
  }): Promise<void> {
    const jwt = await this.jwtIssuer.createJWT(installationId);
    // Convert these guys to async !
    this.execCmd.exec(
      `git clone https://x-access-token:${jwt}@github.com/${owner}/${repo}.git .`,
      `git fetch origin pull/${prNumber}/head`,
      "git checkout FETCH_HEAD",
    );
  }
}
