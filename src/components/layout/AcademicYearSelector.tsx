import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAcademicYear } from "@/hooks/useAcademicYear";

export function AcademicYearSelector() {
  const navigate = useNavigate();
  const { academicYears, currentAcademicYear, loading, setCurrentAcademicYear } = useAcademicYear();
  const selectedAcademicYear =
    currentAcademicYear
    || academicYears.find((year) => year.isActive)
    || academicYears[0]
    || null;

  const handleChangeYear = async (yearId: string) => {
    await setCurrentAcademicYear(yearId);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-secondary/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  if (!selectedAcademicYear) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() => navigate("/admin/settings")}
      >
        Configurar curso
      </Button>
    );
  }

  return (
    <Select value={selectedAcademicYear.id} onValueChange={handleChangeYear} disabled={loading}>
      <SelectTrigger className="w-fit border-0 bg-secondary/50 hover:bg-secondary/70">
        <SelectValue placeholder="Selecciona año académico" />
      </SelectTrigger>
      <SelectContent>
        {academicYears.map((year) => (
          <SelectItem key={year.id} value={year.id}>
            {year.displayName} ({year.yearCode})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
