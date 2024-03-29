import "mocha";
import { PluginLoaderImpl } from "../src";
import fs from "fs-extra";
import path from "path";
import { StoragePlugin } from "livebundle-sdk";
import { expect } from "chai";

class FakeStoragePlugin implements StoragePlugin {
  hasFile(filePath: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  downloadFile(filePath: string): Promise<Buffer> {
    throw new Error("Method not implemented.");
  }
  store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<string> {
    throw new Error("Method not implemented.");
  }
  storeFile(
    filePath: string,
    targetPath: string,
    options?: { contentType?: string | undefined },
  ): Promise<string> {
    throw new Error("Method not implemented.");
  }
  baseUrl: string;
}

describe("PluginLoaderImpl", () => {
  describe("loadBundlerPlugin", () => {
    it("should load the bundler plugin", async () => {
      const sut = new PluginLoaderImpl();
      const res = await sut.loadBundlerPlugin(
        "metro",
        await fs.readJSON(
          path.join(
            __dirname,
            "../../livebundle-bundler-metro/config/default.json",
          ),
        ),
      );
      expect(res).not.undefined;
    });
  });

  describe("loadGeneratorPlugin", () => {
    it("should load the generator plugin", async () => {
      const sut = new PluginLoaderImpl();
      const res = await sut.loadGeneratorPlugin(
        "deeplink",
        {},
        new FakeStoragePlugin(),
      );
      expect(res).not.undefined;
    });
  });

  describe("loadNotifierPlugin", () => {
    it("should load the notifier plugin", async () => {
      const sut = new PluginLoaderImpl();
      const res = await sut.loadNotifierPlugin("github", {
        token: "abcd",
        baseUrl: "https://foo",
      });
      expect(res).not.undefined;
    });
  });

  describe("loadStoragePlugin", () => {
    it("should load the storage plugin", async () => {
      const sut = new PluginLoaderImpl();
      const res = await sut.loadStoragePlugin("fs", {});
      expect(res).not.undefined;
    });
  });

  describe("loadAllPlugins", () => {
    it("should load the plugins declared in configuration", async () => {
      const sut = new PluginLoaderImpl();
      const res = await sut.loadAllPlugins({
        bundler: {
          metro: null,
        },
        server: {
          metro: null,
        },
        storage: {
          fs: null,
        },
        generators: {
          qrcode: null,
        },
        notifiers: {
          terminal: null,
        },
      });
      expect(res.bundler).not.undefined;
      expect(res.storage).not.undefined;
      expect(res.generators).length(1);
      expect(res.notifiers).length(1);
    });
  });
});
