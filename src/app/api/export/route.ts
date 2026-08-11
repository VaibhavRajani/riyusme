import { NextRequest, NextResponse } from "next/server";
import { applyChangesToDocx } from "@/lib/docx/apply";
import { isLayoutSafe } from "@/lib/docx/wordCount";
import type { ResumeChange } from "@/lib/docx/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const changesRaw = form.get("changes");

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
    const out = await applyChangesToDocx(buffer, safe);

    const base = file.name.replace(/\.docx$/i, "") || "resume";
    const filename = `${base}-tailored.docx`;

    return new NextResponse(Buffer.from(out), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
