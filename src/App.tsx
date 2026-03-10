import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import DashboardPage from "@/pages/admin/DashboardPage";
import SchedulePage from "@/pages/admin/SchedulePage";
import ClassesPage from "@/pages/admin/ClassesPage";
import RoomsPage from "@/pages/admin/RoomsPage";
import TeachersPage from "@/pages/admin/TeachersPage";
import StudentsPage from "@/pages/admin/StudentsPage";
import EnrollmentsPage from "@/pages/admin/EnrollmentsPage";
import PaymentsPage from "@/pages/admin/PaymentsPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import FormBuilderPage from "@/pages/admin/FormBuilderPage";
import { PricingManagement } from "@/pages/admin/PricingManagement";
import CommunicationsPage from "@/pages/admin/CommunicationsPage";
import WaitlistPage from "@/pages/admin/WaitlistPage";
import RenewalsPage from "@/pages/admin/RenewalsPage";
import CourseClonePage from "@/pages/admin/CourseClonePage";
import ReceptionPage from "@/pages/admin/ReceptionPage";
import ExamsPage from "@/pages/admin/ExamsPage";
import SchoolLandingPage from "@/pages/public/SchoolLandingPage";
import EnrollPage from "@/pages/public/EnrollPage";
import FullSchedulePage from "@/pages/public/FullSchedulePage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import LegalLayout from "@/pages/legal/LegalLayout";
import PrivacyPolicyPage from "@/pages/legal/PrivacyPolicyPage";
import CookiePolicyPage from "@/pages/legal/CookiePolicyPage";
import TermsOfServicePage from "@/pages/legal/TermsOfServicePage";
import LegalNoticePage from "@/pages/legal/LegalNoticePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/legal" element={<LegalLayout />}>
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="cookies" element={<CookiePolicyPage />} />
            <Route path="terms" element={<TermsOfServicePage />} />
            <Route path="notice" element={<LegalNoticePage />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="teachers" element={<TeachersPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="enrollments" element={<EnrollmentsPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="form-builder" element={<FormBuilderPage />} />
            <Route path="pricing" element={<PricingManagement />} />
            <Route path="communications" element={<CommunicationsPage />} />
            <Route path="waitlist" element={<WaitlistPage />} />
            <Route path="renewals" element={<RenewalsPage />} />
            <Route path="course-clone" element={<CourseClonePage />} />
            <Route path="reception" element={<ReceptionPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/s/:schoolSlug" element={<PublicLayout />}>
            <Route index element={<SchoolLandingPage />} />
            <Route path="enroll" element={<EnrollPage />} />
            <Route path="schedule" element={<FullSchedulePage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
