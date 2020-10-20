import {
  NamedBundlerPlugin,
  NamedGeneratorPlugin,
  PluginLoader,
  NamedNotifierPlugin,
  NamedStoragePlugin,
  StoragePlugin,
  Uploader,
  LiveBundleConfig,
} from "./types";
import { loadConfig, reconciliateConfig, UploaderImpl } from ".";
import debug from "debug";

const log = debug("livebundle-sdk:PluginLoaderImpl");

export class PluginLoaderImpl implements PluginLoader {
  public async loadBundlerPlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedBundlerPlugin> {
    const { Module, moduleConfig } = await this.loadLiveBundleModule(
      "bundler",
      name,
      config,
    );
    const module = Module.create(moduleConfig) as NamedBundlerPlugin;
    module.name = name;
    return module;
  }

  public async loadGeneratorPlugin(
    name: string,
    config: Record<string, unknown>,
    storage: StoragePlugin,
  ): Promise<NamedGeneratorPlugin> {
    log(`loadGeneratorPlugin(name: ${name})`);
    const { Module, moduleConfig } = await this.loadLiveBundleModule(
      "generator",
      name,
      config,
    );
    const module = Module.create(moduleConfig, storage) as NamedGeneratorPlugin;
    module.name = name;
    return module;
  }

  public async loadNotifierPlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedNotifierPlugin> {
    const { Module, moduleConfig } = await this.loadLiveBundleModule(
      "notifier",
      name,
      config,
    );
    const module = Module.create(moduleConfig) as NamedNotifierPlugin;
    module.name = name;
    return module;
  }

  public async loadStoragePlugin(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedStoragePlugin> {
    const { Module, moduleConfig } = await this.loadLiveBundleModule(
      "storage",
      name,
      config,
    );
    const module = Module.create(moduleConfig) as NamedStoragePlugin;
    module.name = name;
    return module;
  }

  public async loadLiveBundleModule(
    type: string,
    name: string,
    config: Record<string, unknown>,
  ): Promise<{
    Module: any;
    moduleConfig: Record<string, unknown>;
  }> {
    log(
      `loadLiveBundleModule(type: ${type}, name: ${name}, config: ${JSON.stringify(
        config,
        null,
        2,
      )})`,
    );
    const { default: Module } = await import(`livebundle-${type}-${name}`);
    let moduleConfig = config;
    if (Module.envVarToConfigKey) {
      moduleConfig = reconciliateConfig({
        curConfig: moduleConfig,
        envVarToConfigKey: Module.envVarToConfigKey,
      }).config!;
    }

    moduleConfig = await loadConfig<Record<string, unknown>>({
      config: moduleConfig,
      defaultConfig: Module.defaultConfig,
      schema: Module.schema,
    });

    return {
      Module,
      moduleConfig,
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
    const bundlerModuleName = Object.keys(config.bundler)[0];
    const storageModuleName = Object.keys(config.storage)[0];
    const generatorModulesNames = Object.keys(config.generators);
    const notifierModulesNames = Object.keys(config.notifiers);

    const storage: NamedStoragePlugin = await this.loadStoragePlugin(
      storageModuleName,
      config.storage[storageModuleName] as Record<string, unknown>,
    );
    storage.name = storageModuleName;
    const uploader = new UploaderImpl(storage);

    const bundler: NamedBundlerPlugin = await this.loadBundlerPlugin(
      bundlerModuleName,
      config.bundler[bundlerModuleName] as Record<string, unknown>,
    );
    bundler.name = bundlerModuleName;

    const generators: NamedGeneratorPlugin[] = [];
    for (const generatorModuleName of generatorModulesNames) {
      const generator = await this.loadGeneratorPlugin(
        generatorModuleName,
        config.generators[generatorModuleName] as Record<string, unknown>,
        storage,
      );
      generator.name = generatorModuleName;
      generators.push(generator);
      log(`Added ${generatorModuleName} generator`);
    }

    const notifiers: NamedNotifierPlugin[] = [];
    for (const notifierModuleName of notifierModulesNames) {
      const notifier = await this.loadNotifierPlugin(
        notifierModuleName,
        config.notifiers[notifierModuleName] as Record<string, unknown>,
      );
      notifier.name = notifierModuleName;
      notifiers.push(notifier);
      log(`Added ${notifierModuleName} notifier`);
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
