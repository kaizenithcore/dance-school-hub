import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { UpgradeFeatureAlert } from "@/components/billing/UpgradeFeatureAlert";
import {
  addOrganizationMember,
  createOrganizationLinkedSchool,
  getOrganizationAccessSnapshot,
  linkSchoolToOrganization,
  removeOrganizationMember,
  setOrganizationPrimarySchool,
  toggleOrganizationMemberActive,
  unlinkSchoolFromOrganization,
  updateOrganizationMemberRole,
  type OrganizationAccessSnapshot,
  type OrganizationRole,
} from "@/lib/api/organizationAccess";

const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  manager: "Coordinador",
  member: "Miembro",
};

export default function OrganizationAccessPage() {
  const { billing, loading: billingLoading, planLabel, startUpgrade } = useBillingEntitlements();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState<OrganizationAccessSnapshot | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<OrganizationRole>("manager");
  const [schoolToLink, setSchoolToLink] = useState<string>("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolSlug, setNewSchoolSlug] = useState("");
  const [copyTeachers, setCopyTeachers] = useState(true);

  const canManage = useMemo(() => {
    if (!snapshot) {
      return false;
    }

    return snapshot.organization.role === "owner" || snapshot.organization.role === "admin";
  }, [snapshot]);

  const featureLocked = !billingLoading && !billing.features.examSuite;
  const multiSiteEnabled = snapshot?.billing.multiSiteEnabled ?? false;

  const loadData = useCallback(async () => {
    if (featureLocked) {
      setLoading(false);
      setSnapshot(null);
      return;
    }

    setLoading(true);
    try {
      const data = await getOrganizationAccessSnapshot();
      setSnapshot(data);
      setSchoolToLink(data.availableSchoolsToLink[0]?.tenantId ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la organización.");
    } finally {
      setLoading(false);
    }
  }, [featureLocked]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const applyMutation = async (action: () => Promise<OrganizationAccessSnapshot>, successMessage: string) => {
    setSaving(true);
    try {
      const next = await action();
      setSnapshot(next);
      setSchoolToLink(next.availableSchoolsToLink[0]?.tenantId ?? "");
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la organización.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    const email = newMemberEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Introduce un email para invitar.");
      return;
    }

    await applyMutation(
      () => addOrganizationMember({
        email,
        role: newMemberRole,
        inviteRedirectUrl: `${window.location.origin}/auth/register`,
      }),
      "Miembro añadido o invitación enviada por email"
    );
    setNewMemberEmail("");
  };

  const handleCreateSchool = async () => {
    const tenantName = newSchoolName.trim();
    const tenantSlug = newSchoolSlug.trim();

    if (!tenantName) {
      toast.error("Introduce el nombre de la nueva sede.");
      return;
    }

    await applyMutation(
      () =>
        createOrganizationLinkedSchool({
          tenantName,
          tenantSlug: tenantSlug || undefined,
          copyTeachers,
        }),
      "Nueva sede creada y vinculada"
    );

    setNewSchoolName("");
    setNewSchoolSlug("");
    setCopyTeachers(true);
  };

  if (featureLocked) {
    return (
      <div className="space-y-6">
        <UpgradeFeatureAlert
          title="Roles y escuelas no disponible"
          description={`Tu plan actual (${planLabel}) no incluye esta función. Está disponible en planes Pro o en el plan especial ExamSuite.`}
          onUpgrade={() => void startUpgrade("examSuite")}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Roles y escuelas</h1>
        <p className="text-muted-foreground">No se pudo recuperar el contexto de organización.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Roles y escuelas</h1>
        <p className="text-muted-foreground">
          Gestiona el acceso de una cuenta de asociación sobre varias escuelas y define permisos por miembro.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Organización activa
          </CardTitle>
          <CardDescription>
            {snapshot.organization.name} ({snapshot.organization.slug}) · Tipo {snapshot.organization.kind}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tu rol actual es <span className="font-medium text-foreground">{ROLE_LABELS[snapshot.organization.role]}</span>.
          {canManage
            ? " Puedes añadir miembros, ajustar permisos y vincular escuelas."
            : " Solo puedes visualizar la configuración porque tu rol no permite cambios."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Escuelas vinculadas</CardTitle>
          <CardDescription>
            {multiSiteEnabled
              ? "En Enterprise puedes crear y vincular sedes, con gestión centralizada de accesos."
              : "La gestión multisede (crear, vincular, definir principal y desvincular) está disponible en Enterprise."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!multiSiteEnabled ? (
            <UpgradeFeatureAlert
              title="Multisede Enterprise"
              description="Tu plan actual no permite crear o gestionar varias sedes desde esta pantalla."
              onUpgrade={() => void startUpgrade("examSuite")}
            />
          ) : null}

          {multiSiteEnabled ? (
            <div className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-[1.2fr_1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="new-school-name">Nombre de la nueva sede</Label>
                <Input
                  id="new-school-name"
                  value={newSchoolName}
                  onChange={(event) => setNewSchoolName(event.target.value)}
                  placeholder="Dance Hub Norte"
                  disabled={!canManage || saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-school-slug">Slug (opcional)</Label>
                <Input
                  id="new-school-slug"
                  value={newSchoolSlug}
                  onChange={(event) => setNewSchoolSlug(event.target.value)}
                  placeholder="dance-hub-norte"
                  disabled={!canManage || saving}
                />
              </div>
              <Button className="w-full md:w-auto" disabled={!canManage || saving} onClick={() => void handleCreateSchool()}>
                Crear sede
              </Button>
              <div className="flex items-center gap-2 md:col-span-3">
                <Switch checked={copyTeachers} disabled={!canManage || saving} onCheckedChange={setCopyTeachers} />
                <span className="text-sm text-muted-foreground">Copiar profesorado de la sede actual</span>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3">
            {snapshot.linkedSchools.map((school) => (
              <div key={school.tenantId} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{school.tenantName}</p>
                  <p className="text-sm text-muted-foreground">/{school.tenantSlug}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={school.isPrimary ? "default" : "outline"}
                    disabled={!canManage || saving || school.isPrimary || !multiSiteEnabled}
                    onClick={() => void applyMutation(() => setOrganizationPrimarySchool(school.tenantId), "Escuela principal actualizada")}
                  >
                    {school.isPrimary ? "Principal" : "Marcar principal"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!canManage || saving || school.isPrimary || !multiSiteEnabled}
                    onClick={() => void applyMutation(() => unlinkSchoolFromOrganization(school.tenantId), "Escuela desvinculada")}
                  >
                    Desvincular
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label>Vincular una escuela existente</Label>
              <Select value={schoolToLink} onValueChange={setSchoolToLink}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una escuela" />
                </SelectTrigger>
                <SelectContent>
                  {snapshot.availableSchoolsToLink.map((school) => (
                    <SelectItem key={school.tenantId} value={school.tenantId}>
                      {school.tenantName} (/{school.tenantSlug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full md:w-auto"
              disabled={!canManage || saving || !schoolToLink || !multiSiteEnabled}
              onClick={() => void applyMutation(() => linkSchoolToOrganization(schoolToLink), "Escuela vinculada")}
            >
              Vincular escuela
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Miembros y permisos</CardTitle>
          <CardDescription>
            Asigna un rol por persona para controlar el alcance dentro de todas las escuelas vinculadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-[1.4fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="new-member-email">Email del miembro</Label>
              <Input
                id="new-member-email"
                value={newMemberEmail}
                onChange={(event) => setNewMemberEmail(event.target.value)}
                placeholder="persona@escuela.com"
                disabled={!canManage || saving}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newMemberRole} onValueChange={(value) => setNewMemberRole(value as OrganizationRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!canManage || saving} onClick={() => void handleAddMember()}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir
            </Button>
          </div>

          <div className="space-y-3">
            {snapshot.members.map((member) => (
              <div key={member.userId} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1.6fr_1fr_auto_auto] md:items-center">
                <div>
                  <p className="font-medium">{member.displayName || member.email || member.userId}</p>
                  <p className="text-sm text-muted-foreground">{member.email || "Sin email visible"}</p>
                </div>
                <Select
                  value={member.role}
                  disabled={!canManage || saving}
                  onValueChange={(value) =>
                    void applyMutation(
                      () => updateOrganizationMemberRole({ userId: member.userId, role: value as OrganizationRole }),
                      "Rol actualizado"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={member.isActive}
                    disabled={!canManage || saving}
                    onCheckedChange={(checked) =>
                      void applyMutation(
                        () => toggleOrganizationMemberActive({ userId: member.userId, isActive: checked }),
                        "Estado de acceso actualizado"
                      )
                    }
                  />
                  <span className="text-sm text-muted-foreground">{member.isActive ? "Activo" : "Inactivo"}</span>
                </div>
                <Button
                  variant="outline"
                  disabled={!canManage || saving || member.role === "owner"}
                  onClick={() => void applyMutation(() => removeOrganizationMember(member.userId), "Miembro eliminado")}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Quitar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
