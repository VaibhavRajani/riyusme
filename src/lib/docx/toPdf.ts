import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";

/**
 * High-fidelity DOCX → PDF for Vercel/serverless via ConvertAPI
 * (LibreOffice/Word-class layout engine — preserves fonts, spacing, one-page layout).
 * Get a free secret: https://www.convertapi.com/
 */
async function convertViaConvertApi(docx: Buffer): Promise<Buffer> {
  const secret = process.env.CONVERTAPI_SECRET?.trim();
  if (!secret) {
    throw new Error("CONVERTAPI_SECRET is not set");
  }

  const form = new FormData();
  form.append(
    "File",
    new Blob([new Uint8Array(docx)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    "resume.docx"
  );

  const url = `https://v2.convertapi.com/convert/docx/to/pdf?Secret=${encodeURIComponent(secret)}&StoreFile=false`;
  const res = await fetch(url, { method: "POST", body: form });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ConvertAPI failed (${res.status}): ${text.slice(0, 300)}`);
  }

  let json: {
    Files?: { FileData?: string; FileName?: string }[];
  };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("ConvertAPI returned invalid JSON");
  }

  const data = json.Files?.[0]?.FileData;
  if (!data) {
    throw new Error("ConvertAPI response missing PDF data");
  }
  return Buffer.from(data, "base64");
}

function runCommand(
  cmd: string,
  args: string[],
  cwd: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, windowsHide: true });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || `${cmd} exited ${code}`));
    });
  });
}

/** Local fallback when LibreOffice is installed (dev machines / Docker). */
async function convertViaLibreOffice(docx: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "riyusme-pdf-"));
  try {
    const input = join(dir, "resume.docx");
    await writeFile(input, docx);

    const candidates =
      process.platform === "win32"
        ? [
            "soffice",
            "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
            "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
          ]
        : ["soffice", "libreoffice"];

    let lastError: Error | null = null;
    for (const bin of candidates) {
      try {
        await runCommand(
          bin,
          ["--headless", "--nologo", "--nofirststartwizard", "--convert-to", "pdf", "--outdir", dir, input],
          dir
        );
        const pdf = await readFile(join(dir, "resume.pdf"));
        return pdf;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
    throw lastError ?? new Error("LibreOffice not available");
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * Convert tailored DOCX to PDF with format preservation.
 * Prefers ConvertAPI (Vercel-safe); falls back to local LibreOffice if present.
 */
export async function docxToPdf(docx: Buffer | Uint8Array): Promise<Buffer> {
  const buf = Buffer.isBuffer(docx) ? docx : Buffer.from(docx);

  if (process.env.CONVERTAPI_SECRET?.trim()) {
    return convertViaConvertApi(buf);
  }

  try {
    return await convertViaLibreOffice(buf);
  } catch {
    throw new Error(
      "PDF conversion needs CONVERTAPI_SECRET (https://www.convertapi.com — free tier) or LibreOffice installed locally."
    );
  }
}
