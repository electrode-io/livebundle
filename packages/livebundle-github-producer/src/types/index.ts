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

export interface Job extends Record<string, unknown> {
  installationId: number;
  owner: string;
  repo: string;
  prNumber: number;
}

export interface JobProducer {
  queue(job: Job): Promise<void>;
}
