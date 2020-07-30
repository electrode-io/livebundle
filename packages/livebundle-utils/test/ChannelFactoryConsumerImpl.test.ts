import {
  AmqpConnectionManager,
  CreateChannelOpts,
  SetupFunc,
} from "amqp-connection-manager";
import { ConfirmChannel, ConsumeMessage } from "amqplib";
import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import { ChannelFactoryConsumerImpl } from "../src/ChannelFactoryConsumerImpl";

describe("ChannelFactoryConsumerImpl", () => {
  describe("createChannel", () => {
    it("should call create a channel on the connection", () => {
      const connectionCreateChannelStub = sinon.stub();
      const sut = new ChannelFactoryConsumerImpl();
      sut.createChannel(
        "test",
        {
          createChannel: connectionCreateChannelStub as unknown,
        } as AmqpConnectionManager,
        (msg: ConsumeMessage) => Promise.resolve(),
      );
      expect(connectionCreateChannelStub.calledOnce).true;
    });

    it("should return the created channel", () => {
      const chan = {};
      const connectionCreateChannelStub = sinon.stub().returns(chan);
      const sut = new ChannelFactoryConsumerImpl();
      const result = sut.createChannel(
        "test",
        {
          createChannel: connectionCreateChannelStub as unknown,
        } as AmqpConnectionManager,
        (msg: ConsumeMessage) => Promise.resolve(),
      );
      expect(result).equals(chan);
    });

    it("should setup the channel with a prefetch count of 1", () => {
      const sut = new ChannelFactoryConsumerImpl();
      let capturedSetupFunction: SetupFunc | undefined;
      sut.createChannel(
        "test",
        {
          createChannel: (opts?: CreateChannelOpts) => {
            capturedSetupFunction = opts?.setup;
          },
        } as AmqpConnectionManager,
        (msg: ConsumeMessage) => Promise.resolve(),
      );
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
      expect(channelStub.prefetch.calledOnceWith(1)).true;
    });
  });
});
