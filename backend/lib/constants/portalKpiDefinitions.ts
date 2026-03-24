export const PORTAL_KPI_CONTRACT_VERSION = "1.0.0";

export interface PortalKpiDefinition {
  key: "dau_students" | "mau_students" | "visitor_to_student_conversion" | "school_retention_30d" | "feed_engagement_rate";
  name: string;
  category: "engagement" | "funnel" | "adoption" | "retention";
  formula: string;
  source: string[];
  frequency: "daily" | "weekly" | "monthly";
  owner: "product" | "growth" | "school-ops";
  target: string;
}

export const PORTAL_KPI_DEFINITIONS: PortalKpiDefinition[] = [
  {
    key: "dau_students",
    name: "DAU alumnos",
    category: "engagement",
    formula: "Usuarios unicos con actividad portal en el dia",
    source: ["portal_analytics_events", "student_profiles"],
    frequency: "daily",
    owner: "product",
    target: ">= 35% de alumnos activos/mes",
  },
  {
    key: "mau_students",
    name: "MAU alumnos",
    category: "adoption",
    formula: "Usuarios unicos con actividad portal en ventana movil de 30 dias",
    source: ["portal_analytics_events", "student_profiles"],
    frequency: "monthly",
    owner: "growth",
    target: ">= 70% de alumnos activos",
  },
  {
    key: "visitor_to_student_conversion",
    name: "Visitor -> Student conversion",
    category: "funnel",
    formula: "enrollment_completions / (explorer_views + onboarding_completions) * 100",
    source: ["portal_analytics_events", "enrollments"],
    frequency: "weekly",
    owner: "growth",
    target: ">= 8%",
  },
  {
    key: "school_retention_30d",
    name: "Retencion 30d por escuela",
    category: "retention",
    formula: "alumnos activos con evento en dias 1-30 y 31-60 / alumnos activos en dias 1-30 * 100",
    source: ["portal_analytics_events", "tenant_memberships", "student_profiles"],
    frequency: "monthly",
    owner: "school-ops",
    target: ">= 55%",
  },
  {
    key: "feed_engagement_rate",
    name: "Engagement feed",
    category: "engagement",
    formula: "(likes + saves) / views * 100",
    source: ["portal_analytics_events", "feed_interactions"],
    frequency: "daily",
    owner: "product",
    target: ">= 12%",
  },
];

export function getPortalKpiContract() {
  return {
    contract: "portal.kpi-definitions",
    version: PORTAL_KPI_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    kpis: PORTAL_KPI_DEFINITIONS,
  };
}
