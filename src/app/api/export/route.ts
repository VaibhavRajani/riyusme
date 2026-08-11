import { NextRequest, NextResponse } from "next/server";
import { applyChangesToDocx } from "@/lib/docx/apply";
import { docxToPdf } from "@/lib/docx/toPdf";
import { isLayoutSafe } from "@/lib/docx/wordCount";
import { tailoredResumeFilename } from "@/lib/filename";
import type { ResumeChange } from "@/lib/docx/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const changesRaw = form.get("changes");
    const formatRaw = form.get("format");
    const companyRaw = form.get("companyName");
    const companyName =
      typeof companyRaw === "string" ? companyRaw.trim() : "";
    const format =
      typeof formatRaw === "string" && formatRaw.toLowerCase() === "pdf"
        ? "pdf"
        : "docx";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Upload original .docx as 'file'" },
        { status: 400 }
      );
    }
    if (typeof changesRaw !== "string") {
      return NextResponse.json(
        { error: "Missing 'changes' JSON" },
        { status: 400 }
      );
    }

    let changes: ResumeChange[];
    try {
      changes = JSON.parse(changesRaw) as ResumeChange[];
      if (!Array.isArray(changes)) throw new Error("not array");
    } catch {
      return NextResponse.json({ error: "Invalid changes JSON" }, { status: 400 });
    }

    const safe = changes.filter((c) => isLayoutSafe(c.original, c.rewritten));
    if (safe.length === 0) {
      return NextResponse.json(
        {
          error:
            "No one-page-safe edits to apply. Rewrites must be the same length or shorter.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tailored = await applyChangesToDocx(buffer, safe);
    const filename = tailoredResumeFilename(file.name, companyName, format);

    if (format === "pdf") {
      const pdf = await docxToPdf(Buffer.from(tailored));
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return new NextResponse(new Uint8Array(tailored), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    const status = message.includes("CONVERTAPI_SECRET") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
