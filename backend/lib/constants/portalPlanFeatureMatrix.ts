import { commercialCatalog } from "@/lib/commercialCatalog";

export const PORTAL_PLAN_MATRIX_VERSION = "1.0.0";

export interface PortalPlanFeatureMatrixItem {
  featureKey: string;
  area: "portal-alumno" | "portal-social" | "portal-eventos" | "portal-escuela";
  title: string;
  description: string;
  availabilityByPlan: {
    starter: "included" | "limited" | "not_included";
    pro: "included" | "limited" | "not_included";
    enterprise: "included" | "limited" | "not_included";
  };
  technicalSource: string;
}

export const PORTAL_PLAN_FEATURE_MATRIX: PortalPlanFeatureMatrixItem[] = [
  {
    featureKey: "portal.student.profile",
    area: "portal-alumno",
    title: "Perfil y preferencias de alumno",
    description: "Perfil publico, privacidad y exportacion de datos personales",
    availabilityByPlan: { starter: "included", pro: "included", enterprise: "included" },
    technicalSource: "portalFoundationService + /api/public/portal/profile|privacy|export-data",
  },
  {
    featureKey: "portal.student.events.attendance",
    area: "portal-eventos",
    title: "Eventos y confirmacion de asistencia",
    description: "Listado de eventos, confirmacion/cancelacion y participaciones",
    availabilityByPlan: { starter: "limited", pro: "included", enterprise: "included" },
    technicalSource: "studentPortalService + /api/student/events",
  },
  {
    featureKey: "portal.student.gamification",
    area: "portal-alumno",
    title: "Progreso, XP y logros",
    description: "Sincronizacion de gamificacion y certificaciones",
    availabilityByPlan: { starter: "limited", pro: "included", enterprise: "included" },
    technicalSource: "studentPortalService syncStudentGamificationState",
  },
  {
    featureKey: "portal.social.feed",
    area: "portal-social",
    title: "Feed social y discovery",
    description: "Feed publico/personalizado, likes, guardados y follows",
    availabilityByPlan: { starter: "limited", pro: "included", enterprise: "included" },
    technicalSource: "portalFoundationService feed/follow/save",
  },
  {
    featureKey: "portal.social.moderation",
    area: "portal-social",
    title: "Reportes y moderacion de contenido",
    description: "Reportes de usuario final y workflow admin de moderacion",
    availabilityByPlan: { starter: "not_included", pro: "included", enterprise: "included" },
    technicalSource: "content_reports + /api/public/portal/reports + /api/admin/portal/reports",
  },
  {
    featureKey: "portal.school.analytics",
    area: "portal-escuela",
    title: "Analitica de portal",
    description: "Overview engagement/funnel/adoption/retention + contrato KPI",
    availabilityByPlan: { starter: "not_included", pro: "included", enterprise: "included" },
    technicalSource: "/api/school/portal/analytics + /api/school/portal/analytics/kpis",
  },
  {
    featureKey: "portal.school.mass-communications",
    area: "portal-escuela",
    title: "Comunicaciones masivas",
    description: "Comunicacion por email y automatizaciones segun entitlement",
    availabilityByPlan: { starter: "not_included", pro: "included", enterprise: "included" },
    technicalSource: "featureEntitlementsService.features.massCommunicationEmail",
  },
  {
    featureKey: "portal.school.custom-roles",
    area: "portal-escuela",
    title: "Roles avanzados personalizados",
    description: "Gestion de permisos avanzados para organizaciones grandes",
    availabilityByPlan: { starter: "not_included", pro: "not_included", enterprise: "included" },
    technicalSource: "featureEntitlementsService.features.customRoles|maxCustomRoles",
  },
];

export function getPortalPlanFeatureMatrix() {
  return {
    contract: "portal.plan-feature-matrix",
    version: PORTAL_PLAN_MATRIX_VERSION,
    generatedAt: new Date().toISOString(),
    plans: {
      starter: commercialCatalog.plans.starter,
      pro: commercialCatalog.plans.pro,
      enterprise: commercialCatalog.plans.enterprise,
    },
    matrix: PORTAL_PLAN_FEATURE_MATRIX,
  };
}
