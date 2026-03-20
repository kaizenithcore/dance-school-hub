import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ExternalLink, Loader2, MapPin, Pencil, Plus, Save, Shield, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UpgradeFeatureAlert } from "@/components/billing/UpgradeFeatureAlert";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { useAuth } from "@/contexts/AuthContext";
import {
  createOrganizationLinkedSchool,
  getOrganizationAccessSnapshot,
  linkSchoolToOrganization,
  setOrganizationPrimarySchool,
  unlinkSchoolFromOrganization,
  updateOrganizationLinkedSchool,
  type OrganizationAccessSnapshot,
} from "@/lib/api/organizationAccess";

export default function BranchesPage() {
  const navigate = useNavigate();
  const { setActiveTenant } = useAuth();
  const { billing, loading: billingLoading, planLabel, startUpgrade } = useBillingEntitlements();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState<OrganizationAccessSnapshot | null>(null);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolSlug, setNewSchoolSlug] = useState("");
  const [copyTeachers, setCopyTeachers] = useState(true);
  const [schoolToLink, setSchoolToLink] = useState("");
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingSlug, setEditingSlug] = useState("");

  const canManage = useMemo(() => {
    if (!snapshot) return false;
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
      toast.error(error instanceof Error ? error.message : "No se pudo cargar las sedes.");
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
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la sede.");
    } finally {
      setSaving(false);
    }
  };

  const goToTenantSection = async (tenantId: string, targetPath: string) => {
    await setActiveTenant(tenantId);
    navigate(targetPath);
  };

  const startEdit = (tenantId: string, tenantName: string, tenantSlug: string) => {
    setEditingTenantId(tenantId);
    setEditingName(tenantName);
    setEditingSlug(tenantSlug);
  };

  const cancelEdit = () => {
    setEditingTenantId(null);
    setEditingName("");
    setEditingSlug("");
  };

  const handleSaveEdit = async () => {
    if (!editingTenantId) return;

    const tenantName = editingName.trim();
    const tenantSlug = editingSlug.trim();

    if (!tenantName) {
      toast.error("El nombre de la sede es obligatorio.");
      return;
    }

    await applyMutation(
      () =>
        updateOrganizationLinkedSchool({
          tenantId: editingTenantId,
          tenantName,
          tenantSlug: tenantSlug || undefined,
        }),
      "Sede actualizada"
    );

    cancelEdit();
  };

  const totals = useMemo(() => {
    if (!snapshot) {
      return {
        branches: 0,
        students: 0,
        classes: 0,
        teachers: 0,
        enrollments: 0,
      };
    }

    return snapshot.linkedSchools.reduce(
      (acc, school) => {
        acc.branches += 1;
        acc.students += school.stats.students;
        acc.classes += school.stats.classes;
        acc.teachers += school.stats.teachers;
        acc.enrollments += school.stats.confirmedEnrollments;
        return acc;
      },
      {
        branches: 0,
        students: 0,
        classes: 0,
        teachers: 0,
        enrollments: 0,
      }
    );
  }, [snapshot]);

  if (featureLocked) {
    return (
      <div className="space-y-6">
        <UpgradeFeatureAlert
          title="Sedes no disponible"
          description={`Tu plan actual (${planLabel}) no incluye esta función. Está disponible en planes Pro o ExamSuite.`}
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
        <h1 className="text-3xl font-bold tracking-tight">Sedes</h1>
        <p className="text-muted-foreground">No se pudo recuperar el contexto de sedes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sedes</h1>
        <p className="text-muted-foreground">
          Accede a la información centralizada de todas las sedes y gestiona su configuración, altas y permisos.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total sedes</CardDescription>
            <CardTitle className="text-2xl">{totals.branches}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alumnos activos</CardDescription>
            <CardTitle className="text-2xl">{totals.students}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clases activas</CardDescription>
            <CardTitle className="text-2xl">{totals.classes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profesores activos</CardDescription>
            <CardTitle className="text-2xl">{totals.teachers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Matrículas confirmadas</CardDescription>
            <CardTitle className="text-2xl">{totals.enrollments}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vista centralizada de sedes
          </CardTitle>
          <CardDescription>
            Consulta y administra cada sede. Puedes abrir su panel, configuración, cambiar principal, editar datos o desvincularla.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!multiSiteEnabled ? (
            <UpgradeFeatureAlert
              title="Multisede Enterprise"
              description="La creación, edición y desvinculación de sedes está disponible en Enterprise."
              onUpgrade={() => void startUpgrade("examSuite")}
            />
          ) : null}

          {snapshot.linkedSchools.map((school) => {
            const isEditing = editingTenantId === school.tenantId;
            const locationLabel = [school.address, school.city].filter(Boolean).join(", ");

            return (
              <div key={school.tenantId} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    {isEditing ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          placeholder="Nombre de sede"
                          disabled={saving}
                        />
                        <Input
                          value={editingSlug}
                          onChange={(event) => setEditingSlug(event.target.value)}
                          placeholder="slug-sede"
                          disabled={saving}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-lg font-semibold text-foreground">
                          {school.tenantName}
                          {school.isPrimary ? " (principal)" : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">/{school.tenantSlug}</p>
                      </>
                    )}
                    {locationLabel ? (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {locationLabel}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin dirección configurada</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => void goToTenantSection(school.tenantId, "/admin")}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir panel
                    </Button>
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => void goToTenantSection(school.tenantId, "/admin/settings")}
                    >
                      Configurar
                    </Button>
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => navigate("/admin/organization-access")}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Permisos
                    </Button>
                    {isEditing ? (
                      <>
                        <Button disabled={saving || !canManage || !multiSiteEnabled} onClick={() => void handleSaveEdit()}>
                          <Save className="mr-2 h-4 w-4" />
                          Guardar
                        </Button>
                        <Button variant="ghost" disabled={saving} onClick={cancelEdit}>
                          <X className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={saving || !canManage || !multiSiteEnabled}
                        onClick={() => startEdit(school.tenantId, school.tenantName, school.tenantSlug)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    )}
                    <Button
                      variant={school.isPrimary ? "default" : "outline"}
                      disabled={saving || !canManage || school.isPrimary || !multiSiteEnabled}
                      onClick={() =>
                        void applyMutation(
                          () => setOrganizationPrimarySchool(school.tenantId),
                          "Sede principal actualizada"
                        )
                      }
                    >
                      {school.isPrimary ? "Principal" : "Marcar principal"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={saving || !canManage || school.isPrimary || !multiSiteEnabled}
                      onClick={() =>
                        void applyMutation(
                          () => unlinkSchoolFromOrganization(school.tenantId),
                          "Sede desvinculada"
                        )
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Alumnos activos:</span>{" "}
                    <strong>{school.stats.students}</strong>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Clases activas:</span>{" "}
                    <strong>{school.stats.classes}</strong>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Profesores activos:</span>{" "}
                    <strong>{school.stats.teachers}</strong>
                  </div>
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Matrículas confirmadas:</span>{" "}
                    <strong>{school.stats.confirmedEnrollments}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crear nueva sede</CardTitle>
          <CardDescription>Crea una sede adicional y, opcionalmente, copia el profesorado de la sede activa.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-[1.2fr_1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="branches-new-name">Nombre de sede</Label>
            <Input
              id="branches-new-name"
              value={newSchoolName}
              onChange={(event) => setNewSchoolName(event.target.value)}
              placeholder="Dance Hub Centro"
              disabled={!canManage || saving || !multiSiteEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branches-new-slug">Slug (opcional)</Label>
            <Input
              id="branches-new-slug"
              value={newSchoolSlug}
              onChange={(event) => setNewSchoolSlug(event.target.value)}
              placeholder="dance-hub-centro"
              disabled={!canManage || saving || !multiSiteEnabled}
            />
          </div>
          <Button
            disabled={!canManage || saving || !multiSiteEnabled}
            onClick={() => {
              const tenantName = newSchoolName.trim();
              const tenantSlug = newSchoolSlug.trim();

              if (!tenantName) {
                toast.error("Introduce el nombre de la sede.");
                return;
              }

              void applyMutation(
                () =>
                  createOrganizationLinkedSchool({
                    tenantName,
                    tenantSlug: tenantSlug || undefined,
                    copyTeachers,
                  }),
                "Nueva sede creada"
              );

              setNewSchoolName("");
              setNewSchoolSlug("");
              setCopyTeachers(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear sede
          </Button>
          <div className="flex items-center gap-2 md:col-span-3">
            <Switch checked={copyTeachers} onCheckedChange={setCopyTeachers} disabled={!canManage || saving || !multiSiteEnabled} />
            <span className="text-sm text-muted-foreground">Copiar profesorado de la sede activa</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vincular sede existente</CardTitle>
          <CardDescription>Une una escuela ya creada para administrarla desde este panel central.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 rounded-lg border border-dashed p-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label>Sede disponible</Label>
            <Select value={schoolToLink} onValueChange={setSchoolToLink}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una sede" />
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
            disabled={!canManage || saving || !schoolToLink || !multiSiteEnabled}
            onClick={() =>
              void applyMutation(
                () => linkSchoolToOrganization(schoolToLink),
                "Sede vinculada"
              )
            }
          >
            Vincular sede
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
