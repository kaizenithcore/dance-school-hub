import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { WeeklySchedule } from "@/components/schedule/WeeklySchedule";
import { MOCK_CLASSES } from "@/lib/data/mockClasses";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FullSchedulePage() {
  const { schoolSlug } = useParams();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const toggleClass = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectedTotal = MOCK_CLASSES
    .filter((c) => selectedClasses.includes(c.id))
    .reduce((sum, c) => sum + c.price, 0);

  return (
    <div className="container py-8 sm:py-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Horario de Clases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultá el horario completo. Las clases semanales se repiten cada semana. Las puntuales tienen fecha fija.
          </p>
        </div>
        {selectedClasses.length > 0 && (
          <div className="flex items-center gap-3 animate-fade-in">
            <span className="text-sm text-muted-foreground">
              {selectedClasses.length} clase{selectedClasses.length > 1 ? "s" : ""} · <span className="font-semibold text-foreground">${selectedTotal}</span>
            </span>
            <Button asChild>
              <Link to={`/s/${schoolSlug}/enroll`}>
                Inscribirse
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      <WeeklySchedule
        classes={MOCK_CLASSES}
        selectedClassIds={selectedClasses}
        onToggleClass={toggleClass}
      />
    </div>
  );
}
