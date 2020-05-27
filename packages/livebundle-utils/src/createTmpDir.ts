import fs from "fs-extra";
import tmp from "tmp";

export const createTmpDir = (): string =>
  fs.realpathSync(
    tmp.dirSync({
      unsafeCleanup: true,
    }).name,
  );
