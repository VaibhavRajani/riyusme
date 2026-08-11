import JSZip from "jszip";
import type { BlockKind, ParseResult, ResumeBlock } from "./types";
import { wordCount } from "./wordCount";

const WT_REGEX = /<w:t([^>]*)>([\s\S]*?)<\/w:t>/g;
const WP_REGEX = /<w:p[\s\S]*?<\/w:p>/g;

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTextFromParagraph(pXml: string): string {
  const parts: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(WT_REGEX.source, "g");
  while ((match = re.exec(pXml)) !== null) {
    parts.push(decodeXmlEntities(match[2]));
  }
  return parts.join("");
}

function inferKind(pXml: string, text: string): BlockKind {
  if (/<w:numPr[\s>]/.test(pXml)) return "bullet";

  const trimmed = text.trim();
  // Short ALL-CAPS or Title-ish lines often section headers
  if (
    trimmed.length > 0 &&
    trimmed.length < 60 &&
    !trimmed.includes(".") &&
    (trimmed === trimmed.toUpperCase() || /^[A-Z][A-Za-z\s&/]+$/.test(trimmed))
  ) {
    // Likely a heading if short and no sentence punctuation
    if (wordCount(trimmed) <= 6) return "heading";
  }

  // Contact-ish: email, phone, linkedin, pipes
  if (
    /@/.test(trimmed) ||
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(trimmed) ||
    /linkedin\.com/i.test(trimmed)
  ) {
    return "contact";
  }

  return "paragraph";
}

export async function parseDocx(buffer: ArrayBuffer | Buffer): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }

  const xml = await docFile.async("string");
  const blocks: ResumeBlock[] = [];
  let paragraphCount = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(WP_REGEX.source, "g");

  while ((match = re.exec(xml)) !== null) {
    const pXml = match[0];
    paragraphCount += 1;
    const text = extractTextFromParagraph(pXml).replace(/\s+/g, " ").trim();
    if (!text) continue;

    const index = blocks.length;
    const kind = inferKind(pXml, text);
    blocks.push({
      id: `b${index}`,
      index,
      text,
      kind,
      wordCount: wordCount(text),
    });
  }

  return { blocks, paragraphCount };
}

export { extractTextFromParagraph, decodeXmlEntities };
