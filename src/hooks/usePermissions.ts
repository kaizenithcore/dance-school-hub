import { useAuth } from "@/contexts/AuthContext";
import type { Permission, PermissionContext, TenantRole, OrganizationRole } from "@/lib/types/permissions";
import { MODULE_PERMISSIONS } from "@/lib/types/permissions";

/**
 * Frontend RBAC hook
 * Provides permission checking based on current user's role
 */
export function usePermissions() {
  const { authContext } = useAuth();
  const role = authContext?.tenant?.role || "staff";
  const organizationRole = authContext?.tenant?.organizationRole || null;

  const permissionContext: PermissionContext = {
    tenantRole: role as TenantRole,
    organizationRole: organizationRole as OrganizationRole | null,
  };

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: Permission): boolean => {
    return checkPermissionFrontend(permissionContext, permission);
  };

  /**
   * Check if user can view a module
   */
  const canView = (module: string): boolean => {
    const accessibleModules = MODULE_PERMISSIONS[role as TenantRole] || [];
    return accessibleModules.includes(module);
  };

  /**
   * Check if user is a specific role
   */
  const isRole = (targetRole: TenantRole): boolean => {
    return role === targetRole;
  };

  /**
   * Check if user is owner or admin
   */
  const isAdmin = (): boolean => {
    return role === "owner" || role === "admin";
  };

  /**
   * Check if user is owner
   */
  const isOwner = (): boolean => {
    return role === "owner";
  };

  return {
    role: role as TenantRole,
    organizationRole,
    hasPermission,
    canView,
    isRole,
    isAdmin,
    isOwner,
  };
}

/**
 * Simple frontend permission matrix check
 * Mirrors backend logic for immediate UI decisions
 * Note: Real authorization always happens on backend
 */
function checkPermissionFrontend(context: PermissionContext, permission: Permission): boolean {
  const { tenantRole, organizationRole } = context;

  // Owner has all permissions
  if (tenantRole === "owner") {
    return true;
  }

  // Admin has all permissions except some org-level ones
  if (tenantRole === "admin") {
    return true;
  }

  // Staff has limited permissions
  if (tenantRole === "staff") {
    // Staff can read students, classes, schedule
    if (
      permission ===  "admin.students.read" ||
      permission === "admin.classes.read" ||
      permission === "admin.schedule.read" ||
      permission === "admin.attendance.read" ||
      permission === "admin.attendance.write" ||
      permission === "admin.incidents.read" ||
      permission === "admin.incidents.write" ||
      permission === "admin.reception.access" ||
      permission === "admin.enrollments.read" ||
      permission === "admin.receipts.download"
    ) {
      return true;
    }
    return false;
  }

  return false;
}
