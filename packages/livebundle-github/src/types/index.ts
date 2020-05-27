import { LiveBundleTask } from "livebundle-sdk";

export interface Config {
  github: GitHubAppConfig;
  jobManager: JobManagerConfig;
  qrcode: QrCodeServiceConfig;
  server: ServerConfig;
  task: LiveBundleTask;
}
export interface ServerConfig {
  host: string;
  port: number;
}
export interface GitHubAppConfig {
  privateKey: string;
  appIdentifier: number;
  clientId: string;
  clientSecret: string;
}

export interface QrCodeServiceConfig {
  url: string;
  margin?: number;
  width?: number;
}

export interface Job {
  installationId: number;
  owner: string;
  repo: string;
  prNumber: number;
}

export interface JobManagerConfig {
  maxConcurentJobs: number;
}
