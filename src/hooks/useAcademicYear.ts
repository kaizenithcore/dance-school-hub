import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createAcademicYear,
  getAcademicYears,
  setCurrentAcademicYear,
  type AcademicYear,
  type CreateAcademicYearInput,
} from "@/lib/api/academicYears";
import { useAuth } from "@/contexts/AuthContext";

interface UseAcademicYearResult {
  academicYears: AcademicYear[];
  currentAcademicYear: AcademicYear | null;
  loading: boolean;
  setCurrentAcademicYear: (yearId: string) => Promise<void>;
  createNewAcademicYear: (input: CreateAcademicYearInput) => Promise<void>;
}

export function useAcademicYear(): UseAcademicYearResult {
  const { authContext } = useAuth();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeTenantId = authContext?.tenant.id;

  const loadAcademicYears = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAcademicYears();
      setAcademicYears(data.academicYears);
      setCurrentAcademicYearId(data.currentAcademicYearId);
    } catch (error) {
      console.error("Failed to load academic years:", error);
      toast.error("No se pudieron cargar los años académicos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAcademicYears();
  }, [activeTenantId, loadAcademicYears]);

  const handleSetCurrentAcademicYear = useCallback(async (yearId: string) => {
    try {
      const result = await setCurrentAcademicYear({ academicYearId: yearId });
      setCurrentAcademicYearId(result.academicYear.id);
      toast.success(`Año académico actualizado: ${result.academicYear.displayName}`);
    } catch (error) {
      console.error("Failed to update current academic year:", error);
      toast.error("No se pudo actualizar el año académico");
      throw error;
    }
  }, []);

  const handleCreateAcademicYear = useCallback(async (input: CreateAcademicYearInput) => {
    try {
      await createAcademicYear(input);
      toast.success("Curso creado correctamente");
      await loadAcademicYears();
    } catch (error) {
      console.error("Failed to create academic year:", error);
      toast.error("No se pudo crear el curso");
      throw error;
    }
  }, [loadAcademicYears]);

  const currentAcademicYear = academicYears.find((year) => year.id === currentAcademicYearId) || null;

  return {
    academicYears,
    currentAcademicYear,
    loading,
    setCurrentAcademicYear: handleSetCurrentAcademicYear,
    createNewAcademicYear: handleCreateAcademicYear,
  };
}
