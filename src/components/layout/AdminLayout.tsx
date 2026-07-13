/**
 * AdminLayout — thin shell that composes the admin frame.
 *
 * Responsibilities:
 *   - Render AdminSidebar (left column)
 *   - Render Topbar (top of right column)
 *   - Delegate billing/trial/checkout logic to BillingShell
 *   - Delegate onboarding/section-intro/help logic to OnboardingShell
 *   - Offline banner is rendered by BillingShell via OfflineGuard
 *
 * ~80 lines. All substantive logic lives in the sub-shells.
 */
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BillingShell } from "@/components/layout/BillingShell";
import { OnboardingShell } from "@/components/layout/OnboardingShell";
import { AcademicYearProvider } from "@/contexts/AcademicYearContext";

export function AdminLayout() {
  return (
    <AcademicYearProvider>
      <div className="flex min-h-screen w-full">
        {/* Left sidebar */}
        <AdminSidebar />

        {/* Right column: topbar + main content area (managed by BillingShell) */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <BillingShell />
        </div>

        {/* Fixed overlays: section intros, welcome, help button, onboarding panel */}
        <OnboardingShell />
      </div>
    </AcademicYearProvider>
  );
}
