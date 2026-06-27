/**
 * Frontend types for RBAC system - mirrors backend Permission enum
 * Shared across frontend for UI control and authorization checks
 */

export enum Permission {
  // Classes management
  CLASSES_READ = "admin.classes.read",
  CLASSES_WRITE = "admin.classes.write",
  CLASSES_DELETE = "admin.classes.delete",

  // Teachers management
  TEACHERS_READ = "admin.teachers.read",
  TEACHERS_WRITE = "admin.teachers.write",
  TEACHERS_DELETE = "admin.teachers.delete",

  // Rooms management
  ROOMS_READ = "admin.rooms.read",
  ROOMS_WRITE = "admin.rooms.write",
  ROOMS_DELETE = "admin.rooms.delete",

  // Students management
  STUDENTS_READ = "admin.students.read",
  STUDENTS_WRITE = "admin.students.write",
  STUDENTS_DELETE = "admin.students.delete",

  // Enrollments management
  ENROLLMENTS_READ = "admin.enrollments.read",
  ENROLLMENTS_WRITE = "admin.enrollments.write",
  ENROLLMENTS_DELETE = "admin.enrollments.delete",

  // Schedule management
  SCHEDULE_READ = "admin.schedule.read",
  SCHEDULE_WRITE = "admin.schedule.write",

  // Attendance
  ATTENDANCE_READ = "admin.attendance.read",
  ATTENDANCE_WRITE = "admin.attendance.write",

  // Incidents
  INCIDENTS_READ = "admin.incidents.read",
  INCIDENTS_WRITE = "admin.incidents.write",

  // Reception mode
  RECEPTION_ACCESS = "admin.reception.access",

  // Feature-gated: Waitlist
  WAITLIST_MANAGE = "admin.waitlist.manage",

  // Feature-gated: Renewals
  RENEWALS_MANAGE = "admin.renewals.manage",

  // Feature-gated: Communications
  COMMUNICATIONS_MANAGE = "admin.communications.manage",

  // Feature-gated: Course Clone
  COURSE_CLONE_MANAGE = "admin.clone.manage",

  // Settings
  SETTINGS_READ = "admin.settings.read",
  SETTINGS_WRITE = "admin.settings.write",

  // Billing
  BILLING_MANAGE = "admin.billing.manage",

  // Receipts
  RECEIPTS_DOWNLOAD = "admin.receipts.download",
}

export type TenantRole = "owner" | "admin" | "staff";
export type OrganizationRole = "owner" | "admin" | "manager" | "member";

export interface PermissionContext {
  tenantRole: TenantRole;
  organizationRole?: OrganizationRole | null;
}

/**
 * Define which modules/pages are accessible by each role.
 * Used for sidebar filtering and route protection.
 */
export const MODULE_PERMISSIONS: Record<TenantRole, string[]> = {
  owner: [
    "dashboard",
    "students",
    "form-builder",
    "enrollments",
    "classes",
    "schedule",
    "teachers",
    "rooms",
    "reception",
    "branches",
    "payments",
    "economia",
    "pricing",
    "communications",
    "waitlist",
    "renewals",
    "course-clone",
    "events",
    "school-portal",
    "website",
    "organization-access",
    "analytics",
    "settings",
  ],
  admin: [
    "dashboard",
    "students",
    "form-builder",
    "enrollments",
    "classes",
    "schedule",
    "teachers",
    "rooms",
    "reception",
    "branches",
    "payments",
    "economia",
    "pricing",
    "communications",
    "waitlist",
    "renewals",
    "course-clone",
    "events",
    "school-portal",
    "website",
    "organization-access",
    "analytics",
    "settings",
  ],
  staff: [
    "dashboard",
    "students",
    "enrollments",
    "classes",
    "schedule",
    "teachers",
    "reception",
    "payments",
    "events",
    // No: form-builder, communications, waitlist, renewals, course-clone, branches, organization-access, analytics, settings
  ],
};
