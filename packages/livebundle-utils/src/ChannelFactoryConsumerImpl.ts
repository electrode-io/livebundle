import { AmqpConnectionManager, ChannelWrapper } from "amqp-connection-manager";
import { Channel, ConsumeMessage } from "amqplib";
import { ChannelFactory } from "./types";

export class ChannelFactoryConsumerImpl implements ChannelFactory {
  createChannel(
    name: string,
    connection: AmqpConnectionManager,
    consumer: (msg: ConsumeMessage) => Promise<void>,
  ): ChannelWrapper {
    return connection.createChannel({
      setup: function (channel: Channel) {
        return Promise.all([
          channel.assertQueue(name, { durable: true }),
          channel.prefetch(1),
          channel.consume(name, consumer),
        ]);
      }.bind(this),
    });
  }
}
