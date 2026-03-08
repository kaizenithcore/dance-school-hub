import { useEffect, useMemo, useState } from "react";
import { StudentRecord } from "@/lib/data/mockStudents";
import { ClassWithRelations, getClasses } from "@/lib/api/classes";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface StudentClassesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentRecord | null;
  students: StudentRecord[];
  onUpdated: () => Promise<void>;
}

export function StudentClassesModal({
  open,
  onOpenChange,
  student,
  students,
  onUpdated,
}: StudentClassesModalProps) {
  const [availableClasses, setAvailableClasses] = useState<ClassWithRelations[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<JointGroupMember[]>([]);
  const [newMemberId, setNewMemberId] = useState<string>("");

  const groupId = student?.jointEnrollmentGroupId || null;

  useEffect(() => {
    if (!open || !student) return;

    let cancelled = false;

    void (async () => {
      setLoadingData(true);
      try {
        const classes = await getClasses();
        if (!cancelled) {
          setAvailableClasses(classes.filter((item) => item.status === "active"));
          setSelectedClassIds(student.enrolledClasses.map((c) => c.id));
        }

        if (groupId) {
          const groupMembers = await getJointGroupMembers(groupId);
          if (!cancelled) {
            setMembers(groupMembers);
          }
        } else if (!cancelled) {
          setMembers([]);
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
  }, [open, student, groupId]);

  const memberCandidates = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    return students.filter((s) => !memberIds.has(s.id));
  }, [members, students]);

  const toggleClass = (classId: string, checked: boolean) => {
    setSelectedClassIds((prev) => {
      if (checked) {
        return prev.includes(classId) ? prev : [...prev, classId];
      }
      return prev.filter((id) => id !== classId);
    });
  };

  const handleSave = async () => {
    if (!student) return;

    setSaving(true);
    try {
      const ok = await updateStudentClasses(student.id, {
        classIds: selectedClassIds,
        jointEnrollmentGroupId: groupId,
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
    if (!groupId || !newMemberId) return;
    setSaving(true);
    try {
      const ok = await addMemberToJointGroup(groupId, newMemberId);
      if (!ok) {
        toast.error("No se pudo agregar el miembro");
        return;
      }
      const groupMembers = await getJointGroupMembers(groupId);
      setMembers(groupMembers);
      setNewMemberId("");
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
          <DialogTitle>Clases y matricula conjunta</DialogTitle>
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
                    return (
                      <label
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                      >
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
                    );
                  })}
                </div>
              )}
            </section>

            {groupId ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Miembros del grupo conjunto</h3>
                <p className="text-xs text-muted-foreground">Grupo: {groupId}</p>

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
                    <Select value={newMemberId} onValueChange={setNewMemberId} disabled={saving}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un alumno" />
                      </SelectTrigger>
                      <SelectContent>
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
              </section>
            ) : (
              <section className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Este alumno no pertenece a una matricula conjunta.
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || !student}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
