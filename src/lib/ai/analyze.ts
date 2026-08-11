import { z } from "zod";
import { CLAUDE_MODEL, getAnthropic } from "./client";
import { SYSTEM_ANALYZE, buildAnalyzeUserPrompt } from "./prompts";

const AnalyzeSchema = z.object({
  keywords: z.array(z.string()).default([]),
  mustHaves: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  seniority: z.string().default("unknown"),
  roleFamily: z.string().default("Finance"),
});

export type AnalyzeResult = z.infer<typeof AnalyzeSchema>;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

export async function analyzeJobDescription(
  jobDescription: string
): Promise<AnalyzeResult> {
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: SYSTEM_ANALYZE,
    messages: [
      {
        role: "user",
        content: buildAnalyzeUserPrompt(jobDescription),
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No analysis response from Claude");
  }

  const parsed = AnalyzeSchema.safeParse(extractJson(textBlock.text));
  if (!parsed.success) {
    throw new Error("Failed to parse analysis JSON");
  }
  return parsed.data;
}

/** Simple coverage: which keywords appear in resume text (case-insensitive). */
export function keywordCoverage(
  keywords: string[],
  resumeText: string
): { covered: string[]; missing: string[]; score: number } {
  const lower = resumeText.toLowerCase();
  const covered: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) covered.push(kw);
    else missing.push(kw);
  }
  const score =
    keywords.length === 0
      ? 0
      : Math.round((covered.length / keywords.length) * 100);
  return { covered, missing, score };
}
