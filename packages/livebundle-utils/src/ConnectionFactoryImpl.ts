import amqp, { AmqpConnectionManager } from "amqp-connection-manager";
import { ConnectionFactory } from "./types";

export class ConnectionFactoryImpl implements ConnectionFactory {
  createConnection(url: string): AmqpConnectionManager {
    return amqp.connect([url]);
  }
}
