import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeJobDescription, keywordCoverage } from "@/lib/ai/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  jobDescription: z.string().min(40),
  resumeText: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const analysis = await analyzeJobDescription(body.jobDescription);
    const coverage = keywordCoverage(
      analysis.keywords,
      body.resumeText ?? ""
    );

    return NextResponse.json({
      ...analysis,
      before: coverage,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Job description is too short or invalid" },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Analyze failed";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
