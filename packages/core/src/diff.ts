export type UnifiedDiffFile = {
  filePath: string;
  diff: string;
};

export type UnifiedDiffSummaryFile = {
  filePath: string;
  addedLineCount: number;
  removedLineCount: number;
};

export type UnifiedDiffSummary = {
  fileCount: number;
  addedLineCount: number;
  removedLineCount: number;
  files: UnifiedDiffSummaryFile[];
};

type Op = { type: "equal" | "add" | "remove"; line: string };

function lcs(a: string[], b: string[]): Op[] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const previousRow = matrix[i - 1];
      const currentRow = matrix[i];
      if (!previousRow || !currentRow) {
        continue;
      }
      const diagonal = previousRow?.[j - 1] ?? 0;
      const up = previousRow?.[j] ?? 0;
      const left = currentRow?.[j - 1] ?? 0;
      currentRow[j] =
        a[i - 1] === b[j - 1]
          ? diagonal + 1
          : Math.max(up, left);
    }
  }

  const ops: Op[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    const left = i > 0 ? a[i - 1] : undefined;
    const right = j > 0 ? b[j - 1] : undefined;
    const currentRow = matrix[i];
    const previousRow = i > 0 ? matrix[i - 1] : undefined;

    if (i > 0 && j > 0 && left === right && left !== undefined) {
      ops.unshift({ type: "equal", line: left });
      i -= 1;
      j -= 1;
      continue;
    }

    if (j > 0 && right !== undefined && (i === 0 || (currentRow?.[j - 1] ?? 0) >= (previousRow?.[j] ?? 0))) {
      ops.unshift({ type: "add", line: right });
      j -= 1;
      continue;
    }

    if (left !== undefined) {
      ops.unshift({ type: "remove", line: left });
    }
    i -= 1;
  }

  return ops;
}

export function createUnifiedDiff(filePath: string, before: string, after: string): UnifiedDiffFile {
  if (before === after) {
    return {
      filePath,
      diff: `--- ${filePath}\n+++ ${filePath}\n`
    };
  }

  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const ops = lcs(beforeLines, afterLines);
  const body = ops
    .map((op) => {
      if (op.type === "equal") {
        return ` ${op.line}`;
      }

      if (op.type === "add") {
        return `+${op.line}`;
      }

      return `-${op.line}`;
    })
    .join("\n");

  return {
    filePath,
    diff: `--- ${filePath}\n+++ ${filePath}\n@@\n${body}\n`
  };
}

export function summarizeUnifiedDiffs(files: UnifiedDiffFile[]): UnifiedDiffSummary {
  const summaryFiles = files.map((file) => {
    let addedLineCount = 0;
    let removedLineCount = 0;

    for (const line of file.diff.split("\n")) {
      if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
        continue;
      }

      if (line.startsWith("+")) {
        addedLineCount += 1;
      }

      if (line.startsWith("-")) {
        removedLineCount += 1;
      }
    }

    return {
      filePath: file.filePath,
      addedLineCount,
      removedLineCount
    };
  });

  return {
    fileCount: summaryFiles.length,
    addedLineCount: summaryFiles.reduce((total, file) => total + file.addedLineCount, 0),
    removedLineCount: summaryFiles.reduce((total, file) => total + file.removedLineCount, 0),
    files: summaryFiles
  };
}
