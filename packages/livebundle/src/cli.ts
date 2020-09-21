#!/usr/bin/env node
import { LiveBundleImpl, ModuleLoaderImpl } from "livebundle-sdk";
import program from "./program";
(async () => {
  await program({
    livebundle: new LiveBundleImpl(new ModuleLoaderImpl()),
  }).parseAsync(process.argv);
})();
