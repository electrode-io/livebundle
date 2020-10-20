import { BlobServiceClient } from "@azure/storage-blob";
import debug from "debug";
import { AzureBlobStorageConfig } from "./types";
import { StoragePlugin } from "livebundle-sdk";
import { configSchema } from "./schemas";

const log = debug("livebundle-storage-impl:AzureStoragePlugin");

export class AzureStoragePlugin implements StoragePlugin {
  private readonly blobServiceClient: BlobServiceClient;
  private readonly config: AzureBlobStorageConfig;

  public get accountUrl(): string {
    return this.config.accountUrl;
  }

  public get baseUrl(): string {
    return `${this.accountUrl}/${this.azureConfig.container}`;
  }

  public getFilePathUrl(p: string): string {
    return `${this.baseUrl}/${p}${this.config.sasTokenReads ?? ""}`;
  }

  public static readonly schema: Record<string, unknown> = configSchema;

  public static readonly envVarToConfigKey: Record<string, string> = {
    LB_STORAGE_AZURE_ACCOUNTURL: "accountUrl",
    LB_STORAGE_AZURE_CONTAINER: "container",
    LB_STORAGE_AZURE_SASTOKEN: "sasToken",
    LB_STORAGE_AZURE_SASTOKENREADS: "sasTokenReads",
  };

  public constructor(
    private readonly azureConfig: AzureBlobStorageConfig,
    { blobServiceClient }: { blobServiceClient?: BlobServiceClient } = {},
  ) {
    this.config = azureConfig;
    this.blobServiceClient =
      blobServiceClient ??
      new BlobServiceClient(
        `${this.accountUrl}${azureConfig.sasToken ?? ""}`,
        undefined,
        azureConfig.options,
      );
  }

  hasFile(filePath: string): Promise<boolean> {
    log(`hasFile(filePath: ${filePath})`);

    const containerClient = this.blobServiceClient.getContainerClient(
      this.config.container,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(filePath);
    return blockBlobClient.exists();
  }

  downloadFile(filePath: string): Promise<Buffer> {
    log(`downloadFile(filePath: ${filePath})`);

    const containerClient = this.blobServiceClient.getContainerClient(
      this.config.container,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(filePath);
    return blockBlobClient.downloadToBuffer();
  }

  public static async create(
    azureConfig: AzureBlobStorageConfig,
  ): Promise<AzureStoragePlugin> {
    return new AzureStoragePlugin(azureConfig);
  }

  async store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<string> {
    log(`store(contentLength: ${contentLength}, targetPath: ${targetPath})`);

    const containerClient = this.blobServiceClient.getContainerClient(
      this.config.container,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
    try {
      await blockBlobClient.upload(content, contentLength);
      return this.getFilePathUrl(targetPath);
    } catch (e) {
      log(`Failed to upload data to ${targetPath}. Error: ${e}`);
      throw e;
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

    const containerClient = this.blobServiceClient.getContainerClient(
      this.config.container,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
    try {
      await blockBlobClient.uploadFile(filePath, {
        blobHTTPHeaders: { blobContentType: options?.contentType },
      });
      return this.getFilePathUrl(targetPath);
    } catch (e) {
      log(`Failed to upload file to ${targetPath}. Error: ${e}`);
      throw e;
    }
  }
}
