import { useState, useMemo } from "react";
import { ExamCandidate, ExamRecord, EXAM_STATUSES } from "@/lib/data/mockExams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Eye, GraduationCap, Award, Download, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const CANDIDATE_STATUS: Record<string, { label: string; className: string }> = {
  registered: { label: "Registrado", className: "bg-info/15 text-info border-info/20" },
  graded: { label: "Calificado", className: "bg-warning/15 text-warning border-warning/20" },
  certified: { label: "Certificado", className: "bg-success/15 text-success border-success/20" },
  absent: { label: "Ausente", className: "bg-muted text-muted-foreground border-border" },
};

interface CandidatesTableProps {
  exam: ExamRecord;
  candidates: ExamCandidate[];
  onBack: () => void;
  onOpenGrading: (candidate: ExamCandidate) => void;
  onGenerateCertificate: (candidate: ExamCandidate) => void;
  onGenerateAllCertificates: () => void;
}

export function CandidatesTable({
  exam, candidates, onBack, onOpenGrading, onGenerateCertificate, onGenerateAllCertificates,
}: CandidatesTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return candidates;
    const q = search.toLowerCase();
    return candidates.filter(
      (c) => c.studentName.toLowerCase().includes(q) || c.studentEmail.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const gradedCount = candidates.filter((c) => c.status === "graded" || c.status === "certified").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">{exam.name}</h2>
          <p className="text-sm text-muted-foreground">
            {candidates.length} candidatos · {gradedCount} calificados
          </p>
        </div>
        {exam.status === "finished" && (
          <Button size="sm" onClick={onGenerateAllCertificates}>
            <Award className="h-3.5 w-3.5 mr-1.5" />
            Generar todos los certificados
          </Button>
        )}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar candidato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Sin candidatos" description="Aún no hay candidatos registrados." />
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead className="hidden md:table-cell">Fecha registro</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Nota final</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((candidate) => {
                const statusCfg = CANDIDATE_STATUS[candidate.status] || CANDIDATE_STATUS.registered;
                return (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-foreground">{candidate.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{candidate.studentEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {format(new Date(candidate.registrationDate), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px] font-medium", statusCfg.className)}>
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-foreground">
                      {candidate.finalGrade !== undefined ? candidate.finalGrade.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenGrading(candidate)}>
                              <GraduationCap className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Calificar</TooltipContent>
                        </Tooltip>
                        {(candidate.status === "graded" || candidate.status === "certified") && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onGenerateCertificate(candidate)}>
                                <Award className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {candidate.certificateGenerated ? "Descargar certificado" : "Generar certificado"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
