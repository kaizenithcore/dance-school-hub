# Plan Maestro de Pruebas y Ajustes

Fecha de inicio: 2026-03-24
Owner inicial: Equipo Producto + QA + Engineering
Estado del documento: Activo (documento vivo)

## 1. Objetivo
Este documento sirve para:
- Registrar resultados de pruebas funcionales, tecnicas y de UX.
- Registrar ajustes/modificaciones realizadas despues de cada prueba.
- Mantener un backlog claro de incidencias detectadas.
- Guiar pruebas recomendadas por cada seccion: aplicacion admin, landing publica y portal.

## 2. Convenciones de estado
- PASSED: prueba correcta sin incidencias.
- PASSED_WITH_NOTES: funciona pero hay observaciones menores.
- FAILED: falla funcional o tecnica.
- BLOCKED: no se puede ejecutar por dependencia externa/datos/configuracion.
- NOT_RUN: aun no ejecutada.

Prioridad de incidencia:
- P0: bloquea operacion critica o seguridad.
- P1: afecta flujo clave sin bloqueo total.
- P2: impacto medio/bajo, mejora recomendada.

## 3. Plantillas de registro

### 3.1 Registro de ejecucion de prueba
| Fecha | Seccion | Caso de prueba | Resultado esperado | Resultado real | Estado | Evidencia | Ticket/Ref |
|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | ejemplo: /admin/students | Crear alumno con tutor legal | Se guarda con validacion correcta | ... | PASSED/FAILED/... | captura/log | JIRA-123 |

### 3.2 Registro de ajuste/modificacion
| Fecha | Seccion | Problema detectado | Cambio aplicado | Archivos afectados | Riesgo de regresion | Validacion posterior | Estado |
|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | ejemplo: portal feed | Notificacion no aparece | Se corrige emision tipo v1 | backend/lib/services/... | Medio | smoke + regression | Completado |

### 3.3 Backlog de incidencias abiertas
| ID | Seccion | Severidad | Descripcion | Reproducible | Responsable | ETA | Estado |
|---|---|---|---|---|---|---|---|
| BUG-001 | landing | P1 | ... | Si/No | Nombre | Fecha | Open/In Progress/Done |

## 4. Criterios de salida por release
- 100% de pruebas P0 en PASSED.
- >= 95% de pruebas P1 en PASSED o PASSED_WITH_NOTES con plan de remediacion.
- 0 incidencias de seguridad abiertas en P0/P1.
- Smoke end-to-end de rutas criticas completado.
- Evidencia adjunta (capturas, logs o videos) para fallos y correcciones.

## 5. Pruebas recomendadas por seccion

## 5.1 Landing publica y rutas /s/:slug
### Cobertura recomendada
- Home/landing general.
- Paginas legales.
- School landing: /s/:schoolSlug.
- Horario publico: /s/:schoolSlug/schedule.
- Matriculacion publica: /s/:schoolSlug/enroll.

### Casos recomendados
1. Hero, CTA principal y CTA secundaria navegan al destino correcto.
2. Formularios de contacto/demo muestran validaciones por campo.
3. SEO basico: title, description, og image, robots/sitemap sin errores.
4. Responsive: mobile, tablet, desktop sin solapes.
5. Accesibilidad: foco teclado, contraste, labels de formularios.
6. Matricula publica:
- caso nuevo alumno,
- caso alumno existente,
- caso matricula conjunta,
- datos de pagador y metodo de pago,
- validaciones de campos condicionales.
7. Persistencia de seleccion de clase desde horario a formulario de inscripcion.
8. Mensajes de error del backend claros y no tecnicos para usuario final.

### Registro rapido
| Caso | Estado | Nota |
|---|---|---|
| CTA principal landing | NOT_RUN | |
| Flujo matricula publica completo | NOT_RUN | |
| Validaciones condicionales formulario | NOT_RUN | |

## 5.2 App Admin (/admin)
### 5.2.1 Core de gestion
Secciones:
- Panel/dashboard
- Students
- Teachers
- Classes
- Rooms
- Schedule
- Enrollments
- Pricing/bonos
- Payments
- Communications
- Renewals
- Course Clone
- Settings
- Analytics
- School hub (settings/analytics/posts/announcements/gallery)

### Casos recomendados por modulo
1. Students
- Crear/editar/eliminar alumno.
- Menor de edad con tutor legal obligatorio.
- Duplicidad de email permitida segun regla vigente.
- Edicion de clases y matriculas conjuntas.

2. Teachers
- CRUD completo.
- Relacion profesor-clase correcta.
- Vista previa sin campos fantasmas.

3. Classes
- Crear clase sin profesor permitido.
- Bloqueo al intentar programar clase sin profesor.
- Selectores con placeholder y recuperacion de valor en edicion.

4. Schedule
- Guardar horarios en lote.
- Propuestas aplicables y respeto de bloqueos.
- Deteccion de conflictos (profesor/aula/tiempo).
- Vista por aula y legibilidad sin solape de texto.

5. Enrollments + Pricing + Payments
- Flujo completo de cobro: factura -> pago -> recibo sin duplicados.
- Metodo de pago persistente por alumno.
- Exportes/recibos descargables.
- Integridad de estados (pending/paid/overdue/etc).

6. Communications
- Campanias masivas.
- Limpieza de colas al eliminar alumno.
- Cancelacion de mensajes en cola.

7. Renewals
- Campania de renovacion admin.
- Confirmacion manual.
- Validar estado del flujo publico (cuando se implemente).

8. Course Clone
- Simulacion y ejecucion real.
- Mapeo correcto de schema actual (discipline_id/category_id).

9. Settings + Billing
- Edicion de cuenta.
- Moneda por defecto.
- Cambio de plan y addons.
- Redireccion a checkout cuando cambia billing.

10. School Hub social
- CRUD posts.
- Moderacion docente (approve/reject).
- Anuncios y notifyAll.
- Gestion de galeria.
- Analiticas visibles y consistentes.

### Registro rapido
| Modulo | Smoke | Regression |
|---|---|---|
| Students | NOT_RUN | NOT_RUN |
| Schedule | NOT_RUN | NOT_RUN |
| Payments | NOT_RUN | NOT_RUN |
| School Hub | NOT_RUN | NOT_RUN |

## 5.3 Portal (public + alumno + profesor + escuela)
### Cobertura recomendada
- /portal
- /portal/explorer
- /portal/app/*
- perfiles, feed, saved, notifications, search, preferences
- teacher screens y school analytics

### Casos recomendados
1. Onboarding portal
- Flujo completo y guardado de datos.
- Seleccion inicial de escuelas (follow).

2. Perfil y privacidad
- GET/PATCH perfil propio.
- GET/PATCH privacy settings.
- Exportacion de datos personales.

3. Feed social
- Feed publico y feed personalizado.
- like/unlike, save/unsave.
- visibilidad por scope (public/followers/school).

4. Invitaciones escuela -> alumno
- Crear invitacion.
- Aceptar codigo valido.
- Rechazo por codigo invalido/expirado/email no coincidente.

5. Eventos social
- Listado participantes publicos.
- Media de evento publica.
- Adjuntar media a evento desde admin.

6. Moderacion
- Crear reporte.
- Listar reportes propios.
- Resolver reporte en admin.
- Verificar auto-hide por umbral de reportes.

7. Notificaciones (contrato v1)
- Contrato disponible: /api/public/portal/notifications/contracts.
- Emision de tipos esperados:
  - school_post_published_v1
  - event_attendance_confirmed_v1
  - event_upcoming_24h_v1
  - achievement_unlocked_v1
- Listado y marcado como leido.

8. Pricing x feature (contrato v1)
- Endpoint: /api/public/portal/pricing/feature-matrix.
- Coherencia matriz vs locks reales en UI y entitlements backend.

9. KPI contract (v1)
- Endpoint: /api/school/portal/analytics/kpis.
- Coherencia de definiciones con dashboard y overview.

## 5.4 Integraciones y backend
### Casos recomendados
1. Integraciones publicas
- /api/public/integrations/:tenantSlug/events
- /api/public/integrations/:tenantSlug/calendar
- /api/public/integrations/oauth/config

2. Exportaciones
- ICS alumno.
- Export actividad JSON/CSV.

3. Webhooks salientes
- Confirmar envio en eventos configurados.
- Verificar reintentos y manejo de error.

4. Seguridad y RLS
- Probar accesos cruzados entre tenants.
- Verificar politicas para tablas nuevas y antiguas.

5. Migraciones
- Validar orden y aplicacion limpia en entorno de pruebas.
- Validar idempotencia (if not exists / on conflict) y rollback documentado.

## 5.5 Calidad transversal
### Casos recomendados
1. Performance
- TTFB en landing y endpoints criticos.
- Latencia de listados principales (students/feed/events/payments).

2. Observabilidad
- Logs con contexto util (tenant, user, endpoint, error code).
- Alertas minimas para errores 5xx repetidos.

3. Accesibilidad
- Navegacion teclado.
- Contraste.
- Labels y aria en controles interactivos.

4. Compatibilidad
- Chrome, Edge, Safari.
- Mobile responsive (iOS/Android viewport).

## 6. Suite minima por sprint
Para cada sprint de ajustes:
1. Smoke corto (15-30 min)
- Login
- Students CRUD basico
- Schedule save
- Payment register
- Portal feed load
- Notification list

2. Regression media (60-120 min)
- Flujos con mayor churn historico.
- Modulos tocados por cambios del sprint.

3. E2E objetivo
- 1 flujo landing -> matricula
- 1 flujo alumno portal completo
- 1 flujo admin de cobros

## 7. Plan de ejecucion sugerido
- Dia 1: Landing + matriculacion publica + smoke admin.
- Dia 2: Admin core (students/classes/schedule/payments).
- Dia 3: Portal social + moderacion + notificaciones.
- Dia 4: Integraciones + seguridad RLS + performance.
- Dia 5: Re-test de incidencias corregidas + cierre de release.

## 8. Resumen diario (plantilla)
| Fecha | Ejecutadas | Passed | Failed | Blocked | Ajustes aplicados | Riesgo global |
|---|---:|---:|---:|---:|---|---|
| YYYY-MM-DD | 0 | 0 | 0 | 0 | - | Bajo/Medio/Alto |

## 9. Notas de uso
- Cada prueba fallida debe crear o enlazar ticket.
- Cada ajuste aplicado debe apuntar commit/PR y evidencia.
- No cerrar una seccion sin re-test del flujo completo afectado.
- Este documento debe actualizarse al final de cada jornada de QA/ajustes.
