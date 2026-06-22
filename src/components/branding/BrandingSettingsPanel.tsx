import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UploadCloud, Trash2, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  getTenantBranding,
  updateTenantBranding,
  type BrandingFontFamily,
  type BrandingStyleVariant,
} from "@/lib/api/branding";
import { defaultBrandingTheme, useBranding } from "@/providers/BrandingProvider";

interface BrandingForm {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: BrandingFontFamily;
  styleVariant: BrandingStyleVariant;
}

const FONT_OPTIONS: Array<{ value: BrandingFontFamily; label: string }> = [
  { value: "inter", label: "Inter" },
  { value: "poppins", label: "Poppins" },
  { value: "montserrat", label: "Montserrat" },
  { value: "lato", label: "Lato" },
];

const STYLE_OPTIONS: Array<{ value: BrandingStyleVariant; label: string; hint: string }> = [
  { value: "clean", label: "Clean", hint: "Actual, minimal y elegante" },
  { value: "rounded", label: "Rounded", hint: "Bordes suaves y cercanos" },
  { value: "bold", label: "Bold", hint: "Mayor contraste visual" },
];

function mapFontToCss(fontFamily: BrandingFontFamily) {
  if (fontFamily === "poppins") return '"Poppins", system-ui, sans-serif';
  if (fontFamily === "montserrat") return '"Montserrat", system-ui, sans-serif';
  if (fontFamily === "lato") return '"Lato", system-ui, sans-serif';
  return '"Inter", system-ui, sans-serif';
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{6})$/.test(value);
}

export function BrandingSettingsPanel() {
  const { setPreviewBranding, refreshBranding } = useBranding();
  const defaults = defaultBrandingTheme();

  const [form, setForm] = useState<BrandingForm>({
    logoUrl: defaults.logoUrl,
    primaryColor: defaults.primaryColor,
    secondaryColor: defaults.secondaryColor,
    accentColor: defaults.accentColor,
    fontFamily: defaults.fontFamily,
    styleVariant: defaults.styleVariant,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const effectiveLogoPreview = useMemo(() => {
    if (removeLogo) return null;
    if (logoPreviewUrl) return logoPreviewUrl;
    return form.logoUrl;
  }, [form.logoUrl, logoPreviewUrl, removeLogo]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(nextUrl);
    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [logoFile]);

  useEffect(() => {
    return () => {
      setPreviewBranding(null);
    };
  }, [setPreviewBranding]);

  useEffect(() => {
    setPreviewBranding({
      logoUrl: removeLogo ? null : (logoPreviewUrl || form.logoUrl),
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
      accentColor: form.accentColor,
      fontFamily: form.fontFamily,
      styleVariant: form.styleVariant,
    });
  }, [form, logoPreviewUrl, removeLogo, setPreviewBranding]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const branding = await getTenantBranding();
        if (!branding) {
          return;
        }

        setForm({
          logoUrl: branding.logo_url,
          primaryColor: branding.primary_color,
          secondaryColor: branding.secondary_color,
          accentColor: branding.accent_color || defaults.accentColor,
          fontFamily: branding.font_family,
          styleVariant: branding.style_variant,
        });
      } catch (error) {
        console.error(error);
        toast.error("No se pudo cargar tu branding");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [defaults.accentColor]);

  const updateFormColor = (field: "primaryColor" | "secondaryColor" | "accentColor", value: string) => {
    setForm((prev) => ({ ...prev, [field]: value.toUpperCase() }));
  };

  const handleLogoDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    if (!["image/png", "image/svg+xml", "image/jpeg"].includes(file.type)) {
      toast.error("Logo no valido. Usa PNG, SVG o JPG");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("El logo supera 2MB");
      return;
    }

    setLogoFile(file);
    setRemoveLogo(false);
    toast.success("Logo listo para guardar");
  };

  const handleSave = async () => {
    if (![form.primaryColor, form.secondaryColor, form.accentColor].every(isHexColor)) {
      toast.error("Todos los colores deben tener formato HEX, por ejemplo #7C3AED");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateTenantBranding(
        {
          primary_color: form.primaryColor,
          secondary_color: form.secondaryColor,
          accent_color: form.accentColor,
          font_family: form.fontFamily,
          style_variant: form.styleVariant,
          remove_logo: removeLogo,
        },
        logoFile
      );

      if (!updated) {
        toast.error("No se pudo guardar el branding");
        return;
      }

      setForm((prev) => ({ ...prev, logoUrl: updated.logo_url }));
      setLogoFile(null);
      setRemoveLogo(false);
      await refreshBranding();
      toast.success("Branding actualizado al instante");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo guardar el branding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving || loading}>
          {saving ? "Guardando..." : "Guardar branding"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Identidad visual</CardTitle>
            <CardDescription>
              Branding simple, premium y consistente en toda Nexa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Logo de academia</Label>
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleLogoDrop}
                className="rounded-xl border border-dashed border-border bg-muted/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <UploadCloud className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra tu logo aqui o selecciona un archivo PNG, SVG o JPG (max. 2MB)
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Input
                    type="file"
                    accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      setLogoFile(file);
                      if (file) {
                        setRemoveLogo(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setLogoFile(null);
                      setRemoveLogo(true);
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Eliminar logo
                  </Button>
                </div>
                {effectiveLogoPreview ? (
                  <div className="mt-4 rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Preview del logo</p>
                    <img src={effectiveLogoPreview} alt="Preview logo" className="mt-2 h-16 object-contain" />
                  </div>
                ) : null}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Color primario</Label>
                <Input value={form.primaryColor} onChange={(event) => updateFormColor("primaryColor", event.target.value)} />
                <Input type="color" value={form.primaryColor} onChange={(event) => updateFormColor("primaryColor", event.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label>Color secundario</Label>
                <Input value={form.secondaryColor} onChange={(event) => updateFormColor("secondaryColor", event.target.value)} />
                <Input type="color" value={form.secondaryColor} onChange={(event) => updateFormColor("secondaryColor", event.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label>Color acento</Label>
                <Input value={form.accentColor} onChange={(event) => updateFormColor("accentColor", event.target.value)} />
                <Input type="color" value={form.accentColor} onChange={(event) => updateFormColor("accentColor", event.target.value)} className="h-10" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipografia</Label>
                <Select value={form.fontFamily} onValueChange={(value) => setForm((prev) => ({ ...prev, fontFamily: value as BrandingFontFamily }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem value={font.value} key={font.value}>{font.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estilo visual</Label>
                <Select value={form.styleVariant} onValueChange={(value) => setForm((prev) => ({ ...prev, styleVariant: value as BrandingStyleVariant }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map((style) => (
                      <SelectItem value={style.value} key={style.value}>{style.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                Cambios aplicados automaticamente en web publica, app interna y documentos compatibles.
              </p>
              <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-1 h-4 w-4" /> Recargar vista
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview en tiempo real</CardTitle>
            <CardDescription>Referencia visual de boton, tarjeta y cabecera.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4" style={{ fontFamily: mapFontToCss(form.fontFamily) }}>
            <div className="rounded-lg border p-4" style={{ borderColor: form.primaryColor }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: form.primaryColor }}>Cabecera Nexa</p>
                <Badge style={{ backgroundColor: form.accentColor, color: "white" }}>Premium</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Tu identidad visual en toda la experiencia.</p>
            </div>

            <button
              type="button"
              className="w-full rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: form.primaryColor }}
            >
              Boton principal
            </button>

            <div className="rounded-lg border bg-card p-4" style={{ borderRadius: form.styleVariant === "rounded" ? "16px" : form.styleVariant === "bold" ? "8px" : "12px" }}>
              <p className="text-sm font-semibold">Tarjeta de referencia</p>
              <p className="text-xs text-muted-foreground">Lista para estudiantes, pagos y clases.</p>
              <div className="mt-3 rounded-md p-2 text-xs" style={{ backgroundColor: form.secondaryColor }}>
                Highlight con color secundario
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="mr-1 inline h-4 w-4" />
              Resultado premium sin complejidad tecnica.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}