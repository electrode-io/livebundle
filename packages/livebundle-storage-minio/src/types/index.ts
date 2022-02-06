export interface MinIOStorageConfig {
  endPoint: string;
  port: number;
  useSSL?: boolean;
  accessKey: string;
  secretKey: string;
  bucketName: string;
}
