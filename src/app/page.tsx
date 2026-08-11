import { TailorWorkspace } from "@/components/TailorWorkspace";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="relative z-10 border-b border-[var(--line)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)]">
                RiyuSme
              </span>
              <span className="truncate text-sm text-[var(--ink-muted)]">
                Tailor your resume to the JD — format preserved
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <section className="relative z-10 flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5">
        <TailorWorkspace />
      </section>

      <footer className="relative z-10 px-4 py-3 text-center text-[11px] text-[var(--ink-muted)] sm:px-6">
        Realistic scope · Word count ±20% · Finance-aware ATS edits
      </footer>
    </main>
  );
}
