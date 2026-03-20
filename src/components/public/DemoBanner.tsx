import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground py-2.5 px-4 flex items-center justify-center gap-3 text-sm font-medium shadow-sm">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>
        Estás explorando el{" "}
        <strong>demo de DanceHub</strong>. Todos los datos son ficticios.
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 px-3 text-xs font-semibold ml-2 shrink-0"
        asChild
      >
        <Link to="/auth/register">
          Crea tu escuela gratis
          <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </Button>
    </div>
  );
}
