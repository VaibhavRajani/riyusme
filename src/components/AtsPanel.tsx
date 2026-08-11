"use client";

type Coverage = {
  covered: string[];
  missing: string[];
  score: number;
};

type Props = {
  before: Coverage;
  after: Coverage;
  roleFamily?: string;
  mustHaves?: string[];
};

export function AtsPanel({
  before,
  after,
  roleFamily,
  mustHaves,
}: Props) {
  const delta = after.score - before.score;

  return (
    <section className="space-y-5 border-t border-[var(--line)] pt-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            ATS signal
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            {roleFamily ? `${roleFamily} · ` : ""}
            Keyword coverage from the job description
          </p>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-sm text-[var(--ink-muted)]">
            {before.score}% →
          </span>
          <span className="font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">
            {after.score}%
          </span>
          {delta !== 0 && (
            <span
              className={
                delta > 0 ? "text-[var(--accent)]" : "text-[var(--ink-muted)]"
              }
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
        </div>
      </div>

      {mustHaves && mustHaves.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Must-haves
          </p>
          <ul className="flex flex-wrap gap-2">
            {mustHaves.map((m) => (
              <li
                key={m}
                className="border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-sm text-[var(--ink)]"
              >
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--accent)]">
            Covered after tailor
          </p>
          <ul className="flex flex-wrap gap-2">
            {after.covered.map((k) => (
              <li
                key={k}
                className="bg-[var(--accent-soft)] px-2.5 py-1 text-sm text-[var(--accent-ink)]"
              >
                {k}
              </li>
            ))}
            {after.covered.length === 0 && (
              <li className="text-sm text-[var(--ink-muted)]">—</li>
            )}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--ink-muted)]">
            Still thin
          </p>
          <ul className="flex flex-wrap gap-2">
            {after.missing.map((k) => (
              <li
                key={k}
                className="border border-dashed border-[var(--ink-muted)]/40 px-2.5 py-1 text-sm text-[var(--ink-muted)]"
              >
                {k}
              </li>
            ))}
            {after.missing.length === 0 && (
              <li className="text-sm text-[var(--ink-muted)]">None flagged</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
