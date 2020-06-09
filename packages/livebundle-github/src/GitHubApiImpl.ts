import { ExecCmd, GitHubApi, JWTIssuer, OctokitFactory } from "./types";

export class GitHubApiImpl implements GitHubApi {
  public constructor(
    private readonly jwtIssuer: JWTIssuer,
    private readonly octokitFactory: OctokitFactory,
    private readonly execCmd: ExecCmd,
  ) {}

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
