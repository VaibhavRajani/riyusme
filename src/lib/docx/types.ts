export type BlockKind = "bullet" | "heading" | "paragraph" | "contact";

export interface ResumeBlock {
  id: string;
  index: number;
  text: string;
  kind: BlockKind;
  wordCount: number;
}

export interface ResumeChange {
  id: string;
  original: string;
  rewritten: string;
  reason?: string;
}

export interface ParseResult {
  blocks: ResumeBlock[];
  paragraphCount: number;
}
