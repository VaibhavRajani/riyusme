/**
 * Free, client-side DOCX → PDF using the tailored Word bytes.
 * Renders with docx-preview (layout-aware), then html2pdf (letter page).
 * No ConvertAPI / cloud conversion fees.
 */

export async function convertDocxToPdfBlob(docxBlob: Blob): Promise<Blob> {
  const [{ renderAsync }, html2pdfModule] = await Promise.all([
    import("docx-preview"),
    import("html2pdf.js"),
  ]);
  const html2pdf = html2pdfModule.default;

  const host = document.createElement("div");
  host.setAttribute("data-riyusme-pdf", "1");
  host.style.cssText = [
    "position:fixed",
    "left:-12000px",
    "top:0",
    "width:8.5in",
    "background:#fff",
    "z-index:-1",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(host);

  try {
    await renderAsync(await docxBlob.arrayBuffer(), host, undefined, {
      className: "docx",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      renderHeaders: true,
      renderFooters: true,
      useBase64URL: true,
    });

    // Prefer the first page section; fall back to wrapper
    const target =
      (host.querySelector(".docx-wrapper > section.docx") as HTMLElement | null) ||
      (host.querySelector(".docx-wrapper") as HTMLElement | null) ||
      host;

    // Tighten wrapper chrome that docx-preview adds for screen preview
    const wrapper = host.querySelector(".docx-wrapper") as HTMLElement | null;
    if (wrapper) {
      wrapper.style.background = "#fff";
      wrapper.style.padding = "0";
      wrapper.style.margin = "0";
      wrapper.style.boxShadow = "none";
    }
    target.style.boxShadow = "none";
    target.style.margin = "0";

    const pdfBlob: Blob = await html2pdf()
      .set({
        margin: 0,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      })
      .from(target)
      .outputPdf("blob");

    return pdfBlob;
  } finally {
    host.remove();
  }
}
