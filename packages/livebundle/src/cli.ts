#!/usr/bin/env node
import { LiveBundleImpl, PluginLoaderImpl } from "livebundle-sdk";
import program from "./program";
(async () => {
  await program({
    livebundle: new LiveBundleImpl(new PluginLoaderImpl()),
  }).parseAsync(process.argv);
})();
