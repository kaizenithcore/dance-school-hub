import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { EnrollmentForm } from "@/components/forms/EnrollmentForm";
import { DEFAULT_ENROLLMENT_SCHEMA } from "@/lib/types/formSchema";
import { MOCK_CLASSES } from "@/lib/data/mockClasses";
import { ClassCardData } from "@/components/cards/ClassCard";
import { ArrowLeft } from "lucide-react";

export default function EnrollPage() {
  const { schoolSlug } = useParams();

  // In production, selected classes would come from URL params or shared state
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    () => {
      // Pre-select first 2 classes as demo
      return MOCK_CLASSES.slice(0, 2).map((c) => c.id);
    }
  );

  const selectedClasses: ClassCardData[] = MOCK_CLASSES.filter((c) =>
    selectedClassIds.includes(c.id)
  );

  const handleRemoveClass = (id: string) => {
    setSelectedClassIds((prev) => prev.filter((cid) => cid !== id));
  };

  return (
    <div className="container py-8 sm:py-12 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <Link
          to={`/s/${schoolSlug}/schedule`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al horario
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Inscripción</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Completá los pasos a continuación para finalizar tu inscripción.
          </p>
        </div>

        <EnrollmentForm
          schema={DEFAULT_ENROLLMENT_SCHEMA}
          selectedClasses={selectedClasses}
          onRemoveClass={handleRemoveClass}
        />
      </div>
    </div>
  );
}
