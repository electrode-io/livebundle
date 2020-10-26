import os from "os";

export const untildifyPath = (p: string): string =>
  p.replace(`~`, os.homedir());
