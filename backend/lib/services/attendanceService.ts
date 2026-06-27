import { chromium } from "playwright";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { brandingService } from "@/lib/services/brandingService";

interface ClassScheduleRow {
  weekday: number;
  start_time: string;
  end_time: string;
}

interface ClassRow {
  id: string;
  name: string;
  teachers: { name: string | null } | Array<{ name: string | null }> | null;
  class_schedules: ClassScheduleRow[] | null;
}

interface EnrollmentRow {
  students: { name: string | null } | Array<{ name: string | null }> | null;
}

function one<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map((part) => Number.parseInt(part, 10));
  const date = new Date(year, monthNumber - 1, 1);
  return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function dayToJsWeekday(weekday: number) {
  // DB weekday: 1 (Mon) ... 7 (Sun)
  return weekday === 7 ? 0 : weekday;
}

function buildSessionDates(month: string, weekdays: number[]) {
  const [year, monthIndexRaw] = month.split("-").map((part) => Number.parseInt(part, 10));
  const monthIndex = monthIndexRaw - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const selectedWeekdays = new Set(weekdays.map(dayToJsWeekday));

  const dates: Date[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const currentDate = new Date(year, monthIndex, day);
    if (selectedWeekdays.has(currentDate.getDay())) {
      dates.push(currentDate);
    }
  }

  return dates;
}

function getDaysInMonth(month: string): number {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum, 0).getDate();
}

function buildHtml(input: {
  className: string;
  teacherName: string;
  month: string;
  schedule: ClassScheduleRow[];
  studentNames: string[];
  sessionDates: Date[];
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: "inter" | "poppins" | "montserrat" | "lato";
}) {
  const className = escapeHtml(input.className);
  const teacherName = escapeHtml(input.teacherName);
  const monthText = escapeHtml(monthLabel(input.month));

  const daysInMonth = getDaysInMonth(input.month);
  const sessionDayNumbers = new Set(input.sessionDates.map((d) => d.getDate()));

  // Build day-number column headers (1..31)
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const isSession = sessionDayNumbers.has(day);
    return `<th class="${isSession ? "session-day" : "non-session"}">${day}</th>`;
  }).join("");

  const studentRows = input.studentNames.length > 0
    ? input.studentNames
        .map((name, idx) => {
          const cells = Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            return sessionDayNumbers.has(day) ? `<td class="session-cell"></td>` : `<td class="off-cell"></td>`;
          }).join("");
          return `<tr class="${idx % 2 === 0 ? "row-even" : "row-odd"}"><td class="name-cell">${idx + 1}. ${escapeHtml(name)}</td>${cells}</tr>`;
        })
        .join("\n")
    : `<tr><td class="name-cell" colspan="${daysInMonth + 1}" style="text-align:center;color:#94a3b8;padding:12px;">Sin alumnos confirmados</td></tr>`;

  const fontStack = input.fontFamily === "poppins"
    ? "Poppins, Arial, sans-serif"
    : input.fontFamily === "montserrat"
      ? "Montserrat, Arial, sans-serif"
      : input.fontFamily === "lato"
        ? "Lato, Arial, sans-serif"
        : "Inter, Segoe UI, Arial, sans-serif";

  const logoHtml = input.logoUrl
    ? `<img class="logo" src="${escapeHtml(input.logoUrl)}" alt="Logo" />`
    : "";

  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${fontStack}; color: #0f172a; font-size: 11px; }
    .sheet-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; border-bottom: 2px solid ${input.primaryColor}; padding-bottom: 6px; }
    .sheet-title { font-size: 15px; font-weight: 700; letter-spacing: 0.05em; color: ${input.primaryColor}; text-transform: uppercase; }
    .sheet-meta { margin-top: 4px; font-size: 10px; color: #475569; display: flex; gap: 20px; flex-wrap: wrap; }
    .sheet-meta span strong { color: #1e293b; }
    .logo { height: 40px; max-width: 130px; object-fit: contain; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .name-cell { width: 200px; min-width: 200px; font-size: 10px; padding: 3px 6px; text-align: left; border: 1px solid #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    thead .name-header { background: ${input.primaryColor}; color: #fff; font-weight: 700; font-size: 10px; padding: 4px 6px; border: 1px solid ${input.primaryColor}; }
    th.session-day { background: ${input.primaryColor}; color: #fff; font-weight: 700; font-size: 9px; padding: 4px 2px; text-align: center; border: 1px solid ${input.primaryColor}; width: 18px; min-width: 14px; }
    th.non-session { background: #f8fafc; color: #94a3b8; font-size: 9px; padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; width: 18px; min-width: 14px; }
    td.session-cell { height: 20px; border: 1px solid #cbd5e1; background: #fff; }
    td.off-cell { height: 20px; border: 1px solid #f1f5f9; background: #f8fafc; }
    tr.row-odd .name-cell, tr.row-odd td.session-cell { background: #fafafa; }
    tr.row-odd td.off-cell { background: #f4f6f8; }
    .legend { margin-top: 6px; font-size: 9px; color: #64748b; display: flex; gap: 12px; }
    .legend-item { display: flex; align-items: center; gap: 4px; }
    .legend-box { width: 10px; height: 10px; border: 1px solid; }
  </style>
</head>
<body>
  <div class="sheet-header">
    <div>
      <div class="sheet-title">Control de Asistencia</div>
      <div class="sheet-meta">
        <span><strong>Clase:</strong> ${className}</span>
        <span><strong>Profesor:</strong> ${teacherName}</span>
        <span><strong>Mes:</strong> ${monthText}</span>
      </div>
    </div>
    ${logoHtml}
  </div>
  <table>
    <thead>
      <tr>
        <th class="name-header">Alumno</th>
        ${dayHeaders}
      </tr>
    </thead>
    <tbody>
      ${studentRows}
    </tbody>
  </table>
  <div class="legend">
    <div class="legend-item"><div class="legend-box" style="background:${input.primaryColor};border-color:${input.primaryColor};"></div> Día de clase</div>
    <div class="legend-item"><div class="legend-box" style="background:#f8fafc;border-color:#e2e8f0;"></div> Sin clase</div>
    <span style="margin-left:auto;">${input.studentNames.length} alumnos · ${input.sessionDates.length} sesiones en el mes</span>
  </div>
</body>
</html>`;
}

async function htmlToPdf(html: string): Promise<Buffer> {
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
      margin: { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function buildClassHtml(
  classData: ClassRow,
  month: string,
  branding: { logo_url: string | null; primary_color: string; secondary_color: string; font_family: "inter" | "poppins" | "montserrat" | "lato" },
  tenantId: string
): Promise<string | null> {
  const schedule = (classData.class_schedules || []).sort((a, b) => a.weekday - b.weekday);
  if (schedule.length === 0) return null;

  const { data: enrollmentData } = await supabaseAdmin
    .from("enrollments")
    .select("students(name)")
    .eq("tenant_id", tenantId)
    .eq("class_id", classData.id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: true });

  const studentNames = ((enrollmentData || []) as EnrollmentRow[])
    .map((row) => one(row.students)?.name || "Alumno")
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b, "es"));

  const sessionDates = buildSessionDates(month, Array.from(new Set(schedule.map((item) => item.weekday))));

  return buildHtml({
    className: classData.name,
    teacherName: one(classData.teachers)?.name || "Sin asignar",
    month,
    schedule,
    studentNames,
    sessionDates,
    logoUrl: branding.logo_url,
    primaryColor: branding.primary_color,
    secondaryColor: branding.secondary_color,
    fontFamily: branding.font_family,
  });
}

export const attendanceService = {
  async buildAttendanceSheetPdf(tenantId: string, classId: string, month: string): Promise<Buffer> {
    const branding = await brandingService.getTenantBranding(tenantId);
    const { data: classData, error: classError } = await supabaseAdmin
      .from("classes")
      .select("id, name, teachers(name), class_schedules(weekday, start_time, end_time)")
      .eq("tenant_id", tenantId)
      .eq("id", classId)
      .maybeSingle();

    if (classError) throw new Error(`Failed to load class: ${classError.message}`);
    if (!classData) throw new Error("Class not found");

    const classRow = classData as unknown as ClassRow;
    const schedule = (classRow.class_schedules || []).sort((a, b) => a.weekday - b.weekday);

    if (schedule.length === 0) {
      throw new Error(
        "NO_SCHEDULE: No hay horarios configurados para esta clase. Ve a Horarios y agrega al menos un bloque antes de descargar la hoja."
      );
    }

    const { data: enrollmentData, error: enrollmentError } = await supabaseAdmin
      .from("enrollments")
      .select("students(name)")
      .eq("tenant_id", tenantId)
      .eq("class_id", classId)
      .eq("status", "confirmed")
      .order("created_at", { ascending: true });

    if (enrollmentError) throw new Error(`Failed to load enrollments: ${enrollmentError.message}`);

    const studentNames = ((enrollmentData || []) as EnrollmentRow[])
      .map((row) => one(row.students)?.name || "Alumno")
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b, "es"));

    const sessionDates = buildSessionDates(month, Array.from(new Set(schedule.map((item) => item.weekday))));

    const html = buildHtml({
      className: classRow.name,
      teacherName: one(classRow.teachers)?.name || "Sin asignar",
      month,
      schedule,
      studentNames,
      sessionDates,
      logoUrl: branding.logo_url,
      primaryColor: branding.primary_color,
      secondaryColor: branding.secondary_color,
      fontFamily: branding.font_family,
    });

    return htmlToPdf(html);
  },

  async buildBulkAttendanceSheetPdf(tenantId: string, month: string): Promise<Buffer> {
    const branding = await brandingService.getTenantBranding(tenantId);

    const { data: classesData, error } = await supabaseAdmin
      .from("classes")
      .select("id, name, teachers(name), class_schedules(weekday, start_time, end_time)")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) throw new Error(`Failed to load classes: ${error.message}`);
    if (!classesData || classesData.length === 0) throw new Error("NO_CLASSES: No hay clases configuradas.");

    const htmlSections: string[] = [];
    for (const cls of classesData as unknown as ClassRow[]) {
      const html = await buildClassHtml(cls, month, branding, tenantId);
      if (html) htmlSections.push(html);
    }

    if (htmlSections.length === 0) {
      throw new Error("NO_SCHEDULE: Ninguna clase tiene horario configurado para generar listados.");
    }

    // Wrap all sections in a single HTML with @page size:A4 landscape and page breaks
    const combinedHtml = `<!doctype html><html><head><meta charset="UTF-8"/><style>
      @page { size: A4 landscape; margin: 10mm; }
      .class-sheet { page-break-after: always; }
      .class-sheet:last-child { page-break-after: avoid; }
    </style></head><body>${htmlSections.map((s) => {
      // Extract only the <body> contents from each individual HTML
      const match = s.match(/<body>([\s\S]*?)<\/body>/);
      return `<div class="class-sheet">${match ? match[1] : s}</div>`;
    }).join("\n")}</body></html>`;

    return htmlToPdf(combinedHtml);
  },
};
