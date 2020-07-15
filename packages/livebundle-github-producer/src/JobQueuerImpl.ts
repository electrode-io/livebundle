import amqp, { ChannelWrapper } from "amqp-connection-manager";
import { Channel } from "amqplib";
import debug from "debug";
import { Job, JobQueuer, QueueConfig } from "./types";

const log = debug("livebundle-github-producer:JobQueuerImpl");

export class JobQueuerImpl implements JobQueuer {
  private chan: ChannelWrapper;
  private hasDoneInit = false;
  private isInitInProgress = false;

  constructor(private readonly config: QueueConfig) {}

  public init(): void {
    if (!this.hasDoneInit && !this.isInitInProgress) {
      const connection = amqp.connect([this.config.url]);
      connection.on("connect", function () {
        log("Connected");
      });
      connection.on("disconnect", function (err) {
        log("Disconnected", err);
      });

      this.chan = connection.createChannel({
        json: true,
        setup: function (channel: Channel) {
          return Promise.all([
            channel.assertQueue(this.config.name, { durable: true }),
          ]);
        }.bind(this),
      });

      this.hasDoneInit = true;
      this.isInitInProgress = false;
      log("Completed init");
    }
  }

  public async queue(job: Job): Promise<void> {
    if (!this.hasDoneInit && !this.isInitInProgress) {
      this.init();
    }
    log(`Sending ${JSON.stringify(job)}`);
    this.chan.sendToQueue(this.config.name, job);
  }
}
