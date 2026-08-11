/**
 * Default resume served from /public/defaults/
 * Place Riya’s baseline .docx here as: public/defaults/riya-resume.docx
 * (Save As → Word Document *.docx — old .doc is not supported)
 */
export const DEFAULT_RESUME_URL = "/defaults/riya-resume.docx";
export const DEFAULT_RESUME_FILENAME = "riya-resume.docx";

export async function loadDefaultResumeFile(): Promise<File | null> {
  try {
    const res = await fetch(DEFAULT_RESUME_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    // Ensure we treat it as a docx even if server MIME is generic
    return new File([blob], DEFAULT_RESUME_FILENAME, {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      lastModified: Date.now(),
    });
  } catch {
    return null;
  }
}
