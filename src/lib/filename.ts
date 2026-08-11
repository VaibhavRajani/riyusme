/** Sanitize a company/label for use in download filenames. */
export function slugifyForFilename(input: string, fallback = "company"): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase()
    .slice(0, 48)
    .replace(/-+$/g, "");

  return slug || fallback;
}

/**
 * Build download name: `{resumeBase}-{company}.docx|pdf`
 * e.g. riya-resume-goldman-sachs.pdf
 */
export function tailoredResumeFilename(
  resumeFileName: string,
  companyName: string | undefined,
  format: "docx" | "pdf"
): string {
  const base =
    resumeFileName
      .replace(/\.docx$/i, "")
      .replace(/-tailored$/i, "")
      .trim() || "riya-resume";
  const company = slugifyForFilename(companyName || "company");
  return `${base}-${company}.${format}`;
}
