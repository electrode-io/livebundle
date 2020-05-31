import * as octokitAuth from "@octokit/auth-app";
import { expect } from "chai";
import sinon from "sinon";
import { JWTIssuerImpl } from "../src";
describe("JWTIssuerImpl", () => {
  const sandbox = sinon.createSandbox();

  describe("createJWT", () => {
    it("should work", async () => {
      const expectedToken = "abcdef";
      sandbox
        .stub(octokitAuth, "createAppAuth")
        // @ts-ignore
        .returns(() => Promise.resolve({ token: expectedToken }));

      const sut = new JWTIssuerImpl({
        appIdentifier: 65645,
        privateKey: `-----BEGIN RSA PRIVATE KEY-----`,
        clientId: " Iv1.04849b1cb72ad0fa",
        clientSecret: "14c640bb4946970807366672ba6bb077c7de7009",
      });
      const token = await sut.createJWT(123456);
      expect(token).equal(expectedToken);
    });
  });
});
