export interface IcalEvent {
  uid: string;
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  rrule?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateUtc(value: Date): string {
  return `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}${pad(value.getUTCSeconds())}Z`;
}

function formatDateLocal(value: Date): string {
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}`;
}

function formatDateTimeLocal(value: Date): string {
  return `${value.getFullYear()}${pad(value.getMonth() + 1)}${pad(value.getDate())}T${pad(value.getHours())}${pad(value.getMinutes())}${pad(value.getSeconds())}`;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  if (line.length <= 74) {
    return line;
  }

  let result = "";
  let remaining = line;
  while (remaining.length > 74) {
    result += `${remaining.slice(0, 74)}\r\n `;
    remaining = remaining.slice(74);
  }
  return `${result}${remaining}`;
}

export function buildIcalCalendar(name: string, events: IcalEvent[]): string {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dance School Hub//Portal Integrations//ES",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(name)}`,
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${formatDateUtc(now)}`);

    if (event.allDay) {
      const nextDay = new Date(event.end);
      nextDay.setDate(nextDay.getDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${formatDateLocal(event.start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateLocal(nextDay)}`);
    } else {
      lines.push(`DTSTART:${formatDateTimeLocal(event.start)}`);
      lines.push(`DTEND:${formatDateTimeLocal(event.end)}`);
    }

    lines.push(`SUMMARY:${escapeText(event.summary)}`);
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeText(event.location)}`);
    }
    if (event.rrule) {
      lines.push(`RRULE:${event.rrule}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
