"use client";

const STAGES = [
  { id: "parse", label: "Parse" },
  { id: "analyze", label: "Keywords" },
  { id: "rewrite", label: "Rewrite" },
  { id: "check", label: "Length check" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

type Props = {
  active: StageId | null;
  done: StageId[];
};

export function ProgressStages({ active, done }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {STAGES.map((s, i) => {
        const isDone = done.includes(s.id);
        const isActive = active === s.id;
        return (
          <li
            key={s.id}
            className={[
              "flex items-center gap-2 text-sm transition-opacity duration-300",
              isDone || isActive ? "opacity-100" : "opacity-40",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-6 w-6 items-center justify-center text-[11px] font-medium",
                isDone
                  ? "bg-[var(--accent)] text-white"
                  : isActive
                    ? "animate-pulse bg-[var(--ink)] text-[var(--paper)]"
                    : "bg-[var(--ink-muted)]/20 text-[var(--ink-muted)]",
              ].join(" ")}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span
              className={
                isActive
                  ? "font-medium text-[var(--ink)]"
                  : "text-[var(--ink-muted)]"
              }
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
