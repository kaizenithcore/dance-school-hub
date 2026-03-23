import type { DanceEvent } from "@/lib/types/events";

export const mockEvents: DanceEvent[] = [
  {
    id: "evt-1",
    name: "Festival de Primavera 2026",
    startDate: "2026-06-15",
    endDate: "2026-06-15",
    location: "Teatro Municipal",
    description: "Festival anual de primavera con actuaciones de todos los niveles.",
    ticketPrice: 12,
    capacity: 300,
    status: "published",
    createdAt: "2026-03-01T10:00:00Z",
    sessions: [
      {
        id: "ses-1a",
        date: "2026-06-15",
        startTime: "10:00",
        name: "Sesión matinal",
        schedule: [
          { id: "si-1", time: "10:00", duration: 5, groupName: "Ballet Infantil A", choreography: "El lago de los cisnes (adaptación)", teacher: "María García", participantsCount: 12, room: "Escenario principal" },
          { id: "si-2", time: "10:05", duration: 4, groupName: "Jazz Iniciación", choreography: "Rythm Nation", teacher: "Carlos López", participantsCount: 8 },
          { id: "si-3", time: "10:09", duration: 6, groupName: "Contemporáneo Intermedio", teacher: "Ana Ruiz", participantsCount: 10 },
        ],
      },
      {
        id: "ses-1b",
        date: "2026-06-15",
        startTime: "17:00",
        name: "Gala de tarde",
        schedule: [
          { id: "si-4", time: "17:00", duration: 8, groupName: "Ballet Avanzado", choreography: "Don Quijote - Acto III", teacher: "María García", participantsCount: 15, room: "Escenario principal" },
          { id: "si-5", time: "17:08", duration: 5, groupName: "Hip Hop Senior", choreography: "Urban Flow", teacher: "David Martín", participantsCount: 18 },
        ],
      },
    ],
  },
  {
    id: "evt-2",
    name: "Exhibición de Navidad",
    startDate: "2026-12-20",
    location: "Auditorio Central",
    status: "draft",
    capacity: 200,
    createdAt: "2026-03-10T09:00:00Z",
    sessions: [
      {
        id: "ses-2a",
        date: "2026-12-20",
        startTime: "18:00",
        name: "Sesión única",
        schedule: [],
      },
    ],
  },
  {
    id: "evt-3",
    name: "Workshop Internacional de Contemporáneo",
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    location: "Sala de ensayos principal",
    description: "Tres días de formación intensiva con coreógrafos internacionales.",
    ticketPrice: 85,
    capacity: 40,
    status: "draft",
    createdAt: "2026-03-15T14:00:00Z",
    sessions: [],
  },
];
