import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ClipboardPlus, CreditCard, Download, Loader2, Search, UserRound } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getStudents } from "@/lib/api/students";
import { getClasses } from "@/lib/api/classes";
import { createIncident, getIncidents, type IncidentRecord, type IncidentType, updateIncident } from "@/lib/api/incidents";
import { recordPayment } from "@/lib/api/payments";
import { downloadAttendanceSheetPdf } from "@/lib/api/attendance";
import { useEffect } from "react";

const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  absence: "Ausencia",
  injury: "Lesión",
  group_change: "Cambio de grupo",
  other: "Otra",
};

export default function ReceptionPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof getStudents>>>([]);
  const [classes, setClasses] = useState<Awaited<ReturnType<typeof getClasses>>>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [busy, setBusy] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("50");

  const [incidentStudentId, setIncidentStudentId] = useState("");
  const [incidentClassId, setIncidentClassId] = useState("none");
  const [incidentType, setIncidentType] = useState<IncidentType>("absence");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 10));
  const [incidentNotes, setIncidentNotes] = useState("");

  const [attendanceClassId, setAttendanceClassId] = useState("");
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().slice(0, 7));

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const filteredStudents = useMemo(() => {
    if (!searchText.trim()) {
      return students.slice(0, 8);
    }

    const normalized = searchText.trim().toLowerCase();
    return students
      .filter((student) => {
        return (
          student.name.toLowerCase().includes(normalized) ||
          student.email.toLowerCase().includes(normalized) ||
          student.phone.toLowerCase().includes(normalized)
        );
      })
      .slice(0, 12);
  }, [students, searchText]);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [studentsData, classesData, incidentsData] = await Promise.all([
        getStudents(),
        getClasses(),
        getIncidents({ fromDate: today, toDate: today, limit: 20 }),
      ]);

      setStudents(studentsData);
      setClasses(classesData);
      setIncidents(incidentsData);
      setAttendanceClassId((current) => current || classesData[0]?.id || "");
      setSelectedStudentId((current) => current || studentsData[0]?.id || "");
      setIncidentStudentId((current) => current || studentsData[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar recepción");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleRecordPayment = async () => {
    if (!selectedStudentId) {
      toast.error("Selecciona un alumno");
      return;
    }

    const amount = Number.parseFloat(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Importe no válido");
      return;
    }

    setBusy(true);
    try {
      await recordPayment({
        studentId: selectedStudentId,
        amount,
        status: "paid",
        metadata: {
          concept: "Pago registrado en recepción",
        },
      });
      toast.success("Pago registrado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el pago");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateIncident = async () => {
    if (!incidentStudentId) {
      toast.error("Selecciona un alumno");
      return;
    }

    setBusy(true);
    try {
      const created = await createIncident({
        studentId: incidentStudentId,
        classId: incidentClassId === "none" ? null : incidentClassId,
        type: incidentType,
        startDate: incidentDate,
        notes: incidentNotes,
      });

      setIncidents((prev) => [created, ...prev].slice(0, 20));
      setIncidentNotes("");
      toast.success("Incidencia guardada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la incidencia");
    } finally {
      setBusy(false);
    }
  };

  const handleResolveIncident = async (incident: IncidentRecord) => {
    setBusy(true);
    try {
      const updated = await updateIncident(incident.id, {
        status: incident.status === "open" ? "resolved" : "open",
      });

      setIncidents((prev) => prev.map((item) => (item.id === incident.id ? updated : item)));
      toast.success(updated.status === "resolved" ? "Incidencia cerrada" : "Incidencia reabierta");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la incidencia");
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadAttendance = async () => {
    if (!attendanceClassId) {
      toast.error("Selecciona una clase");
      return;
    }

    setBusy(true);
    try {
      const blob = await downloadAttendanceSheetPdf(attendanceClassId, attendanceMonth);
      const className = classes.find((cls) => cls.id === attendanceClassId)?.name || "clase";
      const fileName = `hoja-asistencia-${className.replace(/\s+/g, "-").toLowerCase()}-${attendanceMonth}.pdf`;
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      toast.success("Hoja de asistencia descargada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar la hoja de asistencia");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer
      title="Recepción"
      description="Pantalla rápida para atención diaria: alumnos, pagos, incidencias y asistencia."
      actions={
        <Button variant="outline" onClick={() => void loadData()} disabled={loading || busy}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Actualizar
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-4 w-4" /> Buscar alumno</CardTitle>
            <CardDescription>Encuentra rápido por nombre, email o teléfono.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Escribe para buscar..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <div className="max-h-48 space-y-2 overflow-auto">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setIncidentStudentId(student.id);
                  }}
                >
                  <div>
                    <p className="text-sm font-medium">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.email || student.phone}</p>
                  </div>
                  <Badge variant={selectedStudentId === student.id ? "default" : "secondary"}>
                    {selectedStudentId === student.id ? "Seleccionado" : "Elegir"}
                  </Badge>
                </button>
              ))}
            </div>
            {selectedStudent ? (
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{selectedStudent.name}</p>
                <p className="text-muted-foreground">{selectedStudent.email || selectedStudent.phone}</p>
                <p className="mt-1 text-muted-foreground">Estado: {selectedStudent.status === "active" ? "Activo" : "Inactivo"}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Registrar pago</CardTitle>
            <CardDescription>Cobro rápido desde recepción.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Alumno</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un alumno" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Importe</Label>
              <Input value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} type="number" min="1" step="0.01" />
            </div>
            <Button onClick={handleRecordPayment} disabled={loading || busy || !selectedStudentId}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
              Guardar pago
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardPlus className="h-4 w-4" /> Nueva incidencia</CardTitle>
            <CardDescription>Registro rápido de ausencia, lesión o cambio temporal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Alumno</Label>
              <Select value={incidentStudentId} onValueChange={setIncidentStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un alumno" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={incidentType} onValueChange={(value) => setIncidentType(value as IncidentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="absence">Ausencia</SelectItem>
                    <SelectItem value="injury">Lesión</SelectItem>
                    <SelectItem value="group_change">Cambio de grupo</SelectItem>
                    <SelectItem value="other">Otra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={incidentDate} onChange={(event) => setIncidentDate(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Clase (opcional)</Label>
              <Select value={incidentClassId} onValueChange={setIncidentClassId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin clase</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={incidentNotes} onChange={(event) => setIncidentNotes(event.target.value)} placeholder="Detalle breve" />
            </div>
            <Button onClick={handleCreateIncident} disabled={loading || busy || !incidentStudentId}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPlus className="mr-2 h-4 w-4" />}
              Guardar incidencia
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Hoja de asistencia</CardTitle>
            <CardDescription>Genera el PDF por clase y mes para imprimir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Clase</Label>
              <Select value={attendanceClassId} onValueChange={setAttendanceClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una clase" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mes</Label>
              <Input type="month" value={attendanceMonth} onChange={(event) => setAttendanceMonth(event.target.value)} />
            </div>
            <Button onClick={handleDownloadAttendance} disabled={loading || busy || !attendanceClassId}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Descargar hoja
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserRound className="h-4 w-4" /> Incidencias de hoy</CardTitle>
          <CardDescription>Control rápido para cerrar o reabrir incidencias.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-sm text-muted-foreground">Cargando...</div>
          ) : incidents.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">No hay incidencias registradas hoy.</div>
          ) : (
            <div className="space-y-2">
              {incidents.map((incident) => (
                <div key={incident.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{incident.studentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {INCIDENT_TYPE_LABELS[incident.type]} · {incident.className || "Sin clase"} · {incident.startDate}
                    </p>
                    {incident.notes ? <p className="text-sm text-muted-foreground">{incident.notes}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={incident.status === "open" ? "destructive" : "secondary"}>
                      {incident.status === "open" ? "Abierta" : "Resuelta"}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => void handleResolveIncident(incident)} disabled={busy}>
                      {incident.status === "open" ? "Cerrar" : "Reabrir"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
