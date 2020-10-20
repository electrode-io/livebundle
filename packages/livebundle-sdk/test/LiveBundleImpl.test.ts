import "mocha";
import {
  NamedStorage,
  NamedNotifier,
  NamedBundler,
  NamedGenerator,
  Uploader,
  LiveBundleContentType,
  Package,
  LocalBundle,
  PluginLoaderImpl,
  LiveBundleImpl,
} from "../src";
import { v4 as uuidv4 } from "uuid";
import sinon from "sinon";

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
      const moduleLoaderStub = sandbox.createStubInstance(PluginLoaderImpl);
      moduleLoaderStub.loadAllPlugins.resolves({
        bundler: new FakeBundler(),
        storage: new FakeStorage(),
        uploader: new FakeUploader(),
        generators: [new FakeGenerator()],
        notifiers: [new FakeNotifier()],
      });
      const sut = new LiveBundleImpl(moduleLoaderStub);
      await sut.upload({
        bundler: {
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
      const moduleLoaderStub = sandbox.createStubInstance(PluginLoaderImpl);
      moduleLoaderStub.loadAllPlugins.resolves({
        bundler: new FakeBundler(),
        storage: new FakeStorage(),
        uploader: new FakeUploader(),
        generators: [new FakeGenerator()],
        notifiers: [new FakeNotifier()],
      });
      const sut = new LiveBundleImpl(moduleLoaderStub);
      await sut.live({
        bundler: {
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
});

class FakeStorage implements NamedStorage {
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

class FakeNotifier implements NamedNotifier {
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

class FakeGenerator implements NamedGenerator {
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

class FakeBundler implements NamedBundler {
  name: string;
  bundle(): Promise<LocalBundle[]> {
    return Promise.resolve([]);
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
