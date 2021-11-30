export interface S3StorageConfig {
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  region?: string;
}
