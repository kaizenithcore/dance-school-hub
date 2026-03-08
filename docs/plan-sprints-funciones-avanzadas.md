# Plan De Implementacion Por Sprints - Funciones Avanzadas

## 1. Enfoque de minima modificacion
Principio general: extender la arquitectura actual (servicios en backend, rutas API por modulo, clientes en frontend, configuracion en school_settings JSONB) sin rehacer dominios existentes.

Base reutilizable ya disponible:
- Horarios y conflictos: class_schedules + servicio de horarios.
- Matriculas y capacidad: enrollments + students + classes.
- Cobros y PDF: payments/invoices + infraestructura de PDF en receiptService.
- Configuracion y planes: school_settings (payment_config/enrollment_config/notification_config/schedule_config) + billing.planType.
- Seguridad y multitenant: requireAuth + tenant context + audit_log.

## 2. Mapeo feature por feature (como encaja en datos reales)

### 2.1 Hojas de asistencia PDF para profesores
Objetivo:
- Generar un PDF imprimible por clase/periodo con lista de alumnos y casillas por dia.

Integracion minima:
- Reusar classes, class_schedules y enrollments (status confirmed).
- Reusar estrategia PDF de receiptService (Playwright server-side).

Alta de datos:
- Sin tabla nueva en fase 1 (solo PDF bajo demanda).
- Opcional fase 2: tabla attendances para captura digital de asistencia.

Frontend:
- Boton "Generar hoja" en Clases y/o Horarios.

Backend:
- Nueva ruta admin: /api/admin/attendance/sheets/download.
- Nuevo attendanceService con query consolidada + HTML template PDF.

### 2.2 Horario automatico (Propuesta A/B/C)
Objetivo:
- Proponer combinaciones optimizadas por disponibilidad, aulas, demanda y huecos.

Integracion minima:
- Reusar classes, teachers, rooms, class_schedules, enrollments historicos.
- Calcular demanda historica desde enrollments confirmados por clase/franja.

Alta de datos:
- Tabla schedule_proposals:
  - tenant_id, proposal_label (A/B/C), score, payload_json, status, created_at.
- Tabla teacher_availability (si no existe) para disponibilidad declarada.
- Config en school_settings.schedule_config.auto_scheduler.

Frontend:
- Nuevo panel en Horarios: generar propuestas, comparar A/B/C, aplicar propuesta.

Backend:
- Nuevo schedulerProposalService.
- Ruta POST /api/admin/schedule/proposals/generate.
- Ruta POST /api/admin/schedule/proposals/:id/apply (usa saveScheduleBatch actual).

### 2.3 Lista de espera automatica configurable
Objetivo:
- Si clase llena, alumno entra en waitlist; si se libera plaza, avisar siguiente con ventana de aceptacion.

Integracion minima:
- Reusar validacion de capacidad en enrollmentService.
- Reusar students/classes/enrollments y email de contacto existente.

Alta de datos:
- Tabla class_waitlist:
  - tenant_id, class_id, student_id, status (waiting/offered/accepted/expired/cancelled), position, offered_at, expires_at.
- Config en school_settings.enrollment_config.waitlist.
- Campo de entitlement por plan/add-on en school_settings.payment_config.features.

Frontend:
- En matricula publica: estado "Clase completa -> unirme a lista de espera".
- En admin/clase: cola, reordenar, saltar, activar oferta manual.

Backend:
- Hooks en enrollmentService.updateEnrollmentStatus/cancelaciones para disparar offerNext.
- Servicio de notificaciones asincronas para email de oferta.

### 2.4 Renovaciones automaticas de curso
Objetivo:
- Reserva y seguimiento de renovaciones de alumnos actuales para proximo curso.

Integracion minima:
- Reusar students, enrollments, classes.
- Reusar panel de alumnos/inscripciones para acciones de confirmacion.

Alta de datos:
- Tabla renewal_campaigns:
  - tenant_id, name, from_period, to_period, status.
- Tabla renewal_offers:
  - campaign_id, student_id, current_class_ids, proposed_class_ids, status (pending/confirmed/changed/released), expires_at.

Frontend:
- Nuevo submodulo "Renovaciones" con 3 vistas:
  - Confirmadas.
  - Pendientes.
  - Plazas liberadas.

Backend:
- renewalService para crear campana desde enrollments confirmados.
- Endpoints para confirmar/cambiar/liberar.

### 2.5 Comunicacion masiva (Email + WhatsApp)
Objetivo:
- Envio segmentado por clase, disciplina o toda la escuela.

Integracion minima:
- Reusar segmentacion por classes/disciplines/students.
- Email: ya hay RESEND_API_KEY en entorno.

Alta de datos:
- Tabla message_campaigns (metadatos, audiencia, canal, estado).
- Tabla message_deliveries (destinatario, estado, error, enviado_en).
- Config en notification_config.communication.

WhatsApp:
- Fase inicial: plantilla + link deep link (wa.me) opcional.
- Fase avanzada: proveedor oficial (Twilio/Meta) como add-on.

Frontend:
- Nueva pantalla "Comunicacion" con composer, previsualizacion y historial.

Backend:
- communicationService + cola de envios (outbox) para no bloquear request.

### 2.6 Sistema rapido de incidencias
Objetivo:
- Registrar incidencias operativas (ausencia, lesion, cambio temporal de grupo).

Integracion minima:
- Reusar students/classes.

Alta de datos:
- Tabla student_incidents:
  - tenant_id, student_id, class_id opcional, type, start_date, end_date opcional, notes, status.

Frontend:
- Accion rapida desde ficha de alumno y modo recepcion.

Backend:
- incidentService CRUD simple + listado por fecha.

### 2.7 Deteccion automatica de problemas de horario
Objetivo:
- Detectar baja demanda, sobre demanda, huecos de profesor y aulas infrautilizadas.

Integracion minima:
- Reusar analytics + class_schedules + enrollments + rooms + teachers.

Alta de datos:
- Sin tabla nueva en v1 (calculo on-demand).
- Opcional v2: schedule_insights_snapshots para historico.

Frontend:
- Widget en Dashboard + seccion en Horarios con alertas accionables.

Backend:
- Nuevas funciones en analyticsService/scheduleInsightsService.
- Endpoint /api/admin/schedule/insights.

### 2.8 Importador inteligente de alumnos (Excel/Sheets)
Objetivo:
- Importar alumnos detectando columnas automaticamente.

Integracion minima:
- Reusar studentService.createStudent/updateStudent.

Alta de datos:
- Tabla import_jobs:
  - tenant_id, type, status, file_url, mapping_json, result_json, created_by.
- Tabla import_job_rows (opcional) para trazabilidad de errores por fila.

Frontend:
- Wizard en Alumnos:
  - Subir archivo.
  - Mapeo sugerido (autodeteccion).
  - Validacion previa.
  - Ejecutar import.

Backend:
- Parser CSV/XLSX + heuristica de mapping (nombre, apellido, clase, telefono, email).

### 2.9 Vista modo recepcion
Objetivo:
- Interfaz simplificada para personal administrativo.

Integracion minima:
- Reusar operaciones existentes: buscar alumno, registrar pago, cambiar clase, alta alumno.

Alta de datos:
- Sin tabla nueva.
- Ajuste de permisos/rol (staff) con feature flag.

Frontend:
- Ruta /admin/reception con layout simplificado (4 acciones principales).

Backend:
- Reusar endpoints existentes; solo limitar superficie de UI y permisos.

### 2.10 Enlace de matricula inteligente
Objetivo:
- Soportar query params para preseleccionar clase o filtrar disciplina/edad.

Integracion minima:
- Reusar EnrollPage publica y PublicScheduleSelector.

Alta de datos:
- Sin tabla nueva.

Frontend:
- Lectura de query params:
  - class
  - discipline
  - minAge/maxAge
- Aplicar filtros y preseleccion no destructiva.

Backend:
- Sin cambios obligatorios v1 (filtrado cliente con availableClasses).
- Opcional v2: endpoint publico con filtros server-side.

### 2.11 Copia de curso anterior
Objetivo:
- Duplicar clases, profesores asociados, tarifas y horarios para nuevo ciclo.

Integracion minima:
- Reusar classes, class_schedules, pricing_rules, discipline_categories, disciplines/categories.

Alta de datos:
- Tabla clone_jobs:
  - tenant_id, source_period, target_period, options_json, status, summary_json.

Frontend:
- Boton "Duplicar curso anterior" en Horarios o Configuracion academica.

Backend:
- courseCloneService con modo dry-run + apply.
- Mantener referencias por mapeo old_id -> new_id en memoria del job.

## 3. Plan por sprints
Duracion sugerida: 2 semanas por sprint (8-9 dias de desarrollo + QA + ajustes).

### Sprint 1 - Fundacion y capacidades transversales
Alcance:
- Feature entitlements por plan/add-on usando school_settings.payment_config.features.
- Infra de procesos asincronos ligera (outbox + job tick endpoint) para envios y ofertas.
- Base de comunicacion por email (Resend) con plantillas minimas.

Entrega:
- Framework comun para waitlist, renovaciones y comunicacion masiva.

Riesgo:
- Medio (introduce procesamiento asincrono).

### Sprint 2 - Lista de espera automatica + enlace inteligente
Alcance:
- class_waitlist + flujo de alta cuando clase esta llena.
- Oferta automatica al siguiente (email + expiracion 24h configurable).
- UI admin de cola por clase.
- Query params inteligentes en matricula publica.

Entrega:
- Problema "clase llena" resuelto sin gestion manual.

Riesgo:
- Medio.

### Sprint 3 - Renovaciones automaticas + copia de curso anterior
Alcance:
- renewal_campaigns y renewal_offers.
- Panel de renovaciones (confirmadas, pendientes, plazas liberadas).
- courseCloneService con dry-run y duplicado real.

Entrega:
- Reduccion fuerte de trabajo administrativo de cambio de curso.

Riesgo:
- Medio-alto (impacta datos academicos en lote).

### Sprint 4 - Asistencia PDF + incidencias + modo recepcion
Alcance:
- Generador PDF de hoja de asistencia por clase/mes.
- student_incidents con acciones rapidas.
- Ruta /admin/reception con operaciones simplificadas.

Entrega:
- Operacion diaria de profesores y recepcion mucho mas fluida.

Riesgo:
- Bajo-medio.

### Sprint 5 - Comunicacion masiva completa
Alcance:
- Pantalla de campanas (clase, disciplina, todos).
- Historial y estado por destinatario.
- Canal email operativo end-to-end.
- WhatsApp fase inicial (enlace/plantilla) + base para proveedor oficial.

Entrega:
- Comunicacion institucional centralizada desde la plataforma.

Riesgo:
- Medio (entregabilidad y volumen).

### Sprint 6 - Deteccion de problemas en horario
Alcance:
- Motor de insights de ocupacion y demanda.
- Alertas en dashboard/horarios con acciones sugeridas.

Entrega:
- Reorganizacion proactiva basada en datos.

Riesgo:
- Bajo-medio.

### Sprint 7 - Propuestas de horario automatico A/B/C
Alcance:
- Motor de scoring multicriterio:
  - disponibilidad profesor,
  - disponibilidad aula,
  - demanda historica,
  - minimizacion de huecos.
- Generacion de propuestas A/B/C.
- Comparador y aplicacion de propuesta.

Entrega:
- Automatizacion avanzada de planificacion.

Riesgo:
- Alto (optimización + UX de comparacion).

## 4. Orden recomendado de empaquetado comercial
- Starter:
  - enlace inteligente,
  - incidencias rapidas,
  - modo recepcion,
  - asistencia PDF.
- Pro:
  - waitlist automatica,
  - renovaciones,
  - copia de curso.
- Enterprise/Add-ons:
  - comunicacion masiva avanzada con proveedor WhatsApp oficial,
  - propuestas automaticas A/B/C,
  - deteccion avanzada con historicos.

## 5. Estrategia de rollout segura
- Todo nuevo modulo bajo feature flags por tenant.
- Primero soft-launch en 1 tenant piloto.
- Telemetria minima por modulo:
  - uso,
  - errores,
  - tiempos,
  - conversion (waitlist->matricula, renovacion->confirmada).
- Sin romper endpoints actuales: solo sumar rutas y UI incremental.

## 6. Cambios estructurales minimos (resumen)
Nuevas tablas estrictamente necesarias:
- class_waitlist
- renewal_campaigns
- renewal_offers
- message_campaigns
- message_deliveries
- student_incidents
- schedule_proposals
- teacher_availability
- import_jobs
- clone_jobs

Sin cambios destructivos:
- No reemplazar tablas actuales.
- No reescribir dominios core (students/classes/enrollments/payments).
- Mantener patron actual: route -> service -> supabase.

## 7. Dudas de definicion que conviene cerrar antes de arrancar
1. Waitlist: quieres que al aceptar plaza pase a enrollment confirmed automaticamente, o que quede pending para revision admin? Las plazas también deben ser revisadas antes de ser completadas, si una plaza aceptada tiene sitio y puede pasar a una clase, pasa como alumno confirmado automáticamente
2. Renovaciones: la reserva de plaza bloquea cupo real desde el momento de oferta, o solo al confirmar? La reserva de plaza bloquea desde que se ofrece, para que los alumnos matricualdos actualmente tengan preferencia sobre alumnos nuevos. Estas renovaciones tienen un plazo limitado configurable por la escuela tras el cual las plazas no reservadas quedan libres
3. Comunicacion WhatsApp: empezamos con enlace wa.me (sin proveedor) en Pro y dejamos API oficial para Enterprise/add-on? Por ahora no implementaremos comunicación por watsapp
4. Importador: el alcance inicial incluye solo CSV/XLSX o tambien Google Sheets por URL desde sprint 1 del importador? Si no aumenta la complejidad, incluye Google Sheets por URL, si es complejo no es necesario en este sprint
5. Horario automatico: prefieres que la primera version sea "asistente semiautomatico" (sugiere y usuario valida) antes de aplicar auto-completo? Si, el usuario además debe poder poner manualmente algunas clases y bloquear su posición y que las automáticas se coloquen en teniendo en cuenta las horas bloqueadas.
6. Copia de curso: al duplicar, los profesores se copian como referencia al mismo profesor o como snapshot editable por nuevo curso? Se copian los profesores teniendo en cuenta que se mantienen los mismos
7. Modo recepcion: el rol staff podra ver importes y datos sensibles completos, o limitamos por permisos granulares? Se limitan los permisos granulares, el plan enterprise puede crear roles con accesos personalizados (hasta 3)
