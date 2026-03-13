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
  const [pricingLoading, setPricingLoading] = useState(false);

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

        const initialGroupId = student.jointEnrollmentGroupId || null;
        setJointEnabled(Boolean(initialGroupId));
        setWorkingGroupId(initialGroupId);

        if (initialGroupId) {
          const groupMembers = await getJointGroupMembers(initialGroupId);
          if (!cancelled) {
            setMembers(groupMembers);
          }
        } else {
          setMembers([]);
          setMemberSearch("");
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

  const toggleClass = (classId: string, checked: boolean) => {
    setSelectedClassIds((prev) => {
      if (checked) {
        return prev.includes(classId) ? prev : [...prev, classId];
      }
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

  useEffect(() => {
    let cancelled = false;

    const runPricingPreview = async () => {
      if (!open || !student || selectedClassIds.length === 0) {
        setPricingPreview(null);
        return;
      }

      const tenantId = availableClasses[0]?.tenantId;
      if (!tenantId) {
        setPricingPreview(null);
        return;
      }

      const selections = Array.from({ length: effectiveMemberCount }).flatMap(() =>
        selectedClassIds.flatMap((classId) => {
          const classSchedules = classSchedulesByClass[classId] || [];
          const selectedSchedules = selectedScheduleIdsByClass[classId] || [];

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
        const pricing = await calculatePricing(tenantId, selectedClassIds, selections);
        if (!cancelled) {
          setPricingPreview(pricing);
        }
      } catch {
        if (!cancelled) {
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

                    return (
                      <div key={item.id} className="rounded-md border border-border px-3 py-2">
                        <label className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => toggleClass(item.id, Boolean(value))}
                              disabled={saving}
                            />
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">€{item.price}/mes</p>
                            </div>
                          </div>
                        </label>

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
