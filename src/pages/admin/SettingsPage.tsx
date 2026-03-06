import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Clock, CreditCard, Bell, Palette, Globe, Save, RotateCcw,
  Mail, Phone, MapPin, Instagram, Facebook,
} from "lucide-react";
import { toast } from "sonner";

interface SchoolInfo {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  description: string;
  website: string;
  instagram: string;
  facebook: string;
}

interface ScheduleConfig {
  startHour: string;
  endHour: string;
  slotDuration: string;
  workDays: string[];
  allowTrialClass: boolean;
  maxClassesPerStudent: string;
}

interface PaymentConfig {
  currency: string;
  dueDayOfMonth: string;
  gracePeriodDays: string;
  enableTransfer: boolean;
  enableCash: boolean;
  transferAlias: string;
  transferCBU: string;
  autoReminders: boolean;
}

interface NotificationConfig {
  emailNewEnrollment: boolean;
  emailPaymentReceived: boolean;
  emailPaymentOverdue: boolean;
  emailClassCancelled: boolean;
  reminderDaysBefore: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, "0")}:00`;
});

export default function SettingsPage() {
  const [school, setSchool] = useState<SchoolInfo>({
    name: "DanceHub Studio",
    slug: "dancehub",
    email: "info@dancehub.com",
    phone: "(011) 5555-0000",
    address: "Av. Corrientes 1234, Piso 3",
    city: "Buenos Aires",
    description: "Escuela de danza con más de 15 años de trayectoria ofreciendo clases de ballet, contemporáneo, jazz, tango, salsa y más.",
    website: "https://dancehub.com",
    instagram: "@dancehub.studio",
    facebook: "dancehubstudio",
  });

  const [schedule, setSchedule] = useState<ScheduleConfig>({
    startHour: "08:00",
    endHour: "21:00",
    slotDuration: "90",
    workDays: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
    allowTrialClass: true,
    maxClassesPerStudent: "5",
  });

  const [payment, setPayment] = useState<PaymentConfig>({
    currency: "ARS",
    dueDayOfMonth: "10",
    gracePeriodDays: "5",
    enableTransfer: true,
    enableCash: true,
    transferAlias: "dancehub.studio",
    transferCBU: "0000003100012345678901",
    autoReminders: true,
  });

  const [notifications, setNotifications] = useState<NotificationConfig>({
    emailNewEnrollment: true,
    emailPaymentReceived: true,
    emailPaymentOverdue: true,
    emailClassCancelled: true,
    reminderDaysBefore: "3",
  });

  const handleSave = (section: string) => {
    toast.success(`${section} guardada correctamente`);
  };

  return (
    <PageContainer title="Configuración" description="Configura tu escuela de danza">
      <Tabs defaultValue="school" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="school" className="text-xs gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Escuela
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Horarios
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Pagos
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Notificaciones
          </TabsTrigger>
        </TabsList>

        {/* ─── School Info ─── */}
        <TabsContent value="school">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Información de la Escuela</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Datos principales que se mostrarán en tu página pública</p>
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup label="Nombre de la escuela" icon={Building2}>
                <Input value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} className="h-9 text-sm" />
              </FieldGroup>
              <FieldGroup label="Slug (URL pública)" icon={Globe}>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">/s/</span>
                  <Input value={school.slug} onChange={(e) => setSchool({ ...school, slug: e.target.value })} className="h-9 text-sm" />
                </div>
              </FieldGroup>
              <FieldGroup label="Email de contacto" icon={Mail}>
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

            <FieldGroup label="Descripción">
              <Textarea value={school.description} onChange={(e) => setSchool({ ...school, description: e.target.value })} className="text-sm min-h-[80px]" />
            </FieldGroup>

            <Separator />
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Redes Sociales</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <FieldGroup label="Sitio web" icon={Globe}>
                  <Input value={school.website} onChange={(e) => setSchool({ ...school, website: e.target.value })} className="h-9 text-sm" />
                </FieldGroup>
                <FieldGroup label="Instagram" icon={Instagram}>
                  <Input value={school.instagram} onChange={(e) => setSchool({ ...school, instagram: e.target.value })} className="h-9 text-sm" />
                </FieldGroup>
                <FieldGroup label="Facebook" icon={Facebook}>
                  <Input value={school.facebook} onChange={(e) => setSchool({ ...school, facebook: e.target.value })} className="h-9 text-sm" />
                </FieldGroup>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => handleSave("Información de la escuela")}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── Schedule Config ─── */}
        <TabsContent value="schedule">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Configuración de Horarios</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Define el rango horario y los días de funcionamiento</p>
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <FieldGroup label="Hora de inicio">
                <Select value={schedule.startHour} onValueChange={(v) => setSchedule({ ...schedule, startHour: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Hora de fin">
                <Select value={schedule.endHour} onValueChange={(v) => setSchedule({ ...schedule, endHour: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Duración del bloque (min)">
                <Select value={schedule.slotDuration} onValueChange={(v) => setSchedule({ ...schedule, slotDuration: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["30", "45", "60", "90", "120"].map((d) => <SelectItem key={d} value={d}>{d} min</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>

            <FieldGroup label="Días de funcionamiento">
              <div className="flex flex-wrap gap-2 mt-1">
                {DAYS.map((day) => {
                  const active = schedule.workDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() =>
                        setSchedule({
                          ...schedule,
                          workDays: active
                            ? schedule.workDays.filter((d) => d !== day)
                            : [...schedule.workDays, day],
                        })
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        active
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </FieldGroup>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <SwitchRow
                label="Permitir clase de prueba"
                description="Los alumnos pueden tomar una clase gratis antes de inscribirse"
                checked={schedule.allowTrialClass}
                onChange={(v) => setSchedule({ ...schedule, allowTrialClass: v })}
              />
              <FieldGroup label="Máx. clases por alumno">
                <Input
                  type="number" min="1" max="10"
                  value={schedule.maxClassesPerStudent}
                  onChange={(e) => setSchedule({ ...schedule, maxClassesPerStudent: e.target.value })}
                  className="h-9 text-sm w-24"
                />
              </FieldGroup>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => handleSave("Configuración de horarios")}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── Payment Config ─── */}
        <TabsContent value="payments">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Configuración de Pagos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Métodos de pago aceptados y políticas de cobro</p>
            </div>
            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <FieldGroup label="Moneda">
                <Select value={payment.currency} onValueChange={(v) => setPayment({ ...payment, currency: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS ($)</SelectItem>
                    <SelectItem value="USD">USD (US$)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Día de vencimiento">
                <Input
                  type="number" min="1" max="28"
                  value={payment.dueDayOfMonth}
                  onChange={(e) => setPayment({ ...payment, dueDayOfMonth: e.target.value })}
                  className="h-9 text-sm w-24"
                />
              </FieldGroup>
              <FieldGroup label="Días de gracia">
                <Input
                  type="number" min="0" max="15"
                  value={payment.gracePeriodDays}
                  onChange={(e) => setPayment({ ...payment, gracePeriodDays: e.target.value })}
                  className="h-9 text-sm w-24"
                />
              </FieldGroup>
            </div>

            <Separator />
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Métodos Habilitados</h4>

            <div className="space-y-4">
              <SwitchRow
                label="Transferencia bancaria"
                description="Permitir pagos por transferencia"
                checked={payment.enableTransfer}
                onChange={(v) => setPayment({ ...payment, enableTransfer: v })}
              />
              {payment.enableTransfer && (
                <div className="grid gap-4 sm:grid-cols-2 pl-6 border-l-2 border-primary/20">
                  <FieldGroup label="Alias">
                    <Input value={payment.transferAlias} onChange={(e) => setPayment({ ...payment, transferAlias: e.target.value })} className="h-9 text-sm" />
                  </FieldGroup>
                  <FieldGroup label="CBU / CVU">
                    <Input value={payment.transferCBU} onChange={(e) => setPayment({ ...payment, transferCBU: e.target.value })} className="h-9 text-sm" />
                  </FieldGroup>
                </div>
              )}

              <SwitchRow
                label="Efectivo"
                description="Permitir pagos en efectivo presencial"
                checked={payment.enableCash}
                onChange={(v) => setPayment({ ...payment, enableCash: v })}
              />
            </div>

            <Separator />

            <SwitchRow
              label="Recordatorios automáticos"
              description="Enviar email de recordatorio antes del vencimiento"
              checked={payment.autoReminders}
              onChange={(v) => setPayment({ ...payment, autoReminders: v })}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => handleSave("Configuración de pagos")}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>

        {/* ─── Notifications ─── */}
        <TabsContent value="notifications">
          <div className="rounded-lg border border-border bg-card p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Configura qué notificaciones recibís por email</p>
            </div>
            <Separator />

            <div className="space-y-4">
              <SwitchRow
                label="Nueva inscripción"
                description="Recibir email cuando un alumno se inscribe"
                checked={notifications.emailNewEnrollment}
                onChange={(v) => setNotifications({ ...notifications, emailNewEnrollment: v })}
              />
              <SwitchRow
                label="Pago recibido"
                description="Recibir email cuando se registra un pago"
                checked={notifications.emailPaymentReceived}
                onChange={(v) => setNotifications({ ...notifications, emailPaymentReceived: v })}
              />
              <SwitchRow
                label="Pago vencido"
                description="Recibir alerta cuando un pago supera la fecha de vencimiento"
                checked={notifications.emailPaymentOverdue}
                onChange={(v) => setNotifications({ ...notifications, emailPaymentOverdue: v })}
              />
              <SwitchRow
                label="Clase cancelada"
                description="Notificar cuando una clase es cancelada"
                checked={notifications.emailClassCancelled}
                onChange={(v) => setNotifications({ ...notifications, emailClassCancelled: v })}
              />
            </div>

            <Separator />

            <FieldGroup label="Enviar recordatorio X días antes del vencimiento">
              <Input
                type="number" min="1" max="10"
                value={notifications.reminderDaysBefore}
                onChange={(e) => setNotifications({ ...notifications, reminderDaysBefore: e.target.value })}
                className="h-9 text-sm w-24"
              />
            </FieldGroup>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5 mr-1" /> Restablecer</Button>
              <Button size="sm" onClick={() => handleSave("Notificaciones")}><Save className="h-3.5 w-3.5 mr-1" /> Guardar</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

/* ── Helpers ── */

function FieldGroup({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        {label}
      </Label>
      {children}
    </div>
  );
}

function SwitchRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
