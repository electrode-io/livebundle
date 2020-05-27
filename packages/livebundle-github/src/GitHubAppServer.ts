import express from "express";
import { JobManager } from "./JobManager";
import log from "./log";
import { ServerConfig } from "./types";

export class GitHubAppServer {
  private readonly app: express.Application;

  constructor(
    private readonly config: ServerConfig,
    private readonly jobManager: JobManager,
  ) {
    this.app = express();
    this.app.use(express.json());
    this.createAppRoutes();
  }

  private createAppRoutes() {
    this.app.post("/", async (req, res) => {
      if (req.body.action === "opened") {
        const { installation, repository, number: prNumber } = req.body;
        const installationId = installation.id;
        const owner = repository.owner.login;
        const repo = repository.name;

        this.jobManager.add({
          installationId,
          owner,
          prNumber,
          repo,
        });
      }

      res.json({ ok: 1 });
    });
  }

  public start(): void {
    const { host, port } = this.config;
    this.app.listen(port, host, () =>
      log(`GitHub app server listening on ${host}:${port}`),
    );
  }
}
