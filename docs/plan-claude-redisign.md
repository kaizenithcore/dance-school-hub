ROADMAP EXPANDIDO — NEXA
Especificaciones de diseño y producto por sprint

LECTURA DEL ESTADO ACTUAL
Antes de prescribir, hay que entender lo que el código revela con precisión:

El sidebar tiene 24 ítems, pero no todos son iguales:

Estado real	Ítems
MVP activo (visible y funcional)	Dashboard, Alumnos, Matrícula online, Inscripciones, Clases, Horarios, Profesores, Aulas, Recepción, Pagos, Economía, Tarifas y bonos, Comunicación, Lista de espera, School Portal, Página web
Legacy (en código, oculto del nav pero con ruta activa)	Examenes, Sedes, Analíticas, Eventos, Renovaciones, Clonar curso, Organización
Esto significa que hay 16 ítems visibles actualmente en el sidebar (no 24, porque el moduleLifecyclePolicy ya oculta los legacy), pero siguen siendo demasiados para el target. Y el mayor problema es que entre los 16 visibles están items que no deberían ser navegación primaria (Aulas, Recepción, Tarifas y bonos, Matrícula online como ítem separado).

Adicionalmente, Renovaciones — el diferenciador más fuerte — está marcado como legacy y oculto. Eso es una decisión de producto que hay que revertir urgentemente.

SPRINT 0 — LIMPIEZA IRREVERSIBLE
Duración: 1 semana
Audiencia: Solo equipo técnico, invisible para el usuario
Principio: Solo se elimina lo que no tiene ningún camino de retorno en el producto actual. No se congela: se borra.

0.1 — Módulos a eliminar del código
Módulo	Qué eliminar	Por qué
Exámenes	Página ExamsPage, 15+ endpoints /api/admin/exams/*, tablas exam_*, constante examSuite, rutas en App.tsx	Marcado disabled_legacy. Sin plan de activación. El featureKey examSuite también afecta a Sedes y Organización — eliminar el concepto completo
Organización	OrganizationAccessPage, endpoints /api/admin/organizations/* (1.138L), tablas organizations/exam_memberships	Existe solo para el ecosistema de exámenes
Sedes	BranchesPage, endpoints branches	Depende de examSuite. Si en el futuro se hace multi-sede real, se rehace desde cero con modelo diferente
Portal Explorer	SchoolExplorerPage (/portal/explorer), SchoolComparerScreen	Directorio público sin masa crítica
Certifier	Referencias en el checkout a "Certifier Lite" y "Certifier Associations", planes exam en commercialCatalog	Producto huérfano sin módulo activo
Resultado esperado: reducción de ~15 endpoints activos, 5+ páginas, 3 tablas en el esquema de migraciones futuras, y eliminación de examSuite como featureKey (libera Sedes e items del sidebar de esa dependencia para decisiones futuras).

0.2 — Renovaciones: revertir estado legacy
Acción concreta: En moduleLifecyclePolicy.ts, cambiar renewals de legacy a mvp.

Renovaciones debe ser visible, funcional y accesible. Es el feature que más claramente demuestra el valor del producto: convierte semanas de trabajo manual en minutos. Tenerlo oculto mientras el usuario ve "Recepción" o "Aulas" en la navegación es una decisión de producto incorrecta.

0.3 — Variables de entorno de Stripe
Los price IDs de Stripe están hardcodeados en env.ts (201 líneas con 100+ variables de entorno). Esto no es urgente para el usuario, pero sí para la operativa: un cambio de plan requiere deploy.

Acción: Mover los price IDs a una tabla billing_config en Supabase. Las variables de entorno solo deberían contener las claves de API (publishable key, secret key, webhook secret), no los IDs de productos/precios.

SPRINT 1-2 — RESTRUCTURACIÓN DE LA NAVEGACIÓN
Duración: 2 semanas
Impacto visual: Alto — cambia la estructura completa del sidebar
Principio: La navegación debe reflejar el modelo mental del director de escuela, no la arquitectura de la base de datos.

El nuevo sidebar — 7 secciones primarias
Ninguna funcionalidad desaparece. Todo se mueve a una ubicación más coherente.

┌─────────────────────────────────┐
│  [Logo escuela]   [Año académico]│
├─────────────────────────────────┤
│                                 │
│  ○  Inicio                      │
│                                 │
│  ▼  Alumnos                     │
│      └ Todos los alumnos        │
│      └ Inscripciones            │
│      └ Lista de espera          │
│      └ Formulario de matrícula  │
│                                 │
│  ▼  Clases                      │
│      └ Clases y horarios        │
│      └ Profesores               │
│      └ Aulas                    │
│                                 │
│  ▼  Cobros                      │
│      └ Pagos                    │
│      └ Economía                 │
│      └ Tarifas                  │
│                                 │
│  ▼  Comunicaciones              │
│      └ Renovaciones     [PRO]   │
│      └ Campañas de email [PRO]  │
│                                 │
│  ○  Portal del alumno           │
│                                 │
│  ○  Configuración               │
│                                 │
└─────────────────────────────────┘
Mapeo completo: de dónde viene cada ítem y adónde va
Ítem actual	Destino	Acción
Dashboard	Inicio	Renombrar, rediseñar (Sprint 5)
Alumnos	Alumnos → Todos los alumnos	Mover como sub-ítem
Inscripciones	Alumnos → Inscripciones	Mover como sub-ítem
Lista de espera	Alumnos → Lista de espera	Mover como sub-ítem (quitar feature gate del nav, mantenerlo en la página si aplica)
Matrícula online	Alumnos → Formulario de matrícula	Renombrar + mover como sub-ítem
Clases	Clases → Clases y horarios	Fusionar con Horarios en una sola sección
Horarios	(fusionado con Clases)	La vista de horario pasa a ser una pestaña/vista alternativa dentro de Clases
Profesores	Clases → Profesores	Mover como sub-ítem
Aulas	Clases → Aulas	Mover como sub-ítem (quitar de navegación primaria)
Recepción	Configuración → Recepción	Herramienta secundaria, no navegación diaria
Pagos	Cobros → Pagos	Mover como sub-ítem
Economía	Cobros → Economía	Mover como sub-ítem
Tarifas y bonos	Cobros → Tarifas	Mover como sub-ítem
Comunicación	Comunicaciones → Campañas de email	Renombrar, mover como sub-ítem
Renovaciones	Comunicaciones → Renovaciones	Promover: primer sub-ítem de Comunicaciones, visible para todos
School Portal	Portal del alumno	Mantener como ítem primario, renombrar
Página web	Configuración → Página web	No es navegación diaria
Configuración	Configuración	Mantener como ítem primario
Examenes	❌ Eliminado (Sprint 0)	—
Organización	❌ Eliminado (Sprint 0)	—
Sedes	❌ Eliminado (Sprint 0)	—
Analíticas	(absorbido por Cobros → Economía)	Mover contenido a Economía o crear sub-sección en Cobros
Eventos	❌ Oculto (legacy, sin eliminar aún)	Se mantiene en código, invisible en nav
Clonar curso	(acción dentro de Clases, no nav)	Se convierte en un botón/acción contextual dentro de la sección Clases, no un ítem de navegación
Comportamiento del sidebar expandido
Estados de los grupos:

Inicio y Portal del alumno y Configuración: ítems simples, sin expansión, clic directo.
Alumnos, Clases, Cobros, Comunicaciones: grupos expandibles. El estado de expansión persiste en localStorage por usuario.
El grupo activo se expande automáticamente al navegar a cualquiera de sus sub-ítems.
En mobile: el sidebar sigue siendo un drawer. Los grupos se expanden/colapsan con el mismo comportamiento.
Feature gates en el nuevo sidebar:

El gate de plan no oculta el ítem del sidebar. Lo muestra con una etiqueta PRO discreta y, al hacer clic, lleva a la sección con un banner explicativo (no un modal de bloqueo genérico). Esto expone el valor en lugar de ocultarlo.

Excepción: Campañas de email y Renovaciones muestran la etiqueta PRO pero el usuario puede entrar, ver la interfaz, y entender qué obtendría al actualizar.

Configuración — qué contiene ahora
Configuración pasa de ser una sola página monolítica (1.344L) a una sección con sub-navegación lateral:

Configuración
├── Escuela          ← (General + Marca fusionados: datos, logo, redes)
├── Agenda           ← (horarios, franjas, días laborables)
├── Cobros           ← (moneda, vencimiento, métodos de pago)
├── Avisos           ← (notificaciones automáticas)
├── Acceso           ← (seguridad, contraseñas, 2FA)
├── Plan y facturación ← (plan actual, add-ons, historial)
├── Recepción        ← (modo recepción, configuración de incidencias)
└── Página web       ← (landing pública, configuración)
Esta es una reestructuración de SettingsPage.tsx en 8 sub-páginas independientes bajo /admin/settings/*. Cada una carga solo su bloque de configuración. El resultado es que la página de "Escuela" tiene ~200L en lugar de compartir espacio con configuración de seguridad y billing.

Clases y horarios — fusión de dos ítems en uno
Actualmente "Clases" y "Horarios" son dos páginas separadas. Para el usuario, la distinción es artificial: una clase tiene un horario, y un horario es de una clase.

Propuesta:

La sección "Clases y horarios" tiene dos vistas alternativas, accesibles desde la misma URL base:

/admin/classes
├── Vista: Lista de clases     ← tabla con nombre, profesor, aula, estado
└── Vista: Horario semanal     ← vista calendario/grid semanal
Un toggle en la parte superior (similar a cómo GitHub alterna entre vista lista y vista grid) permite cambiar de vista. La URL puede reflejar la vista activa: /admin/classes?view=schedule. La preferencia se recuerda en localStorage.

Acciones disponibles desde ambas vistas:

Crear clase nueva
Editar clase (drawer lateral)
Ver alumnos de una clase
Clonar clase/curso (botón de acción contextual, no ítem de nav)
Activar/desactivar clase
SPRINT 3-4 — ONBOARDING GUIADO
Duración: 2 semanas
Audiencia: Solo usuarios en su primera sesión
Principio: El onboarding no es un tour. Es completar acciones reales. Al terminar, el usuario tiene una escuela configurada con datos reales.

Condición de activación
El onboarding se activa cuando:

first_login_guide_shown en localStorage es false (ya existe esta clave en AdminLayout)
O cuando la escuela no tiene ningún alumno activo
Se desactiva permanentemente al completar el paso 5 o al hacer clic en "Omitir configuración" (con confirmación).

Flujo de 5 pasos
El onboarding no ocupa una ruta separada. Es una capa sobre el admin existente: un panel lateral fijo en el lado derecho (320px) que guía sin bloquear la interfaz. El usuario puede interactuar con la aplicación real mientras lo sigue.

PANEL LATERAL DE ONBOARDING (fijo, colapsable)
┌──────────────────────────────┐
│  Configura tu escuela        │
│  ●●○○○  Paso 2 de 5          │
├──────────────────────────────┤
│                              │
│  Añade tu primera clase      │
│                              │
│  Crea una clase para ver     │
│  cómo funciona el horario.   │
│                              │
│  [Ir a Clases →]             │
│                              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  ✓ Tu escuela                │
│  → Añadir clase              │
│  ○ Añadir alumnos            │
│  ○ Configurar cobros         │
│  ○ Explorar portal           │
└──────────────────────────────┘
Paso 1 — Tu escuela (2 minutos)

Nombre de la escuela (pre-rellenado si existe)
Subir logo (drag & drop, recorte inline)
Ciudad o localidad
No se piden más datos aquí. El resto va a Configuración después.
Acción: guardar en school_settings.branding
Paso 2 — Tu primera clase (3 minutos)

Abre el formulario de clase dentro del panel (versión simplificada: nombre, día, hora inicio, hora fin, profesor opcional)
El horario semanal se actualiza en tiempo real detrás del panel
Acción: crea una clase real en la base de datos
Paso 3 — Tus primeros alumnos (3 minutos)

Dos opciones claramente diferenciadas:
"Añadir uno manualmente" → formulario inline (nombre, email o teléfono, clase asignada)
"Importar desde Excel/CSV" → va a /admin/students/import
Mínimo requerido: 1 alumno
Acción: crea alumnos reales
Paso 4 — Cómo cobrar (2 minutos)

Moneda (selector, EUR por defecto)
Día de vencimiento mensual
Método de pago principal (tarjeta online / transferencia / efectivo)
No se configura Stripe aquí. Solo la preferencia operativa.
Acción: guarda en school_settings.payments
Paso 5 — El portal de tus alumnos (1 minuto)

Pantalla final, sin formulario
Muestra un preview del portal del alumno con los datos recién creados
Botón "Ver mi portal" → abre /s/{schoolSlug} en nueva pestaña
Botón "Listo, ir al panel" → cierra el onboarding, marca como completado
Estado visual del progreso:

Cada paso completado muestra un check verde en la lista lateral
El panel es colapsable (flecha) sin perder progreso
En móvil: el panel se convierte en un banner inferior con el paso actual
Sección intros (ajuste, no eliminación)
AdminLayout ya tiene un sistema de SECTION_INTROS (15+ secciones, auto-dismiss a 5.2 segundos). Este sistema se mantiene pero se recorta:

Se eliminan las section intros de secciones que ya no existen (exams, branches, organization)
Se reducen a un máximo de 6 secciones (Inicio, Alumnos, Cobros, Renovaciones, Portal, Configuración)
La duración pasa de 5.2s a 3.5s (más breve, menos intrusiva)
Se añade una X de cierre explícita (actualmente no existe o no es prominente)
SPRINT 5-6 — DASHBOARD COMO HERRAMIENTA DE TRABAJO
Duración: 2 semanas
Principio: El dashboard no reporta el pasado. Organiza el presente. Cada widget tiene una acción directa.

Problema del dashboard actual
El dashboard actual muestra:

KPI cards (alumnos activos, ingresos del mes, inscripciones)
Gráfico de barras de ingresos de los últimos 6 meses
Balance mensual
ScheduleInsightsPanel
Últimas 5 inscripciones
Pagos pendientes
Es información correcta en el lugar equivocado. Un director de escuela el lunes por la mañana no necesita ver la tendencia de ingresos de 6 meses. Necesita saber qué hacer hoy.

El nuevo dashboard — estructura
┌────────────────────────────────────────────────────────────────┐
│  Buenos días, [nombre]. Aquí está tu escuela hoy.             │
├──────────────────┬─────────────────┬──────────────────────────┤
│  COBROS          │  RENOVACIONES   │  INSCRIPCIONES           │
│  pendientes      │  este mes       │  pendientes              │
│                  │                 │                          │
│  12 alumnos      │  8 de 34        │  3 solicitudes           │
│  €1.840          │  completadas    │  esperando respuesta     │
│                  │                 │                          │
│  [Ver cobros]    │  [Ver estado]   │  [Revisar]               │
├──────────────────┴─────────────────┴──────────────────────────┤
│  ESTA SEMANA                                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Lun  Mar  Mié  Jue  Vie  Sáb                             │ │
│  │  3    5    4    5    3    6   clases                      │ │
│  │       ↑ mañana: Ballet adulto 18:00 · Flamenco 19:30     │ │
│  └──────────────────────────────────────────────────────────┘ │
│  [Ver horario completo]                                        │
├────────────────────────────────────────────────────────────────┤
│  ACTIVIDAD RECIENTE                    ALUMNOS A DESTACAR      │
│                                                                │
│  ○ Ana García se matriculó en Ballet   ⚠ Luis Pérez: 2 meses │
│    Adulto · hace 2 horas               sin pagar              │
│  ○ Carlos López: pago recibido         ⚠ Marta Ruiz: no       │
│    €85 · hace 5 horas                  renovó aún             │
│  ○ 3 alumnos en lista de espera                               │
│    en Flamenco Avanzado                                        │
└────────────────────────────────────────────────────────────────┘
Especificaciones por bloque
Bloque 1 — Los tres números que importan hoy (cards superiores)

Cada card tiene:

Un número grande (el estado)
Un contexto secundario (lo que significa)
Un botón de acción directa que lleva a la sección correcta
Card	Dato principal	Contexto	Acción
Cobros pendientes	N alumnos / €X	"del mes en curso"	→ /admin/payments con filtro "pendiente" aplicado
Renovaciones	N de M completadas	"para el próximo curso"	→ /admin/renewals
Inscripciones	N solicitudes	"esperando respuesta"	→ /admin/enrollments con filtro "pendiente"
Si una card está en cero (todo al día), muestra un estado positivo: checkmark verde + "Todo gestionado" en lugar del número. Esto refuerza la sensación de control.

Bloque 2 — Vista de la semana

No es el ScheduleInsightsPanel actual. Es una barra horizontal simplificada que muestra:

Los 6 días de la semana laboral
Número de clases por día (un número, no una lista)
Un highlight del día siguiente (próximas clases)
Un clic en cualquier día lleva a /admin/classes?view=schedule&date=YYYY-MM-DD
Este bloque no muestra listas de alumnos ni detalles. Solo da contexto de carga de trabajo.

Bloque 3 — Actividad reciente y alertas

Dos columnas:

Izquierda — Actividad reciente: Las últimas 5 acciones del sistema (inscripción nueva, pago recibido, cambio de estado). Cada ítem es clicable y lleva al registro correspondiente. Formato: acción + alumno + tiempo relativo.
Derecha — Alumnos a destacar: Los 3-5 alumnos que requieren atención. No es una lista genérica: es un filtro predefinido que muestra alumnos con pagos vencidos >30 días, alumnos activos que no han renovado a 15 días del cierre del año académico, o alumnos en lista de espera con plaza disponible. Cada ítem tiene una acción directa.
Lo que desaparece del dashboard:

El gráfico de barras de ingresos de 6 meses → se mueve a Cobros → Economía
El balance mensual (ingresos/gastos) → se mueve a Cobros → Economía
Las métricas de MRR → se mueven a Cobros → Economía
El dashboard deja de ser una pantalla de reportes. Economía es la pantalla de reportes.

SPRINT 7-8 — PORTAL DEL ALUMNO — SCOPE V1
Duración: 2 semanas (de las 4 de desarrollo existente, redirigir hacia el scope correcto)
Principio: El portal resuelve primero el problema operativo ("los padres me preguntan lo mismo 10 veces"), no el problema de engagement.

Las 18 pantallas actuales — clasificación
Pantalla	Estado en V1	Razón
Home (feed)	❌ Sustituida	El home debe ser operativo, no social
Classes	✅ Prioridad	Ver mis clases y horario personal
Finance	✅ Prioridad	Ver mis pagos, facturas, estado
Notifications	✅ Prioridad	Avisos de la escuela
Profile	✅ Incluida	Datos personales del alumno
Preferences	✅ Incluida	Configuración de notificaciones
Teacher Schedule	✅ Incluida	Vista de horario para profesores
Teacher Classes	✅ Incluida	Gestión de clases para profesores
Feed	❌ Pospuesta	Social, no operativo
Connections	❌ Pospuesta	Red social, no operativo
Saved	❌ Pospuesta	Social
Gallery	❌ Pospuesta	Social
Progress	⏸ En pausa	Valor real pero depende de exámenes (eliminados)
Certifications	⏸ En pausa	Ídem
Search	❌ Simplificada	La búsqueda global no tiene sentido en V1
School Comparer	❌ Eliminada	Relacionada con Portal Explorer (eliminado)
Teacher Posts	❌ Pospuesta	Social
Onboarding	✅ Incluida	Primer acceso del alumno
Portal V1 — 7 pantallas activas:

/portal/app
├── /inicio          ← Home rediseñado (operativo, no social)
├── /clases          ← Mi horario personal
├── /cobros          ← Mis pagos y facturas
├── /avisos          ← Notificaciones de la escuela
├── /perfil          ← Mis datos
├── /preferencias    ← Configuración
└── /profesor/*      ← Vistas de profesor (schedule, classes)
Diseño del Home del portal (sustitución)
El Home actual es un feed social. El Home V1 es un panel de alumno:

┌───────────────────────────────────────┐
│  Hola, Ana 👋                         │
│  Ballet Adulto · Flamenco Iniciación  │
├───────────────────────────────────────┤
│  PRÓXIMA CLASE                        │
│  Mañana · Martes 18:00                │
│  Ballet Adulto — Sala 2               │
│  [Ver horario completo]               │
├───────────────────────────────────────┤
│  ESTADO DE PAGOS                      │
│  Junio 2026: ✓ Pagado                 │
│  Próximo: Julio · €85                 │
├───────────────────────────────────────┤
│  AVISOS DE LA ESCUELA                 │
│  · Clase del 25/06 cancelada          │
│  · Fin de curso: 30/06               │
└───────────────────────────────────────┘
Tres bloques de información, todos operativos. Ningún feed, ninguna actividad social.

Acceso al portal — simplificación
El portal actualmente tiene /portal/onboarding y su propia autenticación. Esto es correcto. Lo que se añade:

Desde el panel admin, en la ficha de cada alumno, un botón "Enviar acceso al portal" genera un link de invitación con magic link (sin necesidad de recordar contraseña).
El alumno recibe un email con el link, entra directamente al portal, y configura su perfil en el onboarding existente.
Este flujo ya existe parcialmente en el código (hay lógica de invitaciones). Se trata de exponerlo claramente desde la ficha del alumno, no de construirlo desde cero.

SPRINT 9-12 — SETTINGS Y DEUDA TÉCNICA
Duración: 4 semanas
Principio: El trabajo técnico de este sprint tiene impacto en la velocidad futura, no en la experiencia del usuario inmediata. Se hace después de los sprints de producto porque el equipo ya conoce los nuevos patrones.

AdminLayout.tsx — División en 4 ficheros
El fichero de 1.889 líneas tiene responsabilidades claramente separables:

Fichero nuevo	Responsabilidad	Líneas estimadas
AdminLayout.tsx	Solo shell: nav, sidebar, topbar, outlet	~200L
BillingShell.tsx	Trial state, checkout flow, plan gates	~600L
OnboardingShell.tsx	Section intros, first login guide, welcome overlay	~400L
OfflineGuard.tsx	Detección online/offline, banner	~80L
AdminLayout importa los otros tres. Cada uno es testeable de forma independiente.

SettingsPage.tsx — División en 8 sub-páginas
La página de 1.344 líneas se divide en rutas independientes:

/admin/settings                    → redirect a /admin/settings/escuela
/admin/settings/escuela            ← SchoolSettingsPage (~180L)
/admin/settings/agenda             ← ScheduleSettingsPage (~150L)
/admin/settings/cobros             ← PaymentSettingsPage (~160L)
/admin/settings/avisos             ← NotificationSettingsPage (~120L)
/admin/settings/acceso             ← SecuritySettingsPage (~130L)
/admin/settings/plan               ← BillingSettingsPage (~200L)
/admin/settings/recepcion          ← ReceptionSettingsPage (~100L)
/admin/settings/pagina-web         ← WebsiteSettingsPage (~120L)
La navegación lateral dentro de Configuración refleja estas 8 secciones. Es el mismo patrón que ya usa la sección principal del admin (sidebar), aplicado a nivel de sub-sección.

CI de tests — Línea base
Acción concreta:

Ejecutar todos los tests existentes: identificar cuántos pasan, cuántos fallan. Esto da la línea base real.
Configurar GitHub Actions (o el CI que se use) para ejecutar vitest run en cada PR.
No se exige cobertura mínima en este sprint. Solo que el CI ejecute y reporte.
Los tests que fallan se marcan como skip con un comentario // TODO: fix — no se eliminan, no se fuerza que pasen.
El objetivo: que ningún PR futuro rompa tests que actualmente pasan.
organizations/route.ts — Extracción de servicio
El endpoint más largo del backend (1.138 líneas) mezcla lógica de RBAC, contexto multi-tenant y operaciones CRUD. Se extrae a OrganizationsService:

/backend/lib/services/
├── OrganizationsService.ts     ← lógica RBAC y contexto
└── OrganizationsService.test.ts ← tests unitarios de los casos críticos
El route handler queda como orquestador delgado (~150L): valida la request, llama al servicio, devuelve la respuesta.

RESUMEN EJECUTIVO DEL ROADMAP
Sprint	Semanas	Resultado visible
Sprint 0	1	Módulos zombie eliminados, Renovaciones activado
Sprint 1-2	2	Sidebar reorganizado: 7 secciones, 16 ítems como sub-items
Sprint 3-4	2	Onboarding de 5 pasos que produce una escuela configurada
Sprint 5-6	2	Dashboard operativo: 3 números + semana + alertas
Sprint 7-8	2	Portal del alumno V1: 7 pantallas operativas
Sprint 9-12	4	AdminLayout dividido, Settings dividido, CI activo, OrganizationsService extraído
Total: 13 semanas / ~3 meses

Al final de este roadmap:

Un director de escuela puede aprender el producto en 10 minutos (onboarding)
El primer valor visible llega en el día 1 (dashboard operativo)
El diferenciador (renovaciones) es accesible y visible desde el inicio
El portal resuelve el problema inmediato de comunicación con alumnos
El código está en condiciones de recibir un desarrollador nuevo sin que tarde 2 semanas en entender AdminLayout