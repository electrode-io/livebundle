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
      port: 3000,
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

  describe("functional tests", () => {
    describe("GET /:content", () => {
      it("should return HTTP 200", (done) => {
        const sut = new QRCodeServer(defaultConfig);
        chai
          .request(sut.app)
          .get("/foo")
          .end((err, res) => {
            expect(res).to.have.status(200);
            done();
          });
      });

      it("should have Content-Type header set to image/png", (done) => {
        const sut = new QRCodeServer(defaultConfig);
        chai
          .request(sut.app)
          .get("/foo")
          .end((err, res) => {
            expect(res.get("Content-Type")).eql("image/png");
            done();
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
        it(`should generate expected qr [test case #${id}]`, (done) => {
          const sut = new QRCodeServer(config);
          chai
            .request(sut.app)
            .get(`/foo`)
            .query(query as QRCodeConfig)
            .end((err, res) => {
              const b1 = fs.readFileSync(
                path.join(
                  fixturesPath,
                  getQRCodeFileName({ content: "foo", margin, width }),
                ),
              );
              const b2 = res.body;
              expect(Buffer.compare(b1, b2)).eql(0);
              done();
            });
        });
      });
    });
  });
});
