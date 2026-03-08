import { chromium } from "playwright";
import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

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

function buildHtml(input: {
  className: string;
  teacherName: string;
  month: string;
  schedule: ClassScheduleRow[];
  studentNames: string[];
  sessionDates: Date[];
}) {
  const className = escapeHtml(input.className);
  const teacherName = escapeHtml(input.teacherName);
  const month = escapeHtml(monthLabel(input.month));
  const schedule = input.schedule
    .map((item) => {
      const dayMap: Record<number, string> = {
        1: "Lunes",
        2: "Martes",
        3: "Miércoles",
        4: "Jueves",
        5: "Viernes",
        6: "Sábado",
        7: "Domingo",
      };
      return `${dayMap[item.weekday] || "Día"} ${item.start_time.slice(0, 5)}-${item.end_time.slice(0, 5)}`;
    })
    .join(" · ");

  const dateHeaders = input.sessionDates
    .map((sessionDate) => `<th>${escapeHtml(formatDate(sessionDate))}</th>`)
    .join("");

  const studentRows = input.studentNames
    .map((studentName, index) => {
      const cells = input.sessionDates.map(() => "<td></td>").join("");
      return `<tr><td class=\"name\">${index + 1}. ${escapeHtml(studentName)}</td>${cells}</tr>`;
    })
    .join("\n");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          .meta { margin: 0; color: #475569; font-size: 12px; }
          .sheet { border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-top: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          thead th { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 7px 6px; text-align: center; }
          tbody td { border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; height: 26px; text-align: center; }
          tbody tr:last-child td { border-bottom: none; }
          th:first-child, td:first-child { text-align: left; padding: 6px 8px; position: sticky; left: 0; background: #fff; }
          thead th:first-child { background: #f8fafc; }
          .name { min-width: 240px; max-width: 240px; }
        </style>
      </head>
      <body>
        <h1>Hoja de asistencia</h1>
        <p class="meta"><strong>Clase:</strong> ${className}</p>
        <p class="meta"><strong>Profesor:</strong> ${teacherName}</p>
        <p class="meta"><strong>Mes:</strong> ${month}</p>
        <p class="meta"><strong>Horario:</strong> ${escapeHtml(schedule || "Sin horario")}</p>

        <section class="sheet">
          <table>
            <thead>
              <tr>
                <th>Alumno</th>
                ${dateHeaders}
              </tr>
            </thead>
            <tbody>
              ${studentRows || '<tr><td class="name">Sin alumnos confirmados</td></tr>'}
            </tbody>
          </table>
        </section>
      </body>
    </html>
  `;
}

export const attendanceService = {
  async buildAttendanceSheetPdf(tenantId: string, classId: string, month: string): Promise<Buffer> {
    const { data: classData, error: classError } = await supabaseAdmin
      .from("classes")
      .select("id, name, teachers(name), class_schedules(weekday, start_time, end_time)")
      .eq("tenant_id", tenantId)
      .eq("id", classId)
      .maybeSingle();

    if (classError) {
      throw new Error(`Failed to load class: ${classError.message}`);
    }

    if (!classData) {
      throw new Error("Class not found");
    }

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

    if (enrollmentError) {
      throw new Error(`Failed to load enrollments: ${enrollmentError.message}`);
    }

    const studentNames = ((enrollmentData || []) as EnrollmentRow[])
      .map((row) => one(row.students)?.name || "Alumno")
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b, "es"));

    const sessionDates = buildSessionDates(
      month,
      Array.from(new Set(schedule.map((item) => item.weekday)))
    );

    const html = buildHtml({
      className: classRow.name,
      teacherName: one(classRow.teachers)?.name || "Sin asignar",
      month,
      schedule,
      studentNames,
      sessionDates,
    });

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
          right: "8mm",
          bottom: "10mm",
          left: "8mm",
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  },
};
