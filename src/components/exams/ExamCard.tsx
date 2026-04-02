import { ExamRecord, EXAM_STATUSES } from "@/lib/data/mockExams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Users, Eye, Pencil, ClipboardList, Award, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ExamCardProps {
  exam: ExamRecord;
  onEdit: (exam: ExamRecord) => void;
  onViewCandidates: (exam: ExamRecord) => void;
  onOpenGrading: (exam: ExamRecord) => void;
  onOpenCertificates: (exam: ExamRecord) => void;
}

export function ExamCard({ exam, onEdit, onViewCandidates, onOpenGrading, onOpenCertificates }: ExamCardProps) {
  const statusCfg = EXAM_STATUSES[exam.status];

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200 border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground truncate">{exam.name}</h3>
              <Badge variant="outline" className={cn("text-[10px] font-medium shrink-0", statusCfg.className)}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {exam.discipline} · {exam.level}
              {exam.category && ` · ${exam.category}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(exam.examDate), "d MMM yyyy", { locale: es })}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {exam.candidateCount} candidatos
            {exam.maxCandidates && ` / ${exam.maxCandidates}`}
          </span>
        </div>

        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(exam)} aria-label={`Editar examen ${exam.name}`}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar examen</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewCandidates(exam)} aria-label={`Ver candidatos de ${exam.name}`}>
                <ClipboardList className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Candidatos</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenGrading(exam)}
                aria-label={`Abrir calificaciones de ${exam.name}`}
                disabled={exam.status === "draft" || exam.status === "registration_open"}
              >
                <GraduationCap className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Calificaciones</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenCertificates(exam)}
                aria-label={`Abrir certificados de ${exam.name}`}
                disabled={exam.status !== "finished"}
              >
                <Award className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Certificados</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
