/**
 * Mock API service — replace with real API calls in the future.
 * Every function returns a Promise to simulate async behaviour.
 */
import {
  CURRENT_STUDENT,
  MOCK_PORTAL_CLASSES,
  MOCK_PORTAL_EVENTS,
  MOCK_ACHIEVEMENTS,
  MOCK_CERTIFICATIONS,
  MOCK_ACTIVITY,
  MOCK_OTHER_STUDENTS,
  type PortalStudent,
  type PortalClass,
  type PortalEvent,
  type PortalAchievement,
  type PortalCertification,
  type ActivityItem,
} from "../data/mockData";

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export async function fetchCurrentStudent(): Promise<PortalStudent> {
  await delay();
  return CURRENT_STUDENT;
}

export async function fetchClasses(): Promise<PortalClass[]> {
  await delay();
  return MOCK_PORTAL_CLASSES;
}

export async function fetchEvents(): Promise<PortalEvent[]> {
  await delay();
  return MOCK_PORTAL_EVENTS;
}

export async function fetchAchievements(): Promise<PortalAchievement[]> {
  await delay();
  return MOCK_ACHIEVEMENTS;
}

export async function fetchCertifications(): Promise<PortalCertification[]> {
  await delay();
  return MOCK_CERTIFICATIONS;
}

export async function fetchActivity(): Promise<ActivityItem[]> {
  await delay();
  return MOCK_ACTIVITY;
}

export async function fetchStudentById(id: string): Promise<PortalStudent | undefined> {
  await delay();
  if (id === CURRENT_STUDENT.id) return CURRENT_STUDENT;
  return MOCK_OTHER_STUDENTS.find((s) => s.id === id);
}
