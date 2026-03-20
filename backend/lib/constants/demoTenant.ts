export const DEMO_TENANT_SLUG = "escuela-demo-dancehub";

export const DEMO_TENANT_CONFIG = {
  slug: DEMO_TENANT_SLUG,
  readonly: true,
  highlightedModules: [
    "Horarios visuales",
    "Matricula online",
    "Cobros y recibos",
    "Comunicacion con familias",
  ],
  cta: {
    title: "Empieza tu prueba gratuita",
    description: "Configura tu escuela real en minutos y prueba todo el flujo sin compromiso.",
  },
} as const;

export function isDemoTenantSlug(tenantSlug: string): boolean {
  return String(tenantSlug || "").trim().toLowerCase() === DEMO_TENANT_SLUG;
}
