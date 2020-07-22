import { createAppAuth } from "@octokit/auth-app";
import { GitHubAppConfig, JWTIssuer } from "./types";

export class JWTIssuerImpl implements JWTIssuer {
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