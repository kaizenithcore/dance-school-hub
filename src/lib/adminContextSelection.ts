import type { AuthContextResponse } from "@/lib/api/auth";

const ADMIN_SELECTED_TENANT_KEY = "nexa:admin:selected-tenant-id";
const ADMIN_SELECTED_ORGANIZATION_KEY = "nexa:admin:selected-organization-id";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStorageValue(key: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeStorageValue(key: string, value: string | null): void {
  if (!isBrowser()) {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, value);
}

export function getSelectedAdminTenantId(): string | null {
  return readStorageValue(ADMIN_SELECTED_TENANT_KEY);
}

export function getSelectedAdminOrganizationId(): string | null {
  return readStorageValue(ADMIN_SELECTED_ORGANIZATION_KEY);
}

export function setSelectedAdminTenantId(tenantId: string | null): void {
  writeStorageValue(ADMIN_SELECTED_TENANT_KEY, tenantId);
}

export function setSelectedAdminOrganizationId(organizationId: string | null): void {
  writeStorageValue(ADMIN_SELECTED_ORGANIZATION_KEY, organizationId);
}

export function clearSelectedAdminContext(): void {
  setSelectedAdminTenantId(null);
  setSelectedAdminOrganizationId(null);
}

export function syncSelectedAdminContext(authContext: AuthContextResponse | null): void {
  if (!authContext) {
    clearSelectedAdminContext();
    return;
  }

  const selectedTenantId = getSelectedAdminTenantId();
  const selectedOrganizationId = getSelectedAdminOrganizationId();

  const tenantExists = selectedTenantId
    ? authContext.memberships.some((membership) => membership.tenantId === selectedTenantId)
    : false;
  const organizationExists = selectedOrganizationId
    ? authContext.organizations.some((organization) => organization.organizationId === selectedOrganizationId)
    : false;

  const fallbackTenantId = authContext.tenant.id || authContext.memberships[0]?.tenantId || null;
  const fallbackOrganizationId =
    authContext.activeOrganization?.organizationId
    || authContext.organizations[0]?.organizationId
    || null;

  setSelectedAdminTenantId(tenantExists ? selectedTenantId : fallbackTenantId);
  setSelectedAdminOrganizationId(organizationExists ? selectedOrganizationId : fallbackOrganizationId);
}