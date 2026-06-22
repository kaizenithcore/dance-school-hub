export type BackendLifecyclePolicyStatus = "enabled" | "disabled_legacy";
export type BackendLifecycleModuleKey = "examSuite";

export interface BackendModuleLifecyclePolicyEntry {
  status: BackendLifecyclePolicyStatus;
  owner: string;
  reason: string;
  disabledSince: string;
  reviewAfter: string;
}

const MODULE_LIFECYCLE_POLICY: Record<BackendLifecycleModuleKey, BackendModuleLifecyclePolicyEntry> = {
  examSuite: {
    status: "disabled_legacy",
    owner: "product-mvp",
    reason: "Fuera del alcance del MVP para escuelas de baile",
    disabledSince: "2026-04-15",
    reviewAfter: "2026-07-15",
  },
};

export function getBackendModuleLifecyclePolicy(
  moduleKey: BackendLifecycleModuleKey
): BackendModuleLifecyclePolicyEntry {
  return MODULE_LIFECYCLE_POLICY[moduleKey];
}

export function isBackendModuleEnabledByPolicy(moduleKey: BackendLifecycleModuleKey): boolean {
  return getBackendModuleLifecyclePolicy(moduleKey).status === "enabled";
}
