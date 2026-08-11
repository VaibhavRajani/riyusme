import JSZip from "jszip";
import type { ResumeChange } from "./types";
import { extractTextFromParagraph } from "./parse";

function encodeXmlEntities(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Replace paragraph text while preserving run formatting.
 * Puts all new text into the first <w:t>, clears the rest.
 */
export function setParagraphText(pXml: string, newText: string): string {
  const encoded = encodeXmlEntities(newText);
  let first = true;

  return pXml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (_full, attrs: string) => {
    if (first) {
      first = false;
      // Preserve spaces at edges
      let a = attrs;
      if (
        (encoded.startsWith(" ") || encoded.endsWith(" ")) &&
        !/\bxml:space=/.test(a)
      ) {
        a = `${a} xml:space="preserve"`;
      }
      return `<w:t${a}>${encoded}</w:t>`;
    }
    return `<w:t${attrs}></w:t>`;
  });
}

/**
 * Apply approved text changes to the original DOCX buffer.
 * Matches blocks by reading paragraphs in document order (same as parse).
 */
export async function applyChangesToDocx(
  buffer: ArrayBuffer | Buffer,
  changes: ResumeChange[]
): Promise<Uint8Array> {
  const changeMap = new Map(
    changes.map((c) => [c.id, c] as const)
  );

  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("Invalid DOCX: missing word/document.xml");
  }

  let xml = await docFile.async("string");
  const paragraphs = xml.match(/<w:p[\s\S]*?<\/w:p>/g) ?? [];

  let blockIndex = 0;
  const replacements: { from: string; to: string }[] = [];

  for (const pXml of paragraphs) {
    const text = extractTextFromParagraph(pXml).replace(/\s+/g, " ").trim();
    if (!text) continue;

    const id = `b${blockIndex}`;
    blockIndex += 1;

    const change = changeMap.get(id);
    if (!change) continue;

    // Safety: only replace if original still matches (formatting-safe)
    const originalNorm = change.original.replace(/\s+/g, " ").trim();
    if (text !== originalNorm) {
      // Try fuzzy: still apply if close enough? Prefer skip to avoid corruption
      continue;
    }

    const newP = setParagraphText(pXml, change.rewritten);
    if (newP !== pXml) {
      replacements.push({ from: pXml, to: newP });
    }
  }

  // Apply from end to start by unique string replace once each
  for (const { from, to } of replacements) {
    const idx = xml.indexOf(from);
    if (idx !== -1) {
      xml = xml.slice(0, idx) + to + xml.slice(idx + from.length);
    }
  }

  zip.file("word/document.xml", xml);
  const out = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  return out;
}
