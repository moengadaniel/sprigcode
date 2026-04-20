import { describe, expect, it } from "vitest";
import { ERROR_CODES, sprigcodeError, toSprigcodeError } from "../src/errors.js";

describe("errors", () => {
  it("preserves typed failures", () => {
    const failure = sprigcodeError(ERROR_CODES.ANCHOR_NOT_FOUND, "Missing.");
    expect(toSprigcodeError(failure).code).toBe(ERROR_CODES.ANCHOR_NOT_FOUND);
  });

  it("wraps unknown errors", () => {
    const error = toSprigcodeError(new Error("boom"));
    expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });
});

