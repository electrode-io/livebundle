import { createAppAuth } from "@octokit/auth-app";
import { GitHubAppConfig } from "../types";

export class JWTIssuer {
  public constructor(private readonly config: GitHubAppConfig) {}

  public async createJWT(installationId: number): Promise<string> {
    const {
      appIdentifier: id,
      privateKey,
      clientId,
      clientSecret,
    } = this.config;

    const auth = createAppAuth({
      id,
      privateKey,
      installationId,
      clientId,
      clientSecret,
    });

    const { token } = await auth({ type: "installation" });

    return token;
  }
}
