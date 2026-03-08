import { supabase } from "@/lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    const authKey = Object.keys(window.localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token")
    );
    if (authKey) {
      try {
        const raw = window.localStorage.getItem(authKey);
        if (raw) {
          const parsed = JSON.parse(raw) as { access_token?: string };
          if (parsed.access_token) {
            headers.Authorization = `Bearer ${parsed.access_token}`;
            return headers;
          }
        }
      } catch {
        // Fall through to session API fallback.
      }
    }
  }

  try {
    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
    ]);

    if (sessionResult && "data" in sessionResult) {
      const token = sessionResult.data.session?.access_token;
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // Ignore token retrieval failures and continue without Authorization.
  }

  return headers;
}

export type RuleType =
  | "discipline_hours"
  | "category_pack"
  | "total_hours"
  | "fixed_discount"
  | "percentage_discount";

export interface DisciplineCategory {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description?: string;
  discipline_ids: string[];
  is_bonus_eligible: boolean;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface PricingRuleCondition {
  discipline_id?: string;
  category_slug?: string;
  hours_min?: number;
  hours_max?: number;
  included_categories?: string[];
  excluded_disciplines?: string[];
}

export interface PricingRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  rule_type: RuleType;
  conditions: PricingRuleCondition;
  price?: number;
  discount_amount?: number;
  discount_percentage?: number;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingBreakdownItem {
  type: "class" | "pack" | "discount";
  description: string;
  quantity?: number;
  unit_price?: number;
  total: number;
  class_ids?: string[];
}

export interface AppliedRule {
  rule_id: string;
  rule_name: string;
  rule_type: RuleType;
  description: string;
  amount: number;
  class_ids: string[];
}

export interface PricingHint {
  categorySlug: string;
  categoryName: string;
  currentHours: number;
  targetHours: number;
  missingHours: number;
  bonusName: string;
  bonusPrice: number;
  potentialSavings: number;
}

export interface PricingCalculation {
  total: number;
  subtotal: number;
  discount: number;
  breakdown: PricingBreakdownItem[];
  applied_rules: AppliedRule[];
  savings: number;
  hint?: PricingHint;
}

export interface PricingSelectionInput {
  class_id: string;
  schedule_id?: string;
}

export async function getPricingRules(): Promise<PricingRule[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/pricing/rules`, {
    headers,
  });
  if (!response.ok) {
    throw new Error("Error al cargar las tarifas");
  }
  const data = (await response.json()) as { rules: PricingRule[] };
  return data.rules;
}

export async function createPricingRule(
  rule: Omit<PricingRule, "id" | "tenant_id" | "created_at" | "updated_at">
): Promise<PricingRule> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/pricing/rules`, {
    method: "POST",
    headers,
    body: JSON.stringify(rule),
  });

  if (!response.ok) {
    throw new Error("Error al crear la tarifa");
  }
  const data = (await response.json()) as { rule: PricingRule };
  return data.rule;
}

export async function updatePricingRule(id: string, updates: Partial<PricingRule>): Promise<PricingRule> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/pricing/rules/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Error al actualizar la tarifa");
  }
  const data = (await response.json()) as { rule: PricingRule };
  return data.rule;
}

export async function deletePricingRule(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/pricing/rules/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw new Error("Error al eliminar la tarifa");
  }
}

export async function getDisciplineCategories(): Promise<DisciplineCategory[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/pricing/categories`, {
    headers,
  });
  if (!response.ok) {
    throw new Error("Error al cargar las categorías");
  }
  const data = (await response.json()) as { categories: DisciplineCategory[] };
  return data.categories;
}

export async function createDisciplineCategory(
  category: Omit<DisciplineCategory, "id" | "tenant_id" | "created_at" | "updated_at">
): Promise<DisciplineCategory> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/pricing/categories`, {
    method: "POST",
    headers,
    body: JSON.stringify(category),
  });

  if (!response.ok) {
    throw new Error("Error al crear la categoría");
  }
  const data = (await response.json()) as { category: DisciplineCategory };
  return data.category;
}

export async function updateDisciplineCategory(
  id: string,
  updates: Partial<DisciplineCategory>
): Promise<DisciplineCategory> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/pricing/categories/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error("Error al actualizar la categoría");
  }
  const data = (await response.json()) as { category: DisciplineCategory };
  return data.category;
}

export async function deleteDisciplineCategory(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/admin/pricing/categories/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw new Error("Error al eliminar la categoría");
  }
}

export async function calculatePricing(
  tenantId: string,
  classIds: string[],
  selections?: PricingSelectionInput[]
): Promise<PricingCalculation> {
  const response = await fetch(`${API_URL}/api/public/pricing/calculate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tenant_id: tenantId, class_ids: classIds, selections }),
  });

  if (!response.ok) {
    throw new Error("Error al calcular el precio");
  }

  const data = (await response.json()) as { pricing: PricingCalculation };
  return data.pricing;
}
