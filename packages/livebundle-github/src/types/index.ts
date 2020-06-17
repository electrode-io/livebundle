import { Octokit } from "@octokit/rest";
import { LiveBundleTask } from "livebundle-sdk";

export interface Config {
  github: GitHubAppConfig;
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
export interface JobRunner {
  run(job: Job): Promise<void>;
}

export interface GitHubApi {
  createComment({
    installationId,
    owner,
    repo,
    issueNumber,
    comment,
  }: {
    installationId: number;
    owner: string;
    repo: string;
    issueNumber: number;
    comment: string;
  }): Promise<void>;

  getPrChangedFiles({
    installationId,
    owner,
    repo,
    pull_number,
  }: {
    installationId: number;
    owner: string;
    repo: string;
    pull_number: number;
  }): Promise<string[]>;

  cloneRepoAndCheckoutPr({
    installationId,
    owner,
    repo,
    prNumber,
  }: {
    installationId: number;
    owner: string;
    repo: string;
    prNumber: number;
  }): Promise<void>;
}

export interface OctokitFactory {
  create(installationId: number): Promise<Octokit>;
}

export interface JWTIssuer {
  createJWT(installationId: number): Promise<string>;
}

export interface QRCodeUrlBuilder {
  buildUrl(qrContent: string): string;
}

export interface ExecCmd {
  exec(...cmds: string[]): void;
}
