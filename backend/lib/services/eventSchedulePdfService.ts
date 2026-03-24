import { chromium } from "playwright";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type { FrontendScheduleItem } from "@/lib/services/eventScheduleItemService";

interface EventData {
  id: string;
  name: string;
  startDate: string;
  location: string;
}

interface SessionData {
  id: string;
  date: string;
  startTime: string;
  name?: string;
}

type ScheduleItemForPdf = FrontendScheduleItem;

interface TenantData {
  name: string;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
  };
}

function normalizeText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatTime(timeString: string): string {
  if (!timeString) return "";
  return timeString.substring(0, 5);
}

function buildScheduleHtml(
  event: EventData,
  session: SessionData,
  scheduleItems: ScheduleItemForPdf[],
  tenant?: TenantData
): string {
  const primaryColor = normalizeText(
    tenant?.branding?.primaryColor,
    "#8b5cf6"
  );
  const accentColor = normalizeText(
    tenant?.branding?.accentColor,
    "#a78bfa"
  );
  const schoolName = escapeHtml(normalizeText(tenant?.name, "Escuela de Danza"));
  const eventName = escapeHtml(normalizeText(event.name, "Evento"));
  const location = escapeHtml(normalizeText(event.location, ""));
  const sessionName = escapeHtml(
    normalizeText(session.name, "Sesión sin nombre")
  );
  const formattedDate = formatDate(session.date);
  const startTime = formatTime(session.startTime);

  const scheduleRows = scheduleItems
    .map((item, idx) => {
      const time = formatTime(item.time);
      const groupName = escapeHtml(normalizeText(item.groupName, "-"));
      const choreography = escapeHtml(
        normalizeText(item.choreography, "")
      );
      const teacher = escapeHtml(normalizeText(item.teacher, ""));
      const participants = item.participantsCount ? String(item.participantsCount) : "-";
      const notes = escapeHtml(normalizeText(item.notes, ""));

      return `
        <tr>
          <td class="row-number">${idx + 1}</td>
          <td class="time">${time}</td>
          <td class="duration">${item.duration}m</td>
          <td class="group-name"><strong>${groupName}</strong></td>
          <td class="choreography">${choreography}</td>
          <td class="teacher">${teacher}</td>
          <td class="participants">${participants}</td>
        </tr>
        ${notes ? `<tr class="notes-row"><td colspan="7"><em>Notas:</em> ${notes}</td></tr>` : ""}
      `;
    })
    .join("\n");

  const totalDuration = scheduleItems.reduce((sum, item) => sum + item.duration, 0);

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Escaleta - ${eventName}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            font-family: "Segoe UI", Arial, sans-serif;
            color: #1f2937;
            background: white;
          }
          
          .container {
            max-width: 100%;
            padding: 0;
          }
          
          .header {
            border-bottom: 3px solid ${primaryColor};
            margin-bottom: 20px;
            padding-bottom: 15px;
          }
          
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
          }
          
          .header-title {
            flex: 1;
          }
          
          .header-title h1 {
            margin: 0 0 5px 0;
            font-size: 24px;
            color: ${primaryColor};
          }
          
          .header-title p {
            margin: 0;
            font-size: 11px;
            color: #6b7280;
          }
          
          .school-name {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
          }
          
          .meta-info {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            font-size: 10px;
            margin-top: 10px;
          }
          
          .meta-item {
            display: flex;
            flex-direction: column;
          }
          
          .meta-label {
            color: #9ca3af;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 8px;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          
          .meta-value {
            color: #1f2937;
            font-weight: 600;
          }
          
          .table-wrapper {
            margin-bottom: 20px;
            overflow: auto;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          
          thead {
            background-color: ${accentColor};
            color: white;
          }
          
          th {
            padding: 8px 6px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
            border: 1px solid ${primaryColor};
          }
          
          td {
            padding: 7px 6px;
            border: 1px solid #e5e7eb;
          }
          
          tbody tr {
            background-color: white;
          }
          
          tbody tr:nth-child(2n) {
            background-color: #f9fafb;
          }
          
          .notes-row {
            background-color: #f3f4f6 !important;
          }
          
          .notes-row td {
            padding: 5px 6px;
            border: 1px solid #e5e7eb;
            font-size: 9px;
            font-style: italic;
          }
          
          .row-number {
            font-weight: 600;
            color: ${primaryColor};
            text-align: center;
            width: 30px;
          }
          
          .time {
            font-weight: 600;
            text-align: center;
            width: 50px;
          }
          
          .duration {
            text-align: center;
            width: 45px;
          }
          
          .group-name {
            font-weight: 600;
            width: 120px;
          }
          
          .choreography {
            width: 120px;
          }
          
          .teacher {
            width: 100px;
          }
          
          .participants {
            text-align: center;
            width: 60px;
          }
          
          .costume {
            width: 80px;
          }
          
          .summary {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background-color: #f9fafb;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 10px;
            margin-top: 15px;
          }
          
          .summary-item {
            display: flex;
            gap: 20px;
          }
          
          .summary-label {
            color: #6b7280;
            font-weight: 500;
          }
          
          .summary-value {
            font-weight: 600;
            color: ${primaryColor};
          }
          
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #d1d5db;
            text-align: right;
            font-size: 8px;
            color: #9ca3af;
          }
          
          .print-time {
            margin-top: 5px;
            color: #d1d5db;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-title">
              <h1>Escaleta del evento</h1>
              <p class="school-name">${schoolName}</p>
            </div>
            
            <div class="meta-info">
              <div class="meta-item">
                <span class="meta-label">Evento</span>
                <span class="meta-value">${eventName}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Sesión</span>
                <span class="meta-value">${sessionName}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Fecha</span>
                <span class="meta-value">${formattedDate}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Hora de inicio</span>
                <span class="meta-value">${startTime}</span>
              </div>
            </div>
            ${location ? `<div style="color: #6b7280; font-size: 10px; margin-top: 8px;"><strong>Lugar:</strong> ${location}</div>` : ""}
          </div>
          
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Hora</th>
                  <th>Dur.</th>
                  <th>Grupo/Actuación</th>
                  <th>Coreografía</th>
                  <th>Profesor/a</th>
                  <th>Participantes</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleRows}
              </tbody>
            </table>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <span class="summary-label">Total de bloques:</span>
              <span class="summary-value">${scheduleItems.length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Duración total:</span>
              <span class="summary-value">${totalDuration} minutos</span>
            </div>
          </div>
          
          <div class="footer">
            <div class="print-time">Generado el ${new Date().toLocaleString("es-ES", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function resolveTenantData(tenantId: string): Promise<TenantData> {
  const { data: tenantData } = await supabaseAdmin
    .from("tenants")
    .select("name, branding")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenantData) {
    return { name: "Escuela de Danza" };
  }

  return {
    name: tenantData.name || "Escuela de Danza",
    branding: tenantData.branding && typeof tenantData.branding === "object"
      ? (tenantData.branding as TenantData["branding"])
      : undefined,
  };
}

export const eventSchedulePdfService = {
  async generateSchedulePdf(
    tenantId: string,
    event: EventData,
    session: SessionData,
    scheduleItems: ScheduleItemForPdf[]
  ): Promise<Buffer> {
    try {
      const tenant = await resolveTenantData(tenantId);
      const html = buildScheduleHtml(event, session, scheduleItems, tenant);

      const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
      const browser = await chromium.launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle" });
        
        const pdf = await page.pdf({
          format: "A4",
          landscape: true,
          printBackground: true,
          margin: {
            top: "10mm",
            right: "10mm",
            bottom: "10mm",
            left: "10mm",
          },
        });
        
        return Buffer.from(pdf);
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error("Failed to generate schedule PDF:", error);
      throw error;
    }
  },
};
