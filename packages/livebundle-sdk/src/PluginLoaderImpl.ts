import {
  NamedBundlerPlugin,
  NamedGeneratorPlugin,
  PluginLoader,
  NamedNotifierPlugin,
  NamedStoragePlugin,
  StoragePlugin,
  Uploader,
  LiveBundleConfig,
  PluginClass,
} from "./types";
import { loadConfig, reconciliateConfig, UploaderImpl } from ".";
import debug from "debug";

const log = debug("livebundle-sdk:PluginLoaderImpl");

export class PluginLoaderImpl implements PluginLoader {
  public async loadBundlerPlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedBundlerPlugin> {
    const { Plugin, pluginConfig } = await this.loadPlugin<NamedBundlerPlugin>(
      "bundler",
      name,
      config,
    );
    const plugin = Plugin.create(pluginConfig);
    plugin.name = name;
    return plugin;
  }

  public async loadGeneratorPlugin(
    name: string,
    config: Record<string, unknown>,
    storage: StoragePlugin,
  ): Promise<NamedGeneratorPlugin> {
    log(`loadGeneratorPlugin(name: ${name})`);
    const { Plugin, pluginConfig } = await this.loadPlugin<
      NamedGeneratorPlugin
    >("generator", name, config);
    const plugin = Plugin.create(pluginConfig, storage);
    plugin.name = name;
    return plugin;
  }

  public async loadNotifierPlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedNotifierPlugin> {
    const { Plugin, pluginConfig } = await this.loadPlugin<NamedNotifierPlugin>(
      "notifier",
      name,
      config,
    );
    const plugin = Plugin.create(pluginConfig);
    plugin.name = name;
    return plugin;
  }

  public async loadStoragePlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedStoragePlugin> {
    const { Plugin, pluginConfig } = await this.loadPlugin<NamedStoragePlugin>(
      "storage",
      name,
      config,
    );
    const plugin = Plugin.create(pluginConfig);
    plugin.name = name;
    return plugin;
  }

  public async loadPlugin<T>(
    category: string,
    name: string,
    config: Record<string, unknown>,
  ): Promise<{
    Plugin: PluginClass<T>;
    pluginConfig: Record<string, unknown>;
  }> {
    log(
      `loadPlugin(category: ${category}, name: ${name}, config: ${JSON.stringify(
        config,
        null,
        2,
      )})`,
    );
    const { default: Plugin } = await import(`livebundle-${category}-${name}`);
    let pluginConfig = config;
    if (Plugin.envVarToConfigKey) {
      pluginConfig = reconciliateConfig({
        curConfig: pluginConfig,
        envVarToConfigKey: Plugin.envVarToConfigKey,
      });
    }

    pluginConfig = await loadConfig<Record<string, unknown>>({
      config: pluginConfig,
      defaultConfig: Plugin.defaultConfig,
      schema: Plugin.schema,
    });

    return {
      Plugin,
      pluginConfig,
    };
  }

  public async loadAllPlugins(
    config: LiveBundleConfig,
  ): Promise<{
    bundler: NamedBundlerPlugin;
    storage: NamedStoragePlugin;
    generators: NamedGeneratorPlugin[];
    notifiers: NamedNotifierPlugin[];
    uploader: Uploader;
  }> {
    const bundlerPluginName = Object.keys(config.bundler)[0];
    const storagePluginName = Object.keys(config.storage)[0];
    const generatorPluginsNames = Object.keys(config.generators);
    const notifierPluginsNames = Object.keys(config.notifiers);

    const storage: NamedStoragePlugin = await this.loadStoragePlugin(
      storagePluginName,
      config.storage[storagePluginName] as Record<string, unknown>,
    );
    storage.name = storagePluginName;
    const uploader = new UploaderImpl(storage);

    const bundler: NamedBundlerPlugin = await this.loadBundlerPlugin(
      bundlerPluginName,
      config.bundler[bundlerPluginName] as Record<string, unknown>,
    );
    bundler.name = bundlerPluginName;

    const generators: NamedGeneratorPlugin[] = [];
    for (const generatorPluginName of generatorPluginsNames) {
      const generator = await this.loadGeneratorPlugin(
        generatorPluginName,
        config.generators[generatorPluginName] as Record<string, unknown>,
        storage,
      );
      generator.name = generatorPluginName;
      generators.push(generator);
      log(`Added ${generatorPluginName} generator`);
    }

    const notifiers: NamedNotifierPlugin[] = [];
    for (const notifierPluginName of notifierPluginsNames) {
      const notifier = await this.loadNotifierPlugin(
        notifierPluginName,
        config.notifiers[notifierPluginName] as Record<string, unknown>,
      );
      notifier.name = notifierPluginName;
      notifiers.push(notifier);
      log(`Added ${notifierPluginName} notifier`);
    }

    return {
      bundler,
      storage,
      generators,
      notifiers,
      uploader,
    };
  }
}
