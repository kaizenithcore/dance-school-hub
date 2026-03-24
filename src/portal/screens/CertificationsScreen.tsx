import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalPersona } from "../services/portalPersona";
import { getStudentPortalCertifications, type StudentPortalCertification } from "@/lib/api/studentPortal";

export default function CertificationsScreen() {
  const { persona } = usePortalPersona();
  const [certifications, setCertifications] = useState<StudentPortalCertification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (persona === "prospect") {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getStudentPortalCertifications();
        if (cancelled) return;
        setCertifications(result);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudo cargar certificaciones");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [persona]);

  if (persona === "prospect") {
    return (
      <div className="px-4 pb-24 pt-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Certificaciones</h1>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Aun no tienes certificaciones registradas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cuando curses clases en una escuela conectada, tus examenes y diplomas apareceran aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Certificaciones</h1>
      <p className="text-sm text-muted-foreground">Tus exámenes y certificados oficiales.</p>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Cargando certificaciones...</div>
      ) : null}

      {!isLoading && certifications.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Aun no tienes certificaciones registradas.
        </div>
      ) : null}

      <div className="space-y-3">
        {certifications.map((cert, i) => (
          <motion.div
            key={`${cert.examId}-${cert.candidateId}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                cert.status === "passed" ? "bg-success/10" : cert.status === "pending" ? "bg-warning/10" : "bg-destructive/10"
              )}>
                <Award className={cn(
                  "h-5 w-5",
                  cert.status === "passed" ? "text-success" : cert.status === "pending" ? "text-warning" : "text-destructive"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{cert.examName}</h3>
                <p className="text-xs text-muted-foreground">{cert.discipline} · {cert.level}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{new Date(cert.examDate).toLocaleDateString("es-ES")}</span>
                  <span>Escuela activa</span>
                </div>
                {(cert.status === "passed" || cert.status === "failed") && typeof cert.finalGrade === "number" && (
                  <p className="mt-1 text-sm font-bold text-success">Nota: {cert.finalGrade}</p>
                )}
              </div>
              <span className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                cert.status === "passed" ? "bg-success/10 text-success" : cert.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
              )}>
                {cert.status === "passed" ? "Aprobado" : cert.status === "pending" ? "Pendiente" : "Suspenso"}
              </span>
            </div>

            {cert.status === "passed" && (
              <a
                href={cert.certificateUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-muted py-2 text-xs font-medium text-foreground transition hover:bg-muted/80"
              >
                <Download className="h-3.5 w-3.5" /> Ver certificado
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
