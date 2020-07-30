import {
  AmqpConnectionManager,
  CreateChannelOpts,
  SetupFunc,
} from "amqp-connection-manager";
import { ConfirmChannel } from "amqplib";
import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import { ChannelFactoryProducerImpl } from "../src/ChannelFactoryProducerImpl";

describe("ChannelFactoryProducerImpl", () => {
  describe("createChannel", () => {
    it("should call create a channel on the connection", () => {
      const connectionCreateChannelStub = sinon.stub();
      const sut = new ChannelFactoryProducerImpl();
      sut.createChannel("test", {
        createChannel: connectionCreateChannelStub as unknown,
      } as AmqpConnectionManager);
      expect(connectionCreateChannelStub.calledOnce).true;
    });

    it("should return the created channel", () => {
      const chan = {};
      const connectionCreateChannelStub = sinon.stub().returns(chan);
      const sut = new ChannelFactoryProducerImpl();
      const result = sut.createChannel("test", {
        createChannel: connectionCreateChannelStub as unknown,
      } as AmqpConnectionManager);
      expect(result).equals(chan);
    });

    it("should not fail to setup the channel", () => {
      const sut = new ChannelFactoryProducerImpl();
      let capturedSetupFunction: SetupFunc | undefined;
      sut.createChannel("test", {
        createChannel: (opts?: CreateChannelOpts) => {
          capturedSetupFunction = opts?.setup;
        },
      } as AmqpConnectionManager);
      const channelStub = {
        assertQueue: sinon.stub(),
        consume: sinon.stub(),
        prefetch: sinon.stub(),
      };
      expect(capturedSetupFunction).not.undefined;
      capturedSetupFunction!(
        (channelStub as unknown) as ConfirmChannel,
        () => {},
      );
    });
  });
});
