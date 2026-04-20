import type { TextEdit } from "./transaction.js";
import { ERROR_CODES, sprigcodeError } from "./errors.js";

export function sortTextEdits(edits: TextEdit[]): TextEdit[] {
  return [...edits].sort((left, right) => {
    if (left.filePath === right.filePath) {
      if (left.start === right.start) {
        return left.end - right.end;
      }

      return left.start - right.start;
    }

    return left.filePath.localeCompare(right.filePath);
  });
}

export function assertNoConflictingEdits(edits: TextEdit[]): void {
  const sorted = sortTextEdits(edits);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (!previous || !current) {
      continue;
    }

    if (previous.filePath !== current.filePath) {
      continue;
    }

    if (previous.end > current.start) {
      throw sprigcodeError(
        ERROR_CODES.CONFLICTING_EDITS,
        `Overlapping edits detected in ${current.filePath}.`,
        { previous, current }
      );
    }
  }
}

export function applyTextEditsToString(source: string, edits: TextEdit[]): string {
  if (edits.length === 0) {
    return source;
  }

  assertNoConflictingEdits(edits);
  const sorted = sortTextEdits(edits).reverse();
  let next = source;

  for (const edit of sorted) {
    next = next.slice(0, edit.start) + edit.replacement + next.slice(edit.end);
  }

  return next;
}

export function groupEditsByFile(edits: TextEdit[]): Map<string, TextEdit[]> {
  const grouped = new Map<string, TextEdit[]>();
  for (const edit of edits) {
    const fileEdits = grouped.get(edit.filePath) ?? [];
    fileEdits.push(edit);
    grouped.set(edit.filePath, fileEdits);
  }

  return grouped;
}
