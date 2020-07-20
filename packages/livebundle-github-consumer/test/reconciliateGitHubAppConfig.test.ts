import { expect } from "chai";
import "mocha";
import {
  getErrorMessage,
  reconciliateGitHubAppConfig,
} from "../src/reconciliateGitHubAppConfig";
import { GitHubAppConfig } from "../src/types";

const config: GitHubAppConfig = {
  appIdentifier: 65645,
  clientId: "Iv1.04849b1cb72ad0fa",
  clientSecret: "14c640bb4946970807366672ba6bb077c7de7009",
  privateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA3ddwHEVpGM3OXYNY2jro2bDZWzzuNEzwRxl7pgqwG7eWXEGe
NDC+qwOuyclz/2qtqg83eJ9PvUnaG+vmwdbeu7dzkQuCtKFi4sFMCFbl6fZcbn0u
NTfK5dHjjdaQjEqD+WZsTxec8NzMrMWOeJ07sZ3TsmWjXm3AZVn27Mnk0nnY6WIC
6EwSI80pvDDkUHWrPE/WSHYVJWxsl6KpICAu73i2N2hplG13XEmP1TIMwoktSKB7
h+9au+S3KkCdxXzFyN9hVBUZu8FcvbO8ZPSmb5bGyVw44pFQU9X39iqWZtMpc8V4
A/qIwRYuf6mFcnvdwkpbuZkRJq06VFHeFsDe9wIDAQABAoIBAA+XWpvCDRbfMAfG
eXIs/bx+/2e4Ko2mcqSsl9Idoi7wgjLNsc69NklSovAvpmVnG/l9xEpH+BS3ogqg
U8F/1nue8xJYmsETLp39M9jKMrJ0zB4/0gWPfEUWsUWAtPwHKKtYlXghkrgi7Ieg
AtlbQ5zCGOTK2+aBFCqLXh1aOyjHofBubcX/qMVwKqoC+cHtcqQVa3aAZPyovrt5
M1zlUxWfhA/xqIT0PPSkgMrHZbScSBMMrbQ2JZ1EysySK2Mv43FQPGD5oNYZOyJx
F1q8ZDVXvPsqN/pN3gsQ3wCzRCVgtkIpD2sglND+yte9GwVc3EVLQXIO1dRNYt1A
ea2kBgECgYEA/63lxv6eRND8hIDnTFavdrfARJN9ZQhIPkFzRVS1GCxFKGUwBcCX
Qr1fZsbJ4bm/hnxbrVgRGXv0oTuDrGDjVFvdjCFpK4GP6ZB1nNnRmxLhTTla0uXj
1oh/9LUygPDYqjtxf9RyzzznxA7QumorWw+3wY8X/9Cw6lNIV+cQ04ECgYEA3h6s
sClnniGE8LLqO1RpzNTJbM5vUsrl9zCBfXeQ4lqRKutbmgoKWCSO7hJQjC/qoLip
sjyMc4a5R8RxlEb1yBA0+7PzFUJqS4LSpLjWZzHN6XMmBHihAbC31EHX6Wfsu8De
m81D66w4bdtzmIpEMTWLcmi84LIuKIHL4+MdjncCgYEA67xhNCWEtXxepqjXGap/
Ix2pmZDHN8T4HvZnpo/sXLpMlV8edN9KV42VDYSWklmZvhygxmWBdpa0SYg+8ktu
rlP5I/+WITfXAYlg91pZiPpSYsoz9GljtWSrXWtHgl0N137xOeQeavcD1d+3EXlc
Ohx2127guMuoopRhCjMQb4ECgYEAs81K5vMtYJErpxh9iXdkiZ26S6yz6uY5z6Zh
O+pcyw6bMo4AwandA8rcNJV4xHJJUL8LBzACVcY6F4FKm8fxT3jnGtVpMc1odCW7
VAIX9MMZNx+yJ65qTw75UAXYvKUWukl/Kcm4cH8h0rPxWAqc9uSsM/na41z5BmtD
W/7OPzMCgYBJQtH1vqxkrBcv36k9gLK8jiI/GgTSFf/qMfjuW4WG7oXBGC/wzUSn
bRzItrRRkv6C0Yf7GVZvfmxcXpTy9B6fsH29VmNqRSK8BrvocPaRNlyWYAv5ghQU
f8xyaFUyVTosaxjUs6dY4hzb3EjonfuXZJznV/ThoNhNg+ldpWJI8A==
-----END RSA PRIVATE KEY-----`,
};

describe("reconciliateGitHubAppConfig", () => {
  afterEach(() => {
    delete process.env.LIVEBUNDLE_GITHUB_APPIDENTIFIER;
    delete process.env.LIVEBUNDLE_GITHUB_CLIENTID;
    delete process.env.LIVEBUNDLE_GITHUB_CLIENTSECRET;
    delete process.env.LIVEBUNDLE_GITHUB_PRIVATEKEY;
  });

  it("should return reconciliated config [config only]", () => {
    const res = reconciliateGitHubAppConfig(config);
    expect(res.config).not.undefined;
    expect(res.config).deep.equal(config);
  });

  it("should return reconciliated config [env vars only]", () => {
    process.env.LIVEBUNDLE_GITHUB_APPIDENTIFIER = `${config.appIdentifier}`;
    process.env.LIVEBUNDLE_GITHUB_CLIENTID = config.clientId;
    process.env.LIVEBUNDLE_GITHUB_CLIENTSECRET = config.clientSecret;
    process.env.LIVEBUNDLE_GITHUB_PRIVATEKEY = config.privateKey;
    const res = reconciliateGitHubAppConfig();
    expect(res.config).not.undefined;
    expect(res.config).deep.equal(config);
  });

  it("should return reconciliated config [mix config & env vars]", () => {
    const partialConfig = Object.assign({}, config);
    delete partialConfig.privateKey;
    process.env.LIVEBUNDLE_GITHUB_PRIVATEKEY = config.privateKey;
    const res = reconciliateGitHubAppConfig(partialConfig);
    expect(res.config).not.undefined;
    expect(res.config).deep.equal(config);
  });

  it("should return an undefined config if there are ambiguous config props", () => {
    process.env.LIVEBUNDLE_GITHUB_PRIVATEKEY = config.privateKey;
    const res = reconciliateGitHubAppConfig(config);
    expect(res.config).undefined;
  });

  it("should return ambiguous config props", () => {
    process.env.LIVEBUNDLE_GITHUB_CLIENTID = config.clientId;
    process.env.LIVEBUNDLE_GITHUB_PRIVATEKEY = config.privateKey;
    const res = reconciliateGitHubAppConfig(config);
    expect(res.ambiguousConfigProps.length).eql(2);
    expect(res.ambiguousConfigProps[0]).eql([
      "LIVEBUNDLE_GITHUB_CLIENTID",
      "clientId",
    ]);
    expect(res.ambiguousConfigProps[1]).eql([
      "LIVEBUNDLE_GITHUB_PRIVATEKEY",
      "privateKey",
    ]);
  });

  it("should return an undefined config if there are missing config props", () => {
    const partialConfig = Object.assign({}, config);
    delete partialConfig.privateKey;
    const res = reconciliateGitHubAppConfig(partialConfig);
    expect(res.config).undefined;
  });

  it("should return missing config props", () => {
    const partialConfig = Object.assign({}, config);
    delete partialConfig.clientId;
    delete partialConfig.privateKey;
    const res = reconciliateGitHubAppConfig(partialConfig);
    expect(res.missingConfigProps.length).eql(2);
    expect(res.missingConfigProps[0]).eql([
      "LIVEBUNDLE_GITHUB_CLIENTID",
      "clientId",
    ]);
    expect(res.missingConfigProps[1]).eql([
      "LIVEBUNDLE_GITHUB_PRIVATEKEY",
      "privateKey",
    ]);
  });
});

describe("getErrorMessage", () => {
  it("should return expected error message [ambiguous and missing properties]", () => {
    const errorMessage = getErrorMessage({
      ambiguousConfigProps: [["LIVEBUNDLE_GITHUB_CLIENTID", "clientId"]],
      missingConfigProps: [["LIVEBUNDLE_GITHUB_PRIVATEKEY", "privateKey"]],
    });
    expect(errorMessage).eql(`=== Ambiguous GitHub configuration properties ===
- clientId is defined in config as well as environment variable LIVEBUNDLE_GITHUB_CLIENTID
=== Missing GitHub configuration properties ===
- Missing privateKey in config. Either set it in config or as environment variable LIVEBUNDLE_GITHUB_PRIVATEKEY
`);
  });

  it("should return expected error message [ambiguous property]", () => {
    const errorMessage = getErrorMessage({
      ambiguousConfigProps: [["LIVEBUNDLE_GITHUB_CLIENTID", "clientId"]],
      missingConfigProps: [],
    });
    expect(errorMessage).eql(`=== Ambiguous GitHub configuration properties ===
- clientId is defined in config as well as environment variable LIVEBUNDLE_GITHUB_CLIENTID
`);
  });

  it("should return expected error message [missing property]", () => {
    const errorMessage = getErrorMessage({
      ambiguousConfigProps: [],
      missingConfigProps: [["LIVEBUNDLE_GITHUB_PRIVATEKEY", "privateKey"]],
    });
    expect(errorMessage).eql(`=== Missing GitHub configuration properties ===
- Missing privateKey in config. Either set it in config or as environment variable LIVEBUNDLE_GITHUB_PRIVATEKEY
`);
  });
});
