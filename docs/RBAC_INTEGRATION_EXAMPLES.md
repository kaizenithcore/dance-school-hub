// Example: Integrating RBAC into Pages

// ============================================================================
// PATTERN 1: Wrap entire page with ProtectedRoute (Simplest)
// ============================================================================

// File: src/pages/admin/PaymentsPage.tsx
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { PaymentsContent } from "@/components/payments/PaymentsContent";

export default function PaymentsPage() {
  return (
    <ProtectedRoute module="payments" fallback="message">
      <PaymentsContent />
    </ProtectedRoute>
  );
}

// ============================================================================
// PATTERN 2: Conditionally render content based on permissions (Flexible)
// ============================================================================

// File: src/pages/admin/DashboardPage.tsx
import { usePermissions } from "@/hooks/usePermissions";
import { DashboardOwner } from "@/components/dashboard/DashboardOwner";
import { DashboardAdmin } from "@/components/dashboard/DashboardAdmin";
import { DashboardStaff } from "@/components/dashboard/DashboardStaff";
import { AccessDenied } from "@/components/feedback/AccessDenied";

export default function DashboardPage() {
  const { canView, isOwner, isAdmin } = usePermissions();

  if (!canView("dashboard")) {
    return <AccessDenied module="dashboard" />;
  }

  // Show different dashboard per role
  if (isOwner()) return <DashboardOwner />;
  if (isAdmin()) return <DashboardAdmin />;
  return <DashboardStaff />; // Default for staff/examiner roles
}

// ============================================================================
// PATTERN 3: Conditionally show/hide sections (Granular)
// ============================================================================

// File: src/pages/admin/AnalyticsPage.tsx
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { AnalyticsMetrics } from "@/components/analytics/Metrics";
import { AnalyticsDetails } from "@/components/analytics/Details";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

export default function AnalyticsPage() {
  const { isAdmin, isOwner } = usePermissions();

  return (
    <ProtectedRoute module="analytics" fallback="redirect">
      <div className="space-y-6">
        {/* Core metrics - everyone sees */}
        <AnalyticsMetrics />

        {/* Revenue breakdown - admin+ only */}
        {(isAdmin() || isOwner()) && (
          <Card>
            <RevenueChart />
          </Card>
        )}

        {/* Detailed reports - owner only */}
        {isOwner() && (
          <Card>
            <AnalyticsDetails />
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}

// ============================================================================
// PATTERN 4: Form actions conditional on permissions (Specific permissions)
// ============================================================================

// File: src/components/receipts/ReceiptsTable.tsx
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";

export function ReceiptsTable({ receipts }: Props) {
  const { hasPermission } = usePermissions();
  const canDownload = hasPermission("RECEIPTS_DOWNLOAD");

  return (
    <table>
      <tbody>
        {receipts.map((receipt) => (
          <tr key={receipt.id}>
            <td>{receipt.date}</td>
            <td>{receipt.student}</td>
            <td>
              {/* Only show download button if permission */}
              {canDownload && (
                <Button 
                  variation="ghost" 
                  size="sm"
                  onClick={() => downloadReceipt(receipt.id)}
                >
                  Descargar
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ============================================================================
// PATTERN 5: Route component wrapper (App-level integration)
// ============================================================================

// File: src/App.tsx (or your router setup)
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import PaymentsPage from "@/pages/admin/PaymentsPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";

export const routes = [
  // Basic pages (no RBAC wrapper needed - sidebar already filters)
  { path: "/admin", element: <DashboardPage /> },
  
  // Protected pages (wrap for extra security)
  {
    path: "/admin/payments",
    element: (
      <ProtectedRoute module="payments" fallback="redirect">
        <PaymentsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin/analytics",
    element: (
      <ProtectedRoute module="analytics" fallback="redirect">
        <AnalyticsPage />
      </ProtectedRoute>
    ),
  },
];

// ============================================================================
// PATTERN 6: API layer - backend permission checks (CRITICAL)
// ============================================================================

// File: backend/app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { permissionService, Permission } from "@/lib/services/permissionService";

export async function GET(request: NextRequest) {
  // 1. Authenticate user
  const { authContext, user } = await requireAuth(request);
  
  // 2. Check permission (BACKEND AUTHORIZATION - CRITICAL)
  const hasPermission = permissionService.checkPermission(
    authContext.tenant.role,
    authContext.tenant.organizationRole,
    Permission.PAYMENTS_READ
  );

  if (!hasPermission) {
    console.warn(`Unauthorized: ${user.id} attempted to read payments`);
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // 3. Return data filtered by tenant (RLS already filters at DB level)
  const payments = await db.query(
    "SELECT * FROM payments WHERE tenant_id = $1",
    [authContext.tenant.id]
  );

  return NextResponse.json(payments);
}

export async function POST(request: NextRequest) {
  const { authContext, user } = await requireAuth(request);
  
  // Check WRITE permission (stricter than READ)
  const hasPermission = permissionService.checkPermission(
    authContext.tenant.role,
    authContext.tenant.organizationRole,
    Permission.PAYMENTS_MANAGE
  );

  if (!hasPermission) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Process payment creation...
}

// ============================================================================
// MIGRATION GUIDE: Updating Existing Pages
// ============================================================================

// BEFORE (current state):
function OldPaymentsPage() {
  return (
    <PageContainer title="Pagos">
      <PaymentsContent />
    </PageContainer>
  );
}

// AFTER (with RBAC):
function NewPaymentsPage() {
  return (
    <ProtectedRoute module="payments" fallback="message">
      <PageContainer title="Pagos">
        <PaymentsContent />
      </PageContainer>
    </ProtectedRoute>
  );
}

// TODO: Apply this pattern to all pages in src/pages/admin/*:
// 1. DashboardPage (or create multiple dashboards per role)
// 2. AnalyticsPage
// 3. SettingsPage
// 4. ReceiptsPage (if exists)
// 5. BillingPage (if exists)
// And all other pages that need role filtering

// ============================================================================
// TESTING: Verify RBAC Works
// ============================================================================

// Test 1: Staff cannot see admin-only nav items
// - Login as staff
// - Verify "Configuración", "Analíticas", "Economía" NOT in sidebar
// ✓ Staff sidebar shows only 9 modules

// Test 2: Staff cannot access admin-only routes
// - Login as staff
// - Type /admin/analytics in URL bar
// - Expect "Acceso denegado" message or redirect to /admin
// ✓ ProtectedRoute component displays access denied

// Test 3: Backend blocks staff analytics API call
// - Login as staff
// - Open DevTools, manually call GET /api/analytics
// - Expect 403 Forbidden response
// ✓ Backend permissionService rejects unpermitted role

// Test 4: Owner sees all navigation
// - Login as owner
// - Verify all 24 modules appear in sidebar
// ✓ Owner sidebar shows all modules

// Test 5: Role-specific dashboards
// - Login as staff
// - Dashboard shows staff-only view (activity, recent events)
// - No KPIs or financial metrics visible
// ✓ DashboardStaff component rendered

// Test 6: Admin sees everything
// - Login as admin
// - Verify can access all routes
// - Verify can see all nav items
// - Verify all API calls succeed
// ✓ Full access for admin role
