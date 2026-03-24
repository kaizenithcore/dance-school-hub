import { Suspense, lazy, type ReactElement } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import Index from "@/pages/Index";

const AdminLayout = lazy(() => import("@/components/layout/AdminLayout").then((module) => ({ default: module.AdminLayout })));
const PublicLayout = lazy(() => import("@/components/layout/PublicLayout").then((module) => ({ default: module.PublicLayout })));

const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const SchedulePage = lazy(() => import("@/pages/admin/SchedulePage"));
const ClassesPage = lazy(() => import("@/pages/admin/ClassesPage"));
const RoomsPage = lazy(() => import("@/pages/admin/RoomsPage"));
const TeachersPage = lazy(() => import("@/pages/admin/TeachersPage"));
const StudentsPage = lazy(() => import("@/pages/admin/StudentsPage"));
const ImportStudentsPage = lazy(() => import("@/pages/admin/ImportStudentsPage"));
const EnrollmentsPage = lazy(() => import("@/pages/admin/EnrollmentsPage"));
const PaymentsPage = lazy(() => import("@/pages/admin/PaymentsPage"));
const AnalyticsPage = lazy(() => import("@/pages/admin/AnalyticsPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));
const FormBuilderPage = lazy(() => import("@/pages/admin/FormBuilderPage"));
const PricingManagement = lazy(() => import("@/pages/admin/PricingManagement").then((module) => ({ default: module.PricingManagement })));
const CommunicationsPage = lazy(() => import("@/pages/admin/CommunicationsPage"));
const WaitlistPage = lazy(() => import("@/pages/admin/WaitlistPage"));
const RenewalsPage = lazy(() => import("@/pages/admin/RenewalsPage"));
const CourseClonePage = lazy(() => import("@/pages/admin/CourseClonePage"));
const ReceptionPage = lazy(() => import("@/pages/admin/ReceptionPage"));
const BranchesPage = lazy(() => import("@/pages/admin/BranchesPage"));
const ExamsPage = lazy(() => import("@/pages/admin/ExamsPage"));
const OrganizationAccessPage = lazy(() => import("@/pages/admin/OrganizationAccessPage"));
const EventsPage = lazy(() => import("@/pages/admin/EventsPage"));

const SchoolLandingPage = lazy(() => import("@/pages/public/SchoolLandingPage"));
const EnrollPage = lazy(() => import("@/pages/public/EnrollPage"));
const FullSchedulePage = lazy(() => import("@/pages/public/FullSchedulePage"));
const StudentPortalLandingPage = lazy(() => import("@/pages/public/StudentPortalLandingPage"));
const StudentPortalMockupPage = lazy(() => import("@/pages/public/StudentPortalMockupPage"));

const PortalAppShell = lazy(() => import("@/portal/screens/PortalAppShell"));
const PortalOnboarding = lazy(() => import("@/portal/screens/OnboardingScreen"));
const PortalHome = lazy(() => import("@/portal/screens/HomeScreen"));
const PortalClasses = lazy(() => import("@/portal/screens/ClassesScreen"));
const PortalProgress = lazy(() => import("@/portal/screens/ProgressScreen"));
const PortalEvents = lazy(() => import("@/portal/screens/EventsScreen"));
const PortalCertifications = lazy(() => import("@/portal/screens/CertificationsScreen"));
const PortalProfile = lazy(() => import("@/portal/screens/ProfileScreen"));
const PortalFeed = lazy(() => import("@/portal/screens/FeedScreen"));

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

function withSuspense(element: ReactElement) {
  return <Suspense fallback={<div className="min-h-screen bg-background" />}>{element}</Suspense>;
}

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
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
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={withSuspense(<LoginPage />)} />
          <Route path="/auth/register" element={withSuspense(<RegisterPage />)} />
          <Route path="/auth/forgot-password" element={withSuspense(<ForgotPasswordPage />)} />
          <Route path="/auth/reset-password" element={withSuspense(<ResetPasswordPage />)} />
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
            <Route path="students" element={withSuspense(<StudentsPage />)} />
            <Route path="students/import" element={withSuspense(<ImportStudentsPage />)} />
            <Route path="enrollments" element={withSuspense(<EnrollmentsPage />)} />
            <Route path="payments" element={withSuspense(<PaymentsPage />)} />
            <Route path="analytics" element={withSuspense(<AnalyticsPage />)} />
            <Route path="form-builder" element={withSuspense(<FormBuilderPage />)} />
            <Route path="pricing" element={withSuspense(<PricingManagement />)} />
            <Route path="communications" element={withSuspense(<CommunicationsPage />)} />
            <Route path="waitlist" element={withSuspense(<WaitlistPage />)} />
            <Route path="renewals" element={withSuspense(<RenewalsPage />)} />
            <Route path="course-clone" element={withSuspense(<CourseClonePage />)} />
            <Route path="reception" element={withSuspense(<ReceptionPage />)} />
            <Route path="branches" element={withSuspense(<BranchesPage />)} />
            <Route path="exams" element={withSuspense(<ExamsPage />)} />
            <Route path="events" element={withSuspense(<EventsPage />)} />
            <Route path="organization-access" element={withSuspense(<OrganizationAccessPage />)} />
            <Route path="settings" element={withSuspense(<SettingsPage />)} />
          </Route>
          <Route path="/s/:schoolSlug" element={withSuspense(<PublicLayout />)}>
            <Route index element={withSuspense(<SchoolLandingPage />)} />
            <Route path="enroll" element={withSuspense(<EnrollPage />)} />
            <Route path="schedule" element={withSuspense(<FullSchedulePage />)} />
          </Route>
          <Route path="/portal" element={withSuspense(<StudentPortalLandingPage />)} />
          <Route path="/portal/mockup" element={withSuspense(<StudentPortalMockupPage />)} />
          <Route path="/portal/onboarding" element={withSuspense(<PortalOnboarding />)} />
          <Route path="/portal/app" element={withSuspense(<PortalAppShell />)}>
            <Route index element={withSuspense(<PortalHome />)} />
            <Route path="classes" element={withSuspense(<PortalClasses />)} />
            <Route path="progress" element={withSuspense(<PortalProgress />)} />
            <Route path="feed" element={withSuspense(<PortalFeed />)} />
            <Route path="events" element={withSuspense(<PortalEvents />)} />
            <Route path="certifications" element={withSuspense(<PortalCertifications />)} />
            <Route path="profile" element={withSuspense(<PortalProfile />)} />
          </Route>
          <Route path="*" element={withSuspense(<NotFound />)} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
