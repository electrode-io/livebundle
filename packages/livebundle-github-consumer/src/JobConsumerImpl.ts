import { ChannelWrapper } from "amqp-connection-manager";
import { ConsumeMessage } from "amqplib";
import debug from "debug";
import { QueueConfig } from "livebundle-github-producer/src";
import { ChannelFactory, ConnectionFactory } from "livebundle-utils";
import { Job, JobConsumer, JobRunner } from "./types";

const log = debug("livebundle-github-consumer:JobConsumerImpl");

export class JobConsumerImpl implements JobConsumer {
  private constructor(
    private readonly config: QueueConfig,
    private readonly channel: ChannelWrapper,
    private readonly jobRunner: JobRunner,
  ) {}

  public static async init(
    config: QueueConfig,
    jobRunner: JobRunner,
    channelFactory: ChannelFactory,
    connectionFactory: ConnectionFactory,
  ): Promise<JobConsumer> {
    const connection = connectionFactory.createConnection(config.url);
    connection.on("connect", function () {
      log("Connected");
    });
    connection.on("disconnect", function (err) {
      log("Disconnected", err);
    });

    const channel = channelFactory.createChannel(
      config.name,
      connection,
      async (msg: ConsumeMessage) => {
        const msgStr = msg.content.toString();
        log(`Received ${msgStr}`);
        try {
          await jobRunner.run(JSON.parse(msgStr) as Job);
          log(`channel is ${channel}`);
          channel.ack(msg);
        } catch (e) {
          log("Failed to process ${msgStr}. Error : ${e}");
          channel.nack(msg);
        }
      },
    );

    await channel.waitForConnect();
    log("Completed init");
    return new JobConsumerImpl(config, channel, jobRunner);
  }
}
