import "mocha";
import { expect } from "chai";
import { rejects } from "assert";
import { BundleAssetsResolverImpl } from "../src";
import path from "path";

describe("BundleAssetsResolverImpl", () => {
  const minifiedBundle = path.join(__dirname, "fixtures/minified.bundle");
  const nonMinifiedBundle = path.join(__dirname, "fixtures/nonminified.bundle");

  const minifiedRegisterAssetStatements = [
    'registerAsset({__packager_asset:!0,httpServerLocation:"/assets/assets",width:183,height:196,scales:[1],hash:"bb8622afa4965c14c383537fb704bc59",name:"foo",type:"png"})',
    'registerAsset({__packager_asset:!0,httpServerLocation:"/assets/node_modules/foo",width:183,height:196,scales:[1,2,3],hash:"a69fa1c2dd77bd4d143b4b77b1d98b88",name:"bar",type:"png"})',
  ];

  const nonMinifiedRegisterAssetStatements = [
    'registerAsset({\n    "__packager_asset": true,\n    "httpServerLocation": "/assets/assets",\n    "width": 183,\n    "height": 196,\n    "scales": [1],\n    "hash": "bb8622afa4965c14c383537fb704bc59",\n    "name": "foo",\n    "type": "png"\n  })',
    'registerAsset({\n    "__packager_asset": true,\n    "httpServerLocation": "/assets/node_modules/foo",\n    "width": 183,\n    "height": 196,\n    "scales": [1,2,3],\n    "hash": "a69fa1c2dd77bd4d143b4b77b1d98b88",\n    "name": "bar",\n    "type": "png"\n  })',
  ];

  const mappedRegisterAssetStatements = [
    {
      files: ["/assets/foo.png"],
      hash: "bb8622afa4965c14c383537fb704bc59",
    },
    {
      files: [
        "/node_modules/foo/bar.png",
        "/node_modules/foo/bar@2x.png",
        "/node_modules/foo/bar@3x.png",
      ],
      hash: "a69fa1c2dd77bd4d143b4b77b1d98b88",
    },
  ];

  describe("findRegisterAssetStatements", () => {
    it("should throw if path to bundle does not exist", async () => {
      const sut = new BundleAssetsResolverImpl();
      await rejects(sut.findRegisterAssetStatements("/bad/path/index.bundle"));
    });

    it("should return the registerAsset statements (as is) found in a minified bundle", async () => {
      const sut = new BundleAssetsResolverImpl();
      const result = await sut.findRegisterAssetStatements(minifiedBundle);
      expect(result).deep.equal(minifiedRegisterAssetStatements);
    });

    it("should return the registerAsset statements (as is) found in a non minified bundle", async () => {
      const sut = new BundleAssetsResolverImpl();
      const result = await sut.findRegisterAssetStatements(nonMinifiedBundle);
      expect(result).deep.equal(nonMinifiedRegisterAssetStatements);
    });

    it("should return an empty array if no registerAsset statements were found in bundle", async () => {
      const sut = new BundleAssetsResolverImpl();
      const result = await sut.findRegisterAssetStatements(
        path.join(__dirname, "../src/index.ts"),
      );
      expect(result).is.an("array").empty;
    });
  });

  describe("mapRegisterAssetStatements", () => {
    it("should throw if cwd path does not exist", () => {
      const sut = new BundleAssetsResolverImpl();
      expect(() =>
        sut.mapRegisterAssetStatements(minifiedRegisterAssetStatements, {
          cwd: "/bad/path",
        }),
      ).to.throw();
    });

    it("should properly map registerAsset statements coming from a minified bundle", () => {
      const sut = new BundleAssetsResolverImpl();
      const result = sut.mapRegisterAssetStatements(
        minifiedRegisterAssetStatements,
        { cwd: "/" },
      );
      expect(result).deep.equal(mappedRegisterAssetStatements);
    });

    it("should properly map registerAsset statements coming from a non minified bundle", () => {
      const sut = new BundleAssetsResolverImpl();
      const result = sut.mapRegisterAssetStatements(
        nonMinifiedRegisterAssetStatements,
        { cwd: "/" },
      );
      expect(result).deep.equal(mappedRegisterAssetStatements);
    });

    it("should use the process cwd if cwd is not provided", () => {
      const sut = new BundleAssetsResolverImpl();
      const result = sut.mapRegisterAssetStatements(
        nonMinifiedRegisterAssetStatements,
      );
      expect(result).deep.equal(
        mappedRegisterAssetStatements.map((x) => ({
          hash: x.hash,
          files: x.files.map((f) => path.join(process.cwd(), f)),
        })),
      );
    });
  });

  describe("resolveAssets", () => {
    it("should throw if path to bundle does not exist", async () => {
      const sut = new BundleAssetsResolverImpl();
      await rejects(sut.resolveAssets("/bad/path/index.bundle"));
    });

    it("should throw if cwd path does not exist", async () => {
      const sut = new BundleAssetsResolverImpl();
      await rejects(sut.resolveAssets("/", { cwd: "/bad/path" }));
    });

    it("should return react native assets found in a minified bundle", async () => {
      const sut = new BundleAssetsResolverImpl();
      const result = await sut.resolveAssets(minifiedBundle, { cwd: "/" });
      expect(result).deep.equal(mappedRegisterAssetStatements);
    });

    it("should return react native assets found in a non minified bundle", async () => {
      const sut = new BundleAssetsResolverImpl();
      const result = await sut.resolveAssets(nonMinifiedBundle, { cwd: "/" });
      expect(result).deep.equal(mappedRegisterAssetStatements);
    });
  });
});
