import { useEffect, useMemo, useState } from "react";
import { StudentRecord } from "@/lib/data/mockStudents";
import { ClassWithRelations, getClasses } from "@/lib/api/classes";
import { getSchedules } from "@/lib/api/schedules";
import { calculatePricing, type PricingCalculation } from "@/lib/api/pricing";
import {
  addMemberToJointGroup,
  getJointGroupMembers,
  removeMemberFromJointGroup,
  updateStudentClasses,
  type JointGroupMember,
} from "@/lib/api/students";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, UserMinus, Link2Off } from "lucide-react";
import { toast } from "sonner";

interface StudentClassesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentRecord | null;
  students: StudentRecord[];
  onUpdated: () => Promise<void>;
}

type ScheduleOption = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

const WEEKDAY_LABEL: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

export function StudentClassesModal({
  open,
  onOpenChange,
  student,
  students,
  onUpdated,
}: StudentClassesModalProps) {
  const [availableClasses, setAvailableClasses] = useState<ClassWithRelations[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [classSchedulesByClass, setClassSchedulesByClass] = useState<Record<string, ScheduleOption[]>>({});
  const [selectedScheduleIdsByClass, setSelectedScheduleIdsByClass] = useState<Record<string, string[]>>({});

  const [jointEnabled, setJointEnabled] = useState(false);
  const [workingGroupId, setWorkingGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<JointGroupMember[]>([]);
  const [newMemberId, setNewMemberId] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState("");

  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pricingPreview, setPricingPreview] = useState<PricingCalculation | null>(null);
  const [currentPricing, setCurrentPricing] = useState<PricingCalculation | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [initialClassIds, setInitialClassIds] = useState<string[]>([]);
  const [initialScheduleIdsByClass, setInitialScheduleIdsByClass] = useState<Record<string, string[]>>({});
  const [initialJointEnabled, setInitialJointEnabled] = useState(false);
  const [initialMemberCount, setInitialMemberCount] = useState(1);

  const groupId = workingGroupId;

  useEffect(() => {
    if (!open || !student) return;

    let cancelled = false;
    void (async () => {
      setLoadingData(true);
      try {
        const [classes, schedules] = await Promise.all([getClasses(), getSchedules()]);

        if (cancelled) return;

        const activeClasses = classes.filter((item) => item.status === "active");
        setAvailableClasses(activeClasses);

        const initialClassIds = student.enrolledClasses.map((c) => c.id);
        setSelectedClassIds(initialClassIds);
        setInitialClassIds(initialClassIds);

        const groupedSchedules: Record<string, ScheduleOption[]> = {};
        for (const schedule of schedules) {
          if (!groupedSchedules[schedule.class_id]) {
            groupedSchedules[schedule.class_id] = [];
          }
          groupedSchedules[schedule.class_id].push({
            id: schedule.id,
            weekday: schedule.weekday,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
          });
        }
        setClassSchedulesByClass(groupedSchedules);

        const initialSchedules: Record<string, string[]> = {};
        for (const classId of initialClassIds) {
          const existingSelection = student.enrolledClasses.find((item) => item.id === classId)?.selectedScheduleIds || [];
          initialSchedules[classId] = existingSelection.length > 0
            ? existingSelection
            : (groupedSchedules[classId] || []).map((s) => s.id);
        }
        setSelectedScheduleIdsByClass(initialSchedules);
        setInitialScheduleIdsByClass(initialSchedules);

        const initialGroupId = student.jointEnrollmentGroupId || null;
        setJointEnabled(Boolean(initialGroupId));
        setInitialJointEnabled(Boolean(initialGroupId));
        setWorkingGroupId(initialGroupId);

        if (initialGroupId) {
          const groupMembers = await getJointGroupMembers(initialGroupId);
          if (!cancelled) {
            setMembers(groupMembers);
            const uniqueIds = new Set<string>([student.id, ...groupMembers.map((member) => member.id)]);
            setInitialMemberCount(Math.max(1, uniqueIds.size));
          }
        } else {
          setMembers([]);
          setMemberSearch("");
          setInitialMemberCount(1);
        }
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, student]);

  useEffect(() => {
    if (!student) return;

    if (!jointEnabled) {
      setWorkingGroupId(null);
      return;
    }

    if (!workingGroupId) {
      setWorkingGroupId(student.jointEnrollmentGroupId || crypto.randomUUID());
    }
  }, [jointEnabled, student, workingGroupId]);

  const memberCandidates = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    const term = memberSearch.trim().toLowerCase();

    return students.filter((s) => {
      if (student && s.id === student.id) {
        return false;
      }

      if (memberIds.has(s.id)) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        s.name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term)
      );
    });
  }, [memberSearch, members, student, students]);

  const enrolledCountByClass = useMemo(() => {
    const counts = new Map<string, number>();

    for (const candidate of students) {
      for (const enrolledClass of candidate.enrolledClasses || []) {
        counts.set(enrolledClass.id, (counts.get(enrolledClass.id) || 0) + 1);
      }
    }

    return counts;
  }, [students]);

  const toggleClass = (classId: string, checked: boolean) => {
    setSelectedClassIds((prev) => {
      if (checked) {
        const classSchedules = classSchedulesByClass[classId] || [];
        setSelectedScheduleIdsByClass((prevSchedules) => ({
          ...prevSchedules,
          [classId]: classSchedules.map((schedule) => schedule.id),
        }));
        return prev.includes(classId) ? prev : [...prev, classId];
      }

      setSelectedScheduleIdsByClass((prevSchedules) => {
        if (!(classId in prevSchedules)) {
          return prevSchedules;
        }
        const next = { ...prevSchedules };
        delete next[classId];
        return next;
      });

      return prev.filter((id) => id !== classId);
    });
  };

  const toggleScheduleForClass = (classId: string, scheduleId: string, checked: boolean) => {
    setSelectedScheduleIdsByClass((prev) => {
      const current = prev[classId] || [];
      if (checked) {
        return { ...prev, [classId]: current.includes(scheduleId) ? current : [...current, scheduleId] };
      }
      return { ...prev, [classId]: current.filter((id) => id !== scheduleId) };
    });
  };

  const hasInvalidScheduleSelection = selectedClassIds.some((classId) => {
    const classSchedules = classSchedulesByClass[classId] || [];
    if (classSchedules.length === 0) return false;
    return (selectedScheduleIdsByClass[classId] || []).length === 0;
  });

  const effectiveMemberCount = useMemo(() => {
    if (!student) return 0;
    if (!jointEnabled) return 1;

    const uniqueIds = new Set<string>([student.id, ...members.map((member) => member.id)]);
    return Math.max(1, uniqueIds.size);
  }, [jointEnabled, members, student]);

  const selectedMonthlyTotal = useMemo(() => {
    const byId = new Map(availableClasses.map((item) => [item.id, item]));
    return selectedClassIds.reduce((sum, classId) => sum + (byId.get(classId)?.price || 0), 0);
  }, [availableClasses, selectedClassIds]);

  const currentMonthlyTotal = useMemo(() => {
    if (!student) return 0;
    if (typeof student.monthlyTotalOverride === "number") {
      return student.monthlyTotalOverride;
    }
    return student.enrolledClasses.reduce((sum, klass) => sum + (klass.monthlyPrice || 0), 0);
  }, [student]);

  const bonusApplied = Boolean(pricingPreview && pricingPreview.applied_rules.length > 0);

  const currentBonusApplied = Boolean(currentPricing && currentPricing.applied_rules.length > 0);

  const pricingRuleNamesCurrent = useMemo(
    () => new Set((currentPricing?.applied_rules || []).map((rule) => rule.rule_name)),
    [currentPricing]
  );

  const pricingRuleNamesProposed = useMemo(
    () => new Set((pricingPreview?.applied_rules || []).map((rule) => rule.rule_name)),
    [pricingPreview]
  );

  const removedRuleNames = useMemo(
    () => Array.from(pricingRuleNamesCurrent).filter((ruleName) => !pricingRuleNamesProposed.has(ruleName)),
    [pricingRuleNamesCurrent, pricingRuleNamesProposed]
  );

  const finalGroupTotal = useMemo(() => {
    if (!jointEnabled) {
      return pricingPreview?.total ?? selectedMonthlyTotal;
    }
    return pricingPreview?.total ?? (selectedMonthlyTotal * Math.max(1, effectiveMemberCount));
  }, [effectiveMemberCount, jointEnabled, pricingPreview, selectedMonthlyTotal]);

  const finalPerStudentTotal = useMemo(() => {
    if (!jointEnabled) {
      return pricingPreview?.total ?? selectedMonthlyTotal;
    }

    const membersCount = Math.max(1, effectiveMemberCount);
    return finalGroupTotal / membersCount;
  }, [effectiveMemberCount, finalGroupTotal, jointEnabled, pricingPreview, selectedMonthlyTotal]);

  const calculateWeeklyHours = useMemo(() => {
    const toDecimalHours = (timeValue: string) => {
      const [hourRaw = "0", minuteRaw = "0"] = String(timeValue || "").split(":");
      const hour = Number(hourRaw);
      const minute = Number(minuteRaw);
      return (Number.isFinite(hour) ? hour : 0) + (Number.isFinite(minute) ? minute : 0) / 60;
    };

    return (classIds: string[], scheduleByClass: Record<string, string[]>) => {
      return classIds.reduce((sum, classId) => {
        const classSchedules = classSchedulesByClass[classId] || [];
        if (classSchedules.length === 0) {
          return sum;
        }

        const selectedIds = scheduleByClass[classId] || [];
        const selectedSchedules = selectedIds.length > 0
          ? classSchedules.filter((schedule) => selectedIds.includes(schedule.id))
          : classSchedules;

        const classHours = selectedSchedules.reduce((classSum, schedule) => {
          const start = toDecimalHours(schedule.start_time);
          const end = toDecimalHours(schedule.end_time);
          return classSum + Math.max(0, end - start);
        }, 0);

        return sum + classHours;
      }, 0);
    };
  }, [classSchedulesByClass]);

  const currentSelectedHours = useMemo(
    () => calculateWeeklyHours(initialClassIds, initialScheduleIdsByClass),
    [calculateWeeklyHours, initialClassIds, initialScheduleIdsByClass]
  );

  const proposedSelectedHours = useMemo(
    () => calculateWeeklyHours(selectedClassIds, selectedScheduleIdsByClass),
    [calculateWeeklyHours, selectedClassIds, selectedScheduleIdsByClass]
  );

  useEffect(() => {
    let cancelled = false;

    const runPricingPreview = async () => {
      if (!open || !student) {
        setPricingPreview(null);
        setCurrentPricing(null);
        return;
      }

      const tenantId = availableClasses[0]?.tenantId;
      if (!tenantId) {
        setPricingPreview(null);
        setCurrentPricing(null);
        return;
      }

      const buildSelections = (classIds: string[], schedulesByClass: Record<string, string[]>, memberCount: number) =>
        Array.from({ length: Math.max(1, memberCount) }).flatMap(() =>
          classIds.flatMap((classId) => {
            const classSchedules = classSchedulesByClass[classId] || [];
            const selectedSchedules = schedulesByClass[classId] || [];

            if (classSchedules.length === 0) {
              return [{ class_id: classId }];
            }

            if (selectedSchedules.length > 0) {
              return selectedSchedules.map((scheduleId) => ({
                class_id: classId,
                schedule_id: scheduleId,
              }));
            }

            return [{ class_id: classId }];
          })
        );

      setPricingLoading(true);
      try {
        const [currentPricingValue, proposedPricingValue] = await Promise.all([
          initialClassIds.length > 0
            ? calculatePricing(
                tenantId,
                initialClassIds,
                buildSelections(initialClassIds, initialScheduleIdsByClass, initialJointEnabled ? initialMemberCount : 1)
              )
            : Promise.resolve(null),
          selectedClassIds.length > 0
            ? calculatePricing(
                tenantId,
                selectedClassIds,
                buildSelections(selectedClassIds, selectedScheduleIdsByClass, effectiveMemberCount)
              )
            : Promise.resolve(null),
        ]);

        if (!cancelled) {
          setCurrentPricing(currentPricingValue);
          setPricingPreview(proposedPricingValue);
        }
      } catch {
        if (!cancelled) {
          setCurrentPricing(null);
          setPricingPreview(null);
        }
      } finally {
        if (!cancelled) {
          setPricingLoading(false);
        }
      }
    };

    void runPricingPreview();

    return () => {
      cancelled = true;
    };
  }, [
    availableClasses,
    classSchedulesByClass,
    effectiveMemberCount,
    initialClassIds,
    initialJointEnabled,
    initialMemberCount,
    initialScheduleIdsByClass,
    open,
    selectedClassIds,
    selectedScheduleIdsByClass,
    student,
  ]);

  const jointPricingPreview = useMemo(() => {
    if (!student || !jointEnabled) {
      return [] as Array<{ id: string; name: string; currentTotal: number; newTotal: number }>;
    }

    const groupMembers = [
      { id: student.id, name: student.name },
      ...members,
    ];

    const uniqueMembers = groupMembers.filter(
      (member, index, list) => list.findIndex((candidate) => candidate.id === member.id) === index
    );

    const studentById = new Map(students.map((item) => [item.id, item]));

    const calculatedPerMember = pricingPreview && effectiveMemberCount > 0
      ? pricingPreview.total / effectiveMemberCount
      : null;

    return uniqueMembers.map((member) => {
      const source = studentById.get(member.id);
      const currentTotal = typeof source?.monthlyTotalOverride === "number"
        ? source.monthlyTotalOverride
        : (source?.enrolledClasses || []).reduce(
            (sum, classItem) => sum + (classItem.monthlyPrice || 0),
            0
          );

      return {
        id: member.id,
        name: member.name,
        currentTotal,
        newTotal: calculatedPerMember ?? selectedMonthlyTotal,
      };
    });
  }, [effectiveMemberCount, jointEnabled, members, pricingPreview, selectedMonthlyTotal, student, students]);

  const handleSave = async () => {
    if (!student) return;

    setSaving(true);
    try {
      const ok = await updateStudentClasses(student.id, {
        classIds: selectedClassIds,
        jointEnrollmentGroupId: jointEnabled ? groupId : null,
        selections: selectedClassIds.map((classId) => ({
          classId,
          scheduleIds: selectedScheduleIdsByClass[classId] || [],
        })),
      });

      if (!ok) {
        toast.error("No se pudieron actualizar las clases");
        return;
      }

      toast.success("Clases actualizadas");
      await onUpdated();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!student || !groupId || !newMemberId) return;
    setSaving(true);
    try {
      // If this is a brand-new group, persist current student's enrollments first
      // so the backend can clone class assignments from the group to new members.
      if (members.length === 0) {
        const bootstrapOk = await updateStudentClasses(student.id, {
          classIds: selectedClassIds,
          jointEnrollmentGroupId: groupId,
          selections: selectedClassIds.map((classId) => ({
            classId,
            scheduleIds: selectedScheduleIdsByClass[classId] || [],
          })),
        });

        if (!bootstrapOk) {
          toast.error("No se pudo crear la matrícula conjunta base");
          return;
        }
      }

      const ok = await addMemberToJointGroup(groupId, newMemberId);
      if (!ok) {
        toast.error("No se pudo agregar el miembro");
        return;
      }
      const groupMembers = await getJointGroupMembers(groupId);
      setMembers(groupMembers);
      setNewMemberId("");
      setMemberSearch("");
      await onUpdated();
      toast.success("Miembro agregado");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (studentId: string) => {
    if (!groupId) return;
    setSaving(true);
    try {
      const ok = await removeMemberFromJointGroup(groupId, studentId);
      if (!ok) {
        toast.error("No se pudo quitar el miembro");
        return;
      }
      const groupMembers = await getJointGroupMembers(groupId);
      setMembers(groupMembers);
      await onUpdated();
      toast.success("Miembro removido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Clases y matrícula conjunta</DialogTitle>
        </DialogHeader>

        {!student ? null : (
          <div className="space-y-6 py-2">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Clases de {student.name}</h3>
              {loadingData ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando clases...
                </div>
              ) : (
                <div className="grid gap-2">
                  {availableClasses.map((item) => {
                    const checked = selectedClassIds.includes(item.id);
                    const classSchedules = classSchedulesByClass[item.id] || [];
                    const enrolled = enrolledCountByClass.get(item.id) || item.enrolledCount || 0;
                    const capacity = Math.max(0, item.capacity || 0);
                    const isFull = capacity > 0 && enrolled >= capacity;
                    const canSelectClass = checked || !isFull;
                    const occupancyPercent = capacity > 0 ? Math.min(100, (enrolled / capacity) * 100) : 0;

                    return (
                      <div key={item.id} className="rounded-md border border-border px-3 py-2">
                        <label className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => toggleClass(item.id, Boolean(value))}
                              disabled={saving || !canSelectClass}
                            />
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">€{item.price}/mes</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={isFull ? "destructive" : occupancyPercent >= 80 ? "secondary" : "outline"}>
                              {enrolled}/{capacity || "-"} plazas
                            </Badge>
                            {isFull ? <span className="text-[10px] text-destructive">Clase completa</span> : null}
                          </div>
                        </label>

                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={isFull ? "h-full bg-destructive" : occupancyPercent >= 80 ? "h-full bg-warning" : "h-full bg-primary"}
                            style={{ width: `${occupancyPercent}%` }}
                          />
                        </div>

                        {!checked && isFull ? (
                          <p className="mt-2 text-xs text-destructive">
                            No se puede anadir esta clase porque ya alcanzo su capacidad maxima.
                          </p>
                        ) : null}

                        {checked && classSchedules.length > 0 ? (
                          <div className="mt-3 pl-6 space-y-1.5">
                            <p className="text-xs text-muted-foreground">Horarios para esta clase:</p>
                            {classSchedules.map((schedule) => {
                              const scheduleChecked = (selectedScheduleIdsByClass[item.id] || []).includes(schedule.id);
                              return (
                                <label key={schedule.id} className="flex items-center gap-2 text-xs text-foreground">
                                  <Checkbox
                                    checked={scheduleChecked}
                                    onCheckedChange={(value) =>
                                      toggleScheduleForClass(item.id, schedule.id, Boolean(value))
                                    }
                                    disabled={saving}
                                  />
                                  {WEEKDAY_LABEL[schedule.weekday] || "Día"} · {schedule.start_time.slice(0, 5)}-{schedule.end_time.slice(0, 5)}
                                </label>
                              );
                            })}
                          </div>
                        ) : null}

                        {checked && classSchedules.length === 0 ? (
                          <p className="mt-2 pl-6 text-xs text-muted-foreground">
                            Esta clase no tiene horarios definidos aún.
                          </p>
                        ) : null}

                        {checked && classSchedules.length > 0 && (selectedScheduleIdsByClass[item.id] || []).length === 0 ? (
                          <p className="mt-2 pl-6 text-xs text-warning">
                            Selecciona al menos un horario para esta clase.
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-2 rounded-md border border-border bg-muted/20 px-3 py-3">
              <p className="text-xs font-medium text-foreground">Precio final tras los cambios</p>

              {pricingLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calculando bonos y total final...
                </div>
              ) : selectedClassIds.length === 0 ? (
                <p className="text-xs text-muted-foreground">Selecciona al menos una clase para calcular el precio final.</p>
              ) : (
                <>
                  <div className="rounded border border-border bg-background px-3 py-2 space-y-1">
                    <p className="text-[11px] font-medium text-foreground">Bonos actuales</p>
                    <p className="text-xs text-muted-foreground">
                      Seleccion actual: {initialClassIds.length} clase(s), {currentSelectedHours.toFixed(2)} h/semana.
                    </p>
                    {currentBonusApplied ? (
                      <p className="text-xs text-success">
                        Bono activo: {currentPricing?.applied_rules.map((rule) => rule.rule_name).join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Actualmente no hay bono aplicado.</p>
                    )}
                  </div>

                  <div className="rounded border border-border bg-background px-3 py-2 space-y-1">
                    <p className="text-[11px] font-medium text-foreground">Estado de la seleccion propuesta</p>
                    <p className="text-xs text-muted-foreground">
                      Nueva seleccion: {selectedClassIds.length} clase(s), {proposedSelectedHours.toFixed(2)} h/semana.
                    </p>
                    {bonusApplied ? (
                      <p className="text-xs text-success">
                        Bono aplicado automaticamente: {pricingPreview?.applied_rules.map((rule) => rule.rule_name).join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No aplica bono para esta combinacion. Si una regla aplica, se aplicara automaticamente.
                      </p>
                    )}
                    {removedRuleNames.length > 0 ? (
                      <p className="text-xs text-warning">
                        Atencion: al cambiar la seleccion se perderia(n) este(os) bono(s): {removedRuleNames.join(", ")}.
                      </p>
                    ) : null}
                  </div>

                  {!jointEnabled ? (
                    <p className="text-xs text-muted-foreground">
                      {student.name}: €{currentMonthlyTotal.toFixed(2)} -&gt; <span className="font-semibold text-foreground">€{finalPerStudentTotal.toFixed(2)}</span>
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Total conjunto: <span className="font-semibold text-foreground">€{finalGroupTotal.toFixed(2)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Precio final por alumno: <span className="font-semibold text-foreground">€{finalPerStudentTotal.toFixed(2)}</span>
                      </p>
                    </div>
                  )}

                  {pricingPreview && pricingPreview.savings > 0 ? (
                    <p className="text-xs text-success">Ahorro estimado: €{pricingPreview.savings.toFixed(2)}</p>
                  ) : null}
                </>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={jointEnabled}
                  onCheckedChange={(checked) => setJointEnabled(Boolean(checked))}
                  disabled={saving}
                />
                <Label className="text-sm font-medium">Matrícula conjunta</Label>
              </div>

              {!jointEnabled ? (
                <p className="text-xs text-muted-foreground">
                  El alumno quedará con matrícula individual.
                </p>
              ) : null}

              {jointEnabled && groupId ? (
                <>
                  <p className="text-xs text-muted-foreground">Grupo: {groupId}</p>

                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2 space-y-2">
                    <p className="text-xs font-medium text-foreground">Tarifa mensual en matrícula conjunta (previsualización)</p>
                    {pricingLoading ? (
                      <p className="text-xs text-muted-foreground">Calculando bono y total...</p>
                    ) : pricingPreview ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Total conjunto: <span className="font-semibold text-foreground">€{pricingPreview.total.toFixed(2)}</span>
                          {pricingPreview.applied_rules.length > 0 ? (
                            <span> · Regla aplicada: {pricingPreview.applied_rules.map((rule) => rule.rule_name).join(", ")}</span>
                          ) : (
                            <span> · Sin bono aplicado</span>
                          )}
                        </p>
                        {pricingPreview.savings > 0 ? (
                          <p className="text-xs text-success">Ahorro estimado: €{pricingPreview.savings.toFixed(2)}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No se pudo calcular la tarifa con bonos para esta combinación.</p>
                    )}
                    <div className="space-y-1">
                      {jointPricingPreview.map((row) => (
                        <div key={row.id} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{row.name}</span>
                          <span className="text-muted-foreground">€{row.currentTotal.toFixed(2)} → <span className="font-semibold text-foreground">€{row.newTotal.toFixed(2)}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => void handleRemoveMember(member.id)}
                          disabled={saving}
                        >
                          <UserMinus className="h-4 w-4 mr-1" /> Quitar
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label>Agregar alumno al grupo</Label>
                      <Input
                        value={memberSearch}
                        onChange={(event) => setMemberSearch(event.target.value)}
                        placeholder="Buscar por nombre o email"
                        disabled={saving}
                      />
                      <Select value={newMemberId} onValueChange={setNewMemberId} disabled={saving}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un alumno" />
                        </SelectTrigger>
                        <SelectContent>
                          {memberCandidates.length === 0 ? (
                            <SelectItem value="__no_candidates__" disabled>
                              Sin resultados
                            </SelectItem>
                          ) : null}
                          {memberCandidates.map((candidate) => (
                            <SelectItem key={candidate.id} value={candidate.id}>
                              {candidate.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => void handleAddMember()} disabled={saving || !newMemberId}>
                      <Plus className="h-4 w-4 mr-1" /> Agregar
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setJointEnabled(false);
                      setMembers([]);
                      setNewMemberId("");
                      setMemberSearch("");
                    }}
                    disabled={saving}
                  >
                    <Link2Off className="h-4 w-4 mr-1" /> Convertir a matrícula individual
                  </Button>
                </>
              ) : null}
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !student || hasInvalidScheduleSelection}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
