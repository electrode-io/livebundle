import { GitHubAppConfig } from "./types";

export function reconciliateGitHubAppConfig(
  curConfig: Partial<GitHubAppConfig> | undefined = {},
): {
  ambiguousConfigProps: [string, string][];
  missingConfigProps: [string, string][];
  config?: GitHubAppConfig;
} {
  const envVarToConfigKey = {
    LIVEBUNDLE_GITHUB_APPIDENTIFIER: "appIdentifier",
    LIVEBUNDLE_GITHUB_CLIENTID: "clientId",
    LIVEBUNDLE_GITHUB_CLIENTSECRET: "clientSecret",
    LIVEBUNDLE_GITHUB_PRIVATEKEY: "privateKey",
  };

  const res: ReturnType<typeof reconciliateGitHubAppConfig> = {
    ambiguousConfigProps: [],
    missingConfigProps: [],
    config: {} as GitHubAppConfig,
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
  } else {
    // In case appIdentifier is coming from the env var
    // we need to coerce it to a number (env var values
    // are strings)
    // In case its coming from config, it will be a noop
    // @ts-ignore
    res.config!.appIdentifier = parseInt(res.config!.appIdentifier);
  }

  return res;
}

export function getErrorMessage(
  conf: ReturnType<typeof reconciliateGitHubAppConfig>,
) {
  const hasAmbiguousConfigProps = conf.ambiguousConfigProps.length > 0;
  const hasMissingConfigProps = conf.missingConfigProps.length > 0;
  return `${
    hasAmbiguousConfigProps
      ? `=== Ambiguous GitHub configuration properties ===
${conf.ambiguousConfigProps.map(
  ([env, prop]) =>
    `- ${prop} is defined in config as well as environment variable ${env}\n`,
)}`
      : ""
  }${
    hasMissingConfigProps
      ? `=== Missing GitHub configuration properties ===
${conf.missingConfigProps.map(
  ([env, prop]) =>
    `- Missing ${prop} in config. Either set it in config or as environment variable ${env}\n`,
)}`
      : ""
  }`;
}
