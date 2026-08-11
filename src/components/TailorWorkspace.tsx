"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ResumeDropzone } from "@/components/ResumeDropzone";
import { ProgressStages, type StageId } from "@/components/ProgressStages";
import { DiffReview } from "@/components/DiffReview";
import { AtsPanel } from "@/components/AtsPanel";
import { CoverLetterPanel } from "@/components/CoverLetterPanel";
import { isLayoutSafe } from "@/lib/docx/wordCount";
import {
  DEFAULT_RESUME_FILENAME,
  loadDefaultResumeFile,
} from "@/lib/defaultResume";
import { tailoredResumeFilename } from "@/lib/filename";
import type { ResumeBlock, ResumeChange } from "@/lib/docx/types";

type Coverage = { covered: string[]; missing: string[]; score: number };

type TailorState = {
  blocks: ResumeBlock[];
  changes: ResumeChange[];
  summary: string;
  coverLetter: string;
  keywords: string[];
  before: Coverage;
  after: Coverage;
  roleFamily?: string;
  mustHaves?: string[];
  companyName?: string;
};

export function TailorWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [loadingDefault, setLoadingDefault] = useState(true);
  const [jd, setJd] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<StageId | null>(null);
  const [doneStages, setDoneStages] = useState<StageId[]>([]);
  const [result, setResult] = useState<TailorState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<"docx" | "pdf" | null>(null);

  const restoreDefault = useCallback(async () => {
    setLoadingDefault(true);
    const def = await loadDefaultResumeFile();
    if (def) {
      setFile(def);
      setIsDefault(true);
    } else {
      setFile(null);
      setIsDefault(false);
      setError(
        `Default resume missing. Add ${DEFAULT_RESUME_FILENAME} under public/defaults/ (must be .docx).`
      );
    }
    setLoadingDefault(false);
  }, []);

  useEffect(() => {
    void restoreDefault();
  }, [restoreDefault]);

  const onFile = useCallback((f: File | null) => {
    if (!f) {
      void restoreDefault();
      return;
    }
    setFile(f);
    setIsDefault(false);
  }, [restoreDefault]);

  const canRun = Boolean(file && jd.trim().length >= 40 && !busy);

  const markDone = (id: StageId) =>
    setDoneStages((prev) => (prev.includes(id) ? prev : [...prev, id]));

  const runTailor = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setSelected(new Set());
    setDoneStages([]);
    setActiveStage("parse");

    try {
      const parseForm = new FormData();
      parseForm.append("file", file);
      const parseRes = await fetch("/api/parse", {
        method: "POST",
        body: parseForm,
      });
      const parseJson = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseJson.error || "Parse failed");
      const blocks = parseJson.blocks as ResumeBlock[];
      markDone("parse");

      setActiveStage("analyze");
      const resumeText = blocks.map((b) => b.text).join("\n");
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd, resumeText }),
      });
      const analyzeJson = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeJson.error || "Analyze failed");
      markDone("analyze");

      setActiveStage("rewrite");
      const rewriteRes = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jd,
          notes,
          blocks,
        }),
      });
      const rewriteJson = await rewriteRes.json();
      if (!rewriteRes.ok) throw new Error(rewriteJson.error || "Rewrite failed");
      markDone("rewrite");

      setActiveStage("check");
      await new Promise((r) => setTimeout(r, 400));
      markDone("check");
      setActiveStage(null);

      const changes = ((rewriteJson.changes ?? []) as ResumeChange[]).filter(
        (c) => isLayoutSafe(c.original, c.rewritten)
      );
      const keywords =
        (rewriteJson.coverage?.keywords as string[]) ||
        (analyzeJson.keywords as string[]) ||
        [];
      const before =
        (rewriteJson.coverage?.before as Coverage) ||
        (analyzeJson.before as Coverage) || {
          covered: [],
          missing: keywords,
          score: 0,
        };
      const after = (rewriteJson.coverage?.after as Coverage) || before;

      setResult({
        blocks,
        changes,
        summary: rewriteJson.summary || "",
        coverLetter: rewriteJson.coverLetter || "",
        keywords,
        before,
        after,
        roleFamily: analyzeJson.roleFamily,
        mustHaves: analyzeJson.mustHaves,
        companyName: analyzeJson.companyName || "",
      });
      setSelected(new Set(changes.map((c) => c.id)));
    } catch (e) {
      setActiveStage(null);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, [file, jd, notes]);

  const selectedChanges = useMemo(() => {
    if (!result) return [];
    return result.changes.filter(
      (c) => selected.has(c.id) && isLayoutSafe(c.original, c.rewritten)
    );
  }, [result, selected]);

  const unsafeSelected = useMemo(() => {
    if (!result) return 0;
    return result.changes.filter(
      (c) => selected.has(c.id) && !isLayoutSafe(c.original, c.rewritten)
    ).length;
  }, [result, selected]);

  const download = async (format: "docx" | "pdf") => {
    if (!file || selectedChanges.length === 0) return;
    if (unsafeSelected > 0) {
      setError(
        "Uncheck lines marked too long before download — they can push the resume to page 2."
      );
      return;
    }
    setDownloading(format);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("changes", JSON.stringify(selectedChanges));
      form.append("format", format);
      form.append("companyName", result?.companyName || "");
      const res = await fetch("/api/export", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = tailoredResumeFilename(
        file.name,
        result?.companyName,
        format
      );
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3">
      <div className="surface flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <ResumeDropzone
          file={file}
          isDefault={isDefault}
          loadingDefault={loadingDefault}
          onFile={onFile}
          onRestoreDefault={() => void restoreDefault()}
          disabled={busy || loadingDefault}
        />

        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="jd"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]"
              >
                Job description
              </label>
              <span className="text-[11px] text-[var(--ink-muted)]">
                {jd.trim().length} chars
              </span>
            </div>
            <textarea
              id="jd"
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              disabled={busy}
              placeholder="Paste the full job description here…"
              className="field min-h-[220px] flex-1 resize-none md:min-h-[280px]"
            />
          </div>

          <div className="flex min-h-0 flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="notes"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-muted)]"
              >
                Additional notes
              </label>
              <span className="text-[11px] text-[var(--ink-muted)]">
                optional
              </span>
            </div>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
              placeholder="e.g. Python in coursework; fresher — keep metrics modest; emphasize FP&A…"
              className="field min-h-[220px] flex-1 resize-none md:min-h-[280px]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={!canRun}
            onClick={runTailor}
            className="btn-primary"
          >
            {busy ? "Tailoring…" : "Tailor resume"}
          </button>
          {jd.trim().length > 0 && jd.trim().length < 40 && (
            <span className="text-sm text-[var(--ink-muted)]">
              Need a fuller job description
            </span>
          )}
          {!file && !loadingDefault && (
            <span className="text-sm text-[var(--ink-muted)]">
              Add default .docx or upload one to begin
            </span>
          )}
          <span className="hidden text-xs text-[var(--ink-muted)] sm:inline">
            Baseline stays realistic · no inflated scope
          </span>
        </div>
      </div>

      {(busy || doneStages.length > 0) && (
        <div className="surface px-4 py-3">
          <ProgressStages active={activeStage} done={doneStages} />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="border px-4 py-3 text-sm"
          style={{
            background: "var(--danger-bg)",
            color: "var(--danger-ink)",
            borderColor: "var(--danger-line)",
          }}
        >
          {error}
        </p>
      )}

      {result && (
        <div className="surface space-y-6 p-4 sm:p-5">
          <AtsPanel
            before={result.before}
            after={result.after}
            roleFamily={result.roleFamily}
            mustHaves={result.mustHaves}
          />

          <CoverLetterPanel text={result.coverLetter} />

          {result.changes.length === 0 ? (
            <p className="text-[var(--ink-muted)]">
              No layout-safe edits made it through — longer rewrites were
              dropped so your resume stays on one page. Try Tailor again or add
              notes about which skills to emphasize.
            </p>
          ) : (
            <DiffReview
              changes={result.changes}
              selected={selected}
              summary={result.summary}
              onToggle={(id) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onToggleAll={(on) =>
                setSelected(
                  on ? new Set(result.changes.map((c) => c.id)) : new Set()
                )
              }
            />
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">
            <button
              type="button"
              disabled={selectedChanges.length === 0 || downloading !== null}
              onClick={() => void download("docx")}
              className="btn-accent"
            >
              {downloading === "docx"
                ? "Building Word…"
                : `Download Word (${selectedChanges.length})`}
            </button>
            <button
              type="button"
              disabled={selectedChanges.length === 0 || downloading !== null}
              onClick={() => void download("pdf")}
              className="btn-primary"
            >
              {downloading === "pdf"
                ? "Building PDF…"
                : `Download PDF (${selectedChanges.length})`}
            </button>
            <p className="w-full text-sm text-[var(--ink-muted)] sm:w-auto">
              PDF keeps Word layout (fonts, spacing, one page). Only one-page-safe
              lines are applied.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
