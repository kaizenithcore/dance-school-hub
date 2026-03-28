const DEMO_ADMIN_STORAGE_KEY = "nexa:demo-admin-tenant";
export const DEMO_ADMIN_SLUG = "escuela-demo-nexa";

function canUseWindow() {
  return typeof window !== "undefined";
}

function normalizeDemoSlug(value: string | null | undefined) {
  if (value === DEMO_ADMIN_SLUG) {
    return DEMO_ADMIN_SLUG;
  }

  return null;
}

export function isDemoAdminSlug(slug: string | null | undefined): boolean {
  return normalizeDemoSlug(slug) !== null;
}

export function getDemoAdminTenantSlug(): string | null {
  if (!canUseWindow()) {
    return null;
  }

  const querySlug = normalizeDemoSlug(new URLSearchParams(window.location.search).get("demo"));
  if (querySlug) {
    window.sessionStorage.setItem(DEMO_ADMIN_STORAGE_KEY, DEMO_ADMIN_SLUG);
    return DEMO_ADMIN_SLUG;
  }

  if (!window.location.pathname.startsWith("/admin")) {
    return null;
  }

  return normalizeDemoSlug(window.sessionStorage.getItem(DEMO_ADMIN_STORAGE_KEY));
}

export function activateDemoAdminSession(slug: string) {
  if (!canUseWindow()) {
    return;
  }

  const normalizedSlug = normalizeDemoSlug(slug);
  if (normalizedSlug) {
    window.sessionStorage.setItem(DEMO_ADMIN_STORAGE_KEY, DEMO_ADMIN_SLUG);
  }
}

export function clearDemoAdminSession() {
  if (!canUseWindow()) {
    return;
  }

  window.sessionStorage.removeItem(DEMO_ADMIN_STORAGE_KEY);
}

export function isDemoAdminSessionActive() {
  return getDemoAdminTenantSlug() !== null;
}