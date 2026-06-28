# Estado actual del sistema — Nexa

> Última actualización: junio 2026  
> Versión del producto: V1 (Early Adopters)

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite (puerto 8080 en dev) |
| Estilos | Tailwind CSS + shadcn/ui |
| Backend | Next.js 16 (App Router, solo API routes) (puerto 3000 en dev) |
| Base de datos | Supabase (PostgreSQL + Auth + Storage) |
| Pagos | Stripe |
| Email | Resend |
| PDFs | Playwright (HTML → PDF headless) |

---

## Módulos — Estado actual

### ✅ Activos (MVP)

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/admin` | Vista operativa diaria: cobros, inscripciones, horario, renovaciones activas |
| Alumnos | `/admin/students` | Fichas completas, campos personalizados, importación Excel/CSV |
| Clases | `/admin/classes` | Catálogo de clases con disciplina, categoría, capacidad desde aula, campo extra |
| Horario semanal | `/admin/schedule` | Vista de semana con drag & drop, insights automáticos |
| Profesores | `/admin/teachers` | Directorio con clases asignadas y salario |
| Aulas | `/admin/rooms` | Salas con capacidad (auto-rellena la capacidad de la clase) |
| Inscripciones | `/admin/enrollments` | Gestión de solicitudes de matrícula (pendiente/confirmada/cancelada) |
| Lista de espera | `/admin/waitlist` | Alumnos en cola cuando la clase está llena |
| Formulario matrícula | `/admin/form-builder` | Editor de formulario público configurable (drag & drop, condiciones) |
| Pagos | `/admin/payments` | Registro manual, facturas mensuales, recibos en efectivo (PDF con branding) |
| Economía | `/admin/economia` | Ingresos, gastos de profesores, balance mensual, gráficas 12 meses |
| Tarifas y paquetes | `/admin/pricing` | Precios por clase y paquetes combinados (bonos) |
| Comunicados | `/admin/communications` | Email masivo segmentado por clase, disciplina o toda la escuela |
| Renovaciones | `/admin/renewals` | Flujo guiado de renovación de plaza por curso académico, envío de email con horario |
| Recepción | `/admin/reception` | Búsqueda rápida, cobro express, incidencias |
| Portal del alumno (admin) | `/admin/school/portal` | Gestión del portal; vista previa como alumno; invitaciones por email |
| Clonar curso | `/admin/course-clone` | Duplica clases y horarios de un año académico al siguiente |
| Configuración | `/admin/settings/*` | Escuela, branding, agenda, cobros, avisos, acceso, plan |

### 🚧 Portal del alumno V1 — Nexa Club (activo, sin funcionalidades sociales)

| Pantalla | Ruta | Estado |
|----------|------|--------|
| Home operativo | `/portal/app` | ✅ Datos reales |
| Mis clases | `/portal/app/clases` | ✅ Datos reales |
| Cobros y recibos | `/portal/app/cobros` | ✅ Datos reales |
| Avisos | `/portal/app/avisos` | ✅ Datos reales |
| Perfil | `/portal/app/perfil` | ✅ Datos reales |
| Login de alumno | `/portal/login` | ✅ Magic link (OTP) |
| Feed social | `/portal/app/feed` | 🔮 V2 — muestra "Próximamente" |
| Conexiones | `/portal/app/connections` | 🔮 V2 — muestra "Próximamente" |
| Progreso y logros | `/portal/app/progress` | 🔮 V2 — muestra "Próximamente" |
| Certificaciones | `/portal/app/certifications` | 🔮 V2 — muestra "Próximamente" |

### 🕐 Legacy (código existe, ocultos del sidebar)

- `analytics` → muestra página "Próximamente"
- `events` → muestra página "Próximamente"

### ❌ Discontinuados en V1

- **Exámenes / Certifier** → código eliminado del frontend. Spec disponible en `docs/examsuit-estado-integracion-y-pendientes.md` para referencia futura.
- **Multi-sede (branches)** → eliminado en Sprint 0.

---

## Flujos principales

### Alta de alumno
1. Admin crea alumno en `/admin/students` (o importa Excel)
2. Alumno recibe email de invitación al portal (magic link)
3. Alumno accede a `/portal/login`, recibe OTP por email, entra directamente a `/portal/app`

### Matrícula
- **Individual**: formulario en `/s/{slug}/enroll` → solicitud en `/admin/enrollments` → admin confirma/rechaza
- **Conjunta**: mismo formulario con modo matrícula conjunta (varios alumnos, un pagador)
- **Desde recepción**: admin registra directamente desde `/admin/reception`

### Cobros y recibos
1. Generar facturas mensuales (crea registros en `monthly_invoices` con método de pago del alumno)
2. Para alumnos en efectivo: generar PDF de recibos (desde facturas pendientes, antes del pago)
3. Entregar recibo físico al alumno → marcar factura como pagada → se crea registro en `payments`
4. Para transferencia: alumno paga → admin marca como pagado → se registra método correcto

### Renovación de curso
1. Admin configura año académico destino y fecha límite
2. Genera propuestas automáticas para todos los alumnos con matrícula confirmada
3. Configura email con horario del próximo curso (tabla HTML auto-generada desde `/admin/schedule`)
4. Envía emails (inmediato o programado) → alumno ve enlace en `/renovar?offer=<id>`
5. Alumno selecciona qué clases renovar individualmente → admin ve estado en tiempo real

### Año académico
- El selector en el header cambia el `current_academic_year_id` en `school_settings`
- Clases e inscripciones se filtran automáticamente por año seleccionado
- `Clonar curso` duplica clases + horarios de un año al siguiente para reutilizar estructura

---

## Autenticación y roles

### Roles de tenant (escuela)
- `owner`: acceso total, incluido billing
- `admin`: gestión completa sin billing crítico
- `staff`: acceso operativo (clases, alumnos, recepción) sin configuración

### Auth separada por tipo de usuario
- **Escuelas**: `/auth/login`, `/auth/register` → Supabase Auth + JWT + tenant membership
- **Alumnos (Nexa Club)**: `/portal/login` → magic link OTP, sin contraseña, redirige a `/portal/app`

---

## Branding

El branding se configura en `/admin/settings/branding`:
- Logo (PNG/SVG, hasta 2MB) → almacenado en Supabase Storage (`tenant-assets`)
- Color principal → aplicado en portal del alumno, emails, PDFs y recibos
- Tipografía → Inter, Poppins, Montserrat, Lato

---

## Documentos generados (PDFs con branding)

| Documento | Trigger | Branding |
|-----------|---------|----------|
| Recibos de pago individual | Desde ficha de pago | ✅ Logo + colores |
| Lote de recibos en efectivo | Desde `/admin/payments` | ✅ Logo + colores |
| Hojas de asistencia | Desde `/admin/reception` | ✅ Logo + colores |
| Todas las hojas (bulk) | Desde `/admin/reception` | ✅ Logo + colores |
| Impresión de tablas | Botón Printer en tablas | ✅ Logo + colores |

---

## Billing y trial

- Trial gratuito de 30 días desde la creación del tenant
- El plan seleccionado durante el registro se aplica al trial (usando `school_settings.billing.planType`)
- Al expirar: `BillingShell` bloquea el acceso con modal de checkout → Stripe
- Promo de fundadores configurable en `catalog/commercialCatalog.json → foundersPromo`

---

## Deuda técnica conocida

- `SettingsPage.tsx` original existe como referencia pero fue reemplazada por sub-páginas en `src/pages/admin/settings/`
- `portalFoundationService.ts` en backend tiene ~3.700 líneas — pendiente de split cuando el portal social se active
- Tests: solo 1 test file (`src/test/example.test.ts`). Los servicios de pago e inscripción son los más críticos sin cobertura
- `copyFoundersCode` y `foundersCodeCopied` en `BillingShell` son código muerto (el descuento se aplica automáticamente)
- Pantallas V2 del portal (`FeedScreen`, `ConnectionsScreen`, etc.) existen como ficheros pero sus rutas muestran `PortalComingSoonScreen`
- La migración de año académico (`backend/supabase/migrations/20260627000000_academic_year_scoping.sql`) debe aplicarse manualmente con `supabase db push`
