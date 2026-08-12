import { z } from "zod";
import type { ResumeBlock, ResumeChange } from "@/lib/docx/types";
import { charCount, filterValidChanges, wordCount } from "@/lib/docx/wordCount";
import { CLAUDE_MODEL, getAnthropic } from "./client";
import { SYSTEM_REWRITE, buildRewriteUserPrompt } from "./prompts";

const LAYOUT_OPTS = {
  wordGrow: 0.1,
  minWordRatio: 0.55,
  maxCharRatio: 1.0,
} as const;

const ChangeSchema = z.object({
  id: z.string(),
  original: z.string(),
  rewritten: z.string(),
  reason: z.string().optional(),
});

const RewriteSchema = z.object({
  changes: z.array(ChangeSchema).default([]),
  atsKeywords: z.array(z.string()).default([]),
  mustHaves: z.array(z.string()).default([]),
  roleFamily: z.string().default("Finance"),
  companyName: z.string().default(""),
  summary: z.string().default(""),
  coverLetter: z.string().default(""),
});

export type RewriteResult = {
  changes: ResumeChange[];
  rejected: ResumeChange[];
  atsKeywords: string[];
  mustHaves: string[];
  roleFamily: string;
  companyName: string;
  summary: string;
  coverLetter: string;
};

/** Forced tool keeps Claude from emitting broken free-form JSON. */
const REWRITE_TOOL = {
  name: "submit_resume_tailor_result",
  description:
    "Submit the tailored resume edits, ATS metadata, and application blurb.",
  input_schema: {
    type: "object" as const,
    properties: {
      changes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            original: { type: "string" },
            rewritten: { type: "string" },
            reason: { type: "string" },
          },
          required: ["id", "original", "rewritten"],
        },
      },
      atsKeywords: { type: "array", items: { type: "string" } },
      mustHaves: { type: "array", items: { type: "string" } },
      roleFamily: { type: "string" },
      companyName: { type: "string" },
      summary: { type: "string" },
      coverLetter: { type: "string" },
    },
    required: [
      "changes",
      "atsKeywords",
      "mustHaves",
      "roleFamily",
      "companyName",
      "summary",
      "coverLetter",
    ],
  },
};

async function callRewrite(
  jobDescription: string,
  notes: string,
  blocks: ResumeBlock[],
  retryHint?: string
) {
  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: [
      {
        type: "text",
        text: SYSTEM_REWRITE,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [REWRITE_TOOL],
    tool_choice: { type: "tool", name: "submit_resume_tailor_result" },
    messages: [
      {
        role: "user",
        content: buildRewriteUserPrompt({
          jobDescription,
          notes,
          blocks,
          retryHint,
        }),
      },
    ],
  });

  const toolBlock = response.content.find((c) => c.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new Error("No structured rewrite result from Claude");
  }

  const parsed = RewriteSchema.safeParse(toolBlock.input);
  if (!parsed.success) {
    throw new Error("Failed to validate rewrite result from Claude");
  }
  return parsed.data;
}

function alignWithBlocks(
  changes: z.infer<typeof ChangeSchema>[],
  blocks: ResumeBlock[]
): ResumeChange[] {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const out: ResumeChange[] = [];

  for (const c of changes) {
    const block = byId.get(c.id);
    if (!block) continue;
    if (block.kind === "contact" || block.kind === "heading") continue;
    out.push({
      id: c.id,
      original: block.text,
      rewritten: c.rewritten.trim().replace(/\s+/g, " "),
      reason: c.reason,
    });
  }
  return out;
}

export async function rewriteResume(input: {
  jobDescription: string;
  notes: string;
  blocks: ResumeBlock[];
}): Promise<RewriteResult> {
  const editable = input.blocks.filter((b) => b.kind !== "contact");

  const first = await callRewrite(
    input.jobDescription,
    input.notes,
    editable
  );

  let changes = alignWithBlocks(first.changes, input.blocks);
  let { valid, rejected } = filterValidChanges(changes, LAYOUT_OPTS);

  if (rejected.length > 0) {
    const hint = rejected
      .map((r) => {
        const ow = wordCount(r.original);
        const rw = wordCount(r.rewritten);
        const oc = charCount(r.original);
        const rc = charCount(r.rewritten);
        return `- ${r.id}: original ${ow} words / ${oc} chars → you wrote ${rw} words / ${rc} chars. MUST be ≤ ${oc} chars; words may shrink but not grow past ~${Math.ceil(ow * 1.1)}. Original: "${r.original}" Your attempt: "${r.rewritten}"`;
      })
      .join("\n");

    const second = await callRewrite(
      input.jobDescription,
      input.notes,
      editable.filter((b) => rejected.some((r) => r.id === b.id)),
      `These changes FAILED the one-page length lock (would risk an extra line / page 2). Fix ONLY these IDs — shorten until char count ≤ original:\n${hint}`
    );

    const retried = alignWithBlocks(second.changes, input.blocks);
    const retryFiltered = filterValidChanges(retried, LAYOUT_OPTS);

    const byId = new Map(valid.map((c) => [c.id, c]));
    for (const c of retryFiltered.valid) byId.set(c.id, c);
    valid = Array.from(byId.values());
    rejected = retryFiltered.rejected;
  }

  return {
    changes: valid,
    rejected,
    atsKeywords: first.atsKeywords,
    mustHaves: first.mustHaves,
    roleFamily: first.roleFamily,
    companyName: first.companyName.trim(),
    summary: first.summary,
    coverLetter: first.coverLetter.trim(),
  };
}
