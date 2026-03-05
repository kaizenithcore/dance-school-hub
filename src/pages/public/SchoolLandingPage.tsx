import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClassSchedulePreview } from "@/components/schedule/ClassSchedulePreview";
import { ArrowRight, MapPin, Phone, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SchoolLandingPage() {
  const { schoolSlug } = useParams();
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const schoolName = schoolSlug?.replace(/-/g, " ") || "Dance School";

  const toggleClass = (id: string) => {
    setSelectedClasses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/30" />
        <div className="container relative py-16 sm:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground mb-4">
              <Sparkles className="h-3 w-3" />
              Now enrolling for Spring 2026
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight capitalize">
              {schoolName}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed max-w-lg">
              Discover the joy of movement. We offer a wide range of dance classes for all ages and skill levels in a supportive, inspiring environment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={`/s/${schoolSlug}/enroll`}>
                  Start Enrollment
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#schedule">View Classes</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Info Bar */}
      <section className="border-b border-border bg-card">
        <div className="container py-4 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> 123 Dance Avenue, Studio District
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" /> (555) 123-4567
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" /> hello@{schoolSlug}.com
          </span>
        </div>
      </section>

      {/* Schedule Section */}
      <section id="schedule" className="container py-12 sm:py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Available Classes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select the classes you're interested in, then proceed to enroll.
            </p>
          </div>
          {selectedClasses.length > 0 && (
            <Button asChild className="animate-fade-in">
              <Link to={`/s/${schoolSlug}/enroll`}>
                Enroll in {selectedClasses.length} class{selectedClasses.length > 1 ? "es" : ""}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        <ClassSchedulePreview
          selectedClassIds={selectedClasses}
          onToggleClass={toggleClass}
        />
      </section>
    </div>
  );
}
