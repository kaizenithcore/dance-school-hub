import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getAcademicYears, setCurrentAcademicYear, type AcademicYear } from "@/lib/api/academicYears";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AcademicYearContextValue {
  academicYears: AcademicYear[];
  currentYear: AcademicYear | null;
  currentYearId: string | null;
  loading: boolean;
  /** Increments each time the selected year changes — use as useEffect dependency to re-fetch data */
  refreshKey: number;
  switchYear: (yearId: string) => Promise<void>;
  createYear: (input: { yearCode: string; displayName: string; startDate: string; endDate: string }) => Promise<void>;
  reload: () => Promise<void>;
}

const AcademicYearContext = createContext<AcademicYearContextValue | null>(null);

export function AcademicYearProvider({ children }: { children: React.ReactNode }) {
  const { authContext } = useAuth();
  const tenantId = authContext?.tenant.id;

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentYearId, setCurrentYearId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getAcademicYears();
      setAcademicYears(result.academicYears);
      setCurrentYearId(result.currentAcademicYearId);
    } catch {
      // Don't block the app if academic years fail to load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tenantId || loadedRef.current) return;
    loadedRef.current = true;
    void load();
  }, [tenantId, load]);

  const switchYear = useCallback(async (yearId: string) => {
    const prev = currentYearId;
    setCurrentYearId(yearId);
    try {
      const result = await setCurrentAcademicYear({ academicYearId: yearId });
      toast.success(`Curso cambiado a ${result.academicYear.displayName}`);
      // Increment refreshKey so all data-fetching pages re-load
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setCurrentYearId(prev); // rollback
      toast.error(err instanceof Error ? err.message : "No se pudo cambiar el curso");
    }
  }, [currentYearId]);

  const createYear = useCallback(async (input: {
    yearCode: string; displayName: string; startDate: string; endDate: string;
  }) => {
    const { createAcademicYear } = await import("@/lib/api/academicYears");
    await createAcademicYear(input);
    await load();
  }, [load]);

  const currentYear = academicYears.find((y) => y.id === currentYearId) ?? null;

  return (
    <AcademicYearContext.Provider value={{
      academicYears,
      currentYear,
      currentYearId,
      loading,
      refreshKey,
      switchYear,
      createYear,
      reload: load,
    }}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYearContext(): AcademicYearContextValue {
  const ctx = useContext(AcademicYearContext);
  if (!ctx) throw new Error("useAcademicYearContext must be used inside AcademicYearProvider");
  return ctx;
}
