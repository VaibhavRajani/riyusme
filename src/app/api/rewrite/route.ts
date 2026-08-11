import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rewriteResume } from "@/lib/ai/rewrite";
import { keywordCoverage } from "@/lib/ai/analyze";

export const runtime = "nodejs";
export const maxDuration = 120;

const BlockSchema = z.object({
  id: z.string(),
  index: z.number(),
  text: z.string(),
  kind: z.enum(["bullet", "heading", "paragraph", "contact"]),
  wordCount: z.number(),
});

const BodySchema = z.object({
  jobDescription: z.string().min(40),
  notes: z.string().default(""),
  blocks: z.array(BlockSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const result = await rewriteResume({
      jobDescription: body.jobDescription,
      notes: body.notes,
      blocks: body.blocks,
    });

    const beforeText = body.blocks.map((b) => b.text).join("\n");
    const afterMap = new Map(result.changes.map((c) => [c.id, c.rewritten]));
    const afterText = body.blocks
      .map((b) => afterMap.get(b.id) ?? b.text)
      .join("\n");

    const keywords =
      result.atsKeywords.length > 0
        ? result.atsKeywords
        : [];

    const before = keywordCoverage(keywords, beforeText);
    const after = keywordCoverage(keywords, afterText);

    return NextResponse.json({
      ...result,
      coverage: { before, after, keywords },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid rewrite request", details: err.flatten() },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Rewrite failed";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
