#!/usr/bin/env node

/**
 * This script currently assumes the following
 * - Machine is logged in to DockerHub with proper credentials
 * - 0.1.x is the current images version range
 * - Is run after new livebundle packages have been published
 */

const fs = require("fs");
const path = require("path");
const execSync = require("child_process").execSync;

const dockerHubOrg = "belemaire";

const dockerBuildCmnd = (image, tag) => `docker build -t ${image}:${tag} \
-t ${image}:0.1 \
-t ${image}:latest \
-f Dockerfile.prod .`;

const dockerPushCmd = (image, tag) => `docker push ${image}:${tag}`;

const packagesRoot = path.resolve(__dirname, "../packages");

const packages = [
  "livebundle-github-consumer",
  "livebundle-github-producer",
  "livebundle-qrcode",
  "livebundle-store",
];

function isImageTagPublished(image, tag) {
  const res = execSync(
    `curl --silent https://hub.docker.com/v2/repositories/${image}/tags/${tag}/`,
  );
  const obj = JSON.parse(res.toString());
  return !!(obj && obj.name && obj.name === tag);
}

function getPackageVersion(pkg) {
  const pJsonPath = path.join(packagesRoot, pkg, "package.json");
  const pJsonFile = fs.readFileSync(pJsonPath);
  const pJson = JSON.parse(pJsonFile);
  return pJson.version;
}

function updateDockerFileWithNewPkgVersion(pkg, version) {
  const dockerFilePath = path.join(packagesRoot, pkg, "Dockerfile.prod");
  const dockerFileContent = fs.readFileSync(dockerFilePath, {
    encoding: "utf-8",
  });
  const re = new RegExp(`${pkg}@.+$`, "m");
  const updatedContent = dockerFileContent.replace(re, `${pkg}@${version}`);
  fs.writeFileSync(dockerFilePath, updatedContent);
}

packages.forEach((pkg) => {
  const image = `${dockerHubOrg}/${pkg}`;
  const version = getPackageVersion(pkg);
  console.log(`==== Handling ${image} ${version} ====`);
  if (!isImageTagPublished(image, version)) {
    process.chdir(path.join(packagesRoot, pkg));
    updateDockerFileWithNewPkgVersion(pkg, version);
    [
      dockerBuildCmnd(image, version),
      dockerPushCmd(image, version),
      dockerPushCmd(image, "0.1"),
      dockerPushCmd(image, "latest"),
    ].forEach((cmd) => execSync(cmd, { stdio: "inherit " }));
  } else {
    console.log(`Skipping [already published to DockerHub]`);
  }
});
