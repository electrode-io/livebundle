import {
  AmqpConnectionManager,
  ChannelWrapper,
  CreateChannelOpts,
  SetupFunc,
} from "amqp-connection-manager";
import {
  ConfirmChannel,
  ConsumeMessage,
  Message,
  Options,
  Replies,
} from "amqplib";
import { expect } from "chai";
import { EventEmitter } from "events";
import { ChannelFactory, ConnectionFactory } from "livebundle-utils";
import "mocha";
import sinon from "sinon";
import { Job, JobProducerImpl } from "../src";

describe("JobProducerImpl", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  const job: Job = {
    installationId: 12345,
    owner: "foo",
    repo: "bar",
    prNumber: 56,
  };

  describe("init", () => {
    it("should not fail", async () => {
      await JobProducerImpl.init(
        {
          name: "test",
          url: "amqp://localhost:5672",
        },
        new ChannelFactoryNullImpl(),
        new ConnectionFactoryNullImpl(),
      );
      expect(true).true;
    });

    it("should properly handle connect event from connection", async () => {
      const connectionManager = new AmqpConnectionManagerNullImpl();
      const connectionFactoryStub = sandbox.createStubInstance(
        ConnectionFactoryNullImpl,
        {
          createConnection: sandbox
            .stub<[string], any>()
            .returns(connectionManager),
        },
      );
      await JobProducerImpl.init(
        {
          name: "test",
          url: "amqp://localhost:5672",
        },
        new ChannelFactoryNullImpl(),
        connectionFactoryStub,
      );
      connectionManager.emit("connect");
    });

    it("should properly handle disconnect event from connection", async () => {
      const connectionManager = new AmqpConnectionManagerNullImpl();
      const connectionFactoryStub = sandbox.createStubInstance(
        ConnectionFactoryNullImpl,
        {
          createConnection: sandbox
            .stub<[string], any>()
            .returns(connectionManager),
        },
      );
      await JobProducerImpl.init(
        {
          name: "test",
          url: "amqp://localhost:5672",
        },
        new ChannelFactoryNullImpl(),
        connectionFactoryStub,
      );
      connectionManager.emit("disconnect", new Error("boom"));
    });
  });

  describe("queue", () => {
    it("should send the job on queue channel", async () => {
      const channelWrapperStub = sandbox.createStubInstance(
        ChannelWrapperNullImpl,
        {
          sendToQueue: sandbox
            .stub<
              [
                string,
                Record<string, unknown> | Buffer,
                Options.Publish | undefined,
                ((err: any, ok: Replies.Empty) => void) | undefined,
              ],
              Promise<void>
            >()
            .resolves(),
        },
      );
      const channelFactoryStub = sandbox.createStubInstance(
        ChannelFactoryNullImpl,
        {
          createChannel: sandbox
            .stub<
              [
                string,
                AmqpConnectionManager,
                ((msg: ConsumeMessage) => Promise<void>) | undefined,
              ],
              ChannelWrapper
            >()
            .returns(channelWrapperStub),
        },
      );
      const sut = await JobProducerImpl.init(
        {
          name: "test",
          url: "amqp://localhost:5672",
        },
        channelFactoryStub,
        new ConnectionFactoryNullImpl(),
      );
      await sut.queue(job);
      expect(channelWrapperStub.sendToQueue.calledOnce).true;
      expect(channelWrapperStub.sendToQueue.calledWith("test", job));
    });
  });
});

class AmqpConnectionManagerNullImpl extends EventEmitter
  implements AmqpConnectionManager {
  createChannel(opts?: CreateChannelOpts | undefined): ChannelWrapper {
    return new ChannelWrapperNullImpl();
  }
  isConnected(): boolean {
    return false;
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}

class ChannelWrapperNullImpl extends EventEmitter implements ChannelWrapper {
  addSetup(func: SetupFunc): Promise<void> {
    return Promise.resolve();
  }
  removeSetup(
    func: SetupFunc,
    tearDown?:
      | ((
          channel: ConfirmChannel,
          callback: (error?: Error | undefined) => void,
        ) => void)
      | ((channel: ConfirmChannel) => Promise<void>)
      | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }
  publish(
    exchange: string,
    routingKey: string,
    content: Record<string, unknown> | Buffer,
    options?: Options.Publish | undefined,
    callback?: ((err: any, ok: Replies.Empty) => void) | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }
  sendToQueue(
    queue: string,
    content: Record<string, unknown> | Buffer,
    options?: Options.Publish | undefined,
    callback?: ((err: any, ok: Replies.Empty) => void) | undefined,
  ): Promise<void> {
    return Promise.resolve();
  }
  ack(message: Message, allUpTo?: boolean | undefined): void {
    return;
  }
  nack(
    message: Message,
    allUpTo?: boolean | undefined,
    requeue?: boolean | undefined,
  ): void {
    return;
  }
  queueLength(): number {
    return 0;
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
  waitForConnect(): Promise<void> {
    return Promise.resolve();
  }
}

class ChannelFactoryNullImpl implements ChannelFactory {
  createChannel(
    name: string,
    connection: AmqpConnectionManager,
    consumer?: ((msg: ConsumeMessage) => Promise<void>) | undefined,
  ): ChannelWrapper {
    return new ChannelWrapperNullImpl();
  }
}

class ConnectionFactoryNullImpl implements ConnectionFactory {
  createConnection(url: string): AmqpConnectionManager {
    return new AmqpConnectionManagerNullImpl();
  }
}
