import { supabaseAdmin } from "@/lib/db/supabaseAdmin";

/** Returns current_academic_year_id for the tenant, or null if not set. */
export async function getCurrentAcademicYearId(tenantId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("school_settings")
    .select("current_academic_year_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data?.current_academic_year_id as string | null | undefined) ?? null;
}
