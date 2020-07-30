import amqp, { AmqpConnectionManager } from "amqp-connection-manager";
import { expect } from "chai";
import { ConnectionFactoryImpl } from "livebundle-utils/src/ConnectionFactoryImpl";
import "mocha";
import sinon from "sinon";

describe("ChannelFactoryProducerImpl", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  describe("createConnection", () => {
    it("should call amqp connect", () => {
      const amqpConnectStub = sandbox.stub(amqp, "connect");
      const sut = new ConnectionFactoryImpl();
      sut.createConnection("amqp://localhost:5672");
      expect(amqpConnectStub.calledOnce).true;
    });

    it("should pass the url to amqp connect", () => {
      const amqpConnectStub = sandbox.stub(amqp, "connect");
      const sut = new ConnectionFactoryImpl();
      sut.createConnection("amqp://localhost:5672");
      expect(amqpConnectStub.calledOnceWith(["amqp://localhost:5672"])).true;
    });

    it("should return the created connection instance", () => {
      const expected = {};
      sandbox.stub(amqp, "connect").returns(expected as AmqpConnectionManager);
      const sut = new ConnectionFactoryImpl();
      const result = sut.createConnection("amqp://localhost:5672");
      expect(result).equals(expected);
    });
  });
});
