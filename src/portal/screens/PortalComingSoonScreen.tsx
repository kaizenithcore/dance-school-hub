import { useNavigate } from "react-router-dom";
import { Clock, ArrowLeft } from "lucide-react";
import { usePortalBranding } from "@/portal/services/portalBranding";

export default function PortalComingSoonScreen() {
  const navigate = useNavigate();
  const { branding } = usePortalBranding();
  const primary = branding?.primaryColor ?? "#7C3AED";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: `${primary}18` }}
      >
        <Clock className="h-8 w-8" style={{ color: primary }} />
      </div>

      <h1 className="text-xl font-semibold text-foreground">Próximamente</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs">
        Esta sección estará disponible en una próxima actualización del portal.
      </p>

      <button
        type="button"
        onClick={() => navigate("/portal/app", { replace: true })}
        className="mt-8 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        style={{ background: `${primary}18`, color: primary }}
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </button>
    </div>
  );
}
