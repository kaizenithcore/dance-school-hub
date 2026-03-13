import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYear } from "@/hooks/useAcademicYear";

export function AcademicYearSelector() {
  const { academicYears, currentAcademicYear, loading, setCurrentAcademicYear } = useAcademicYear();

  const handleChangeYear = async (yearId: string) => {
    await setCurrentAcademicYear(yearId);
  };

  if (loading || !currentAcademicYear) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-secondary/50">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  return (
    <Select value={currentAcademicYear.id} onValueChange={handleChangeYear} disabled={loading}>
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
