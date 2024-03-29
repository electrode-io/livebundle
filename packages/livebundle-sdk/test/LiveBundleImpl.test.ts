import "mocha";
import {
  NamedStoragePlugin,
  NamedNotifierPlugin,
  NamedBundlerPlugin,
  NamedGeneratorPlugin,
  Uploader,
  LiveBundleContentType,
  Package,
  LocalBundle,
  PluginLoaderImpl,
  LiveBundleImpl,
  NamedServerPlugin,
} from "../src";
import { v4 as uuidv4 } from "uuid";
import sinon from "sinon";
import { expect } from "chai";

describe("LiveBundleImpl", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.reset();
  });

  after(() => {
    sandbox.restore();
  });

  describe("upload", () => {
    it("should go through", async () => {
      const pluginLoaderStub = sandbox.createStubInstance(PluginLoaderImpl);
      pluginLoaderStub.loadAllPlugins.resolves({
        bundler: new FakeBundler(),
        server: new FakeServer(),
        storage: new FakeStorage(),
        uploader: new FakeUploader(),
        generators: [new FakeGenerator()],
        notifiers: [new FakeNotifier()],
      });
      const sut = new LiveBundleImpl(pluginLoaderStub);
      await sut.upload({
        bundler: {
          fake: null,
        },
        server: {
          fake: null,
        },
        generators: {
          fake: null,
        },
        notifiers: {
          fake: null,
        },
        storage: {
          fake: null,
        },
      });
    });
  });

  describe("live", () => {
    it("should go through", async () => {
      const pluginLoaderStub = sandbox.createStubInstance(PluginLoaderImpl);
      pluginLoaderStub.loadAllPlugins.resolves({
        bundler: new FakeBundler(),
        server: new FakeServer(),
        storage: new FakeStorage(),
        uploader: new FakeUploader(),
        generators: [new FakeGenerator()],
        notifiers: [new FakeNotifier()],
      });
      const sut = new LiveBundleImpl(pluginLoaderStub);
      await sut.live({
        bundler: {
          fake: null,
        },
        server: {
          fake: null,
        },
        generators: {
          fake: null,
        },
        notifiers: {
          fake: null,
        },
        storage: {
          fake: null,
        },
      });
    });
  });

  describe("buildLiveSessionMetadata", () => {
    it("should return expected metadata string [host/port provided]", () => {
      expect(
        LiveBundleImpl.buildLiveSessionMetadata({
          host: "1.2.3.4",
          port: 8086,
        }),
      ).equals('{"host":"1.2.3.4:8086"}');
    });
  });
});

class FakeStorage implements NamedStoragePlugin {
  hasFile(filePath: string): Promise<boolean> {
    return Promise.resolve(true);
  }
  downloadFile(filePath: string): Promise<Buffer> {
    return Promise.resolve(Buffer.from("[]", "utf8"));
  }
  name: string;
  store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<string> {
    return Promise.resolve("");
  }
  storeFile(
    filePath: string,
    targetPath: string,
    options?: { contentType?: string | undefined },
  ): Promise<string> {
    return Promise.resolve("");
  }
  baseUrl: string;
}

class FakeNotifier implements NamedNotifierPlugin {
  name: string;
  notify({
    generators,
    pkg,
    type,
  }: {
    generators: Record<string, Record<string, unknown>>;
    pkg?: Package | undefined;
    type: LiveBundleContentType;
  }): Promise<void> {
    return Promise.resolve();
  }
}

class FakeGenerator implements NamedGeneratorPlugin {
  name: string;
  generate({
    id,
    type,
  }: {
    id: string;
    type: LiveBundleContentType;
  }): Promise<any> {
    return Promise.resolve({});
  }
}

class FakeBundler implements NamedBundlerPlugin {
  name: string;
  bundle(): Promise<LocalBundle[]> {
    return Promise.resolve([]);
  }
}

class FakeServer implements NamedServerPlugin {
  name: string;
  launchServer(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeUploader implements Uploader {
  upload({ bundles }: { bundles: LocalBundle[] }): Promise<Package> {
    return Promise.resolve({
      id: uuidv4(),
      bundles: [],
      timestamp: Date.now(),
    });
  }
}
