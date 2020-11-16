import {
  LiveBundleConfig,
  LocalBundle,
  LiveBundleContentType,
  LiveBundle,
  PluginLoader,
  ServerOpts,
} from "./types";
import debug from "debug";
import { v4 as uuidv4 } from "uuid";
import ip from "ip";

const log = debug("livebundle-sdk:LiveBundleImpl");

export class LiveBundleImpl implements LiveBundle {
  public constructor(private readonly pluginLoader: PluginLoader) {}

  public async upload(config: LiveBundleConfig): Promise<void> {
    log(`upload(config: ${JSON.stringify(config, null, 2)})`);

    const {
      bundler,
      generators,
      notifiers,
      uploader,
    } = await this.pluginLoader.loadAllPlugins(config);

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

  public async live(
    config: LiveBundleConfig,
    opts?: ServerOpts,
  ): Promise<void> {
    log(
      `live(config: ${JSON.stringify(config, null, 2)}, opts: ${JSON.stringify(
        opts,
        null,
        2,
      )})`,
    );

    const {
      server,
      generators,
      notifiers,
      storage,
    } = await this.pluginLoader.loadAllPlugins(config);

    await server.launchServer(opts);

    const metadata = JSON.stringify(
      LiveBundleImpl.buildLiveSessionMetadata(opts),
    );

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

  public static buildLiveSessionMetadata(opts?: ServerOpts): string {
    return JSON.stringify({
      host: `${opts?.host ?? ip.address()}:${opts?.port ?? "8081"}`,
    });
  }
}
