import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { respondToRenewalOffer } from "@/lib/api/renewals";

type State = "loading" | "confirmed" | "rejected" | "already" | "error";

export default function RenewalResponsePage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<State>("loading");
  const [studentName, setStudentName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const offerId = searchParams.get("offer");
  const action  = searchParams.get("action") as "confirm" | "reject" | null;
  // If backend redirected here with ?status=... (already processed)
  const statusParam = searchParams.get("status");

  useEffect(() => {
    // Backend already processed via GET redirect
    if (statusParam) {
      if (statusParam === "confirmed") { setState("confirmed"); return; }
      if (statusParam === "released")  { setState("rejected");  return; }
      if (statusParam === "error") {
        setErrorMsg(searchParams.get("msg") || "Enlace inválido o expirado.");
        setState("error");
        return;
      }
      setState("already");
      return;
    }

    if (!offerId || (action !== "confirm" && action !== "reject")) {
      setErrorMsg("Enlace inválido. Contacta con tu escuela.");
      setState("error");
      return;
    }

    respondToRenewalOffer({ offerId, action })
      .then(({ studentName: name, status }) => {
        setStudentName(name);
        setState(status === "confirmed" ? "confirmed" : "rejected");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "No se pudo procesar tu respuesta.";
        setErrorMsg(msg);
        setState("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {state === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Procesando tu respuesta…</p>
          </>
        )}

        {state === "confirmed" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground">¡Plaza confirmada!</h1>
            {studentName && <p className="mt-2 text-sm text-muted-foreground">Gracias, <strong>{studentName}</strong>.</p>}
            <p className="mt-2 text-sm text-muted-foreground">Tu plaza queda reservada para el próximo período. Tu escuela te avisará con todos los detalles.</p>
          </>
        )}

        {state === "rejected" && (
          <>
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground">Plaza liberada</h1>
            {studentName && <p className="mt-2 text-sm text-muted-foreground">Gracias, <strong>{studentName}</strong>.</p>}
            <p className="mt-2 text-sm text-muted-foreground">Hemos registrado que no renovarás tu plaza. Si cambias de opinión, contacta con tu escuela.</p>
          </>
        )}

        {state === "already" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground">Ya registrada</h1>
            <p className="mt-2 text-sm text-muted-foreground">Tu respuesta ya fue registrada anteriormente. No es necesario hacer nada más.</p>
          </>
        )}

        {state === "error" && (
          <>
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-foreground">Enlace no válido</h1>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
          </>
        )}

        {state !== "loading" && (
          <div className="mt-8">
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/app">Ir al portal del alumno</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
