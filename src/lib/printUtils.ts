import { getTenantBranding, type TenantBranding } from "@/lib/api/branding";

export interface PrintColumn {
  label: string;
  key: string;
  align?: "left" | "center" | "right";
}

export interface PrintOptions {
  title: string;
  subtitle?: string;
  columns: PrintColumn[];
  rows: Record<string, string | number | null | undefined>[];
  footerNote?: string;
}

function fontStack(fontFamily: string): string {
  if (fontFamily === "poppins") return "Poppins, Arial, sans-serif";
  if (fontFamily === "montserrat") return "Montserrat, Arial, sans-serif";
  if (fontFamily === "lato") return "Lato, Arial, sans-serif";
  return "Inter, Segoe UI, Arial, sans-serif";
}

function escapeHtml(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildPrintHtml(options: PrintOptions, branding: TenantBranding | null): string {
  const primary = branding?.primary_color ?? "#1e293b";
  const secondary = branding?.secondary_color ?? "#f1f5f9";
  const font = fontStack(branding?.font_family ?? "inter");
  const logoUrl = branding?.logo_url ?? null;
  const now = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const colCount = options.columns.length;
  const colWidth = Math.floor(100 / colCount);

  const headerCells = options.columns
    .map((col) => `<th style="text-align:${col.align ?? "left"}">${escapeHtml(col.label)}</th>`)
    .join("");

  const bodyRows = options.rows.map((row, idx) => {
    const cells = options.columns
      .map((col) => `<td style="text-align:${col.align ?? "left"}">${escapeHtml(row[col.key])}</td>`)
      .join("");
    const bg = idx % 2 === 0 ? "#ffffff" : secondary;
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join("");

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" style="height:36px;max-width:120px;object-fit:contain;" />`
    : "";

  const subtitleHtml = options.subtitle
    ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(options.subtitle)}</div>`
    : "";

  const footerHtml = options.footerNote
    ? `<div style="margin-top:12px;font-size:10px;color:#94a3b8;">${escapeHtml(options.footerNote)}</div>`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${font}; color: #0f172a; font-size: 11px; }
    .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${primary}; padding-bottom: 8px; margin-bottom: 10px; }
    .doc-title { font-size: 16px; font-weight: 700; color: ${primary}; }
    .doc-date { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    colgroup col { width: ${colWidth}%; }
    thead tr { background: ${primary}; color: #fff; }
    thead th { padding: 6px 8px; font-size: 10px; font-weight: 600; }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
    .total-row { font-size: 10px; color: #64748b; margin-top: 6px; }
  </style>
</head>
<body>
  <div class="doc-header">
    <div>
      <div class="doc-title">${escapeHtml(options.title)}</div>
      ${subtitleHtml}
      <div class="doc-date">Generado: ${now} · ${options.rows.length} registro(s)</div>
    </div>
    ${logoHtml}
  </div>
  <table>
    <colgroup>${"<col />".repeat(colCount)}</colgroup>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  ${footerHtml}
</body>
</html>`;
}

let cachedBranding: TenantBranding | null = null;
let brandingFetchedAt = 0;

async function getBranding(): Promise<TenantBranding | null> {
  // Cache branding for 5 minutes to avoid repeated API calls
  if (cachedBranding && Date.now() - brandingFetchedAt < 5 * 60 * 1000) {
    return cachedBranding;
  }
  try {
    cachedBranding = await getTenantBranding();
    brandingFetchedAt = Date.now();
    return cachedBranding;
  } catch {
    return null;
  }
}

export async function openPrintView(options: PrintOptions): Promise<void> {
  const branding = await getBranding();
  const html = buildPrintHtml(options, branding);

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");

  if (win) {
    win.addEventListener("load", () => {
      win.print();
      // Clean up object URL after print dialog closes
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }
}
