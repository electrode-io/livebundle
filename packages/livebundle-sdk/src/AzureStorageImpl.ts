import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import debug from "debug";
import { AzureBlobStorageConfig, Storage } from "./types";

const log = debug("livebundle-sdk:AzureStorageImpl");

export class AzureStorageImpl implements Storage {
  private readonly containerClient: ContainerClient;

  public get accountUrl(): string {
    return `https://${this.azureConfig.account}.blob.core.windows.net`;
  }

  public get baseUrl(): string {
    return `${this.accountUrl}/${this.azureConfig.container}`;
  }

  public constructor(private readonly azureConfig: AzureBlobStorageConfig) {
    const blobServiceClient = new BlobServiceClient(
      `${this.accountUrl}${azureConfig.sasToken}`,
      undefined,
      azureConfig.options,
    );
    this.containerClient = blobServiceClient.getContainerClient(
      azureConfig.container,
    );
  }

  async store(
    content: string,
    contentLength: number,
    targetPath: string,
  ): Promise<void> {
    log(`Uploading data to ${targetPath}`);
    const blockBlobClient = this.containerClient.getBlockBlobClient(targetPath);
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
    log(`Uploading file to ${targetPath}`);
    const blockBlobClient = this.containerClient.getBlockBlobClient(targetPath);
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
