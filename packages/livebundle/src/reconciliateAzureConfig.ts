import { AzureBlobStorageConfig } from "livebundle-sdk";

export function reconciliateAzureConfig(
  curConfig: Partial<AzureBlobStorageConfig> | undefined = {},
): {
  ambiguousConfigProps: [string, string][];
  missingConfigProps: [string, string][];
  config?: AzureBlobStorageConfig;
} {
  const envVarToConfigKey = {
    LB_UPLOAD_AZURE_ACCOUNT: "account",
    LB_UPLOAD_AZURE_CONTAINER: "container",
    LB_UPLOAD_AZURE_SASTOKEN: "sasToken",
  };

  const res: ReturnType<typeof reconciliateAzureConfig> = {
    ambiguousConfigProps: [],
    missingConfigProps: [],
    config:
      (curConfig as AzureBlobStorageConfig) ?? ({} as AzureBlobStorageConfig),
  };

  for (const [envVar, configKey] of Object.entries(envVarToConfigKey)) {
    const envVarVal = process.env[envVar];
    if (curConfig && curConfig[configKey] && envVarVal) {
      // Config property is defined both in config and as an env var
      res.ambiguousConfigProps.push([envVar, configKey]);
    } else if ((!curConfig || !curConfig[configKey]) && envVarVal) {
      // Config property is defined as an env var
      res.config![configKey] = envVarVal;
    } else if (curConfig && !curConfig[configKey] && !envVarVal) {
      // Config property is defined nowhere
      res.missingConfigProps.push([envVar, configKey]);
    } else if (curConfig && curConfig[configKey] && !envVarVal) {
      // Config property is defined in config
      res.config![configKey] = curConfig[configKey];
    }
  }

  if (
    res.ambiguousConfigProps.length > 0 ||
    res.missingConfigProps.length > 0
  ) {
    res.config = undefined;
  }

  return res;
}

export function getErrorMessage(
  conf: ReturnType<typeof reconciliateAzureConfig>,
) {
  const hasAmbiguousConfigProps = conf.ambiguousConfigProps.length > 0;
  const hasMissingConfigProps = conf.missingConfigProps.length > 0;
  return `${
    hasAmbiguousConfigProps
      ? `=== Ambiguous Azure configuration properties ===
${conf.ambiguousConfigProps.map(
  ([env, prop]) =>
    `- ${prop} is defined in config as well as environment variable ${env}\n`,
)}`
      : ""
  }${
    hasMissingConfigProps
      ? `=== Missing Azure configuration properties ===
${conf.missingConfigProps.map(
  ([env, prop]) =>
    `- Missing ${prop} in config. Either set it in config or as environment variable ${env}\n`,
)}`
      : ""
  }`;
}
