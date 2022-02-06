import debug from "debug";
import * as Minio from "minio";
import { MinIOStorageConfig } from "./types";
import type { Client } from "minio";
import { StoragePlugin } from "livebundle-sdk";
import { configSchema } from "./schemas";
import fs from "fs-extra";

const log = debug("livebundle-storage-minio:MinIOStoragePlugin");

export class MinIOStoragePlugin implements StoragePlugin {
  private readonly config: MinIOStorageConfig;
  private readonly mio: Client;

  public get baseUrl(): string {
    let url = "http://";
    if (this.config.useSSL) {
      url = "https://";
    }
    url += this.config.endPoint;
    return url;
  }

  public static readonly envVarToConfigKey: Record<string, string> = {
    LB_STORAGE_MINIO_PORT: "port",
    LB_STORAGE_MINIO_ENDPOINT: "endPoint",
    LB_STORAGE_MINIO_USESSL: "useSSL",
    LB_STORAGE_MINIO_ACCESSKEY: "accessKey",
    LB_STORAGE_MINIO_SECRETKEY: "secretKey",
  };

  public static readonly schema: Record<string, unknown> = configSchema;

  public constructor(
    config: MinIOStorageConfig,
    { mio }: { mio?: Client } = {},
  ) {
    this.config = config;

    this.mio =
      mio ??
      new Minio.Client({
        port: this.config.port,
        endPoint: this.config.endPoint,
        useSSL: this.config.useSSL || false,
        accessKey: this.config.accessKey,
        secretKey: this.config.secretKey,
      });
  }

  async hasFile(filePath: string): Promise<boolean> {
    log(`hasFile(filePath: ${filePath})`);
    try {
      const stat = await this.mio.statObject(this.config.bucketName, filePath);
      return stat.etag ? true : false;
    } catch (err) {
      log(err);
      return false;
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    log(`downloadFile(filePath: ${filePath})`);
    const fileStream = await this.mio.getObject(
      this.config.bucketName,
      filePath,
    );

    const result: Buffer = await new Promise((resolve) => {
      const fileBuff: Buffer[] = [];
      fileStream.on("data", (chunk: Buffer) => {
        fileBuff.push(chunk);
      });

      fileStream.on("end", () => {
        resolve(Buffer.concat(fileBuff));
      });
    });

    return result;
  }

  public static async create(
    config: MinIOStorageConfig,
  ): Promise<MinIOStoragePlugin> {
    return new MinIOStoragePlugin(config);
  }

  async store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<string> {
    log(`store(contentLength: ${contentLength}, targetPath: ${targetPath})`);

    const dataBuff = Buffer.from(content);
    await this.mio.putObject(
      this.config.bucketName,
      targetPath,
      dataBuff,
      contentLength,
    );
    return targetPath;
  }

  // need to figure out what this does exactly...
  async storeFile(filePath: string, targetPath: string): Promise<string> {
    log(`store(filePath: ${filePath}, targetPath: ${targetPath})`);
    const dataBuff = fs.readFileSync(filePath);
    await this.mio.putObject(this.config.bucketName, targetPath, dataBuff);
    return targetPath;
  }
}
