# RBAC Implementation Guide

## Overview

This guide documents the Role-Based Access Control (RBAC) system implemented across the dance-school-hub application. The system operates at three layers: **backend authorization**, **database row-level security (RLS)**, and **frontend visibility control**.

## Architecture

### 1. Backend Authorization (`/backend/lib/services/permissionService.ts`)

The backend defines a comprehensive permission matrix that maps combinations of tenant roles and organization roles to specific permissions.

**Tenant Roles:**
- `owner` - Full access to all features
- `admin` - Administrative access to most features
- `staff` - Limited access to core operations

**Organization Roles:**
- `owner` - Organization owner (full access)
- `admin` - Organization administrator
- `manager` - Department/team manager (limited)
- `member` - Standard member

**Key Functions:**
```typescript
// Included in backend permissionService:
- Permission enum (31 specific permissions for different modules)
- PERMISSION_MATRIX: Maps (tenantRole, organizationRole) → Permission[]
- checkPermission(tenantRole, organizationRole, permission): boolean
- filterPermissions(tenantRole, organizationRole): Permission[]
```

### 2. Frontend Permission Layer

#### Types: `/src/lib/types/permissions.ts`
- **Permission Enum**: Mirrors backend permissions (31 values)
- **TenantRole Type**: "owner" | "admin" | "staff" | "examiner"
- **OrganizationRole Type**: "owner" | "admin" | "manager" | "member"
- **MODULE_PERMISSIONS Mapping**: Defines which modules each tenant role can access

```typescript
MODULE_PERMISSIONS: {
  owner: [24 modules - all features],
  admin: [24 modules - all features],
  staff: [9 core modules - students, enrollments, classes, schedule, teachers, reception, payments, events, dashboard],
  examiner: [5 modules - exams, schedule, students, results, dashboard]
}
```

#### Hook: `/src/hooks/usePermissions.ts`
Provides permission checks in React components:

```typescript
const { 
  role,                    // Current tenant role (owner|admin|staff|examiner)
  organizationRole,        // Current organization role
  canView(module),         // Check if user can view a module
  hasPermission(perm),     // Check specific permission
  isRole(role),            // Check if user has a role
  isAdmin(),               // Shortcut: is owner or admin
  isOwner()                // Shortcut: is owner
} = usePermissions();
```

#### Component: `/src/components/layout/ProtectedRoute.tsx`
Wraps pages to enforce module-level access:

```typescript
<ProtectedRoute module="payments" fallback="redirect">
  <PaymentsPage />
</ProtectedRoute>
```

**Props:**
- `module`: Module identifier (string) - checked against MODULE_PERMISSIONS
- `fallback`: "redirect" (to /admin) or "message" (shows access denied card)
- `children`: Page component to protect

### 3. Frontend UI Integration

#### AdminSidebar Auto-Filtering
The sidebar automatically filters navigation items based on:
1. **Feature Access**: Plan-based gates (waitlistAutomation, examSuite, etc.)
2. **Role Access**: RBAC via MODULE_PERMISSIONS

```typescript
// Each nav item now includes module identifier
{ 
  title: "Pagos", 
  url: "/admin/payments", 
  icon: CreditCard, 
  module: "payments"  // ← Used for RBAC filtering
}

// Sidebar filters: item shown if user has BOTH feature AND role access
const canAccess = canViewItem(item) 
  // → (no featureKey OR feature available) AND (no module OR role allows)
```

## Implementation Reference

### How RBAC Flows Through the App

#### Staff User Flow:
1. **Backend**: User authenticated with `tenantRole: "staff"`
2. **Frontend**: AuthContext provides this role to all components
3. **Sidebar**: Staff sees 9 modules (no Analíticas, Configuración, Billing, etc.)
4. **Navigation**: URLs for unavailable modules still work if typed directly, but:
   - ProtectedRoute shows access denied card
   - Pages can check `canView("analytics")` and redirect
5. **API**: Staff requests are validated by backend permissionService on each endpoint

#### Owner User Flow:
1. **Backend**: User authenticated with `tenantRole: "owner"`
2. **Frontend**: AuthContext provides this role
3. **Sidebar**: Owner sees all 24 modules
4. **Navigation**: All features accessible
5. **API**: Backend enforces owner-level permissions on all endpoints

### Permission Check Examples

**In Components:**
```typescript
import { usePermissions } from "@/hooks/usePermissions";

export function PaymentsPage() {
  const { canView, isAdmin } = usePermissions();
  
  if (!canView("payments")) {
    return <AccessDenied />;
  }
  
  if (isAdmin()) {
    // Show additional options for admins
  }
}
```

**In Routes:**
```typescript
<ProtectedRoute module="analytics" fallback="redirect">
  <AnalyticsPage />
</ProtectedRoute>
```

**Backend Validation:**
```typescript
// In API route (e.g., POST /api/payments)
import { requireAuth } from "@/lib/auth/requireAuth";

export async function POST(request: NextRequest) {
  const { authContext, user } = await requireAuth(request);
  
  // Check permission using backend permissionService
  if (!permissionService.checkPermission(
    authContext.tenant.role,
    authContext.tenant.organizationRole,
    Permission.PAYMENTS_MANAGE
  )) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  // Process payment...
}
```

## Dual-Layer Security Model

### Frontend Layer (UI Visibility)
- **Purpose**: Improve UX by hiding inaccessible features
- **Not Security**: Easy to bypass (browser dev tools)
- **Implementation**: usePermissions hook, ProtectedRoute component, AdminSidebar filtering
- **Responsibility**: Display only relevant options per role

### Backend Layer (Real Authorization)
- **Purpose**: Enforce actual authorization on all requests
- **Secure**: Cannot be bypassed from client
- **Implementation**: permissionService checks in API routes + RLS policies
- **Responsibility**: Validate every request, return 403 Forbidden if unauthorized

### Database Layer (RLS Policies)
- **Purpose**: Prevent SQL injection / direct DB access
- **Secure**: Enforced at Postgres level
- **Implementation**: Row-level security policies in Supabase
- **Responsibility**: Ensure users only see/modify their own data

## Module Mapping

Current module identifiers (used in MODULE_PERMISSIONS and ProtectedRoute):

| Module | Pages | Accessible By |
|--------|-------|---|
| dashboard | /admin | owner, admin, staff, examiner |
| students | /admin/students | owner, admin, staff, examiner |
| form-builder | /admin/form-builder | owner, admin, staff |
| enrollments | /admin/enrollments | owner, admin, staff |
| classes | /admin/classes | owner, admin, staff |
| schedule | /admin/schedule | owner, admin, staff, examiner |
| teachers | /admin/teachers | owner, admin, staff |
| rooms | /admin/rooms | owner, admin, staff |
| reception | /admin/reception | owner, admin, staff |
| branches | /admin/branches | owner, admin, examiner |
| payments | /admin/payments | owner, admin, staff |
| economia | /admin/economia | owner, admin |
| pricing | /admin/pricing | owner, admin |
| communications | /admin/communications | owner, admin, staff |
| waitlist | /admin/waitlist | owner, admin, staff |
| renewals | /admin/renewals | owner, admin, staff |
| course-clone | /admin/course-clone | owner, admin, staff |
| exams | /admin/exams | owner, admin, examiner |
| events | /admin/events | owner, admin, staff |
| school-portal | /admin/school/portal | owner, admin |
| website | /admin/website | owner, admin |
| organization-access | /admin/organization-access | owner, admin |
| analytics | /admin/analytics | owner, admin |
| settings | /admin/settings | owner, admin |

## Integration Checklist

- [x] Backend: Permission enum and permission matrix (existing)
- [x] Frontend: Permission types and MODULE_PERMISSIONS mapping
- [x] Frontend: usePermissions hook for component checks
- [x] Frontend: ProtectedRoute wrapper component
- [x] Frontend: AdminSidebar integration (both feature + role filtering)
- [ ] Frontend: Wrap critical pages with ProtectedRoute
- [ ] Frontend: Create role-specific dashboard templates
- [ ] Backend: Add permission checks to all API endpoints
- [ ] Database: Verify RLS policies match backend authorization
- [ ] Test: Verify staff role cannot access admin-only features
- [ ] Test: Verify frontend and backend authorization are consistent

## Future Enhancements

1. **Custom Roles** (Enterprise): Allow organizations to define custom roles with custom permission sets
2. **Fine-grained Permissions**: Break down modules into sub-permissions (e.g., STUDENTS_READ vs STUDENTS_WRITE)
3. **Audit Trail**: Log all permission checks and access attempts
4. **Permission Delegation**: Allow admins to grant specific permissions to users
5. **Time-based Access**: Temporary access grants that expire
6. **Scope Filtering**: Staff see only data for their branch/group (tenant_id, branch_id filtering in RLS)

## Troubleshooting

**Issue: Staff can access admin-only page by typing URL**
- **Root**: Frontend ProtectedRoute not wrapping the page
- **Fix**: Add ProtectedRoute wrapper or check canView() in page component

**Issue: User roles don't match between frontend and backend**
- **Root**: AuthContext update lag or backend permission matrix inconsistency
- **Fix**: Verify authContext.tenant.role is synchronized with backend permissionService.checkPermission()

**Issue: RLS policies prevent legitimate staff access**
- **Root**: RLS policies more restrictive than backend permission matrix
- **Fix**: Ensure RLS policies match backend PERMISSION_MATRIX logic (e.g., if backend allows, RLS should allow)

## Security Notes

1. **Never trust frontend checks**: Always validate permissions on the backend
2. **RLS + Backend + Frontend**: All three layers should be consistent for best security
3. **Permission changes**: When updating PERMISSION_MATRIX, update all three layers:
   - Backend permissionService.ts (source of truth)
   - Frontend MODULE_PERMISSIONS in permissions.ts 
   - Database RLS policies in Supabase
4. **Audit access attempts**: Log failed permission checks for security monitoring
