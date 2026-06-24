import { useContext, useEffect, useMemo, useState } from "react";
import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";
import { EnrollmentFormConfig, createDefaultSection, getDefaultEnrollmentConfig } from "@/lib/types/formBuilder";
import { SectionCard } from "./SectionCard";
import { JointEnrollmentSettings } from "./JointEnrollmentSettings";
import { FormPreview } from "./FormPreview";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, CalendarDays, RotateCcw, Tags, LayoutGrid, Users, ChevronDown, ChevronUp, Settings2, Bookmark, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FormBuilderField, FormBuilderSection, FieldType } from "@/lib/types/formBuilder";
import { Textarea } from "@/components/ui/textarea";
import { getEnrollmentFormConfig, saveEnrollmentFormConfig } from "@/lib/api/enrollmentFormConfig";
import { Badge } from "@/components/ui/badge";
import { getStudentFields, type SchoolStudentField } from "@/lib/api/studentFields";

const FORM_BUILDER_UNSAVED_KEY = "nexa:form-builder:unsaved";
const FORM_BUILDER_SAVE_REQUEST_EVENT = "nexa:form-builder:request-save";
const FORM_BUILDER_SAVE_RESULT_EVENT = "nexa:form-builder:save-result";

export function FormBuilder() {
  const [config, setConfig] = useState<EnrollmentFormConfig>(getDefaultEnrollmentConfig);
  const [saving, setSaving] = useState(false);
  // Panel state — only the schedule config panel expands
  const [scheduleConfigOpen, setScheduleConfigOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Preset system
  const [presets, setPresets] = useState<Array<{name: string; config: EnrollmentFormConfig; savedAt: string}>>(() => {
    try {
      const raw = window.localStorage.getItem("nexa:form-builder:presets");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [presetName, setPresetName] = useState("");
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify(getDefaultEnrollmentConfig()));
  const [schoolStudentFields, setSchoolStudentFields] = useState<SchoolStudentField[]>([]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(config) !== lastSavedSnapshot,
    [config, lastSavedSnapshot]
  );
  const navigationContext = useContext(NavigationContext);

  useEffect(() => {
    const loadConfig = async () => {
      const response = await getEnrollmentFormConfig();

      if (!response.success || !response.data?.config) {
        toast.error(response.error?.message || "No se pudo cargar el formulario guardado");
        return;
      }

      setConfig(response.data.config);
      setLastSavedSnapshot(JSON.stringify(response.data.config));
    };

    void loadConfig();
  }, []);

  useEffect(() => {
    const loadSchoolFields = async () => {
      try {
        const fields = await getStudentFields();
        setSchoolStudentFields(fields);
      } catch {
        setSchoolStudentFields([]);
      }
    };

    void loadSchoolFields();
  }, []);

  useEffect(() => {
    if (hasUnsavedChanges) {
      window.localStorage.setItem(FORM_BUILDER_UNSAVED_KEY, "1");
    } else {
      window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const navigator = navigationContext.navigator as {
      block?: (blocker: (tx: { retry: () => void }) => void) => () => void;
    };

    if (typeof navigator.block !== "function") {
      return;
    }

    const unblock = navigator.block((tx) => {
      const confirmLeave = window.confirm(
        "Tienes cambios sin guardar en el Form Builder. Si sales ahora, se perderan. ¿Quieres continuar?"
      );

      if (!confirmLeave) {
        return;
      }

      window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
      unblock();
      tx.retry();
    });

    return unblock;
  }, [hasUnsavedChanges, navigationContext]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleAnchorNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || anchor.target === "_blank") {
        return;
      }

      const isInternal = href.startsWith("/");
      if (!isInternal) {
        return;
      }

      const confirmLeave = window.confirm(
        "Tienes cambios sin guardar en el Form Builder. Si sales ahora, se perderan. ¿Quieres continuar?"
      );

      if (!confirmLeave) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
    };

    document.addEventListener("click", handleAnchorNavigation, true);
    return () => {
      document.removeEventListener("click", handleAnchorNavigation, true);
    };
  }, [hasUnsavedChanges]);

  const updateSection = (index: number, section: FormBuilderSection) => {
    const sections = [...config.sections];
    sections[index] = section;
    setConfig({ ...config, sections });
  };

  const deleteSection = (index: number) => {
    setConfig({ ...config, sections: config.sections.filter((_, i) => i !== index) });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const sections = [...config.sections];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    setConfig({ ...config, sections });
  };

  const addSection = () => {
    setConfig({ ...config, sections: [...config.sections, createDefaultSection()] });
  };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);

    const response = await saveEnrollmentFormConfig(config);
    setSaving(false);

    if (!response.success) {
      toast.error(response.error?.message || "No se pudo guardar el formulario");
      return false;
    }

    setLastSavedSnapshot(JSON.stringify(config));
    toast.success("Formulario guardado correctamente");
    return true;
  };

  useEffect(() => {
    const onRequestSave = () => {
      void (async () => {
        const success = await handleSave();
        window.dispatchEvent(new CustomEvent(FORM_BUILDER_SAVE_RESULT_EVENT, { detail: { success } }));
      })();
    };

    window.addEventListener(FORM_BUILDER_SAVE_REQUEST_EVENT, onRequestSave);
    return () => {
      window.removeEventListener(FORM_BUILDER_SAVE_REQUEST_EVENT, onRequestSave);
    };
  }, [handleSave]);

  const handleReset = () => {
    setConfig(getDefaultEnrollmentConfig());
    toast.info("Formulario restaurado a valores por defecto");
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) { toast.error("Escribe un nombre para el preset"); return; }
    const next = [
      { name, config: JSON.parse(JSON.stringify(config)) as EnrollmentFormConfig, savedAt: new Date().toISOString() },
      ...presets.filter((p) => p.name !== name),
    ];
    setPresets(next);
    window.localStorage.setItem("nexa:form-builder:presets", JSON.stringify(next));
    setPresetName("");
    toast.success(`Preset "${name}" guardado`);
  };

  const loadPreset = (preset: typeof presets[number]) => {
    setConfig(preset.config);
    setPresetsOpen(false);
    toast.success(`Preset "${preset.name}" cargado`);
  };

  const deletePreset = (name: string) => {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    window.localStorage.setItem("nexa:form-builder:presets", JSON.stringify(next));
    toast.info(`Preset "${name}" eliminado`);
  };

  const sectionIndexForStudentData = useMemo(() => {
    const byId = config.sections.findIndex((section) => section.id.toLowerCase().includes("student"));
    if (byId >= 0) return byId;

    const byTitle = config.sections.findIndex((section) => section.title.toLowerCase().includes("alumno"));
    if (byTitle >= 0) return byTitle;

    return 0;
  }, [config.sections]);

  const existingFieldIds = useMemo(() => {
    return new Set(config.sections.flatMap((section) => section.fields.map((field) => field.id)));
  }, [config.sections]);

  const toFormFieldType = (type: SchoolStudentField["type"]): FieldType => {
    if (type === "number") return "number";
    if (type === "date") return "date";
    return "text";
  };

  const makeSchoolFieldFormId = (field: SchoolStudentField) => field.key;

  const makeSchoolFieldFormField = (field: SchoolStudentField): FormBuilderField => ({
    id: makeSchoolFieldFormId(field),
    type: toFormFieldType(field.type),
    label: field.label,
    placeholder: `Ingresa ${field.label.toLowerCase()}`,
    required: field.required,
  });

  const requiredSchoolFieldsNotIncluded = useMemo(() => {
    return schoolStudentFields.filter((field) => field.required && !existingFieldIds.has(makeSchoolFieldFormId(field)));
  }, [schoolStudentFields, existingFieldIds]);

  const addSchoolFieldToForm = (field: SchoolStudentField) => {
    const fieldId = makeSchoolFieldFormId(field);
    if (existingFieldIds.has(fieldId)) {
      toast.info(`El campo ${field.label} ya esta incluido en el formulario`);
      return;
    }

    if (config.sections.length === 0) {
      toast.error("No hay secciones disponibles para agregar el campo");
      return;
    }

    setConfig((prev) => {
      const sections = [...prev.sections];
      const target = sections[sectionIndexForStudentData] ?? sections[0];
      const targetIndex = sections.indexOf(target);
      const nextFields = [...target.fields, makeSchoolFieldFormField(field)];
      sections[targetIndex] = { ...target, fields: nextFields };
      return { ...prev, sections };
    });

    toast.success(`Campo ${field.label} agregado al formulario`);
  };

  const addAllRequiredSchoolFieldsToForm = () => {
    if (requiredSchoolFieldsNotIncluded.length === 0) {
      toast.info("No hay campos requeridos pendientes de agregar");
      return;
    }

    if (config.sections.length === 0) {
      toast.error("No hay secciones disponibles para agregar campos");
      return;
    }

    setConfig((prev) => {
      const sections = [...prev.sections];
      const target = sections[sectionIndexForStudentData] ?? sections[0];
      const targetIndex = sections.indexOf(target);
      const knownIds = new Set(target.fields.map((field) => field.id));
      const fieldsToAdd = requiredSchoolFieldsNotIncluded
        .filter((field) => !knownIds.has(makeSchoolFieldFormId(field)))
        .map((field) => makeSchoolFieldFormField(field));

      if (fieldsToAdd.length === 0) {
        return prev;
      }

      sections[targetIndex] = {
        ...target,
        fields: [...target.fields, ...fieldsToAdd],
      };

      return { ...prev, sections };
    });

    toast.success(`Se agregaron ${requiredSchoolFieldsNotIncluded.length} campo(s) requeridos al formulario`);
  };

  const scheduleSettings = config.scheduleSettings ?? {
    preferredView: "calendar" as const,
    recurringSelectionMode: "linked" as const,
    recurringClassOverrides: [] as string[],
    calendarFields: {
      showDiscipline: true,
      showCategory: false,
      showRoom: true,
      showCapacity: true,
      showPrice: true,
      showSelectedStudents: true,
    },
  };
  const updateSchedule = (next: typeof scheduleSettings) =>
    setConfig({ ...config, scheduleSettings: next });

  function CollapsiblePanel({
    icon: Icon,
    title,
    description,
    open,
    onToggle,
    rightSlot,
    children,
  }: {
    icon: React.ElementType;
    title: string;
    description: string;
    open: boolean;
    onToggle: () => void;
    rightSlot?: React.ReactNode;
    children?: React.ReactNode;
  }) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center gap-3 p-4 text-left hover:bg-accent/30 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
            <Icon className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          </div>
          {rightSlot && <div onClick={(e) => e.stopPropagation()}>{rightSlot}</div>}
          {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </button>
        {open && children && (
          <div className="border-t border-border p-4">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {hasUnsavedChanges && (
          <span className="text-xs font-medium text-warning">Cambios sin guardar</span>
        )}
        {/* Preset system */}
        <div className="relative ml-auto">
          <Button variant="outline" size="sm" onClick={() => setPresetsOpen((v) => !v)}>
            <Bookmark className="h-3.5 w-3.5 mr-1.5" />
            Presets{presets.length > 0 && ` (${presets.length})`}
            <ChevronDown className="ml-1.5 h-3 w-3" />
          </Button>
          {presetsOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border border-border bg-card shadow-xl p-3 space-y-3">
              {/* Save current as preset */}
              <div className="flex gap-2">
                <input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && savePreset()}
                  placeholder="Nombre del preset..."
                  className="flex-1 h-8 rounded-md border border-border bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button size="sm" className="h-8 text-xs" onClick={savePreset}>
                  Guardar
                </Button>
              </div>
              {/* Preset list */}
              {presets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Sin presets guardados</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {presets.map((p) => (
                    <div key={p.name} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 hover:bg-accent/50 transition-colors">
                      <button type="button" onClick={() => loadPreset(p)} className="flex-1 text-left">
                        <p className="text-xs font-medium text-foreground">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(p.savedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </button>
                      <button type="button" onClick={() => deletePreset(p.name)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Restaurar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          Guardar formulario
        </Button>
      </div>

      {/* Side-by-side layout */}
      <div className="flex gap-6 items-start">
        {/* Left — Configuration */}
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">Opciones del formulario</p>

          {/* 4 options in a single flex row */}
          <div className="flex flex-wrap gap-2">
            {/* 1. Selección de clases — toggle only */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, includeSchedule: !config.includeSchedule })}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                config.includeSchedule
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span className="text-xs">Clases por horario</span>
              <Switch
                checked={config.includeSchedule}
                onCheckedChange={(checked) => { setConfig({ ...config, includeSchedule: checked }); }}
                onClick={(e) => e.stopPropagation()}
                className="scale-75 origin-right"
              />
            </button>

            {/* 2. Tarifas — toggle only */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, includePricing: !(config.includePricing ?? true) })}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                (config.includePricing ?? true)
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Tags className="h-4 w-4 shrink-0" />
              <span className="text-xs">Tarifas y bonos</span>
              <Switch
                checked={config.includePricing ?? true}
                onCheckedChange={(checked) => { setConfig({ ...config, includePricing: checked }); }}
                onClick={(e) => e.stopPropagation()}
                className="scale-75 origin-right"
              />
            </button>

            {/* 3. Matrícula conjunta — toggle only (maxStudents inline when enabled) */}
            <button
              type="button"
              onClick={() => setConfig({ ...config, jointEnrollment: { ...config.jointEnrollment, enabled: !config.jointEnrollment?.enabled } })}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                config.jointEnrollment?.enabled
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="text-xs">Matrícula conjunta</span>
              {config.jointEnrollment?.enabled && (
                <span className="text-[10px] text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                  · máx{" "}
                  <input
                    type="number" min={2} max={20}
                    value={config.jointEnrollment?.maxStudents ?? 5}
                    onChange={(e) => setConfig({ ...config, jointEnrollment: { ...config.jointEnrollment, maxStudents: Math.max(2, Math.min(20, parseInt(e.target.value) || 2)) } })}
                    className="w-10 h-5 rounded border border-border bg-background text-center text-[10px] px-1 inline-block"
                  />
                </span>
              )}
              <Switch
                checked={Boolean(config.jointEnrollment?.enabled)}
                onCheckedChange={(checked) => { setConfig({ ...config, jointEnrollment: { ...config.jointEnrollment, enabled: checked } }); }}
                onClick={(e) => e.stopPropagation()}
                className="scale-75 origin-right"
              />
            </button>

            {/* 4. Configuración del horario — expandable (last) */}
            <button
              type="button"
              onClick={() => setScheduleConfigOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                scheduleConfigOpen
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span className="text-xs">Configuración del horario</span>
              {scheduleConfigOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {/* Configuración del horario — expanded panel */}
          {scheduleConfigOpen && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Vista preferida</Label>
                  <div className="flex rounded-md border overflow-hidden">
                    {["calendar", "list"].map((v) => (
                      <button key={v} type="button"
                        className={`flex-1 text-xs px-3 py-1.5 ${scheduleSettings.preferredView === v ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}
                        onClick={() => updateSchedule({ ...scheduleSettings, preferredView: v as "calendar" | "list" })}
                      >
                        {v === "calendar" ? "Calendario" : "Lista"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Clases recurrentes</Label>
                  <div className="flex rounded-md border overflow-hidden">
                    {([["linked", "Enlazadas"], ["single_day", "Por día"]] as const).map(([v, label]) => (
                      <button key={v} type="button"
                        className={`flex-1 text-xs px-3 py-1.5 ${scheduleSettings.recurringSelectionMode === v ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}
                        onClick={() => updateSchedule({ ...scheduleSettings, recurringSelectionMode: v })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Campos visibles en tarjetas del calendario</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    ["showDiscipline", "Disciplina"], ["showRoom", "Aula"],
                    ["showCapacity", "Capacidad"], ["showPrice", "Precio"],
                    ["showSelectedStudents", "Alumnos seleccionados"], ["showCategory", "Categoría"],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                      <span className="text-xs">{label}</span>
                      <Switch
                        checked={Boolean(scheduleSettings.calendarFields[key])}
                        onCheckedChange={(checked) =>
                          updateSchedule({ ...scheduleSettings, calendarFields: { ...scheduleSettings.calendarFields, [key]: Boolean(checked) } })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Advanced */}
          <div className="rounded-xl border border-dashed border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span className="font-medium">Configuración avanzada</span>
              <span className="text-muted-foreground/60">· Campos personalizados, IDs de clase</span>
              {advancedOpen ? <ChevronUp className="ml-auto h-3.5 w-3.5" /> : <ChevronDown className="ml-auto h-3.5 w-3.5" />}
            </button>
            {advancedOpen && (
              <div className="border-t border-dashed border-border p-4 space-y-4">
                {/* Class ID overrides */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">IDs de clase para anular modo recurrente (separados por coma)</Label>
                  <Textarea
                    rows={2}
                    className="text-xs"
                    placeholder="uuid-1, uuid-2"
                    value={scheduleSettings.recurringClassOverrides.join(", ")}
                    onChange={(e) => {
                      const ids = e.target.value.split(",").map((v) => v.trim()).filter(Boolean);
                      updateSchedule({ ...scheduleSettings, recurringClassOverrides: ids });
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Anula el modo de selección para estas clases específicas.
                  </p>
                </div>

                {/* Custom fields */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Campos personalizados de la escuela</Label>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addAllRequiredSchoolFieldsToForm} disabled={requiredSchoolFieldsNotIncluded.length === 0}>
                      Añadir requeridos ({requiredSchoolFieldsNotIncluded.length})
                    </Button>
                  </div>
                  {schoolStudentFields.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No hay campos personalizados configurados.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {schoolStudentFields.map((field) => {
                        const included = existingFieldIds.has(makeSchoolFieldFormId(field));
                        return (
                          <div key={field.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                            <div>
                              <span className="text-xs font-medium">{field.label}</span>
                              <span className="ml-1 text-[10px] text-muted-foreground">({field.key})</span>
                              {field.required && <Badge variant="outline" className="ml-1 text-[9px] h-4">Req.</Badge>}
                            </div>
                            <Button size="sm" className="h-6 text-[10px] px-2" variant={included ? "outline" : "default"} disabled={included} onClick={() => addSchoolFieldToForm(field)}>
                              {included ? "Añadido" : "Añadir"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form sections editor */}
          <div className="pt-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-0.5">Secciones del formulario</p>
            <div className="rounded-xl border-2 border-primary/20 bg-primary/[0.02] p-4 space-y-3">
              {config.sections.map((section, i) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={i}
                  totalSections={config.sections.length}
                  allSections={config.sections}
                  onUpdate={(s) => updateSection(i, s)}
                  onDelete={() => deleteSection(i)}
                  onMove={(dir) => moveSection(i, dir)}
                />
              ))}
              <Button variant="outline" className="w-full border-dashed" onClick={addSection}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir sección
              </Button>
            </div>
          </div>
        </div>

        {/* Right — Preview (sticky) */}
        <div className="hidden xl:block w-[380px] shrink-0 sticky top-20">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-0.5">Vista previa en tiempo real</p>
          <div className="rounded-xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Así lo verán tus alumnos al matricularse</p>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-4">
              <FormPreview config={config} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
