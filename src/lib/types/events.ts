export type EventStatus = "draft" | "published";

export interface ScheduleItem {
  id: string;
  time: string;        // "HH:mm"
  duration: number;    // minutes
  groupName: string;
  choreography?: string;
  teacher?: string;
  participantsCount?: number;
  room?: string;
  notes?: string;
}

export interface EventSession {
  id: string;
  date: string;        // ISO date
  startTime: string;   // "HH:mm"
  endTime?: string;
  name?: string;
  notes?: string;
  schedule: ScheduleItem[];
}

export interface DanceEvent {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  location: string;
  description?: string;
  ticketPrice?: number;
  capacity?: number;
  notes?: string;
  status: EventStatus;
  sessions: EventSession[];
  createdAt: string;
}
