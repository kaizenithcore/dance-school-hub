import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, AlertTriangle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicRenewalOffer, respondToRenewalOffer, type PublicOfferDetails } from "@/lib/api/renewals";

type Screen = "loading" | "form" | "success" | "error";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
}

export default function RenewalResponsePage() {
  const [searchParams] = useSearchParams();
  const offerId = searchParams.get("offer") ?? "";

  const [screen, setScreen] = useState<Screen>("loading");
  const [offer, setOffer] = useState<PublicOfferDetails | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ confirmedClasses: string[]; releasedClasses: string[] } | null>(null);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    if (!offerId) {
      setErrorMsg("Enlace inválido. Contacta con tu escuela.");
      setScreen("error");
      return;
    }

    getPublicRenewalOffer(offerId)
      .then((details) => {
        if (details.status !== "pending") {
          // Already responded
          setStudentName(details.studentName);
          setResult({ confirmedClasses: [], releasedClasses: [] });
          setScreen("success");
          return;
        }
        setOffer(details);
        // Default: all classes selected
        setSelected(new Set(details.classes.map((c) => c.id)));
        setScreen("form");
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "No se pudo cargar la oferta. El enlace puede haber expirado.");
        setScreen("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleClass = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (action: "confirm" | "reject") => {
    if (!offer) return;
    setSubmitting(true);
    try {
      const res = await respondToRenewalOffer({
        offerId,
        action,
        selectedClassIds: action === "confirm" ? Array.from(selected) : [],
      });
      setStudentName(res.studentName);
      setResult({ confirmedClasses: res.confirmedClasses, releasedClasses: res.releasedClasses });
      setScreen("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo procesar tu respuesta.");
      setScreen("error");
    } finally {
      setSubmitting(false);
    }
  };

  const expiresLabel = offer?.expiresAt ? formatDate(offer.expiresAt) : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">

      {/* Loading */}
      {screen === "loading" && (
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Cargando tu renovación…</p>
        </div>
      )}

      {/* Error */}
      {screen === "error" && (
        <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground">Enlace no válido</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
          <div className="mt-8">
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/app">Ir al portal del alumno</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Success */}
      {screen === "success" && (
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-sm space-y-4">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-foreground">¡Respuesta registrada!</h1>
            {studentName && <p className="mt-1 text-sm text-muted-foreground">Gracias, <strong>{studentName}</strong>.</p>}
          </div>

          {result && (result.confirmedClasses.length > 0 || result.releasedClasses.length > 0) && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 text-sm">
              {result.confirmedClasses.length > 0 && (
                <div>
                  <p className="font-semibold text-success flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Clases renovadas
                  </p>
                  <ul className="space-y-1">
                    {result.confirmedClasses.map((name) => (
                      <li key={name} className="text-foreground">{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.releasedClasses.length > 0 && (
                <div>
                  <p className="font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
                    <XCircle className="h-4 w-4" /> Plazas liberadas
                  </p>
                  <ul className="space-y-1">
                    {result.releasedClasses.map((name) => (
                      <li key={name} className="text-muted-foreground">{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">Tu escuela recibirá tu selección. Si necesitas cambiar algo, contacta directamente con la academia.</p>

          <div className="text-center">
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/app">Ir al portal del alumno</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Form */}
      {screen === "form" && offer && (
        <div className="max-w-md w-full space-y-4">
          {/* Header */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{offer.schoolName}</p>
                <p className="text-xs text-muted-foreground">Renovación de plaza</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{offer.fromCourse}</span>
              <span className="text-muted-foreground text-xs">→</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{offer.toCourse}</span>
            </div>
            <p className="text-sm font-medium text-foreground mt-2">Hola, <strong>{offer.studentName}</strong></p>
            <p className="text-xs text-muted-foreground mt-1">
              Selecciona las clases que quieres renovar para el curso {offer.toCourse}. Las clases que no marques quedarán liberadas.
            </p>
            {expiresLabel && (
              <p className="text-xs text-amber-600 mt-2 font-medium">Plazo límite: {expiresLabel}</p>
            )}
          </div>

          {/* Class selector */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Tus clases — {offer.fromCourse}
            </p>

            {offer.classes.map((cls) => {
              const isSelected = selected.has(cls.id);
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => toggleClass(cls.id)}
                  className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-muted/20 text-muted-foreground"
                  }`}
                >
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    isSelected ? "border-primary bg-primary" : "border-border bg-background"
                  }`}>
                    {isSelected && (
                      <svg viewBox="0 0 10 8" className="h-3 w-3 text-primary-foreground fill-current">
                        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{cls.name}</p>
                    <p className="text-xs mt-0.5">
                      {isSelected ? "Renovar plaza" : "Liberar plaza"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              disabled={submitting || selected.size === 0}
              onClick={() => void handleSubmit("confirm")}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {selected.size === offer.classes.length
                ? "Confirmar todas las plazas"
                : selected.size === 0
                  ? "Selecciona al menos una clase"
                  : `Confirmar ${selected.size} plaza(s) / Liberar ${offer.classes.length - selected.size}`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              disabled={submitting}
              onClick={() => void handleSubmit("reject")}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              No deseo renovar ninguna plaza
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
