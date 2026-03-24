import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getSchoolSettings } from "@/lib/api/settings";
import { updateSchoolPortalProfile } from "@/lib/api/portalFoundation";
import { toast } from "sonner";

interface SchoolProfileForm {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  location: string;
  isPublic: boolean;
}

const initialForm: SchoolProfileForm = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  location: "",
  isPublic: true,
};

export default function SchoolSettingsScreen() {
  const [form, setForm] = useState<SchoolProfileForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const settings = await getSchoolSettings();
        if (settings) {
          setForm({
            name: settings.school.name || "",
            slug: settings.school.slug || "",
            description: settings.school.description || "",
            logoUrl: "",
            location: `${settings.school.address || ""} ${settings.school.city || ""}`.trim(),
            isPublic: true,
          });
        }
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar los datos de escuela");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error("Nombre y slug son obligatorios");
      return;
    }

    setSaving(true);
    try {
      await updateSchoolPortalProfile({
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        logoUrl: form.logoUrl.trim() || null,
        location: form.location.trim() || null,
        isPublic: form.isPublic,
      });
      toast.success("Perfil de escuela actualizado");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo actualizar el perfil de escuela");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title="Perfil de Escuela"
      description="Configura la informacion publica y branding del centro"
      actions={
        <Button onClick={() => void handleSave()} disabled={saving || loading}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Identidad publica</CardTitle>
          <CardDescription>Estos datos se usan en el portal social y en la vista publica.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="school-name">Nombre</Label>
              <Input
                id="school-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-slug">Slug</Label>
              <Input
                id="school-slug"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-logo">Logo URL</Label>
              <Input
                id="school-logo"
                placeholder="https://..."
                value={form.logoUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-location">Ubicacion</Label>
              <Input
                id="school-location"
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="school-description">Descripcion</Label>
            <Textarea
              id="school-description"
              rows={5}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Perfil publico activo</p>
              <p className="text-xs text-muted-foreground">Permite que la escuela aparezca en descubrimiento social.</p>
            </div>
            <Switch
              checked={form.isPublic}
              onCheckedChange={(value) => setForm((prev) => ({ ...prev, isPublic: value }))}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
