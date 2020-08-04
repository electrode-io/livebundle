import { ChannelWrapper } from "amqp-connection-manager";
import debug from "debug";
import {
  ChannelFactoryProducerImpl,
  ConnectionFactoryImpl,
} from "livebundle-utils";
import { Job, JobProducer, QueueConfig } from "./types";

const log = debug("livebundle-github-producer:JobQueuerImpl");

export class JobProducerImpl implements JobProducer {
  private constructor(
    private readonly config: QueueConfig,
    private readonly channel: ChannelWrapper,
  ) {}

  public static async init(
    config: QueueConfig,
    channelFactory: ChannelFactoryProducerImpl,
    connectionFactory: ConnectionFactoryImpl,
  ): Promise<JobProducer> {
    const connection = connectionFactory.createConnection(config.url);
    connection.on("connect", function () {
      log("Connected");
    });
    connection.on("disconnect", function (err) {
      log("Disconnected", err);
    });

    const channel = channelFactory.createChannel(config.name, connection);

    await channel.waitForConnect();
    log("Completed init");
    return new JobProducerImpl(config, channel);
  }

  public async queue(job: Job): Promise<void> {
    log(`Sending ${JSON.stringify(job)}`);
    this.channel.sendToQueue(this.config.name, job);
  }
}
