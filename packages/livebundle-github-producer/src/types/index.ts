export interface Config extends Record<string, unknown> {
  server: ServerConfig;
  queue: QueueConfig;
}

export interface ServerConfig {
  host: string;
  port: number;
}

export interface QueueConfig {
  url: string;
  name: string;
}

export interface Job {
  installationId: number;
  owner: string;
  repo: string;
  prNumber: number;
}

export interface JobQueuer {
  queue(job: Job): Promise<void>;
}
