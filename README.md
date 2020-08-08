<h2 align="center">
    <br>
	<img src="./assets/logo.png" alt="LiveBundle" width="200">
	<br>
</h2>

# LiveBundle CLI

[![ci][1]][2] [![codecov][3]][4]

**This project is still in incubation.
If you are cloning this repository at this stage, be ready for a wild ride with potential consequent repository updates and breaking changes from one day to the next. _Or to put it another way : 'Not ready for production'._**

## Adding LiveBundle CLI to your React Native application

Using npm

`$ npm install livebundle --save-dev`

Using yarn

`$ yarn add livebundle --dev`

Once installed, you will need to add the following asset plugin in your `metro.config.js` file

```javascript
module.exports = {
  transformer: {
    assetPlugins: ['livebundle-metro-asset-plugin'],
    // Other transformer properties
  }
}
```

*BLE Remark: This step shouldn't be needed in the near future as we will instead perform bundle static analysis to detect assets, rather than relying on a plugin, to simplify the setup experience*

## Configuring LiveBundle CLI

- Create a `livebundle.yaml` file in your top level React Native application directory.
- Add the desired LiveBundle configuration in this file. For reference, you can have a look to the [minimalistic `livebundle.yaml` configuration](https://github.com/electrode-io/react-native-livebundle/blob/master/example/livebundle.yaml) in the LiveBundle demo application. You can also refer to the [full sample configuration](./packages/livebundle/config/sample.yaml) part of this repository.

*BLE Remark: Of course we will beef up the configuration documentation. It should be part of the website documentation anyway, not this README. Also we should have on near term a LiveBudle command to generate a basic starter livebundle.yaml configuration file*

## Using LiveBundle CLI

To generate and upload a new LiveBundle package.

Using npm

`$ npm run livebundle upload`

Using yarn

`$ yarn livebundle upload`

Note that an Azure SAS Token is needed for the upload. It should either be set in the `livebundle.yaml` configuration, or set as `LB_UPLOAD_AZURE_SASTOKEN` env variable.

It is also possible to have different LiveBundle configuration file *(for example, could have a `livebundle.ci.yaml` containing LiveBundle configuration when running on CI only)*. By default, the `livebundle` command will load the `livebundle.yaml` configuration. To inform `livebundle` to use a different configuration file, just use the `--config` option which takes the path of the configuration file to us.

## Repository structure _(curated)_

```
.
├── lerna.json            // Lerna configuration
├── packages              // Node.js packages
│   ├── livebundle        // Command line CLI
│   ├── livebundle-metro-asset-plugin  // Metro asset plugin
│   ├── livebundle-sdk    // SDK (used by CLI and GITHUB)
│   └── livebundle-utils  // Misc shared utils
├── README.md             // This README ;)
├── tsconfig.build.json   // TypeScript config used for builds
├── tsconfig.json         // TypeScript config used by monorepo
├── .eslintignore.json    // Files/Directories to exclude from ESLint
├── .eslintrc.js          // ESLint configuration
├── .mocharc.json         // Mocha configuration
├── .nycrc                // nyc (coverage) configuration
├── .prettier.rc          // Prettier configuration
└── .vscode               // VSCode IDE configuration
    └── settings.json     // VSCode workspace configuration
```

## Related repositories

- [react-native-livebundle](https://github.com/electrode-io/react-native-livebundle) contains LiveBundle React Native native module along with a demo application.
- [LiveBundle website](https://github.com/electrode-io/livebundle-website) contains the LiveBundle website and user documentation *(outdated)*

[1]: https://github.com/electrode-io/livebundle/workflows/ci/badge.svg
[2]: https://github.com/electrode-io/livebundle/actions
[3]: https://codecov.io/gh/electrode-io/livebundle/branch/master/graph/badge.svg?token=97VWVN63G0
[4]: https://codecov.io/gh/electrode-io/livebundle
