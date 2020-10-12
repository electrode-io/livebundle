import {
  NamedBundler,
  NamedGenerator,
  ModuleLoader,
  NamedNotifier,
  NamedStorage,
  Storage,
  Uploader,
  LiveBundleConfig,
} from "./types";
import { loadConfig, reconciliateConfig, UploaderImpl } from ".";
import debug from "debug";

const log = debug("livebundle-sdk:ModuleLoaderImpl");

export class ModuleLoaderImpl implements ModuleLoader {
  public async loadLiveBundleBundlerModule(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedBundler> {
    const { Module, moduleConfig } = await this.loadLiveBundleModule(
      "bundler",
      name,
      config,
    );
    const module = Module.create(moduleConfig) as NamedBundler;
    module.name = name;
    return module;
  }

  public async loadLiveBundleGeneratorModule(
    name: string,
    config: Record<string, unknown>,
    storage: Storage,
  ): Promise<NamedGenerator> {
    log(`loadLiveBundleGeneratorModule(name: ${name})`);
    const { Module, moduleConfig } = await this.loadLiveBundleModule(
      "generator",
      name,
      config,
    );
    const module = Module.create(moduleConfig, storage) as NamedGenerator;
    module.name = name;
    return module;
  }

  public async loadLiveBundleNotifierModule(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedNotifier> {
    const { Module, moduleConfig } = await this.loadLiveBundleModule(
      "notifier",
      name,
      config,
    );
    const module = Module.create(moduleConfig) as NamedNotifier;
    module.name = name;
    return module;
  }

  public async loadLiveBundleStorageModule(
    name: string,
    config: Record<string, unknown>,
  ): Promise<NamedStorage> {
    const { Module, moduleConfig } = await this.loadLiveBundleModule(
      "storage",
      name,
      config,
    );
    const module = Module.create(moduleConfig) as NamedStorage;
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

  public async loadModules(
    config: LiveBundleConfig,
  ): Promise<{
    bundler: NamedBundler;
    storage: NamedStorage;
    generators: NamedGenerator[];
    notifiers: NamedNotifier[];
    uploader: Uploader;
  }> {
    const bundlerModuleName = Object.keys(config.bundler)[0];
    const storageModuleName = Object.keys(config.storage)[0];
    const generatorModulesNames = Object.keys(config.generators);
    const notifierModulesNames = Object.keys(config.notifiers);

    const storage: NamedStorage = await this.loadLiveBundleStorageModule(
      storageModuleName,
      config.storage[storageModuleName] as Record<string, unknown>,
    );
    storage.name = storageModuleName;
    const uploader = new UploaderImpl(storage);

    const bundler: NamedBundler = await this.loadLiveBundleBundlerModule(
      bundlerModuleName,
      config.bundler[bundlerModuleName] as Record<string, unknown>,
    );
    bundler.name = bundlerModuleName;

    const generators: NamedGenerator[] = [];
    for (const generatorModuleName of generatorModulesNames) {
      const generator = await this.loadLiveBundleGeneratorModule(
        generatorModuleName,
        config.generators[generatorModuleName] as Record<string, unknown>,
        storage,
      );
      generator.name = generatorModuleName;
      generators.push(generator);
      log(`Added ${generatorModuleName} generator`);
    }

    const notifiers: NamedNotifier[] = [];
    for (const notifierModuleName of notifierModulesNames) {
      const notifier = await this.loadLiveBundleNotifierModule(
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
