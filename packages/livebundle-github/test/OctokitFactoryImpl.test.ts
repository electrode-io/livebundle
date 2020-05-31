import { Octokit } from "@octokit/rest";
import { expect } from "chai";
import { OctokitFactoryImpl } from "../src";
import { JWTIssuer } from "../src/types";

describe("OctokitFactoryImpl", () => {
  const jwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.\
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.\
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

  class JWTIssuerTestImpl implements JWTIssuer {
    public createJWT(installationId: number): Promise<string> {
      return Promise.resolve(jwt);
    }
  }

  describe("create", () => {
    it("should create a new Octokit instance", async () => {
      const sut = new OctokitFactoryImpl(new JWTIssuerTestImpl());
      const octokit = await sut.create(1296269);
      expect(octokit).instanceOf(Octokit);
    });
  });
});
