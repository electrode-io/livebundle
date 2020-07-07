import { Octokit } from "@octokit/rest";
import { JWTIssuer, OctokitFactory } from "./types";

export class OctokitFactoryImpl implements OctokitFactory {
  public constructor(private readonly jwtIssuer: JWTIssuer) {}

  public async create(installationId: number): Promise<Octokit> {
    const jwt = await this.jwtIssuer.createJWT(installationId);
    return new Octokit({ auth: `Bearer ${jwt}` });
  }
}
