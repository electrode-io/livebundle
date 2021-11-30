/* eslint-disable no-useless-catch */
import AWS from "aws-sdk";
import type { S3 } from "aws-sdk";
import { readFile } from "fs/promises";
import debug from "debug";
import { S3StorageConfig } from "./types";
import { StoragePlugin } from "livebundle-sdk";
import { configSchema } from "./schemas";

const log = debug("livebundle-storage-impl:S3StoragePlugin");

export class S3StoragePlugin implements StoragePlugin {
  public static readonly schema: Record<string, unknown> = configSchema;
  private readonly config: S3StorageConfig;
  private readonly s3: S3;

  public constructor(
    private readonly s3Config: S3StorageConfig,
    { s3 }: { s3?: S3 } = {},
  ) {
    this.config = s3Config;
    this.s3 =
      s3 ??
      new AWS.S3({
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        sessionToken: this.config.sessionToken,
        region: this.config.region ?? "us-east-2",
        maxRetries: 4,
        correctClockSkew: true,
      });
  }

  public get baseUrl(): string {
    return `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com`;
  }

  public getFilePathUrl(filePath: string): string {
    return `${this.baseUrl}/${filePath}`;
  }

  async hasFile(filePath: string): Promise<boolean> {
    log(`hasFile(filePath: ${filePath})`);

    const params: S3.Types.HeadObjectRequest = {
      Bucket: this.config.bucketName,
      Key: filePath,
    };
    try {
      await this.s3.headObject(params).promise();
      return true;
    } catch (err) {
      log(err);
      return false;
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    log(`downloadFile(filePath: ${filePath})`);

    const params: S3.Types.HeadObjectRequest = {
      Bucket: this.config.bucketName,
      Key: filePath,
    };
    try {
      const output: S3.Types.GetObjectOutput = await this.s3
        .getObject(params)
        .promise();
      return output.Body as Buffer;
    } catch (err) {
      log(`Failed to download file from ${filePath}. Error: ${err}`);
      throw err;
    }
  }

  public static async create(
    s3Config: S3StorageConfig,
  ): Promise<S3StoragePlugin> {
    return new S3StoragePlugin(s3Config);
  }

  async store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<string> {
    log(`store(contentLength: ${contentLength}, targetPath: ${targetPath})`);
    const params: S3.Types.PutObjectRequest = {
      Bucket: this.config.bucketName,
      Key: targetPath,
      Body: content,
      ContentLength: contentLength,
    };
    try {
      await this.s3.putObject(params).promise();
      return this.getFilePathUrl(targetPath);
    } catch (err) {
      log(`Failed to store data to ${targetPath}. Error: ${err}`);
      throw err;
    }
  }

  async storeFile(
    filePath: string,
    targetPath: string,
    options?: {
      contentType?: string;
    },
  ): Promise<string> {
    log(
      `storeFile(filePath: ${filePath}, targetPath: ${targetPath}, options: ${JSON.stringify(
        options,
        null,
        2,
      )})`,
    );

    try {
      const fileData: Buffer = await readFile(filePath);
      const params: S3.Types.PutObjectRequest = {
        Bucket: this.config.bucketName,
        Key: targetPath,
        Body: fileData,
        ContentType: options?.contentType,
      };
      await this.s3.putObject(params).promise();
      return this.getFilePathUrl(targetPath);
    } catch (err) {
      log(
        `Failed to upload file to ${targetPath} from ${filePath}. Error: ${err}`,
      );
      throw err;
    }
  }
}
