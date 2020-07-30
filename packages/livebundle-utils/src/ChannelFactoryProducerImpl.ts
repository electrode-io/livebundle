import { AmqpConnectionManager, ChannelWrapper } from "amqp-connection-manager";
import { Channel } from "amqplib";
import { ChannelFactory } from "./types";

export class ChannelFactoryProducerImpl implements ChannelFactory {
  createChannel(
    name: string,
    connection: AmqpConnectionManager,
  ): ChannelWrapper {
    return connection.createChannel({
      json: true,
      setup: function (channel: Channel) {
        return Promise.all([channel.assertQueue(name, { durable: true })]);
      },
    });
  }
}
