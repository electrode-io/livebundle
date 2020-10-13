import "mocha";
import { Octokit } from "@octokit/rest";
import sinon from "sinon";
import GitHubNotifierImpl, { GitHubNotifierConfig } from "../src";
import { LiveBundleContentType, Package } from "livebundle-sdk";
import { v4 as uuidv4 } from "uuid";
import { expect } from "chai";
import tmp from "tmp";
import fs from "fs-extra";
import path from "path";

describe("GitHubNotifierImpl", () => {
  const sandbox = sinon.createSandbox();

  const stubs = {
    octokit: sinon.stub(Octokit) as any,
    createComment: sandbox.stub(),
  };

  const notifyPayload: {
    generators: Record<string, Record<string, unknown>>;
    pkg?: Package;
    type: LiveBundleContentType;
  } = {
    generators: {
      qrcode: { remoteImagePath: "https://foo/qrcode.png" },
      deeplink: { deepLinkUrl: "livebundle://foo/bar" },
    },
    pkg: { id: uuidv4(), bundles: [], timestamp: Date.now() },
    type: LiveBundleContentType.PACKAGE,
  };

  const notifierConfig: GitHubNotifierConfig = {
    baseUrl: "https://api.github.com",
    token: "7a491152d7854d5f3c7b0bc5bbc5dcef",
  };

  const githubEventPayload = {
    repository: {
      owner: {
        login: "owner",
      },
      name: "repo",
    },
    number: 1234,
  };

  let ghEventPathBackup: string | undefined;

  beforeEach(() => {
    stubs.octokit.issues = {
      createComment: stubs.createComment,
    };
    ghEventPathBackup = process.env.GITHUB_EVENT_PATH;
    delete process.env.GITHUB_EVENT_PATH;
  });

  afterEach(() => {
    sandbox.reset();
    if (ghEventPathBackup) {
      process.env.GITHUB_EVENT_PATH = ghEventPathBackup;
    }
  });

  after(() => {
    sandbox.restore();
  });

  describe("create", () => {
    it("should return an instance of GitHubNotifierImpl", async () => {
      const res = await GitHubNotifierImpl.create(notifierConfig);
      expect(res).instanceOf(GitHubNotifierImpl);
    });
  });

  describe("notify", () => {
    it("should not post a PR comment if LiveBundle content type is SESSION", async () => {
      const sut = new GitHubNotifierImpl(notifierConfig, {
        octokit: stubs.octokit,
      });
      try {
        process.env.LB_NOTIFIER_GITHUB_PRURL =
          "https://github.com/owner/repo/pull/1234";
        await sut.notify({
          ...notifyPayload,
          type: LiveBundleContentType.SESSION,
        });
        sinon.assert.notCalled(stubs.createComment);
      } finally {
        delete process.env.LB_NOTIFIER_GITHUB_PRURL;
      }
    });

    it("should not post a PR comment if LB_NOTIFIER_GITHUB_PRURL and GITHUB_EVENT_PATH are missing", async () => {
      const sut = new GitHubNotifierImpl(notifierConfig, {
        octokit: stubs.octokit,
      });
      await sut.notify(notifyPayload);
      sinon.assert.notCalled(stubs.createComment);
    });

    it("should not post a PR comment if LB_NOTIFIER_GITHUB_PRURL is invalid", async () => {
      const sut = new GitHubNotifierImpl(notifierConfig, {
        octokit: stubs.octokit,
      });
      try {
        process.env.LB_NOTIFIER_GITHUB_PRURL = "https://invalid";
        await sut.notify(notifyPayload);
        sinon.assert.notCalled(stubs.createComment);
      } finally {
        delete process.env.LB_NOTIFIER_GITHUB_PRURL;
      }
    });

    it("should work with LB_NOTIFIER_GITHUB_PRURL env var [GitHub action not used]", async () => {
      const sut = new GitHubNotifierImpl(notifierConfig, {
        octokit: stubs.octokit,
      });
      try {
        process.env.LB_NOTIFIER_GITHUB_PRURL =
          "https://github.com/owner/repo/pull/1234";
        await sut.notify(notifyPayload);
      } finally {
        delete process.env.LB_NOTIFIER_GITHUB_PRURL;
      }
    });

    it("should post proper PR comment [QRCode only]", async () => {
      const sut = new GitHubNotifierImpl(notifierConfig, {
        octokit: stubs.octokit,
      });
      try {
        process.env.LB_NOTIFIER_GITHUB_PRURL =
          "https://github.com/owner/repo/pull/1234";
        const payload = JSON.parse(JSON.stringify(notifyPayload));
        delete payload.generators.deeplink;
        await sut.notify(payload);
        sinon.assert.calledOnceWithExactly(stubs.createComment, {
          owner: "owner",
          repo: "repo",
          issue_number: 1234,
          body: sinon.match("QR Code"),
        });
      } finally {
        delete process.env.LB_NOTIFIER_GITHUB_PRURL;
      }
    });

    it("should post proper PR comment [DeepLink only]", async () => {
      const sut = new GitHubNotifierImpl(notifierConfig, {
        octokit: stubs.octokit,
      });
      try {
        process.env.LB_NOTIFIER_GITHUB_PRURL =
          "https://github.com/owner/repo/pull/1234";
        const payload = JSON.parse(JSON.stringify(notifyPayload));
        delete payload.generators.qrcode;
        await sut.notify(payload);
        sinon.assert.calledOnceWithExactly(stubs.createComment, {
          owner: "owner",
          repo: "repo",
          issue_number: 1234,
          body: sinon.match("Deep Link"),
        });
      } finally {
        delete process.env.LB_NOTIFIER_GITHUB_PRURL;
      }
    });

    it("should post proper PR comment [LB_NOTIFIER_GITHUB_PRURL]", async () => {
      const sut = new GitHubNotifierImpl(notifierConfig, {
        octokit: stubs.octokit,
      });
      try {
        process.env.LB_NOTIFIER_GITHUB_PRURL =
          "https://github.com/owner/repo/pull/1234";
        await sut.notify(notifyPayload);
        sinon.assert.calledOnceWithExactly(stubs.createComment, {
          owner: "owner",
          repo: "repo",
          issue_number: 1234,
          body: sinon.match("QR Code").and(sinon.match("Deep Link")),
        });
      } finally {
        delete process.env.LB_NOTIFIER_GITHUB_PRURL;
      }
    });

    it("should work with GITHUB_EVENT_PATH env var [GitHub action]", async () => {
      const sut = new GitHubNotifierImpl(notifierConfig, {
        octokit: stubs.octokit,
      });
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      const eventPayloadFilePath = path.join(tmpDir, "event.json");
      await fs.writeFile(
        eventPayloadFilePath,
        JSON.stringify(githubEventPayload),
        { encoding: "utf8" },
      );
      try {
        process.env.GITHUB_EVENT_PATH = eventPayloadFilePath;
        await sut.notify(notifyPayload);
      } finally {
        delete process.env.GITHUB_EVENT_PATH;
      }
    });

    it("should post proper PR comment [GITHUB_EVENT_PATH]", async () => {
      const sut = new GitHubNotifierImpl(notifierConfig, {
        octokit: stubs.octokit,
      });
      const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
      const eventPayloadFilePath = path.join(tmpDir, "event.json");
      await fs.writeFile(
        eventPayloadFilePath,
        JSON.stringify(githubEventPayload),
        { encoding: "utf8" },
      );
      try {
        process.env.GITHUB_EVENT_PATH = eventPayloadFilePath;
        await sut.notify(notifyPayload);
        sinon.assert.calledOnceWithExactly(stubs.createComment, {
          owner: "owner",
          repo: "repo",
          issue_number: 1234,
          body: sinon.match("QR Code").and(sinon.match("Deep Link")),
        });
      } finally {
        delete process.env.GITHUB_EVENT_PATH;
      }
    });
  });
});
