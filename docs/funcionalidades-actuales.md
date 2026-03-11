# Inventario de Funcionalidades Actuales - Dance School Hub

## 1) Objetivo del documento
Este documento resume, en lenguaje funcional y no tecnico, todo lo que la aplicacion puede hacer actualmente.

Se utiliza como base para:
- Ver que valor real ya existe en el producto.
- Detectar funcionalidades parciales o aun no cerradas.
- Definir limites por plan (Starter, Pro, Enterprise) y su propuesta comercial.

## 2) Vista general del producto
La plataforma cubre tres grandes frentes:
- Gestion interna de la escuela (panel admin).
- Experiencia publica para alumnos/familias (sitio de escuela y matricula online).
- Operacion de cobros (pagos, facturas, recibos y seguimiento mensual).

Ademas, incluye un sistema de configuracion central que modifica comportamientos reales en varias pantallas.

## 3) Acceso, cuentas y sesion
### 3.1 Inicio de sesion
- Ingreso con email y contrasena.
- Validacion de credenciales y acceso al panel.
- Mensajes de error/confirmacion para guiar al usuario.

### 3.2 Registro de nueva escuela
- Alta guiada en 2 pasos:
  - Datos de escuela.
  - Datos de la cuenta administradora.
- Validaciones basicas (campos obligatorios, confirmacion de contrasena, aceptacion de terminos).

### 3.3 Recuperacion y cambio de contrasena
- Restablecimiento de contrasena desde pantalla de reset con actualizacion real.
- Politica de contrasena aplicada segun configuracion de seguridad:
  - Contrasena fuerte (si esta activa).
  - Minimo de longitud (si no se exige politica fuerte).

### 3.4 Politicas de sesion con impacto real
- Tiempo maximo de inactividad configurable (cierre automatico de sesion).
- Alertas de inicio de sesion activables desde configuracion.

## 4) Panel administrativo (operacion diaria)

### 4.1 Panel principal (Dashboard)
- Muestra indicadores clave:
  - Alumnos activos y totales.
  - Clases activas y totales.
  - Ingresos del mes.
  - Tasa de inscripcion.
- Alertas accionables:
  - Pagos vencidos o pendientes.
  - Inscripciones pendientes.
- Vistas rapidas:
  - Ingresos por mes.
  - Ocupacion de clases.
  - Inscripciones recientes.
  - Pagos que requieren atencion.

### 4.2 Horarios
- Editor visual para construir el horario semanal.
- Flujo de trabajo tipo arrastrar y soltar clases al calendario.
- El calendario respeta configuracion de dias y franja horaria definida en Ajustes.

### 4.3 Clases
- Alta de clases nuevas.
- Edicion de clases existentes.
- Eliminacion con confirmacion.
- Vista previa de clase.
- Gestion de datos principales de la clase (nombre, disciplina, categoria, profesor, capacidad, precio, estado).
- Tabla con busqueda y filtros.

### 4.4 Aulas
- Alta, edicion y eliminacion de aulas.
- Gestion de capacidad, descripcion y estado (activa/inactiva).

### 4.5 Profesores
- Alta, edicion y eliminacion de profesores.
- Vista de perfil del profesor.
- Asignacion de clases desde modal dedicada.
- Tabla con busqueda y filtros por estado.

### 4.6 Alumnos
- Alta, edicion y eliminacion de alumnos.
- Vista de perfil del alumno.
- Gestion de clases del alumno desde modal dedicada.
- Tabla con busqueda y filtros por estado.

### 4.7 Inscripciones
- Listado de solicitudes de matricula.
- Vista detallada de cada solicitud.
- Cambio de estado de la inscripcion (pendiente, aceptada, rechazada, cancelada).

## 5) Cobros, facturacion y seguimiento financiero

### 5.1 Pagos
- Registro manual de pagos.
- Vista detalle de pago.
- Cambio de estado (pagado / reembolsado).
- Generacion de recibo PDF individual.
- Filtros de pagos por texto, metodo y periodo.

### 5.2 Facturas
- Generacion mensual de facturas.
- Listado de facturas con filtros por estado, mes y busqueda.
- Vista de detalle de factura (lineas y total).
- Marcado de factura como pagada con datos de metodo de pago.

### 5.3 Recibos en lote (efectivo)
- Generacion de PDF multipagina con recibos de pagos en efectivo por mes.

### 5.4 Alertas operativas de cobro
- Aviso cuando no hay facturas del mes actual.
- Aviso de alumnos aceptados sin registro de cobro del mes.

### 5.5 Impacto de configuracion de pagos
- Moneda y metodos habilitados en Ajustes impactan el registro de pagos.
- Si un metodo esta desactivado en configuracion, deja de ofrecerse en la operacion diaria.

## 6) Analiticas
- KPIs de alumnos activos/inactivos, recaudacion y morosidad.
- Graficos de ingresos por mes.
- Distribucion de inscripciones por estado.
- Distribucion por metodo de pago.
- Ranking de alumnos por clase.

## 7) Configuracion de la escuela (Ajustes)

### 7.1 Escuela
- Datos institucionales:
  - Nombre, slug publico, contacto, direccion, ciudad.
  - Descripcion y tagline.
  - Redes y web.

### 7.2 Horarios
- Hora de inicio y fin.
- Duracion de bloque.
- Dias de funcionamiento.
- Clase de prueba (activar/desactivar).
- Maximo de clases por alumno.

### 7.3 Pagos
- Moneda.
- Dia de vencimiento.
- Dias de gracia.
- Metodos habilitados (transferencia / efectivo).
- Datos de transferencia (alias, CBU/CVU).
- Recordatorios automaticos.

### 7.4 Notificaciones
- Definicion de eventos a notificar:
  - Nueva inscripcion.
  - Pago recibido.
  - Pago vencido.
  - Clase cancelada.
- Dias de antelacion para recordatorios.

### 7.5 Seguridad
- Exigir contrasena fuerte.
- Habilitar politica de 2FA.
- Alertas de inicio de sesion.
- Timeout de sesion por inactividad.

### 7.6 Billing
- Seleccion y persistencia del tipo de plan:
  - Starter.
  - Pro.
  - Enterprise.
- El valor queda guardado y visible, listo para conectar reglas comerciales.

## 8) Topbar operativa (productividad diaria)

### 8.1 Busqueda global
- Busqueda rapida de secciones y registros (alumnos, clases, inscripciones, pagos, profesores, aulas).
- Acceso rapido a acciones contextuales (vista previa, edicion, eliminacion) segun modulo.

### 8.2 Centro de notificaciones
- Notificaciones de inscripciones pendientes.
- Notificaciones de pagos vencidos.
- Marcar una o todas como leidas.
- Navegacion directa al registro relacionado.

### 8.3 Perfil y cuenta
- Pestaña Cuenta: datos de usuario/rol/escuela.
- Pestaña Seguridad: cambio real de contrasena con politicas activas.
- Pestaña Billing: visualizacion del plan actual guardado en configuracion.
- Cierre de sesion real.

## 9) Sitio publico de la escuela

### 9.1 Landing publica por escuela
- URL publica por slug de escuela.
- Presentacion de la escuela (descripcion, contacto, direccion).
- Vista previa de clases disponibles.
- Seleccion de clases y CTA para iniciar inscripcion.

### 9.2 Horario publico
- Vista de horario completo para futuros alumnos.
- Seleccion de clases y salto directo al formulario de inscripcion.

### 9.3 Matricula online publica
- Formulario dinamico configurable desde el panel admin.
- Soporte de secciones y campos condicionales.
- Seleccion de clases/horarios.
- Resumen dinamico de precio (incluyendo reglas/bonos cuando corresponde).
- Soporte de matricula conjunta (varios alumnos en un mismo flujo) cuando esta habilitada.
- Envio de solicitud de inscripcion.

## 10) Editor de formulario de matricula
- Constructor de formulario por secciones.
- Creacion, orden, edicion y eliminacion de secciones.
- Configuracion de campos (tipo, obligatoriedad, opciones, condiciones, etc.).
- Vista previa del formulario final.
- Guardar y restaurar configuracion.
- Activar/desactivar bloques de:
  - Seleccion de horario.
  - Resumen de tarifas/bonos.
  - Matricula conjunta.

## 11) Tarifas y bonos
- Gestion de reglas tarifarias (alta, edicion, eliminacion).
- Gestion de categorias de disciplinas.
- Soporte para descuentos/bonos por condiciones.
- Integracion con el flujo de matricula para mostrar resumen dinamico de precio.

## 12) Legal y cumplimiento
- Secciones legales publicas disponibles:
  - Politica de privacidad.
  - Politica de cookies.
  - Terminos de servicio.
  - Aviso legal.

## 13) Funcionalidades parciales o pendientes detectadas
Estas funcionalidades existen pero aun no estan cerradas al 100%:
- Recuperacion de contrasena (pantalla "Olvide mi contrasena"):
  - La UI existe, pero el envio de email de recuperacion aun esta marcado como pendiente de integracion.
- Horario publico:
  - Algunas partes usan datos de respaldo/demo cuando falla la carga real.
  - El precio/teacher en esa vista aun no viene completamente de datos definitivos en todos los casos.
- 2FA:
  - La politica se puede activar y se refleja en UI, pero la configuracion completa de enrolamiento MFA aun depende de implementacion final del flujo del proveedor de autenticacion.
- Perfil avanzado de cuenta:
  - Se anticipa espacio para foto/preferencias personales, pero actualmente no es un modulo completo.

## 14) Ejes recomendados para definir planes y tarifas
Con lo ya implementado, se pueden definir planes comerciales usando estos ejes:
- Volumen operativo:
  - Numero de alumnos activos.
  - Numero de profesores.
  - Numero de clases y aulas.
- Complejidad academica:
  - Uso de horario avanzado.
  - Uso de matricula conjunta.
  - Nivel de personalizacion del formulario.
- Complejidad comercial:
  - Cantidad de reglas de tarifas/bonos activas.
  - Uso de facturacion mensual y recibos en lote.
- Gobernanza y seguridad:
  - Politicas de seguridad activas (contrasena fuerte, timeout, alertas).
  - Nivel de soporte de control de accesos.
- Marca y conversion publica:
  - Uso de landing publica.
  - Uso de matricula online y schedule publico.

## 15) Conclusiones para producto
- La aplicacion ya cubre un ciclo operativo casi completo: captacion, matricula, gestion academica, cobranza y analitica.
- Existen piezas diferenciales para paquetizar (form builder, tarifas/bonos, facturacion, seguridad configurable).
- Las brechas mas relevantes para cerrar antes de congelar planes son:
  - Recuperacion de contrasena end-to-end.
  - Cierre total de flujo 2FA.
  - Homogeneizar datos reales en horario publico para eliminar cualquier fallback demo.

---
Documento de referencia funcional (estado actual) para decisiones de producto y pricing.

---

## 16) Estado actual del proyecto (11 Mar 2026)

### 16.1 Integraciones completadas

| Area | Estado |
|------|--------|
| Autenticacion (login, registro de escuela, cambio/reset de contrasena) | ✅ Completa |
| Multi-tenancy (aislamiento por tenant_id, RLS en Supabase) | ✅ Completa |
| Backend API: Profesores (CRUD) | ✅ Completa |
| Backend API: Aulas (CRUD) | ✅ Completa |
| Backend API: Clases (CRUD) | ✅ Completa |
| Backend API: Alumnos (CRUD + quota) | ✅ Completa |
| Backend API: Inscripciones (flujo publico + gestion admin) | ✅ Completa |
| Backend API: Horarios (class_schedules + bloqueo + propuestas A/B/C) | ✅ Completa |
| Backend API: Pagos (registro manual, cambio de estado) | ✅ Completa |
| Backend API: Facturas mensuales (generacion, listado, marcado como pagada) | ✅ Completa |
| Backend API: Recibos en lote PDF (efectivo por mes) | ✅ Completa |
| Backend API: Asistencia PDF (hoja por clase/periodo) | ✅ Completa |
| Backend API: Lista de espera (waitlist automatica, oferta al siguiente) | ✅ Completa |
| Backend API: Incidencias (CRUD student_incidents) | ✅ Completa |
| Backend API: Renovaciones (renewal_campaigns + renewal_offers) | ✅ Completa |
| Backend API: Comunicacion masiva (message_campaigns + message_deliveries) | ✅ Completa |
| Backend API: Copia de curso (courseCloneService, dry-run + apply) | ✅ Completa |
| Backend API: Importador de alumnos (import_jobs) | ✅ Completa |
| Backend API: Propuestas de horario automatico (schedulerProposalService) | ✅ Completa |
| Backend API: Insights de horario (scheduleInsightsService) | ✅ Completa |
| Backend API: Tarifas y bonos (pricing_rules + discipline_categories) | ✅ Completa |
| Backend API: Configuracion de escuela (school_settings JSONB) | ✅ Completa |
| Backend API: Entitlements por plan/add-on | ✅ Completa |
| Backend API: Modo recepcion (ruta /api/admin/jobs, permisos reducidos) | ✅ Completa |
| Backend API: ExamSuite – Examenes (CRUD) | ✅ Completa |
| Backend API: ExamSuite – Candidatos (registro, calificacion, estado) | ✅ Completa |
| Backend API: ExamSuite – Certificados (generacion individual y masiva) | ✅ Completa |
| Frontend: Panel admin completo (dashboard, clases, profesores, aulas, alumnos, horarios, inscripciones, pagos, facturas, analiticas, ajustes, comunicaciones, lista de espera, renovaciones, copia de curso, modo recepcion, examenes) | ✅ Completa |
| Frontend: Sitio publico (landing, horario publico, formulario de matricula online) | ✅ Completa |
| Frontend: Editor de formulario de matricula | ✅ Completa |
| Frontend: Tarifas y bonos | ✅ Completa |
| Frontend: ExamSuite (ExamsPage, ExamCard, ExamFormModal, CandidatesTable, GradingInterface, CertificatePreview) | ✅ Completa |
| Migracion SQL ExamSuite en Supabase (tablas exams + exam_candidates, indices, RLS, triggers) | ✅ Completa |

### 16.2 Estado de pruebas

#### Pruebas de infraestructura (frontend)
| Archivo | Estado |
|---------|--------|
| `src/test/example.test.ts` | ✅ Pasa (1/1 tests) |

El framework de pruebas frontend (Vitest) esta configurado y operativo.
No existen todavía pruebas unitarias específicas por módulo en el frontend; la cobertura actual es de infraestructura.

#### Validacion tecnica backend (typecheck + lint)
| Check | Estado |
|-------|--------|
| `npm run typecheck` (backend) | ✅ Sin errores |
| `npx eslint` en modulos ExamSuite | ✅ Sin errores |
| `npm run lint` global backend | ⚠️ 59 errores preexistentes en servicios no relacionados (principalmente `@typescript-eslint/no-explicit-any` en `studentService.ts` y otros) – no introducidos por este sprint |

#### Funciones probadas mediante cURL / validacion manual
Las siguientes funciones han sido verificadas en sprints anteriores con el tenant de prueba (`a157c330-a83f-4962-b61f-36cf4b1e1726`):
- `GET /api/admin/teachers` – lista profesores del tenant ✅
- `POST /api/admin/teachers` – crea profesor ✅
- `GET /api/admin/rooms` – lista salas ✅
- `GET /api/admin/classes` – lista clases ✅
- `PUT /api/admin/classes/:id` – actualiza clase ✅
- `POST /api/tenants` – registro de escuela ✅
- `GET /api/auth/me` – contexto de usuario/tenant ✅
- `GET /api/health` – healthcheck ✅

#### Modulo ExamSuite – endpoints disponibles (pendientes de prueba con datos reales en Supabase)
| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/admin/exams` | GET | Lista examenes del tenant |
| `/api/admin/exams` | POST | Crea un examen |
| `/api/admin/exams/:id` | GET | Obtiene un examen |
| `/api/admin/exams/:id` | PUT | Actualiza un examen |
| `/api/admin/exams/:id` | DELETE | Elimina un examen |
| `/api/admin/exams/:id/candidates` | GET | Lista candidatos del examen |
| `/api/admin/exams/:id/candidates` | POST | Registra un candidato |
| `/api/admin/exams/:id/candidates/:candidateId` | PUT | Actualiza estado o calificacion del candidato |
| `/api/admin/exams/:id/candidates/:candidateId/grade` | POST | Guarda calificacion del candidato |
| `/api/admin/exams/:id/certificates` | POST | Genera todos los certificados del examen |

Para activar en Supabase, ejecutar la migracion:
`backend/supabase/migrations/20260311000000_examsuite_module.sql`

### 16.3 Funcionalidades pendientes de cerrar

- **Recuperacion de contrasena end-to-end**: la UI existe, pero el envio de email de recuperacion aun no esta integrado.
- **Flujo 2FA completo**: la politica se puede activar, pero el enrolamiento MFA del proveedor de autenticacion esta pendiente.
- **Datos reales en horario publico**: algunas vistas aun usan fallback demo cuando falla la carga de datos reales.
- **Pruebas unitarias por modulo**: el framework Vitest esta listo; faltan tests unitarios para servicios backend y componentes frontend clave.
- **Perfil avanzado de cuenta**: el espacio para foto/preferencias personales existe en UI pero no es un modulo completo.
