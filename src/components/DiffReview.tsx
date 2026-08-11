"use client";

import { charCount, isLayoutSafe, wordCount } from "@/lib/docx/wordCount";
import type { ResumeChange } from "@/lib/docx/types";

type Props = {
  changes: ResumeChange[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (on: boolean) => void;
  summary?: string;
};

export function DiffReview({
  changes,
  selected,
  onToggle,
  onToggleAll,
  summary,
}: Props) {
  const allOn = changes.length > 0 && changes.every((c) => selected.has(c.id));

  return (
    <section className="space-y-5 border-t border-[var(--line)] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Review edits
          </h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--ink-muted)]">
            {summary ||
              "Only same-or-shorter lines are kept so the resume stays one page. Uncheck any you don’t want."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleAll(!allOn)}
          className="text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          {allOn ? "Deselect all" : "Select all"}
        </button>
      </div>

      <ul className="space-y-4">
        {changes.map((c, i) => {
          const on = selected.has(c.id);
          const ow = wordCount(c.original);
          const rw = wordCount(c.rewritten);
          const oc = charCount(c.original);
          const rc = charCount(c.rewritten);
          const safe = isLayoutSafe(c.original, c.rewritten);
          return (
            <li
              key={c.id}
              className={[
                "animate-[fadeUp_0.45s_ease_both] border border-[var(--line)] bg-[var(--paper)] py-3 pl-3 pr-3 transition-opacity sm:pl-4",
                on
                  ? "border-l-[3px] border-l-[var(--accent)] opacity-100"
                  : "opacity-45",
                !safe ? "border-[var(--danger-line)]" : "",
              ].join(" ")}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <label className="flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(c.id)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--ink-muted)]">
                    <span className="uppercase tracking-wider">{c.id}</span>
                    <span>
                      {ow}→{rw} words · {oc}→{rc} chars
                    </span>
                    <span
                      className={
                        safe ? "text-[var(--accent)]" : "text-[var(--danger-ink)]"
                      }
                    >
                      {safe ? "one-page safe" : "too long — uncheck"}
                    </span>
                    {c.reason && <span>· {c.reason}</span>}
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--ink-muted)] line-through decoration-[var(--ink-muted)]/40">
                    {c.original}
                  </p>
                  <p className="text-[15px] leading-relaxed text-[var(--ink)]">
                    {c.rewritten}
                  </p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
