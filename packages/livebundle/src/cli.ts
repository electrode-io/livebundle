#!/usr/bin/env node
import program from "./program";
(async () => {
  await program().parseAsync(process.argv);
})();
