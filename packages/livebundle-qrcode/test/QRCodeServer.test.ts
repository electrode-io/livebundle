import chai, { expect } from "chai";
import chaiHttp from "chai-http";
import fs from "fs-extra";
import "mocha";
import path from "path";
import { QRCodeServer } from "../src/QRCodeServer";
import { Config, QRCodeConfig } from "../src/types";

describe("QRCodeServer", () => {
  chai.use(chaiHttp);

  const fixturesPath = path.resolve(__dirname, "fixtures");

  const defaultConfig: Config = {
    qrcode: {
      margin: 1,
      width: 250,
    },
    server: {
      host: "localhost",
      port: 0,
    },
  };

  function getQRCodeFileName({
    content,
    margin,
    width,
  }: {
    content: string;
    margin: number;
    width: number;
  }): string {
    return `${content}_m${margin}_w${width}.jpg`;
  }

  async function test(
    config: Config,
    func: (req: ChaiHttp.Agent, server: QRCodeServer) => Promise<void>,
  ) {
    const serv = new QRCodeServer(config);
    try {
      await serv.start();
      await func(chai.request(`http://${serv.address}:${serv.port}`), serv);
    } finally {
      serv.stop();
    }
  }

  describe("get address", () => {
    it("should throw if the server is not started", () => {
      const sut = new QRCodeServer(defaultConfig);
      expect(() => sut.address).to.throw();
    });
  });

  describe("get port", () => {
    it("should throw if the server is not started", () => {
      const sut = new QRCodeServer(defaultConfig);
      expect(() => sut.port).to.throw();
    });
  });

  describe("functional tests", () => {
    describe("GET /:content", () => {
      it("should return HTTP 200", async () => {
        await test(defaultConfig, async (req) => {
          const res = await req.get("/foo");
          expect(res).to.have.status(200);
        });
      });

      it("should have Content-Type header set to image/png", async () => {
        await test(defaultConfig, async (req) => {
          const res = await req.get("/foo");
          expect(res.get("Content-Type")).eql("image/png");
        });
      });

      // [config, query_params, content] tuples
      const configTuples: [
        number, // Test id
        Config, // QRCode service configuration
        QRCodeConfig | undefined, // QR Code configuration send as query params
        number, // QR Code expected margin outcome
        number, // QR Code expected width outcome
      ][] = [
        // Default config, not overriden by query parameters
        [0, defaultConfig, undefined, 1, 250],
        // Default config, overriden by query parameters
        [1, defaultConfig, { margin: 2, width: 200 }, 2, 200],
        // Custom config, not overriden by query parameters
        [
          2,
          { qrcode: { margin: 2, width: 200 }, server: defaultConfig.server },
          undefined,
          2,
          200,
        ],
        // Custom config, overriden by query parameters
        [
          3,
          { qrcode: { margin: 2, width: 200 }, server: defaultConfig.server },
          { margin: 1, width: 250 },
          1,
          250,
        ],
      ];
      configTuples.forEach(([id, config, query, margin, width]) => {
        it(`should generate expected qr [test case #${id}]`, async () => {
          await test(config, async (req) => {
            const res = await req.get(`/foo`).query(query as QRCodeConfig);

            const b1 = fs.readFileSync(
              path.join(
                fixturesPath,
                getQRCodeFileName({ content: "foo", margin, width }),
              ),
            );
            const b2 = res.body;
            expect(Buffer.compare(b1, b2)).eql(0);
          });
        });
      });
    });
  });
});
