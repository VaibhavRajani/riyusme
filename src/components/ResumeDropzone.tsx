"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
};

export function ResumeDropzone({ file, onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const accept = useCallback(
    (f: File | undefined) => {
      if (!f) return;
      if (!f.name.toLowerCase().endsWith(".docx")) {
        alert("Please upload a Word document (.docx)");
        return;
      }
      onFile(f);
    },
    [onFile]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        accept(e.dataTransfer.files?.[0]);
      }}
      className={[
        "flex cursor-pointer items-center justify-between gap-3 border border-dashed px-4 py-3 transition-colors duration-200",
        dragging
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--line)] bg-[var(--paper)] hover:border-[var(--accent)]/60",
        disabled ? "pointer-events-none opacity-50" : "",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        disabled={disabled}
        onChange={(e) => accept(e.target.files?.[0])}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--ink)]">
          {file ? file.name : "Drop your resume (.docx) or click to browse"}
        </p>
        <p className="text-xs text-[var(--ink-muted)]">
          {file ? "Format preserved · click to replace" : "Word document only"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {file && (
          <button
            type="button"
            className="text-xs text-[var(--accent)] underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onFile(null);
            }}
          >
            Clear
          </button>
        )}
        <span className="border border-[var(--line)] bg-[var(--paper-raised)] px-3 py-1.5 text-xs font-medium text-[var(--ink)]">
          {file ? "Replace" : "Upload"}
        </span>
      </div>
    </div>
  );
}
