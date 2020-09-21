import debug from "debug";
import { FsStorageConfig } from "./types";
import { Storage } from "livebundle-sdk";
import { configSchema } from "./schemas";
import tmp from "tmp";
import fs from "fs-extra";
import path from "path";

const log = debug("livebundle-storage-fs:FsStorageImpl");

export class FsStorageImpl implements Storage {
  private readonly storageDir: string;

  public get baseUrl(): string {
    return this.storageDir;
  }

  public static readonly defaultConfig: Record<
    string,
    unknown
  > = require("../config/default.json");

  public static readonly schema: Record<string, unknown> = configSchema;

  public constructor(fsConfig: FsStorageConfig) {
    this.storageDir =
      fsConfig.storageDir ?? tmp.dirSync({ unsafeCleanup: true }).name;
    fs.ensureDir(this.storageDir);
  }

  public static async create(config: FsStorageConfig): Promise<FsStorageImpl> {
    return new FsStorageImpl(config);
  }

  async store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<void> {
    log(`store(contentLength: ${contentLength}, targetPath: ${targetPath})`);

    const tp = path.join(this.storageDir, targetPath);
    await fs.ensureDir(path.dirname(tp));
    await fs.writeFile(tp, content, { encoding: "utf8" });
  }

  async storeFile(filePath: string, targetPath: string): Promise<void> {
    log(`store(filePath: ${filePath}, targetPath: ${targetPath})`);

    const tp = path.join(this.storageDir, targetPath);
    await fs.ensureDir(path.dirname(tp));
    await fs.copyFile(filePath, tp);
  }
}
