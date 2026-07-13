import { Suspense, lazy, type ReactElement } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/providers/BrandingProvider";
import Index from "@/pages/Index";
import { CookieBanner } from "@/components/CookieBanner";

const AdminLayout = lazy(() => import("@/components/layout/AdminLayout").then((module) => ({ default: module.AdminLayout })));
const PublicLayout = lazy(() => import("@/components/layout/PublicLayout").then((module) => ({ default: module.PublicLayout })));

const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const SchedulePage = lazy(() => import("@/pages/admin/SchedulePage"));
const ClassesPage = lazy(() => import("@/pages/admin/ClassesPage"));
const RoomsPage = lazy(() => import("@/pages/admin/RoomsPage"));
const TeachersPage = lazy(() => import("@/pages/admin/TeachersPage"));
const EconomyPage = lazy(() => import("@/pages/admin/EconomyPage"));
const StudentsPage = lazy(() => import("@/pages/admin/StudentsPage"));
const ImportStudentsPage = lazy(() => import("@/pages/admin/ImportStudentsPage"));
const EnrollmentsPage = lazy(() => import("@/pages/admin/EnrollmentsPage"));
const PaymentsPage = lazy(() => import("@/pages/admin/PaymentsPage"));
const AnalyticsPage = lazy(() => import("@/pages/admin/AnalyticsPage"));
import ModuleDisabledPage from "@/pages/admin/ModuleDisabledPage";
const SettingsLayout = lazy(() => import("@/pages/admin/settings/SettingsLayout"));
const EscuelaPage = lazy(() => import("@/pages/admin/settings/EscuelaPage"));
const AgendaPage = lazy(() => import("@/pages/admin/settings/AgendaPage"));
const CobrosSettingsPage = lazy(() => import("@/pages/admin/settings/CobrosSettingsPage"));
const AvisosPage = lazy(() => import("@/pages/admin/settings/AvisosPage"));
const AccesoPage = lazy(() => import("@/pages/admin/settings/AccesoPage"));
const PlanPage = lazy(() => import("@/pages/admin/settings/PlanPage"));
const RecepcionPage = lazy(() => import("@/pages/admin/settings/RecepcionPage"));
const PaginaWebPage = lazy(() => import("@/pages/admin/settings/PaginaWebPage"));
const BrandingSettingsPage = lazy(() => import("@/pages/admin/BrandingSettingsPage"));
const FormBuilderPage = lazy(() => import("@/pages/admin/FormBuilderPage"));
const PricingManagement = lazy(() => import("@/pages/admin/PricingManagement").then((module) => ({ default: module.PricingManagement })));
const CommunicationsPage = lazy(() => import("@/pages/admin/CommunicationsPage"));
const WaitlistPage = lazy(() => import("@/pages/admin/WaitlistPage"));
const RenewalsPage = lazy(() => import("@/pages/admin/RenewalsPage"));
const CourseClonePage = lazy(() => import("@/pages/admin/CourseClonePage"));
const ReceptionPage = lazy(() => import("@/pages/admin/ReceptionPage"));
const EventsPage = lazy(() => import("@/pages/admin/EventsPage"));
const WebsitePage = lazy(() => import("@/pages/admin/WebsitePage"));
const SchoolPortalHubScreen = lazy(() => import("@/pages/admin/SchoolPortalHubScreen"));
const SchoolSettingsScreen = lazy(() => import("@/pages/admin/SchoolSettingsScreen"));
const SchoolAnalyticsScreen = lazy(() => import("@/pages/admin/SchoolAnalyticsScreen"));
const PostsManagementScreen = lazy(() => import("@/pages/admin/PostsManagementScreen"));
const AnnouncementsScreen = lazy(() => import("@/pages/admin/AnnouncementsScreen"));
const GalleryManagementScreen = lazy(() => import("@/pages/admin/GalleryManagementScreen"));

const SchoolLandingPage = lazy(() => import("@/pages/public/SchoolLandingPage"));
const EnrollPage = lazy(() => import("@/pages/public/EnrollPage"));
const FullSchedulePage = lazy(() => import("@/pages/public/FullSchedulePage"));
const StudentPortalLandingPage = lazy(() => import("@/pages/public/StudentPortalLandingPage"));

const LeadQualificationPage = lazy(() => import("@/pages/public/LeadQualificationPage"));
const LandingDemoPage = lazy(() => import("@/pages/public/LandingDemoPage"));
const RenewalResponsePage = lazy(() => import("@/pages/public/RenewalResponsePage"));
const PortalLoginPage = lazy(() => import("@/pages/portal/PortalLoginPage"));
const SuperAdminDashboard = lazy(() => import("@/pages/superadmin/SuperAdminDashboard"));

// ── Portal V1 — 7 operational screens ──────────────────────────────────────
const PortalAppShell = lazy(() => import("@/portal/screens/PortalAppShell"));
const PortalOnboarding = lazy(() => import("@/portal/screens/OnboardingScreen"));
const PortalHome = lazy(() => import("@/portal/screens/HomeScreen"));
const PortalClasses = lazy(() => import("@/portal/screens/ClassesScreen"));
const PortalFinanceScreen = lazy(() => import("@/portal/screens/PortalFinanceScreen"));
const PortalNotifications = lazy(() => import("@/portal/screens/NotificationsScreen"));
const PortalProfile = lazy(() => import("@/portal/screens/ProfileScreen"));
const PortalPreferencesScreen = lazy(() => import("@/portal/screens/PortalPreferencesScreen"));
const TeacherScheduleScreen = lazy(() => import("@/portal/screens/teacher/TeacherScheduleScreen"));
const TeacherClassesScreen = lazy(() => import("@/portal/screens/teacher/TeacherClassesScreen"));
const PortalComingSoonScreen = lazy(() => import("@/portal/screens/PortalComingSoonScreen"));

const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));

const LegalLayout = lazy(() => import("@/pages/legal/LegalLayout"));
const PrivacyPolicyPage = lazy(() => import("@/pages/legal/PrivacyPolicyPage"));
const CookiePolicyPage = lazy(() => import("@/pages/legal/CookiePolicyPage"));
const TermsOfServicePage = lazy(() => import("@/pages/legal/TermsOfServicePage"));
const LegalNoticePage = lazy(() => import("@/pages/legal/LegalNoticePage"));

const GuidesLayout = lazy(() => import("@/pages/guides/GuidesLayout"));
const GuidesIndexPage = lazy(() => import("@/pages/guides/GuidesIndexPage"));
const GuideEnrollmentPage = lazy(() => import("@/pages/guides/GuideEnrollmentPage"));
const GuideSchedulePage = lazy(() => import("@/pages/guides/GuideSchedulePage"));
const GuideRenewalsPage = lazy(() => import("@/pages/guides/GuideRenewalsPage"));
const GuideWaitlistPage = lazy(() => import("@/pages/guides/GuideWaitlistPage"));
const GuideCollectionsPage = lazy(() => import("@/pages/guides/GuideCollectionsPage"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function FullScreenLoader({ message = "Cargando..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">Esto solo tarda unos segundos.</p>
      </div>
    </div>
  );
}

function withSuspense(element: ReactElement) {
  return <Suspense fallback={<FullScreenLoader />}>{element}</Suspense>;
}

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenLoader message="Validando sesión..." />;
  }

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to={`/auth/login?next=${next}`} replace />;
  }

  return children;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BrandingProvider>
          <CookieBanner />
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={withSuspense(<LoginPage />)} />
          <Route path="/auth/register" element={withSuspense(<RegisterPage />)} />
          <Route path="/auth/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />
          <Route path="/auth/reset-password" element={withSuspense(<ResetPasswordPage />)} />
          <Route path="/settings/branding" element={<Navigate to="/admin/settings/branding" replace />} />
          <Route path="/legal" element={withSuspense(<LegalLayout />)}>
            <Route path="privacy" element={withSuspense(<PrivacyPolicyPage />)} />
            <Route path="cookies" element={withSuspense(<CookiePolicyPage />)} />
            <Route path="terms" element={withSuspense(<TermsOfServicePage />)} />
            <Route path="notice" element={withSuspense(<LegalNoticePage />)} />
          </Route>
          <Route path="/guides" element={withSuspense(<GuidesLayout />)}>
            <Route index element={withSuspense(<GuidesIndexPage />)} />
            <Route path="matricula-5-minutos" element={withSuspense(<GuideEnrollmentPage />)} />
            <Route path="organizar-horario-curso" element={withSuspense(<GuideSchedulePage />)} />
            <Route path="automatizar-renovaciones" element={withSuspense(<GuideRenewalsPage />)} />
            <Route path="lista-espera-sin-llamadas" element={withSuspense(<GuideWaitlistPage />)} />
            <Route path="cobros-vencidos-reducir-impagos" element={withSuspense(<GuideCollectionsPage />)} />
          </Route>
          <Route
            path="/admin"
            element={withSuspense(
              <AuthProvider>
                <RequireAdminAuth>
                  <AdminLayout />
                </RequireAdminAuth>
              </AuthProvider>
            )}
          >
            <Route index element={withSuspense(<DashboardPage />)} />
            <Route path="schedule" element={withSuspense(<SchedulePage />)} />
            <Route path="classes" element={withSuspense(<ClassesPage />)} />
            <Route path="rooms" element={withSuspense(<RoomsPage />)} />
            <Route path="teachers" element={withSuspense(<TeachersPage />)} />
            <Route path="economia" element={withSuspense(<EconomyPage />)} />
            <Route path="students" element={withSuspense(<StudentsPage />)} />
            <Route path="students/import" element={withSuspense(<ImportStudentsPage />)} />
            <Route path="enrollments" element={withSuspense(<EnrollmentsPage />)} />
            <Route path="payments" element={withSuspense(<PaymentsPage />)} />
            <Route path="analytics" element={<ModuleDisabledPage moduleKey="analytics" />} />
            <Route path="form-builder" element={withSuspense(<FormBuilderPage />)} />
            <Route path="pricing" element={withSuspense(<PricingManagement />)} />
            <Route path="communications" element={withSuspense(<CommunicationsPage />)} />
            <Route path="waitlist" element={withSuspense(<WaitlistPage />)} />
            <Route path="renewals" element={withSuspense(<RenewalsPage />)} />
            <Route path="course-clone" element={withSuspense(<CourseClonePage />)} />
            <Route path="reception" element={withSuspense(<ReceptionPage />)} />
            <Route path="events" element={<ModuleDisabledPage moduleKey="events" />} />
            <Route path="website" element={withSuspense(<WebsitePage />)} />
            <Route path="school/portal" element={withSuspense(<SchoolPortalHubScreen />)} />
            <Route path="school/settings" element={withSuspense(<SchoolPortalHubScreen />)} />
            <Route path="school/analytics" element={withSuspense(<SchoolPortalHubScreen />)} />
            <Route path="school/posts" element={withSuspense(<SchoolPortalHubScreen />)} />
            <Route path="school/announcements" element={withSuspense(<SchoolPortalHubScreen />)} />
            <Route path="school/gallery" element={withSuspense(<SchoolPortalHubScreen />)} />
            <Route path="settings" element={withSuspense(<SettingsLayout />)}>
              <Route index element={<Navigate to="/admin/settings/escuela" replace />} />
              <Route path="escuela" element={withSuspense(<EscuelaPage />)} />
              <Route path="agenda" element={withSuspense(<AgendaPage />)} />
              <Route path="cobros" element={withSuspense(<CobrosSettingsPage />)} />
              <Route path="avisos" element={withSuspense(<AvisosPage />)} />
              <Route path="acceso" element={withSuspense(<AccesoPage />)} />
              <Route path="plan" element={withSuspense(<PlanPage />)} />
              <Route path="branding" element={withSuspense(<BrandingSettingsPage />)} />
            </Route>
          </Route>
          <Route path="/s/:schoolSlug" element={withSuspense(<PublicLayout />)}>
            <Route index element={withSuspense(<SchoolLandingPage />)} />
            <Route path="enroll" element={withSuspense(<EnrollPage />)} />
            <Route path="schedule" element={withSuspense(<FullSchedulePage />)} />
          </Route>
          <Route path="/cualificacion" element={withSuspense(<LeadQualificationPage />)} />
          <Route path="/landing-demo" element={withSuspense(<LandingDemoPage />)} />
          <Route path="/renovar" element={withSuspense(<RenewalResponsePage />)} />
          <Route path="/portal/login" element={withSuspense(<PortalLoginPage />)} />
          {/* Super admin — protected by backend PLATFORM_OWNER_EMAIL check */}
          <Route path="/superadmin" element={withSuspense(<SuperAdminDashboard />)} />
          <Route path="/portal" element={withSuspense(<StudentPortalLandingPage />)} />
          {/* /portal/mockup removed — was a V2 wireframe, no longer linked */}
          <Route path="/dashboard/economia" element={<Navigate to="/admin/economia" replace />} />
          <Route path="/portal/onboarding" element={withSuspense(<PortalOnboarding />)} />
          <Route path="/portal/app" element={withSuspense(<PortalAppShell />)}>
            {/* V1 operational routes — Spanish slugs */}
            <Route index element={withSuspense(<PortalHome />)} />
            <Route path="clases" element={withSuspense(<PortalClasses />)} />
            <Route path="cobros" element={withSuspense(<PortalFinanceScreen />)} />
            <Route path="avisos" element={withSuspense(<PortalNotifications />)} />
            <Route path="perfil" element={withSuspense(<PortalProfile />)} />
            <Route path="preferencias" element={withSuspense(<PortalPreferencesScreen />)} />
            <Route path="profesor/horario" element={withSuspense(<TeacherScheduleScreen />)} />
            <Route path="profesor/clases" element={withSuspense(<TeacherClassesScreen />)} />
            {/* Legacy English redirects for backward compat */}
            <Route path="classes" element={<Navigate to="/portal/app/clases" replace />} />
            <Route path="finance" element={<Navigate to="/portal/app/cobros" replace />} />
            <Route path="notifications" element={<Navigate to="/portal/app/avisos" replace />} />
            <Route path="profile" element={<Navigate to="/portal/app/perfil" replace />} />
            <Route path="preferences" element={<Navigate to="/portal/app/preferencias" replace />} />
            {/* V2 screens — explicit routes so users see "Próximamente" instead of silent redirect */}
            <Route path="feed" element={withSuspense(<PortalComingSoonScreen />)} />
            <Route path="connections" element={withSuspense(<PortalComingSoonScreen />)} />
            <Route path="progress" element={withSuspense(<PortalComingSoonScreen />)} />
            <Route path="certifications" element={withSuspense(<PortalComingSoonScreen />)} />
            <Route path="gallery" element={withSuspense(<PortalComingSoonScreen />)} />
            <Route path="saved" element={withSuspense(<PortalComingSoonScreen />)} />
            <Route path="search" element={withSuspense(<PortalComingSoonScreen />)} />
            {/* Anything else still unknown → home */}
            <Route path="*" element={<Navigate to="/portal/app" replace />} />
          </Route>
          <Route path="*" element={withSuspense(<NotFound />)} />
          </Routes>
        </BrandingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
