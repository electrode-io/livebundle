import amqp, { ChannelWrapper } from "amqp-connection-manager";
import { Channel, ConsumeMessage } from "amqplib";
import debug from "debug";
import { QueueConfig } from "livebundle-github-producer/src";
import { Job, JobDequeuer, JobRunner } from "./types";

const log = debug("livebundle-github-consumer:JobDequeuerImpl");

export class JobDequeuerImpl implements JobDequeuer {
  private chan: ChannelWrapper;
  private hasDoneInit = false;
  private isInitInProgress = false;

  constructor(
    private readonly config: QueueConfig,
    private readonly jobRunner: JobRunner,
  ) {}

  private onMessage(msg: ConsumeMessage) {
    const msgStr = msg.content.toString();
    log(`Received ${msgStr}`);
    this.chan.ack(msg);
    this.jobRunner.run(JSON.parse(msgStr) as Job).catch((err) => log(err));
  }

  public async init(): Promise<void> {
    if (!this.hasDoneInit && !this.isInitInProgress) {
      this.isInitInProgress = true;
      const connection = amqp.connect([this.config.url]);
      connection.on("connect", function () {
        log("Connected");
      });
      connection.on("disconnect", function (err) {
        log("Disconnected", err);
      });

      this.chan = connection.createChannel({
        setup: function (channel: Channel) {
          return Promise.all([
            channel.assertQueue(this.config.name, { durable: true }),
            channel.prefetch(1),
            channel.consume(this.config.name, this.onMessage.bind(this)),
          ]);
        }.bind(this),
      });

      await this.chan.waitForConnect();
      this.hasDoneInit = true;
      this.isInitInProgress = false;
      log("Completed init");
    }
  }

  public async start(): Promise<void> {
    if (!this.hasDoneInit && !this.isInitInProgress) {
      await this.init();
    }
  }
}
