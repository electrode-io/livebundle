import debug from "debug";

const log = debug("livebundle-sdk:reconciliateConfig");

export function reconciliateConfig<T extends Record<string, unknown>>({
  curConfig,
  envVarToConfigKey,
}: {
  curConfig: Partial<T> | undefined;
  envVarToConfigKey: Record<string, string>;
}): {
  ambiguousConfigProps: [string, string][];
  missingConfigProps: [string, string][];
  config?: T;
} {
  log(
    `reconciliateConfig(curConfig: ${JSON.stringify(
      curConfig,
      null,
      2,
    )}, envVarToConfigKey: ${JSON.stringify(envVarToConfigKey, null, 2)})`,
  );

  const res: {
    ambiguousConfigProps: [string, string][];
    missingConfigProps: [string, string][];
    config?: T;
  } = {
    ambiguousConfigProps: [],
    missingConfigProps: [],
    config: curConfig as T,
  };

  for (const [envVar, configKey] of Object.entries(envVarToConfigKey)) {
    const envVarVal = process.env[envVar];
    if (curConfig && curConfig[configKey] && envVarVal) {
      // Config property is defined both in config and as an env var
      res.ambiguousConfigProps.push([envVar, configKey]);
    } else if ((!curConfig || !curConfig[configKey]) && envVarVal) {
      // Config property is defined as an env var
      (res.config as Record<string, unknown>)[configKey] = envVarVal;
    } else if (curConfig && !curConfig[configKey] && !envVarVal) {
      // Config property is defined nowhere
      res.missingConfigProps.push([envVar, configKey]);
    } else {
      // Config property is defined in config
      (res.config as Record<string, unknown>)[configKey] = curConfig![
        configKey
      ];
    }
  }

  if (
    res.ambiguousConfigProps.length > 0 ||
    res.missingConfigProps.length > 0
  ) {
    res.config = undefined;
  }

  if (!res.config) {
    throw new Error(getErrorMessage(res));
  }

  return res;
}

export function getErrorMessage({
  ambiguousConfigProps,
  missingConfigProps,
}: {
  ambiguousConfigProps: [string, string][];
  missingConfigProps: [string, string][];
}): string {
  const hasAmbiguousConfigProps = ambiguousConfigProps.length > 0;
  const hasMissingConfigProps = missingConfigProps.length > 0;
  return `${
    hasAmbiguousConfigProps
      ? `=== Ambiguous configuration properties ===
${ambiguousConfigProps.map(
  ([env, prop]) =>
    `- ${prop} is defined in config as well as environment variable ${env}\n`,
)}`
      : ""
  }${
    hasMissingConfigProps
      ? `=== Missing configuration properties ===
${missingConfigProps.map(
  ([env, prop]) =>
    `- Missing '${prop}' in config. Either set it in config or as environment variable ${env}\n`,
)}`
      : ""
  }`;
}
