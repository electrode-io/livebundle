import Ajv from "ajv";
import debug from "debug";

const log = debug("livebundle-sdk:schemaValidate");

export function schemaValidate<T>({
  data = {} as T,
  refSchemas = [],
  schema,
}: {
  data: T;
  refSchemas?: Record<string, unknown>[];
  schema: Record<string, unknown>;
}): void {
  log(`data: ${JSON.stringify(data, null, 2)}
refSchemas: ${refSchemas.map((s) => s["$id"])}
schema: ${schema["$id"]}}`);

  const ajv = new Ajv({ $data: true, strict: false });
  for (const refSchema of refSchemas) {
    ajv.addSchema(refSchema);
  }

  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (e) {
    throw new Error(`Schema compilation failed: ${e.message}`);
  }

  const isValid = validate(data);
  if (!isValid) {
    throw new Error(`Invalid data: ${ajv.errorsText(validate.errors)}`);
  }
}
