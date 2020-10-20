import {
  LiveBundleConfig,
  LocalBundle,
  LiveBundleContentType,
  LiveBundle,
  PluginLoader,
} from "./types";
import debug from "debug";
import { v4 as uuidv4 } from "uuid";
import ip from "ip";

const log = debug("livebundle-sdk:LiveBundleImpl");

export class LiveBundleImpl implements LiveBundle {
  public constructor(private readonly moduleLoader: PluginLoader) {}

  public async upload(config: LiveBundleConfig): Promise<void> {
    log(`upload(config: ${JSON.stringify(config, null, 2)})`);

    const {
      bundler,
      generators,
      notifiers,
      uploader,
    } = await this.moduleLoader.loadAllPlugins(config);

    const bundles: LocalBundle[] = await bundler.bundle();

    const pkg = await uploader.upload({ bundles });

    const generatorsOutput: Record<string, Record<string, unknown>> = {};
    for (const generator of generators) {
      const res = await generator.generate({
        id: pkg.id,
        type: LiveBundleContentType.PACKAGE,
      });
      generatorsOutput[generator.name] = res;
    }

    for (const notifier of notifiers) {
      await notifier.notify({
        generators: generatorsOutput,
        pkg,
        type: LiveBundleContentType.PACKAGE,
      });
    }
  }

  public async live(config: LiveBundleConfig): Promise<void> {
    log(`live(config: ${JSON.stringify(config, null, 2)})`);

    const {
      generators,
      notifiers,
      storage,
    } = await this.moduleLoader.loadAllPlugins(config);

    const metadata = JSON.stringify({
      host: `${ip.address()}:8081`,
    });
    const sessionId = uuidv4();
    await storage.store(
      metadata,
      metadata.length,
      `sessions/${sessionId}/metadata.json`,
    );

    const generatorsOutput: Record<string, Record<string, unknown>> = {};
    for (const generator of generators) {
      const res = await generator.generate({
        id: sessionId,
        type: LiveBundleContentType.SESSION,
      });
      generatorsOutput[generator.name] = res;
    }

    for (const notifier of notifiers) {
      await notifier.notify({
        generators: generatorsOutput,
        type: LiveBundleContentType.SESSION,
      });
    }
  }
}
