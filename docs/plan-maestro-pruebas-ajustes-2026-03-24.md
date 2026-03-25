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
## Modificaciones o apuntes en general:
Se ha creado un modo oscuro, se debe poder mantener el modo claro como predeterminado y crear un toggle para cambiar de apariencia. 


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

### Modificaciones o apuntes en general:
Revisar precio y características de:
"modernizationProBundle": {
      "label": "Pack Modernización Pro",
      "description": "La forma más rápida de digitalizar tu escuela con todo incluido.",
      "includes": [
        "proPlan",
        "modernizationPack",
        "integratedWebsite"
      ],
      "pricing": {
        "oneTimeEur": 1490,
        "note": "Ahorra más de 1.000€ frente a contratar servicios por separado"
      },
      "commercialPositioning": {
        "highlighted": true,
        "recommended": true,
        "conversionDriver": true
      }
    }
  Revisar:
  "integratedWebsite": {
      "label": "Web integrada con DanceHub",
      "serviceType": "one_time",
      "shortDescription": "Web conectada al sistema para captar y matricular alumnos.",
      "pricingByPlanEur": {
        "starter": 1490,
        "pro": 1790,
        "enterprise": 2190
      },
      "installments": {
        "months": [3, 6],
        "interestFree": true,
        "exampleMonthlyEur": 199,
        "exampleMonths": 6
      },
      "commercialStrategy": {
        "starter": "paid",
        "pro": "included_or_discounted",
        "enterprise": "discounted"
      },
      "bundleEligible": true,
      "bundlePriceEur": 990
    },
    "standaloneWebsite": {
      "label": "Web independiente",
      "serviceType": "one_time",
      "shortDescription": "Web profesional para escuelas que no necesitan el SaaS.",
      "tierPricingEur": {
        "basic": 1390,
        "standard": 1590,
        "advanced": 2990
      },
      "maintenance": {
        "monthlyPriceEur": 29
      },
      "pricingFinal": false
    }

    Incluir servicio de rebranding y de revisión. 
    Incluir colaboración con estudio creativo Weydi para la creación de las páginas webs

    Revisar descuento de lanzamiento, quiero centrarme en el plan anual, pero entonces cómo ofrezco el descuento durante los primeros meses? Pasar a descuento anual? 
    
    Revisar documentos legales

    Añadir campos de Domicilio y localidad (incluidos filtros, personalizable mediante toggles qué campos mostrar en las tablas de consultas)
    Incluir ordenación ascendente o descendente con icono en cada columna de las tablas de consultas
    Mantener la paginación de las tablas al recargar la página (si el usuario estaba en la página 4 de una tabla y recarga, debe mantenerse en la página 4 en lugar de volver a la 1)
    Añadir un estado de carga mientras se obtienen los datos en las tablas de resultados (actualmente aparece el mensaje de que no hay datos durante unos segundos hasta que estos cargan)

    /register
    Las opciones de planes no incluyen los pagos anuales

    Header:
    El selector de organización sólo confunde y el selector de sede sólo debe estar disponible si el usuario está en el plan Enterprise
    El selector de cursos no permite añadir nuevo curso
    El badge con el número de notificaciones no aparece hasta pulsar por primera vez en el botón de notificaciones
    Modificar subheader para incluir de forma no invasiva, pero como recordatorio constante la capacidad del plan con barra progresiva como en /students

    /auth
    El botón de "Recuérdame" no funciona y hay que volver a iniciar sesión cada vez que expira el tiempo de sesión


    /admin
    El modal de aviso de fin de la prueba gratuita puede no entrar en la pantalla no permitiendo continuar al pago y se puede borrar desde el inspector para continuar con el uso normal de la aplicacion. 
    En el modal de aviso de fin de la prueba gratuita no deja claro los precios reales de los planes (la suma de los addons confunde y los cálculos del ahorro no son suficientemente visibles para el usuario), además el plan preseleccionado debe ser el plan pro con facturación anual. Crea un badge con un código de descuento promocional y que indique que sólo se da el primer mes "FOUNDERS50"
    
    /alumnos
    Tratar de importar da error:
    client:702 [vite] Internal Server Error
Failed to resolve import "xlsx" from "src/components/import/ImportWizard.tsx". Does the file exist?

    Validar campos al crear alumnos

    /form-builder
    El formulario por defecto debe ser el que se carga tras restablecer (actualmente es otro más básico, el objetivo es mostrar claramente las funcionalidades y capacidades que puede tener este formulario)
    Añadir aviso si se sale de la sección teniendo cambios sin guardar

    /enrollments
    Tras cambiar una matrícula de un alumno (de forma que se altere su cuota o clases) la inscripción no se actualiza. No tengo claro si simplemente mostrar un aviso en estos casos o si actualizar la inscripción de forma dinámica.

    Falta completar datos del alumno en la vista previa de la inscripción (fecha de nacimiento, tutores, etc.)
    Si el método de pago es transferencia, en la vista previa de la inscripción se debe mostrar el IBAN.

    /classes
    Al crear una clase, en el select de Aula no se preselecciona el valor "Seleccionar" como el resto de selects y queda vacío
    La ocupación de las clases no se obtiene, se muestran todas las clases con 0 de ocupación, en los alumnos sí se pueden ver las clases correctamente seleccionadas
    Los profesores de las clases no se obtienen, se muestran todas "Sin asignar" pero los profesores si tienen asignadas las clases correctamente desde su sección

    /schedule
    Crear apartado de pressets o horarios guardados que permita guardar horarios y reemplazar el actual por estos guardados.

    La cabecera de la tabla no se queda correctaemnte, pasa por encima del header pero no se fija en la parte superior de la tabla, se debe eliminar esta funcionalidad sticky

    /teachers
    Incluir una suma total de los salarios
    En tabla y vista previa se muestran las clases asignadas, pero en asignar clases no se obtiene las clases asignadas previamente y no se muestran las clases reales, parece que se siguen usando datos de ejemplo







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
