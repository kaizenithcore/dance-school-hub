import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getAcademicYears, setCurrentAcademicYear, type AcademicYear } from "@/lib/api/academicYears";

interface UseAcademicYearResult {
  academicYears: AcademicYear[];
  currentAcademicYear: AcademicYear | null;
  loading: boolean;
  setCurrentAcademicYear: (yearId: string) => Promise<void>;
}

export function useAcademicYear(): UseAcademicYearResult {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAcademicYears = async () => {
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
    };

    void loadAcademicYears();
  }, []);

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

  const currentAcademicYear = academicYears.find((year) => year.id === currentAcademicYearId) || null;

  return {
    academicYears,
    currentAcademicYear,
    loading,
    setCurrentAcademicYear: handleSetCurrentAcademicYear,
  };
}
