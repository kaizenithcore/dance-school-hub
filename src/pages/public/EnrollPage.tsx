import { useParams } from "react-router-dom";

export default function EnrollPage() {
  const { schoolSlug } = useParams();

  return (
    <div className="container py-12 sm:py-16 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-foreground">Enrollment</h1>
        <p className="mt-1 text-sm text-muted-foreground mb-8">
          Complete the form below to enroll in classes.
        </p>
        <div className="rounded-lg border border-border bg-card p-8 shadow-soft flex items-center justify-center min-h-[300px]">
          <p className="text-muted-foreground text-sm">
            Dynamic enrollment form will be implemented in Sprint 4
          </p>
        </div>
      </div>
    </div>
  );
}
