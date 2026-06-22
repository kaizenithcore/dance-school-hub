export type Ciudad =
  | "Madrid"
  | "Mostoles"
  | "Alcorcon"
  | "Getafe"
  | "Leganes"
  | "Fuenlabrada"
  | "Pozuelo"
  | "Majadahonda"
  | "Las Rozas"
  | "Alcala de Henares"
  | "Otro";

export type TipoCentro = "danza" | "baile" | "escuela artistica" | "otro";
export type RangoAlumnos = "0-50" | "51-150" | "151-300" | "301-500" | "500+";
export type SiNoDesact = "si" | "no" | "desactualizada";
export type GestionTipo = "excel" | "whatsapp" | "papel" | "software" | "mezcla";
export type SiNoParcial = "si" | "no" | "parcial";
export type TareaTipo = "matriculas" | "horarios" | "cobros" | "comunicacion" | "asistencia" | "profesores" | "otro";
export type ProblemaTipo =
  | "desorganizacion"
  | "datos_duplicados"
  | "falta_visibilidad"
  | "cobros_pendientes"
  | "cambios_horario"
  | "falta_tiempo";
export type GastoMensual = "0" | "<50" | "50-100" | "100-250" | "250+";
export type InteresTipo = "matriculas" | "portal_alumno" | "pagos" | "horarios" | "comunicacion" | "todo";
export type ResponsableTipo = "propietario" | "administracion" | "profesores" | "varios";
export type NivelTecnico = "bajo" | "medio" | "alto";
export type NecesitaAyuda = "si" | "no" | "solo_inicio";
export type MotivacionTipo = "ahorro_tiempo" | "menos_errores" | "mejor_imagen" | "mas_control" | "portal_alumno";
export type BarreraTipo = "coste" | "tiempo" | "miedo" | "ya_sistema" | "ninguna";

export interface LeadQualificationPayload {
  escuela: {
    nombreEscuela: string;
    ciudad: Ciudad | "";
    tipoCentro: TipoCentro | "";
    numeroAlumnos: RangoAlumnos | "";
    numeroProfesores: number | null;
    numeroClases: number | null;
  };
  situacion: {
    tieneWeb: SiNoDesact | "";
    gestionActual: GestionTipo[];
    tieneMatriculaOnline: SiNoParcial | "";
  };
  operativa: {
    tareasMasTiempo: TareaTipo[];
    principalesProblemas: ProblemaTipo[];
    automatizacionDeseada: string;
  };
  sistema: {
    usaSoftware: "si" | "no" | "";
    nombreSoftware: string;
    gastoMensual: GastoMensual | "";
    interesPrincipal: InteresTipo[];
  };
  perfil: {
    responsableSistema: ResponsableTipo | "";
    nivelTecnico: NivelTecnico | "";
    necesitaAyuda: NecesitaAyuda | "";
  };
  interes: {
    dispuestoProbar: "si" | "no" | "";
    motivacion: MotivacionTipo[];
    barreraCambio: BarreraTipo[];
  };
  contacto: {
    nombreContacto: string;
    email: string;
    telefono: string;
    cargo: string;
    webRedes: string;
  };
  feedback: {
    mejoraPrincipal: string;
  };
  metadata: {
    fecha: string;
    userAgent: string;
    origen: "landing_form";
  };
}

export const createEmptyPayload = (): LeadQualificationPayload => ({
  escuela: {
    nombreEscuela: "",
    ciudad: "",
    tipoCentro: "",
    numeroAlumnos: "",
    numeroProfesores: null,
    numeroClases: null,
  },
  situacion: { tieneWeb: "", gestionActual: [], tieneMatriculaOnline: "" },
  operativa: { tareasMasTiempo: [], principalesProblemas: [], automatizacionDeseada: "" },
  sistema: { usaSoftware: "", nombreSoftware: "", gastoMensual: "", interesPrincipal: [] },
  perfil: { responsableSistema: "", nivelTecnico: "", necesitaAyuda: "" },
  interes: { dispuestoProbar: "", motivacion: [], barreraCambio: [] },
  contacto: { nombreContacto: "", email: "", telefono: "", cargo: "", webRedes: "" },
  feedback: { mejoraPrincipal: "" },
  metadata: { fecha: "", userAgent: "", origen: "landing_form" },
});
