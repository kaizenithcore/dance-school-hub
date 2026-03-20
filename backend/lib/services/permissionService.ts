import { TenantRole, OrganizationRole } from "@/types/domain";

/**
 * Permission actions defined across the system.
 * Format: "resource.operation" or "resource.action"
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

  // Feature-gated: Exams
  EXAMS_MANAGE = "admin.exams.manage",

  // Settings
  SETTINGS_READ = "admin.settings.read",
  SETTINGS_WRITE = "admin.settings.write",

  // Billing
  BILLING_MANAGE = "admin.billing.manage",

  // Receipts
  RECEIPTS_DOWNLOAD = "admin.receipts.download",
}

/**
 * Permission matrix: defines what each role can do.
 * Structure: {tenantRole_organizationRole: [Permission[]]}
 * 
 * Roles are matched by tenant role first, then organization role for enhancements.
 * If no organization role context exists, pure tenant role permissions apply.
 * If both exist, the most permissive combination is used.
 */
const PERMISSION_MATRIX: Record<string, Permission[]> = {
  // OWNER roles: Full access
  "owner_null": [
    Permission.CLASSES_READ,
    Permission.CLASSES_WRITE,
    Permission.CLASSES_DELETE,
    Permission.TEACHERS_READ,
    Permission.TEACHERS_WRITE,
    Permission.TEACHERS_DELETE,
    Permission.ROOMS_READ,
    Permission.ROOMS_WRITE,
    Permission.ROOMS_DELETE,
    Permission.STUDENTS_READ,
    Permission.STUDENTS_WRITE,
    Permission.STUDENTS_DELETE,
    Permission.ENROLLMENTS_READ,
    Permission.ENROLLMENTS_WRITE,
    Permission.ENROLLMENTS_DELETE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_WRITE,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.INCIDENTS_READ,
    Permission.INCIDENTS_WRITE,
    Permission.RECEPTION_ACCESS,
    Permission.WAITLIST_MANAGE,
    Permission.RENEWALS_MANAGE,
    Permission.COMMUNICATIONS_MANAGE,
    Permission.COURSE_CLONE_MANAGE,
    Permission.EXAMS_MANAGE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
    Permission.BILLING_MANAGE,
    Permission.RECEIPTS_DOWNLOAD,
  ],
  "owner_owner": [
    Permission.CLASSES_READ,
    Permission.CLASSES_WRITE,
    Permission.CLASSES_DELETE,
    Permission.TEACHERS_READ,
    Permission.TEACHERS_WRITE,
    Permission.TEACHERS_DELETE,
    Permission.ROOMS_READ,
    Permission.ROOMS_WRITE,
    Permission.ROOMS_DELETE,
    Permission.STUDENTS_READ,
    Permission.STUDENTS_WRITE,
    Permission.STUDENTS_DELETE,
    Permission.ENROLLMENTS_READ,
    Permission.ENROLLMENTS_WRITE,
    Permission.ENROLLMENTS_DELETE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_WRITE,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.INCIDENTS_READ,
    Permission.INCIDENTS_WRITE,
    Permission.RECEPTION_ACCESS,
    Permission.WAITLIST_MANAGE,
    Permission.RENEWALS_MANAGE,
    Permission.COMMUNICATIONS_MANAGE,
    Permission.COURSE_CLONE_MANAGE,
    Permission.EXAMS_MANAGE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
    Permission.BILLING_MANAGE,
    Permission.RECEIPTS_DOWNLOAD,
  ],

  // ADMIN roles: Most access, limited on sensitive settings
  "admin_null": [
    Permission.CLASSES_READ,
    Permission.CLASSES_WRITE,
    Permission.CLASSES_DELETE,
    Permission.TEACHERS_READ,
    Permission.TEACHERS_WRITE,
    Permission.TEACHERS_DELETE,
    Permission.ROOMS_READ,
    Permission.ROOMS_WRITE,
    Permission.ROOMS_DELETE,
    Permission.STUDENTS_READ,
    Permission.STUDENTS_WRITE,
    Permission.STUDENTS_DELETE,
    Permission.ENROLLMENTS_READ,
    Permission.ENROLLMENTS_WRITE,
    Permission.ENROLLMENTS_DELETE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_WRITE,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.INCIDENTS_READ,
    Permission.INCIDENTS_WRITE,
    Permission.RECEPTION_ACCESS,
    Permission.WAITLIST_MANAGE,
    Permission.RENEWALS_MANAGE,
    Permission.COMMUNICATIONS_MANAGE,
    Permission.COURSE_CLONE_MANAGE,
    Permission.EXAMS_MANAGE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
    Permission.BILLING_MANAGE,
    Permission.RECEIPTS_DOWNLOAD,
  ],
  "admin_admin": [
    Permission.CLASSES_READ,
    Permission.CLASSES_WRITE,
    Permission.CLASSES_DELETE,
    Permission.TEACHERS_READ,
    Permission.TEACHERS_WRITE,
    Permission.TEACHERS_DELETE,
    Permission.ROOMS_READ,
    Permission.ROOMS_WRITE,
    Permission.ROOMS_DELETE,
    Permission.STUDENTS_READ,
    Permission.STUDENTS_WRITE,
    Permission.STUDENTS_DELETE,
    Permission.ENROLLMENTS_READ,
    Permission.ENROLLMENTS_WRITE,
    Permission.ENROLLMENTS_DELETE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_WRITE,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.INCIDENTS_READ,
    Permission.INCIDENTS_WRITE,
    Permission.RECEPTION_ACCESS,
    Permission.WAITLIST_MANAGE,
    Permission.RENEWALS_MANAGE,
    Permission.COMMUNICATIONS_MANAGE,
    Permission.COURSE_CLONE_MANAGE,
    Permission.EXAMS_MANAGE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
    Permission.BILLING_MANAGE,
    Permission.RECEIPTS_DOWNLOAD,
  ],

  // MANAGER role (org): Core operations only, no communications/settings
  "admin_manager": [
    Permission.CLASSES_READ,
    Permission.CLASSES_WRITE,
    Permission.CLASSES_DELETE,
    Permission.TEACHERS_READ,
    Permission.TEACHERS_WRITE,
    Permission.TEACHERS_DELETE,
    Permission.ROOMS_READ,
    Permission.ROOMS_WRITE,
    Permission.ROOMS_DELETE,
    Permission.STUDENTS_READ,
    Permission.STUDENTS_WRITE,
    Permission.STUDENTS_DELETE,
    Permission.ENROLLMENTS_READ,
    Permission.ENROLLMENTS_WRITE,
    Permission.ENROLLMENTS_DELETE,
    Permission.SCHEDULE_READ,
    Permission.SCHEDULE_WRITE,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.INCIDENTS_READ,
    Permission.INCIDENTS_WRITE,
    Permission.RECEPTION_ACCESS,
    Permission.WAITLIST_MANAGE,
    Permission.RENEWALS_MANAGE,
    Permission.EXAMS_MANAGE,
    // DENIED: Permission.COMMUNICATIONS_MANAGE (reserved for owner/admin)
    // DENIED: Permission.COURSE_CLONE_MANAGE (reserved for owner/admin)
    // DENIED: Permission.SETTINGS_WRITE (reserved for owner/admin)
    Permission.SETTINGS_READ,
    // DENIED: Permission.BILLING_MANAGE (reserved for owner/admin)
    Permission.RECEIPTS_DOWNLOAD,
  ],

  // STAFF role (tenant): Operational access only
  "staff_null": [
    Permission.STUDENTS_READ,
    Permission.CLASSES_READ,
    Permission.SCHEDULE_READ,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_WRITE,
    Permission.INCIDENTS_READ,
    Permission.INCIDENTS_WRITE,
    Permission.RECEPTION_ACCESS,
    Permission.ENROLLMENTS_READ,
    Permission.RECEIPTS_DOWNLOAD,
  ],

  // MEMBER role (org): Read-only access
  "member_null": [
    Permission.CLASSES_READ,
    Permission.SCHEDULE_READ,
    Permission.ENROLLMENTS_READ,
  ],
  "member_member": [
    Permission.CLASSES_READ,
    Permission.SCHEDULE_READ,
    Permission.ENROLLMENTS_READ,
  ],
};

export interface CheckPermissionContext {
  tenantRole: TenantRole;
  organizationRole?: OrganizationRole | null;
}

/**
 * Permission service for centralized authorization checks.
 * Evaluates tenant role + organization role to determine permissions.
 */
export const permissionService = {
  /**
   * Check if a role combination has a specific permission.
   */
  hasPermission(context: CheckPermissionContext, permission: Permission): boolean {
    const { tenantRole, organizationRole } = context;

    // Build matrix keys to check (most specific first)
    const keysToCheck: string[] = [];

    // 1. Try tenant_org combination
    if (organizationRole) {
      keysToCheck.push(`${tenantRole}_${organizationRole}`);
    }

    // 2. Fall back to tenant_null
    keysToCheck.push(`${tenantRole}_null`);

    // Check each key in order
    for (const key of keysToCheck) {
      const permissions = PERMISSION_MATRIX[key];
      if (permissions && permissions.includes(permission)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Get all permissions for a role combination.
   */
  getPermissions(context: CheckPermissionContext): Permission[] {
    const { tenantRole, organizationRole } = context;

    // Try most specific first
    if (organizationRole) {
      const key = `${tenantRole}_${organizationRole}`;
      if (PERMISSION_MATRIX[key]) {
        return PERMISSION_MATRIX[key];
      }
    }

    // Fall back to tenant_null
    const key = `${tenantRole}_null`;
    return PERMISSION_MATRIX[key] || [];
  },

  /**
   * Check if user can manage a resource (write/delete).
   * Common convenience methods for refactoring inline checks.
   */
  canManageClasses(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.CLASSES_WRITE);
  },

  canManageTeachers(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.TEACHERS_WRITE);
  },

  canManageRooms(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.ROOMS_WRITE);
  },

  canManageStudents(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.STUDENTS_WRITE);
  },

  canManageEnrollments(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.ENROLLMENTS_WRITE);
  },

  canManageSchedule(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.SCHEDULE_WRITE);
  },

  canManageAttendance(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.ATTENDANCE_WRITE);
  },

  canManageIncidents(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.INCIDENTS_WRITE);
  },

  canAccessReception(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.RECEPTION_ACCESS);
  },

  canManageWaitlist(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.WAITLIST_MANAGE);
  },

  canManageRenewals(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.RENEWALS_MANAGE);
  },

  canManageCommunications(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.COMMUNICATIONS_MANAGE);
  },

  canManageCourseClone(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.COURSE_CLONE_MANAGE);
  },

  canManageExams(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.EXAMS_MANAGE);
  },

  canManageSettings(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.SETTINGS_WRITE);
  },

  canManageBilling(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.BILLING_MANAGE);
  },

  canDownloadReceipts(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.RECEIPTS_DOWNLOAD);
  },

  canReadClasses(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.CLASSES_READ);
  },

  canReadSchedule(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.SCHEDULE_READ);
  },

  canDownloadAttendance(context: CheckPermissionContext): boolean {
    return this.hasPermission(context, Permission.ATTENDANCE_READ);
  },
};
