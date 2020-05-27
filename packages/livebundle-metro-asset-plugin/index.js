const debug = require("debug");
const fs = require("fs-extra");
const path = require("path");

const log = debug("livebundle-metro-asset-plugin:index");

fs.ensureDirSync(path.resolve(".livebundle"));
const assetsFile = path.resolve(".livebundle/assets.json");

var stream = fs.createWriteStream(assetsFile);

async function transformer(assetData) {
  try {
    const assetDataStr = JSON.stringify(assetData);
    log(assetDataStr);
    stream.write(`${assetDataStr}\n`);
  } catch (e) {
    log(e.message);
  } finally {
    return assetData;
  }
}

module.exports = transformer;
