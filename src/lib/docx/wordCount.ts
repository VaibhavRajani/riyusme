/** Count words in a string (whitespace-separated tokens). */
export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function charCount(text: string): number {
  return text.trim().length;
}

/**
 * One-page layout lock (extra wrapped lines push the resume to page 2):
 * - Character count must be ≤ original (never longer)
 * - Word count may shrink a bit, but must not grow past +wordGrow
 * - Must not collapse below minWordRatio of original (keep the bullet substantive)
 */
export function isLayoutSafe(
  original: string,
  rewritten: string,
  opts: {
    wordGrow?: number;
    minWordRatio?: number;
    maxCharRatio?: number;
  } = {}
): boolean {
  const wordGrow = opts.wordGrow ?? 0.1;
  const minWordRatio = opts.minWordRatio ?? 0.55;
  const maxCharRatio = opts.maxCharRatio ?? 1.0;

  const oWords = wordCount(original);
  const rWords = wordCount(rewritten);
  const oChars = charCount(original);
  const rChars = charCount(rewritten);

  if (!rewritten.trim()) return false;
  if (oChars === 0) return rChars === 0;

  if (rChars > Math.floor(oChars * maxCharRatio)) return false;

  if (oWords === 0) return rWords === 0;
  if (rWords > Math.ceil(oWords * (1 + wordGrow))) return false;
  if (rWords < Math.floor(oWords * minWordRatio)) return false;

  return true;
}

/** @deprecated use isLayoutSafe */
export function isWithinWordTolerance(
  original: string,
  rewritten: string,
  _tolerance = 0.15
): boolean {
  return isLayoutSafe(original, rewritten);
}

export function filterValidChanges<T extends { original: string; rewritten: string }>(
  changes: T[],
  opts?: {
    wordGrow?: number;
    minWordRatio?: number;
    maxCharRatio?: number;
  }
): { valid: T[]; rejected: T[] } {
  const valid: T[] = [];
  const rejected: T[] = [];
  for (const c of changes) {
    if (
      c.rewritten.trim() &&
      c.rewritten.trim() !== c.original.trim() &&
      isLayoutSafe(c.original, c.rewritten, opts)
    ) {
      valid.push(c);
    } else if (c.rewritten.trim() !== c.original.trim()) {
      rejected.push(c);
    }
  }
  return { valid, rejected };
}

export function layoutStats(original: string, rewritten: string) {
  return {
    originalWords: wordCount(original),
    rewrittenWords: wordCount(rewritten),
    originalChars: charCount(original),
    rewrittenChars: charCount(rewritten),
    safe: isLayoutSafe(original, rewritten),
  };
}
