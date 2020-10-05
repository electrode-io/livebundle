import "mocha";
import { ModuleLoaderImpl } from "../src";
import fs from "fs-extra";
import path from "path";
import { Storage } from "livebundle-sdk";
import { expect } from "chai";

class FakeStorage implements Storage {
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

describe("ModuleLoaderImpl", () => {
  describe("loadLiveBundleBundlerModule", () => {
    it("should load the bundler module", async () => {
      const sut = new ModuleLoaderImpl();
      const res = await sut.loadLiveBundleBundlerModule(
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

  describe("loadLiveBundleGeneratorModule", () => {
    it("should load the generator module", async () => {
      const sut = new ModuleLoaderImpl();
      const res = await sut.loadLiveBundleGeneratorModule(
        "deeplink",
        {},
        new FakeStorage(),
      );
      expect(res).not.undefined;
    });
  });

  describe("loadLiveBundleNotifierModule", () => {
    it("should load the notifier module", async () => {
      const sut = new ModuleLoaderImpl();
      const res = await sut.loadLiveBundleNotifierModule("github", {
        token: "abcd",
        baseUrl: "https://foo",
      });
      expect(res).not.undefined;
    });
  });

  describe("loadLiveBundleStorageModule", () => {
    it("should load the storage module", async () => {
      const sut = new ModuleLoaderImpl();
      const res = await sut.loadLiveBundleStorageModule("fs", {});
      expect(res).not.undefined;
    });
  });

  describe("loadModules", () => {
    it("should load the modules declared in configuration", async () => {
      const sut = new ModuleLoaderImpl();
      const res = await sut.loadModules({
        bundler: {
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
