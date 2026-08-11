/**
 * Minimal DOCX smoke test: build a tiny docx, parse, apply, re-parse.
 * Run: npx tsx scripts/smoke-docx.ts
 */
import JSZip from "jszip";
import { parseDocx } from "../src/lib/docx/parse";
import { applyChangesToDocx } from "../src/lib/docx/apply";
import { isLayoutSafe } from "../src/lib/docx/wordCount";

async function minimalDocx(paragraphs: string[]): Promise<Buffer> {
  const body = paragraphs
    .map(
      (t) =>
        `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${t.replace(/&/g, "&amp;")}</w:t></w:r></w:p>`
    )
    .join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr/></w:body>
</w:document>`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.folder("word")?.file("document.xml", documentXml);

  return zip.generateAsync({ type: "nodebuffer" });
}

async function main() {
  const original =
    "Built financial models in Excel to forecast revenue for three product lines";
  // Same-or-shorter chars required for one-page lock
  const rewritten =
    "Built Excel models to forecast revenue across three product lines";

  if (!isLayoutSafe(original, rewritten)) {
    throw new Error("Length tolerance helper failed on known-good pair");
  }

  // Longer rewrite must fail layout lock
  const tooLong =
    "Built detailed financial models in Microsoft Excel to accurately forecast revenue for three product lines and more";
  if (isLayoutSafe(original, tooLong)) {
    throw new Error("Layout lock should reject longer character counts");
  }

  const buf = await minimalDocx([
    "VAIBHAV EXAMPLE",
    original,
    "Skills: Excel, SQL, Power BI",
  ]);

  const parsed = await parseDocx(buf);
  console.log("Parsed blocks:", parsed.blocks.map((b) => b.text));

  const target = parsed.blocks.find((b) => b.text === original);
  if (!target) throw new Error("Could not find original bullet");

  const out = await applyChangesToDocx(buf, [
    { id: target.id, original, rewritten },
  ]);

  const again = await parseDocx(Buffer.from(out));
  const hit = again.blocks.find((b) => b.id === target.id);
  if (!hit || hit.text !== rewritten) {
    throw new Error(`Apply failed. Got: ${hit?.text}`);
  }

  // Bold run property should still exist in XML
  const zip = await JSZip.loadAsync(out);
  const xml = await zip.file("word/document.xml")!.async("string");
  if (!xml.includes("<w:b/>") && !xml.includes("<w:b ")) {
    throw new Error("Formatting (bold) was stripped");
  }

  console.log("Smoke OK — parse, length lock, apply, format preserved");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
