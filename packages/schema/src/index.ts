import schema from "./sprigcode.schema.json" with { type: "json" };

export { schema as sprigcodeSchema };

export function validateTransactionShape(value: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const candidate = value as { version?: unknown; language?: unknown; ops?: unknown };

  if (typeof value !== "object" || value === null) {
    return { valid: false, errors: ["/ must be an object"] };
  }

  if (candidate.version !== "0.1") {
    errors.push("/version must equal 0.1");
  }

  if (typeof candidate.language !== "string" || candidate.language.length === 0) {
    errors.push("/language must be a non-empty string");
  }

  if (!Array.isArray(candidate.ops)) {
    errors.push("/ops must be an array");
  } else {
    for (const [index, op] of candidate.ops.entries()) {
      if (typeof op !== "object" || op === null) {
        errors.push(`/ops/${index} must be an object`);
        continue;
      }

      if (typeof (op as { id?: unknown }).id !== "string") {
        errors.push(`/ops/${index}/id must be a string`);
      }

      if (typeof (op as { op?: unknown }).op !== "string") {
        errors.push(`/ops/${index}/op must be a string`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

if (process.argv.includes("--check-schema")) {
  const outcome = validateTransactionShape({
    version: "0.1",
    language: "typescript",
    ops: [{ id: "example", op: "add_import" }]
  });

  if (!outcome.valid) {
    process.exitCode = 1;
    console.error(outcome.errors.join("\n"));
  }
}
