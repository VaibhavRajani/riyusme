"use client";

import { useState } from "react";

type Props = {
  text: string;
  companyHint?: string;
};

export function CoverLetterPanel({ text }: Props) {
  const [copied, setCopied] = useState(false);

  if (!text.trim()) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="space-y-3 border-t border-[var(--line)] pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Application blurb
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            2–3 lines for “why this company / how I’ll contribute” fields
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <blockquote className="border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-[15px] leading-relaxed text-[var(--ink)]">
        {text.trim()}
      </blockquote>
    </section>
  );
}
