import { useCallback, useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Building2, Globe, Instagram, Facebook, Music2, Mail, Phone, MapPin, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/api/settings";
import { BrandingSettingsPanel } from "@/components/branding/BrandingSettingsPanel";
import { FieldGroup, SectionHeader } from "./_shared";

interface SchoolInfo {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  tagline: string;
  description: string;
  website: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

const DEFAULT_SCHOOL: SchoolInfo = {
  name: "", slug: "", email: "", phone: "", address: "", city: "",
  tagline: "", description: "", website: "", instagram: "", facebook: "", tiktok: "",
};

export default function EscuelaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<SchoolInfo>(DEFAULT_SCHOOL);
  const [snapshot, setSnapshot] = useState<Record<string, unknown>>({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSchoolSettings();
      if (!data) { toast.error("No se pudo cargar la configuración"); return; }
      setSchool((prev) => ({ ...prev, ...data.school }));
      setSnapshot(data as unknown as Record<string, unknown>);
    } catch { toast.error("Error al cargar la configuración"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSchoolSettings({ ...snapshot, school } as Parameters<typeof updateSchoolSettings>[0]);
      if (!updated) { toast.error("No se pudo guardar"); return; }
      setSchool((prev) => ({ ...prev, ...updated.school }));
      setSnapshot(updated as unknown as Record<string, unknown>);
      toast.success("Información de la escuela guardada");
    } catch { toast.error("Error al guardar la configuración"); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <PageContainer title="Escuela" description="Información y marca de tu escuela">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Escuela" description="Información y marca de tu escuela">
      <div className="space-y-6 max-w-3xl">
        {/* Branding */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-4">
          <SectionHeader title="Marca visual" description="Logo, colores y tipografía de tu escuela" />
          <BrandingSettingsPanel />
        </div>

        {/* School info */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
          <SectionHeader title="Información de la escuela" description="Datos que aparecen en tu página pública" />
          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="Nombre" icon={Building2}>
              <Input value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>
            <FieldGroup label="URL pública (/s/…)" icon={Globe}>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground shrink-0">/s/</span>
                <Input value={school.slug} onChange={(e) => setSchool({ ...school, slug: e.target.value })} className="h-9 text-sm" />
              </div>
            </FieldGroup>
            <FieldGroup label="Email" icon={Mail}>
              <Input type="email" value={school.email} onChange={(e) => setSchool({ ...school, email: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>
            <FieldGroup label="Teléfono" icon={Phone}>
              <Input value={school.phone} onChange={(e) => setSchool({ ...school, phone: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>
            <FieldGroup label="Dirección" icon={MapPin}>
              <Input value={school.address} onChange={(e) => setSchool({ ...school, address: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>
            <FieldGroup label="Ciudad">
              <Input value={school.city} onChange={(e) => setSchool({ ...school, city: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>
          </div>

          <FieldGroup label="Tagline público">
            <Input value={school.tagline} onChange={(e) => setSchool({ ...school, tagline: e.target.value })} className="h-9 text-sm" />
          </FieldGroup>
          <FieldGroup label="Descripción">
            <Textarea value={school.description} onChange={(e) => setSchool({ ...school, description: e.target.value })} className="text-sm min-h-[80px]" />
          </FieldGroup>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Redes sociales</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FieldGroup label="Sitio web" icon={Globe}>
              <Input value={school.website} onChange={(e) => setSchool({ ...school, website: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>
            <FieldGroup label="Instagram" icon={Instagram}>
              <Input value={school.instagram} onChange={(e) => setSchool({ ...school, instagram: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>
            <FieldGroup label="Facebook" icon={Facebook}>
              <Input value={school.facebook} onChange={(e) => setSchool({ ...school, facebook: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>
            <FieldGroup label="TikTok" icon={Music2}>
              <Input value={school.tiktok} onChange={(e) => setSchool({ ...school, tiktok: e.target.value })} className="h-9 text-sm" />
            </FieldGroup>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={loadSettings} disabled={saving}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" /> Guardar
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
