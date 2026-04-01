// Simple line-by-line diff for prompt comparison
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = computeLCS(oldLines, newLines);
  let oi = 0, ni = 0, li = 0;

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && oldLines[oi] === lcs[li]) {
      if (ni < newLines.length && newLines[ni] === lcs[li]) {
        result.push({ type: 'unchanged', content: lcs[li], lineNumber: ni + 1 });
        oi++; ni++; li++;
      } else if (ni < newLines.length) {
        result.push({ type: 'added', content: newLines[ni], lineNumber: ni + 1 });
        ni++;
      }
    } else if (oi < oldLines.length) {
      result.push({ type: 'removed', content: oldLines[oi], lineNumber: oi + 1 });
      oi++;
    } else if (ni < newLines.length) {
      result.push({ type: 'added', content: newLines[ni], lineNumber: ni + 1 });
      ni++;
    }
  }

  return result;
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { result.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return result;
}
