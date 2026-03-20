# Sprint 5 - Organization-Aware Permission Matrix

## Overview

Sprint 5 implements a centralized, organization-aware permission matrix that replaces scattered inline permission checks throughout the backend admin routes. This enables fine-grained control over which roles can perform which actions, considering both tenant role (legacy) and organization role (new).

## Problem Statement

**Before Sprint 5:**
- Permission checks were scattered across 60+ admin route handlers
- Each route had inline functions like `canManageClone()`, `canManageWaitlist()`, etc.
- Permission logic was duplicated across multiple files
- Only considered tenant role (`owner`, `admin`, `staff`)
- No support for organization-level roles (`manager`, `member`)
- Difficult to audit and maintain consistent permissions across the system

**After Sprint 5:**
- Single source of truth: `backend/lib/services/permissionService.ts`
- Organization role (`manager`, `member`) support built-in
- Centralized permission matrix accessible to all routes
- Consistent permission evaluation across the entire system
- Easy to audit, modify, and extend permission policies

## Permission Matrix

### Role Definitions

**Tenant Roles (Legacy):**
- `owner`: Full system access (all operations)
- `admin`: Administrative access (most operations except some sensitive settings)
- `staff`: Limited operational access (read-only, some write for their domain)
- `member`: Read-only access to basic resources

**Organization Roles (New):**
- `owner`: Full organizational control
- `admin`: Full administrative control within organization
- `manager`: Operational management (classes, students, schedules) but NOT sensitive operations
- `member`: Read-only access within organization

### Permission Types

```
"admin.classes.read"
"admin.classes write"
"admin.classes.delete"
"admin.teachers.read/write/delete"
"admin.rooms.read/write/delete"
"admin.students.read/write/delete"
"admin.enrollments.read/write/delete"
"admin.schedule.read/write"
"admin.attendance.read/write"
"admin.incidents.read/write"
"admin.reception.access"
"admin.waitlist.manage"
"admin.renewals.manage"
"admin.communications.manage"
"admin.clone.manage"
"admin.exams.manage"
"admin.settings.read/write"
"admin.billing.manage"
"admin.receipts.download"
```

### Matrix Summary

| Role               | Classes | Teachers | Students | Enrollments | Schedule | Attendance | Settings | Comms | Billing | Notes |
|-------------------|---------|----------|----------|------------|----------|--------------|----------|-------|---------|-------|
| owner (tenant)     | RWXD    | RWXD     | RWXD     | RWXD       | RW       | RW          | RW       | W     | W       | Full access |
| admin (tenant)     | RWXD    | RWXD     | RWXD     | RWXD       | RW       | RW          | RW       | W     | W       | Full access |
| admin (org)        | RWXD    | RWXD     | RWXD     | RWXD       | RW       | RW          | RW       | W     | W       | Full org control |
| manager (org)      | RWXD    | RWXD     | RWXD     | RWXD       | RW       | RW          | R        | X     | X       | Ops only, no settings/comms/billing |
| staff (tenant)     | R       | R        | R        | R          | R        | RW          | X        | X     | R       | Limited to ops |
| member (org)       | R       | R        | R        | R          | R        | X           | X        | X     | X       | Read-only |

Legend: R=Read, W=Write, X=Delete/Manage, D=Delete, X=Denied

## Usage

### Import the Permission Service

```typescript
import { permissionService, type CheckPermissionContext } from "@/lib/services/permissionService";
```

### Check Permissions in Route Handlers

**Recommended Pattern (Generic Permission Check):**
```typescript
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const auth = await requireAuth(request);

  if (!auth.authorized || !auth.context) {
    return auth.response;
  }

  // Check generic permission with context
  if (!permissionService.hasPermission({
    tenantRole: auth.context.role,
    organizationRole: auth.context.organizationRole,
  }, Permission.CLASSES_WRITE)) {
    return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
  }

  // Proceed with operation...
}
```

**Convenience Methods (Specific Actions):**
```typescript
// Course clone example
if (!permissionService.canManageCourseClone({
  tenantRole: auth.context.role,
  organizationRole: auth.context.organizationRole,
})) {
  return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
}

// Communications example
if (!permissionService.canManageCommunications({
  tenantRole: auth.context.role,
  organizationRole: auth.context.organizationRole,
})) {
  return fail({ code: "forbidden", message: "Insufficient permissions" }, 403, origin);
}
```

### Get All Permissions for a Role

```typescript
const permissions = permissionService.getPermissions({
  tenantRole: auth.context.role,
  organizationRole: auth.context.organizationRole,
});

// permissions is an array of Permission enums
console.log(permissions); // [Permission.CLASSES_READ, Permission.CLASSES_WRITE, ...]
```

## Implementation Details

### Context-Aware Evaluation

The permission service evaluates permissions based on a `CheckPermissionContext`:

```typescript
interface CheckPermissionContext {
  tenantRole: TenantRole;        // Required: user's tenant role
  organizationRole?: OrganizationRole | null;  // Optional: user's org role
}
```

**Lookup Order:**
1. If `organizationRole` is present, check `tenor_role_organizationRole_key` in matrix
2. If no match or no `organizationRole`, fall back to `tenantRole_null` key
3. This allows organization roles to enhance permissions over base tenant role

### Flow Example

**User has: tenant_role = admin, organization_role = manager**

For `canManageCommunications()`:
1. Check key `"admin_manager"` → Not in matrix, fall back
2. Check key `"admin_null"` → Has `COMMUNICATIONS_MANAGE` → ✅ Allowed

**User has: tenant_role = staff, organization_role = null**

For `canManageCourseClone()`:
1. Check key `"staff_null"` → No `COURSE_CLONE_MANAGE` → ❌ Denied

## File Structure

**Created:**
- `backend/lib/services/permissionService.ts` - Core permission service (550 lines)

**Modified:**
- 20+ admin route files to use centralized service
- All 60+ permission checks converted from inline to service calls

**Removed:**
- 15+ inline permission check functions across routes

## Migration Path

If you're adding a new admin feature or modifying an existing one:

**Old Way (❌ Don't do this):**
```typescript
function canManageMyFeature(role: string) {
  return role === "owner" || role === "admin";
}

if (!canManageMyFeature(auth.context.role)) {
  return fail(...);
}
```

**New Way (✅ Do this):**
1. Add permission type to `Permission` enum:
   ```typescript
   MY_FEATURE_MANAGE = "admin.myfeature.manage",
   ```

2. Add role entries to `PERMISSION_MATRIX`:
   ```typescript
   "admin_null": [..., Permission.MY_FEATURE_MANAGE, ...],
   "owner_owner": [..., Permission.MY_FEATURE_MANAGE, ...],
   // Add for all applicable role combinations
   ```

3. Use in route:
   ```typescript
   if (!permissionService.hasPermission({
     tenantRole: auth.context.role,
     organizationRole: auth.context.organizationRole,
   }, Permission.MY_FEATURE_MANAGE)) {
     return fail(...);
   }
   ```

## Testing

### Permission Scenarios to Verify

1. **Owner (tenant) can do everything**
   - All operations should be allowed

2. **Admin (org) can manage core operations but not sensitive settings**
   - Can: classes, teachers, students, schedule, enrollments, attendance
   - Cannot: settings write, communications, billing, course clone

3. **Manager (org) can manage operations but not sensitive features**
   - Can: classes, schedule, students, enrollments, incidents
   - Cannot: settings, communications, billing, attachments, exams
   - Can: downloads (read-only access to receipts)

4. **Staff (tenant) has limited access**
   - Can: read classes/schedule, write incidents/attendance, access reception
   - Cannot: delete anything, manage settings or sensitive operations

5. **Member (org) is read-only**
   - Can: read schedules, read enrollments, read classes
   - Cannot: write/modify any operations

### Smoke Test Commands

```bash
# Verify TypeScript compilation
npm run typecheck

# Run specific route tests if available
npm run test -- api/admin/course-clone

# Start dev server and test endpoints
npm run dev
```

## Backward Compatibility

- Tenant role permission checks work exactly as before
- Existing users without `organizationRole` continue to work (falls back to tenant role)
- New organization-aware features don't break old implementations
- Manager role maps to admin-level access for safety in mixed deployments

## Future Enhancements

1. **Fine-grained action-level permissions**
   - Support for custom role definitions (Pro/Enterprise)
   - Example: "allow manager to read billing but not modify"

2. **Audit logging**
   - Log every permission check in sensitive operations
   - Track which role attempted which action

3. **Permission inheritance**
   - Define role hierarchies (manager inherits some admin permissions)
   - Reduce permission matrix duplication

4. **Conditional permissions**
   - Allow permissions based on tenant settings or feature flags
   - Example: "manager-read-settings if feature X is enabled"

5. **UI-level permission checking**
   - Export permission matrix to frontend
   - Hide UI elements based on user permissions

## Troubleshooting

### Permission Denied on Expected Action

**Debug steps:**
1. Check `auth.context.role` and `auth.context.organizationRole` values in request
2. Verify role values match enum types exactly
3. Look up role combination in `PERMISSION_MATRIX`
4. Confirm permission is in the array for that role

**Common Issue:** Using `null` instead of `undefined` for missing organization role
```typescript
// ❌ Wrong - will not find matrix key
organizationRole: null

// ✅ Correct
organizationRole: undefined // or simply omit
```

### Adding New Permission Type

When adding a new feature that needs permission control:

1. Add to `Permission` enum
2. Update `PERMISSION_MATRIX` with entries for each applicable role
3. Use `permissionService.hasPermission()` or specific convenience method
4. Add corresponding convenience method if frequently used
5. Document in this file

## See Also

- [Authentication Documentation](./auth-notes.md)
- [Organization Infrastructure](./organizations-auth-foundation.md)
- [TenantContext Type Definition](../types/domain.ts)

---

**Sprint 5 Complete:** Organization-aware permission matrix fully functional across 60+ admin routes.
