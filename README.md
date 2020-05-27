# LiveBundle

**This project is still in incubation.  
Heavy work is in progess to get to a proper initial MVP state.  
If you are cloning this repository at this stage, be ready for a wild ride with potential consequent repository updates and breaking changes from one day to the next. _Or to put it another way : 'Not ready for production'._**

### Instructions

1. `yarn install`
2. `yarn build`
3. `yarn test`
4. `Figure it out :)`

Further development documentation material detailing technology stack, development setup, repository structure, contribution guidelines, testing, publication to be soon released.

### Repository structure _(curated)_

```
.
├── lerna.json            // Lerna configuration
├── native-libs           // Native client libaries
│   └── android           // Android client library
├── packages              // Node.js packages
│   ├── livebundle-cli    // Command line CLI
│   ├── livebundle-github // GitHub application server
│   ├── livebundle-metro-asset-plugin  // Metro asset plugin
│   ├── livebundle-qrcode // QR Code server
│   ├── livebundle-sdk    // SDK (used by CLI and GITHUB)
│   ├── livebundle-store  // Store server
│   └── livebundle-utils  // Misc shared utils
├── README.md             // This README ;)
├── tsconfig.build.json   // TypeScript config used for builds
├── tsconfig.json         // TypeScript config used by monorepo
├── .eslintignore.json    // Files/Directories to exclude from ESLint
├── .eslintrc.js          // ESLint configuration
├── .mocharc.json         // Mocha configuration
├── .prettier.rc          // Prettier configurations
└── .vscode               // VSCode IDE configuration
    └── settings.json     // VSCode workspace configuration 
```

### Related repositories

- [LiveBundle website](https://github.com/electrode-io/livebundle-website) contains the LiveBundle website and user documentation.
- [LiveBundle sample](https://github.com/electrode-io/livebundle-sample) contains a sample React Native application wired with LiveBundle, used for the getting started guide.
- [LiveBundle Docker starter](https://github.com/electrode-io/livebundle-docker-starter) contains necessary files to spin up a basic LiveBundle complete infrastructure in Docker.
