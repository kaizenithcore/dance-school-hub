import { motion } from "framer-motion";
import { Award, Download, ChevronRight } from "lucide-react";
import { MOCK_CERTIFICATIONS } from "../data/mockData";
import { cn } from "@/lib/utils";

export default function CertificationsScreen() {
  return (
    <div className="px-4 pb-24 pt-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Certificaciones</h1>
      <p className="text-sm text-muted-foreground">Tus exámenes y certificados oficiales.</p>

      <div className="space-y-3">
        {MOCK_CERTIFICATIONS.map((cert, i) => (
          <motion.div
            key={cert.id}
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
                  <span>{new Date(cert.date).toLocaleDateString("es-ES")}</span>
                  <span>{cert.school}</span>
                </div>
                {cert.status === "passed" && (
                  <p className="mt-1 text-sm font-bold text-success">Nota: {cert.grade}/10</p>
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
              <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-muted py-2 text-xs font-medium text-foreground transition hover:bg-muted/80">
                <Download className="h-3.5 w-3.5" /> Ver certificado
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
