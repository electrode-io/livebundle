import { AmqpConnectionManager, ChannelWrapper } from "amqp-connection-manager";
import { ConsumeMessage } from "amqplib";

export interface ChannelFactory {
  createChannel(
    name: string,
    connection: AmqpConnectionManager,
    consumer?: (msg: ConsumeMessage) => Promise<void>,
  ): ChannelWrapper;
}

export interface ConnectionFactory {
  createConnection(url: string): AmqpConnectionManager;
}
