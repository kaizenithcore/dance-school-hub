import { useState, useEffect } from "react";
import { StudentRecord } from "@/lib/data/mockStudents";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { SchoolStudentField } from "@/lib/api/studentFields";

interface StudentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: StudentRecord | null;
  customFields?: SchoolStudentField[];
  onSave: (data: Omit<StudentRecord, "id">) => Promise<boolean>;
}

const EMPTY: Omit<StudentRecord, "id"> = {
  name: "", email: "", phone: "", birthdate: "",
  address: "", locality: "", identityDocumentType: undefined, identityDocumentNumber: "",
  enrolledClasses: [], status: "active", joinDate: new Date().toISOString().slice(0, 10),
  paymentType: "monthly", notes: "",
  payerType: "student",
  payerName: "",
  payerEmail: "",
  payerPhone: "",
  preferredPaymentMethod: "cash",
  accountNumber: "",
  extraData: {},
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hasMinDigits(value: string, min: number): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= min;
}

function isValidDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function StudentFormModal({ open, onOpenChange, student, customFields = [], onSave }: StudentFormModalProps) {
  const isEdit = !!student;
  const [form, setForm] = useState<Omit<StudentRecord, "id">>(EMPTY);
  const [hasGuardian, setHasGuardian] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const isMinor = (() => {
    if (!form.birthdate) return false;
    const birth = new Date(form.birthdate);
    if (Number.isNaN(birth.getTime())) return false;
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear() - (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
        ? 1
        : 0
    );
    return age < 18;
  })();

  useEffect(() => {
    if (student) {
      const { id, ...rest } = student;
      setForm({ ...rest, extraData: rest.extraData || {} });
      setHasGuardian(!!student.guardian);
    } else {
      setForm(EMPTY);
      setHasGuardian(false);
    }
    setErrors({});
  }, [student, open]);

  useEffect(() => {
    if (form.payerType === "guardian" && !hasGuardian) {
      setHasGuardian(true);
    }
  }, [form.payerType, hasGuardian]);

  const set = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const setGuardian = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      guardian: { ...(prev.guardian || { name: "", phone: "", email: "" }), [key]: value },
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Obligatorio";
    else if (form.name.trim().length > 120) e.name = "Máximo 120 caracteres";

    if (!form.email.trim()) e.email = "Obligatorio";
    else if (!EMAIL_REGEX.test(form.email.trim())) e.email = "Email inválido";

    if (!form.phone.trim()) e.phone = "Obligatorio";
    else if (!hasMinDigits(form.phone, 6)) e.phone = "Teléfono inválido";

    if (form.identityDocumentNumber?.trim() && !form.identityDocumentType) {
      e.identityDocumentType = "Obligatorio";
    }
    if (form.identityDocumentType && !form.identityDocumentNumber?.trim()) {
      e.identityDocumentNumber = "Obligatorio";
    } else if (form.identityDocumentType && form.identityDocumentNumber?.trim()) {
      const normalizedDoc = form.identityDocumentNumber.trim();
      if (form.identityDocumentType === "dni" && !/^\d{7,8}[A-Za-z]?$/.test(normalizedDoc)) {
        e.identityDocumentNumber = "DNI inválido";
      }
      if (form.identityDocumentType === "passport" && !/^[A-Za-z0-9]{5,20}$/.test(normalizedDoc)) {
        e.identityDocumentNumber = "Pasaporte inválido";
      }
    }

    if (!form.birthdate) e.birthdate = "Obligatorio";
    else if (!isValidDate(form.birthdate)) e.birthdate = "Fecha inválida";
    else if (new Date(form.birthdate) > new Date()) e.birthdate = "No puede ser futura";

    if (form.joinDate && !isValidDate(form.joinDate)) {
      e.joinDate = "Fecha inválida";
    }

    if (form.address && form.address.trim().length > 180) {
      e.address = "Máximo 180 caracteres";
    }

    if (form.locality && form.locality.trim().length > 120) {
      e.locality = "Máximo 120 caracteres";
    }

    if (form.notes && form.notes.length > 2000) {
      e.notes = "Máximo 2000 caracteres";
    }

    const requiresGuardianData = hasGuardian || isMinor || form.payerType === "guardian";
    if (requiresGuardianData) {
      if (!form.guardian?.name?.trim()) e.guardian_name = "Obligatorio";
      if (!form.guardian?.phone?.trim()) e.guardian_phone = "Obligatorio";
      else if (!hasMinDigits(form.guardian.phone, 6)) e.guardian_phone = "Teléfono inválido";
      if (form.guardian?.email?.trim() && !EMAIL_REGEX.test(form.guardian.email.trim())) {
        e.guardian_email = "Email inválido";
      }
    }

    if (!form.payerType) {
      e.payerType = "Obligatorio";
    }

    if (!form.preferredPaymentMethod) {
      e.preferredPaymentMethod = "Obligatorio";
    }

    if (form.payerType === "other") {
      if (!form.payerName?.trim()) e.payerName = "Obligatorio";
      if (!form.payerPhone?.trim()) e.payerPhone = "Obligatorio";
      else if (!hasMinDigits(form.payerPhone, 6)) e.payerPhone = "Teléfono inválido";
      if (!form.payerEmail?.trim()) {
        e.payerEmail = "Obligatorio";
      } else if (!EMAIL_REGEX.test(form.payerEmail.trim())) {
        e.payerEmail = "Email inválido";
      }
    }

    if (form.preferredPaymentMethod === "transfer" && form.accountNumber?.trim() === "") {
      e.accountNumber = "Obligatorio";
    } else if (form.preferredPaymentMethod === "transfer" && form.accountNumber && form.accountNumber.trim().length < 8) {
      e.accountNumber = "Cuenta inválida";
    }

    for (const field of customFields.filter((item) => item.visible && item.required)) {
      const rawValue = form.extraData?.[field.key];
      if (rawValue == null || String(rawValue).trim() === "") {
        e[`custom_${field.key}`] = "Obligatorio";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const data = { ...form };
    if (!hasGuardian && !isMinor) {
      delete data.guardian;
    } else if (data.guardian) {
      data.guardian = {
        ...data.guardian,
        email: data.guardian.email?.trim() ? data.guardian.email.trim() : undefined,
      };
    }

    if (data.payerType !== "other") {
      data.payerName = undefined;
      data.payerEmail = undefined;
      data.payerPhone = undefined;
    }

    if (data.preferredPaymentMethod !== "transfer") {
      data.accountNumber = undefined;
    }

    data.extraData = { ...(data.extraData || {}) };

    setIsLoading(true);
    try {
      const ok = await onSave(data);
      if (ok) {
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Alumno" : "Nuevo Alumno"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Modifica los datos del alumno y guarda cambios." : "Completa la ficha para registrar un nuevo alumno."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm">Nombre completo *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nombre completo" disabled={isLoading} className={errors.name ? "border-destructive" : ""} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@ejemplo.com" disabled={isLoading} className={errors.email ? "border-destructive" : ""} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Teléfono *</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(011) 1234-5678" disabled={isLoading} className={errors.phone ? "border-destructive" : ""} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Domicilio</Label>
              <Input
                value={form.address || ""}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Calle, número, piso..."
                disabled={isLoading}
                className={errors.address ? "border-destructive" : ""}
              />
              {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Localidad</Label>
              <Input
                value={form.locality || ""}
                onChange={(e) => set("locality", e.target.value)}
                placeholder="Ej: Madrid"
                disabled={isLoading}
                className={errors.locality ? "border-destructive" : ""}
              />
              {errors.locality && <p className="text-xs text-destructive">{errors.locality}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de documento</Label>
              <Select
                value={form.identityDocumentType || "none"}
                onValueChange={(v) => set("identityDocumentType", v === "none" ? undefined : v)}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.identityDocumentType ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin documento</SelectItem>
                  <SelectItem value="dni">DNI</SelectItem>
                  <SelectItem value="passport">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
              {errors.identityDocumentType && <p className="text-xs text-destructive">{errors.identityDocumentType}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Nº DNI/Pasaporte</Label>
              <Input
                value={form.identityDocumentNumber || ""}
                onChange={(e) => set("identityDocumentNumber", e.target.value)}
                placeholder="Documento identificativo"
                disabled={isLoading}
                className={errors.identityDocumentNumber ? "border-destructive" : ""}
              />
              {errors.identityDocumentNumber && <p className="text-xs text-destructive">{errors.identityDocumentNumber}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Fecha de nacimiento *</Label>
              <Input type="date" value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} disabled={isLoading} className={errors.birthdate ? "border-destructive" : ""} />
              {errors.birthdate && <p className="text-xs text-destructive">{errors.birthdate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo de pago</Label>
              <Select value={form.paymentType} onValueChange={(v) => set("paymentType", v)} disabled={isLoading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="per_class">Por clase</SelectItem>
                  <SelectItem value="none">Sin pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Estado</Label>
              <Select value={form.status} onValueChange={(v: any) => set("status", v)} disabled={isLoading}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Fecha de ingreso</Label>
              <Input type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} disabled={isLoading} className={errors.joinDate ? "border-destructive" : ""} />
              {errors.joinDate && <p className="text-xs text-destructive">{errors.joinDate}</p>}
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Datos de pago
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Quién realiza el pago *</Label>
                <Select
                  value={form.payerType || "student"}
                  onValueChange={(v) => set("payerType", v)}
                  disabled={isLoading}
                >
                  <SelectTrigger className={errors.payerType ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">El propio alumno</SelectItem>
                    <SelectItem value="guardian">Tutor o responsable</SelectItem>
                    <SelectItem value="other">Otra persona</SelectItem>
                  </SelectContent>
                </Select>
                {errors.payerType && <p className="text-xs text-destructive">{errors.payerType}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Método de pago *</Label>
                <Select
                  value={form.preferredPaymentMethod || "cash"}
                  onValueChange={(v) => set("preferredPaymentMethod", v)}
                  disabled={isLoading}
                >
                  <SelectTrigger className={errors.preferredPaymentMethod ? "border-destructive" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferencia bancaria</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                  </SelectContent>
                </Select>
                {errors.preferredPaymentMethod && <p className="text-xs text-destructive">{errors.preferredPaymentMethod}</p>}
              </div>
            </div>

            {form.payerType === "other" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm">Nombre del pagador *</Label>
                  <Input
                    value={form.payerName || ""}
                    onChange={(e) => set("payerName", e.target.value)}
                    placeholder="Nombre completo"
                    disabled={isLoading}
                    className={errors.payerName ? "border-destructive" : ""}
                  />
                  {errors.payerName && <p className="text-xs text-destructive">{errors.payerName}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Email del pagador *</Label>
                  <Input
                    type="email"
                    value={form.payerEmail || ""}
                    onChange={(e) => set("payerEmail", e.target.value)}
                    placeholder="pagador@ejemplo.com"
                    disabled={isLoading}
                    className={errors.payerEmail ? "border-destructive" : ""}
                  />
                  {errors.payerEmail && <p className="text-xs text-destructive">{errors.payerEmail}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Teléfono del pagador *</Label>
                  <Input
                    value={form.payerPhone || ""}
                    onChange={(e) => set("payerPhone", e.target.value)}
                    placeholder="(011) 1234-5678"
                    disabled={isLoading}
                    className={errors.payerPhone ? "border-destructive" : ""}
                  />
                  {errors.payerPhone && <p className="text-xs text-destructive">{errors.payerPhone}</p>}
                </div>
              </div>
            )}

            {form.preferredPaymentMethod === "transfer" && (
              <div className="space-y-1.5">
                <Label className="text-sm">Número de cuenta (IBAN/CBU) *</Label>
                <Input
                  value={form.accountNumber || ""}
                  onChange={(e) => set("accountNumber", e.target.value)}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  disabled={isLoading}
                  className={errors.accountNumber ? "border-destructive" : ""}
                />
                {errors.accountNumber && <p className="text-xs text-destructive">{errors.accountNumber}</p>}
              </div>
            )}
          </div>

          {/* Guardian toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="has-guardian"
              checked={hasGuardian || isMinor || form.payerType === "guardian"}
              onChange={(e) => setHasGuardian(e.target.checked)}
              disabled={isLoading || isMinor || form.payerType === "guardian"}
              className="rounded border-border"
            />
            <Label htmlFor="has-guardian" className="text-sm font-normal cursor-pointer">
              Tiene tutor / responsable {isMinor ? "(obligatorio por menor de edad)" : form.payerType === "guardian" ? "(obligatorio si paga el tutor)" : ""}
            </Label>
          </div>

          {(hasGuardian || isMinor || form.payerType === "guardian") && (
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos del Tutor</p>
              <div className="space-y-1.5">
                <Label className="text-sm">Nombre *</Label>
                <Input value={form.guardian?.name || ""} onChange={(e) => setGuardian("name", e.target.value)} disabled={isLoading} className={errors.guardian_name ? "border-destructive" : ""} />
                {errors.guardian_name && <p className="text-xs text-destructive">{errors.guardian_name}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Teléfono *</Label>
                  <Input value={form.guardian?.phone || ""} onChange={(e) => setGuardian("phone", e.target.value)} disabled={isLoading} className={errors.guardian_phone ? "border-destructive" : ""} />
                  {errors.guardian_phone && <p className="text-xs text-destructive">{errors.guardian_phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Email</Label>
                  <Input type="email" value={form.guardian?.email || ""} onChange={(e) => setGuardian("email", e.target.value)} disabled={isLoading} className={errors.guardian_email ? "border-destructive" : ""} />
                  {errors.guardian_email && <p className="text-xs text-destructive">{errors.guardian_email}</p>}
                </div>
              </div>
            </div>
          )}

          {customFields.filter((field) => field.visible).length > 0 && (
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Campos personalizados</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {customFields.filter((field) => field.visible).map((field) => {
                  const value = form.extraData?.[field.key];
                  const errorKey = `custom_${field.key}`;

                  if (field.type === "date") {
                    return (
                      <div className="space-y-1.5" key={field.id}>
                        <Label className="text-sm">{field.label}{field.required ? " *" : ""}</Label>
                        <Input
                          type="date"
                          value={typeof value === "string" ? value : ""}
                          onChange={(event) => set("extraData", { ...(form.extraData || {}), [field.key]: event.target.value })}
                          disabled={isLoading}
                          className={errors[errorKey] ? "border-destructive" : ""}
                        />
                        {errors[errorKey] && <p className="text-xs text-destructive">{errors[errorKey]}</p>}
                      </div>
                    );
                  }

                  if (field.type === "number") {
                    return (
                      <div className="space-y-1.5" key={field.id}>
                        <Label className="text-sm">{field.label}{field.required ? " *" : ""}</Label>
                        <Input
                          type="number"
                          value={value == null ? "" : String(value)}
                          onChange={(event) => set("extraData", { ...(form.extraData || {}), [field.key]: event.target.value })}
                          disabled={isLoading}
                          className={errors[errorKey] ? "border-destructive" : ""}
                        />
                        {errors[errorKey] && <p className="text-xs text-destructive">{errors[errorKey]}</p>}
                      </div>
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <div className="space-y-1.5" key={field.id}>
                        <Label className="text-sm">{field.label}{field.required ? " *" : ""}</Label>
                        <Input
                          value={value == null ? "" : String(value)}
                          onChange={(event) => set("extraData", { ...(form.extraData || {}), [field.key]: event.target.value })}
                          placeholder="Valor"
                          disabled={isLoading}
                          className={errors[errorKey] ? "border-destructive" : ""}
                        />
                        {errors[errorKey] && <p className="text-xs text-destructive">{errors[errorKey]}</p>}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-1.5" key={field.id}>
                      <Label className="text-sm">{field.label}{field.required ? " *" : ""}</Label>
                      <Input
                        value={value == null ? "" : String(value)}
                        onChange={(event) => set("extraData", { ...(form.extraData || {}), [field.key]: event.target.value })}
                        placeholder={field.label}
                        disabled={isLoading}
                        className={errors[errorKey] ? "border-destructive" : ""}
                      />
                      {errors[errorKey] && <p className="text-xs text-destructive">{errors[errorKey]}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">Notas</Label>
            <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="Observaciones sobre el alumno..." rows={2} disabled={isLoading} className={errors.notes ? "resize-none border-destructive" : "resize-none"} />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Guardar Cambios" : "Crear Alumno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
