import { BlobServiceClient } from "@azure/storage-blob";
import debug from "debug";
import { AzureBlobStorageConfig } from "./types";
import { Storage } from "livebundle-sdk";

const log = debug("livebundle-storage-impl:AzureStorageImpl");

export class AzureStorageImpl implements Storage {
  private readonly blobServiceClient: BlobServiceClient;
  private readonly config: AzureBlobStorageConfig;

  public get accountUrl(): string {
    return this.config.accountUrl;
  }

  public get baseUrl(): string {
    return `${this.accountUrl}/${this.azureConfig.container}`;
  }

  public static readonly envVarToConfigKey: Record<string, string> = {
    LB_STORAGE_AZURE_ACCOUNTURL: "accountUrl",
    LB_STORAGE_AZURE_CONTAINER: "container",
    LB_STORAGE_AZURE_SASTOKEN: "sasToken",
  };

  public constructor(
    private readonly azureConfig: AzureBlobStorageConfig,
    { blobServiceClient }: { blobServiceClient?: BlobServiceClient } = {},
  ) {
    this.config = azureConfig;
    this.blobServiceClient =
      blobServiceClient ??
      new BlobServiceClient(
        `${this.accountUrl}${azureConfig.sasToken}`,
        undefined,
        azureConfig.options,
      );
  }

  public static async create(
    azureConfig: AzureBlobStorageConfig,
  ): Promise<AzureStorageImpl> {
    return new AzureStorageImpl(azureConfig);
  }

  async store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<void> {
    log(`store(contentLength: ${contentLength}, targetPath: ${targetPath})`);

    const containerClient = this.blobServiceClient.getContainerClient(
      this.config.container,
    );
    const blockBlobClient = containerClient.getBlockBlobClient(targetPath);
    try {
      await blockBlobClient.upload(content, contentLength);
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
  ): Promise<void> {
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
    } catch (e) {
      log(`Failed to upload file to ${targetPath}. Error: ${e}`);
      throw e;
    }
  }
}
