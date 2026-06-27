export type ModuleStatus = "mvp" | "legacy" | "disabled" | "future";

export interface ModuleEntry {
  status: ModuleStatus;
  owner: string;
  reason?: string;
  disabledSince?: string;
  reviewAfter?: string;
  replacement?: string;
}

const MODULE_MAP: Record<string, ModuleEntry> = {
  // Core MVP modules
  dashboard: { status: "mvp", owner: "product-core" },
  students: { status: "mvp", owner: "product-core" },
  "form-builder": { status: "mvp", owner: "product-core" },
  enrollments: { status: "mvp", owner: "product-core" },
  classes: { status: "mvp", owner: "product-core" },
  schedule: { status: "mvp", owner: "product-core" },
  teachers: { status: "mvp", owner: "product-core" },
  payments: { status: "mvp", owner: "product-core" },
  waitlist: { status: "mvp", owner: "product-core" },
  communications: { status: "mvp", owner: "product-core" },
  "school-portal": { status: "mvp", owner: "product-core" },
  website: { status: "mvp", owner: "product-core" },

  economia: { status: "mvp", owner: "product-core" },
  pricing: { status: "mvp", owner: "product-core" },
  renewals: { status: "mvp", owner: "product-core" },

  "course-clone": { status: "mvp", owner: "product-core" },

  // Hidden from primary UX — not removed yet, pending cleanup
  analytics: { status: "legacy", owner: "product-mvp", reason: "Analíticas avanzadas fuera de MVP" },
  events: { status: "legacy", owner: "product-mvp", reason: "Eventos avanzados fuera de MVP" },

  // Advanced/enterprise features flagged as future
  enterprise: { status: "future", owner: "product-mvp", reason: "Funciones enterprise avanzadas" },
};

export function getModuleEntry(moduleKey?: string): ModuleEntry | undefined {
  if (!moduleKey) return undefined;
  return MODULE_MAP[moduleKey];
}

export function getModuleStatus(moduleKey?: string): ModuleStatus | undefined {
  return getModuleEntry(moduleKey)?.status;
}

export function isModuleMVP(moduleKey?: string): boolean {
  return getModuleStatus(moduleKey) === "mvp";
}

export function isModuleVisible(moduleKey?: string): boolean {
  // Visible only when explicitly MVP. Unknown modules default to visible to avoid accidental hiding.
  const status = getModuleStatus(moduleKey);
  if (typeof status === "undefined") return true;
  return status === "mvp";
}

// Backwards compatibility for any code using the older name
export function isModuleEnabledByPolicy(_moduleKey: string): boolean {
  return isModuleMVP(_moduleKey);
}
