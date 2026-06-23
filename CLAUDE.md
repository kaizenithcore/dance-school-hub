# Nexa — Guía para desarrolladores

Plataforma SaaS de gestión para escuelas de danza. Target: academias de 50–500 alumnos que trabajan con Excel, WhatsApp y herramientas desconectadas.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | Supabase (PostgreSQL + Auth + Storage) |
| API backend | Next.js 16 (App Router, solo API routes — sin SSR) |
| Pagos | Stripe |
| Email | Resend |

---

## Estructura del repositorio

```
/                     ← Frontend React (Vite, puerto 8080 en dev)
├── src/
│   ├── components/
│   │   ├── layout/   ← AdminLayout, BillingShell, OnboardingShell, OfflineGuard, AdminSidebar, Topbar
│   │   ├── onboarding/ ← OnboardingPanel (panel guiado de 5 pasos)
│   │   ├── schedule/ ← ScheduleEditor, ScheduleInsightsPanel
│   │   ├── tables/   ← Tablas de datos (Students, Payments, etc.)
│   │   └── ui/       ← shadcn/ui components (no modificar directamente)
│   ├── hooks/        ← Custom hooks (useBillingEntitlements, usePermissions, etc.)
│   ├── lib/
│   │   ├── api/      ← Clientes API (1 fichero por dominio)
│   │   ├── auth.ts   ← Funciones de autenticación (login, logout, register)
│   │   ├── commercialCatalog.ts ← Planes, precios, features (fuente de verdad comercial)
│   │   ├── constants.ts ← Constantes compartidas (timeouts, magic numbers)
│   │   └── moduleLifecyclePolicy.ts ← Qué módulos están activos/legacy/desactivados
│   ├── pages/
│   │   ├── admin/    ← Panel de administración
│   │   │   └── settings/ ← Sub-páginas de configuración (8 ficheros)
│   │   ├── auth/     ← Login, registro, recuperación de contraseña
│   │   └── public/   ← Matriculación pública, horario público
│   ├── portal/       ← Portal del alumno (deferred — V1 parcial)
│   └── providers/    ← BrandingProvider

/backend              ← API Next.js (puerto 3000 en dev)
├── app/api/
│   ├── admin/        ← Endpoints del panel (requieren auth de admin)
│   ├── public/       ← Endpoints sin auth (formulario, horario público)
│   ├── student/      ← Endpoints del portal de alumno
│   └── auth/me       ← Contexto de autenticación + tenant
└── lib/
    ├── auth/         ← requireAuth, tenantContext
    ├── services/     ← Lógica de negocio (1 service por dominio)
    └── constants/    ← moduleLifecyclePolicy, defaultEnrollmentFormConfig
```

---

## Cómo arrancar

### Frontend (puerto 8080)
```bash
npm install
npm run dev
```

### Backend (puerto 3000) — necesario para datos reales
```bash
cd backend
npm install
npm run dev
```

El frontend proxea `/api/*` → `localhost:3000` vía Vite. Sin el backend, el admin carga pero sin datos (empty states).

---

## Variables de entorno

### Frontend (`.env.local`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3000
```

### Backend (`backend/.env.local`)
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=hola@tudominio.com
NODE_ENV=development
```

---

## Modelo de tenancy

Cada escuela es un **tenant**. El aislamiento de datos está a nivel de base de datos mediante RLS (Row-Level Security) de Supabase. Todos los datos tienen `tenant_id`.

El flujo auth:
1. Supabase Auth autentica al usuario
2. `/api/auth/me` devuelve el contexto de tenant (rol, membresías)
3. `AuthContext` en el frontend provee el contexto al árbol de React
4. `BillingShell` gestiona estado de trial/plan

---

## Módulos — estado actual

| Módulo | Estado | Notas |
|--------|--------|-------|
| Alumnos | ✅ Activo | Fichas, importación, clases |
| Clases y horarios | ✅ Activo | Vista lista + toggle a horario semanal |
| Inscripciones | ✅ Activo | Formulario público configurable |
| Pagos | ✅ Activo | Registro manual, facturas, recibos |
| Renovaciones | ✅ Activo | Campañas de renovación por curso |
| Lista de espera | ✅ Activo | Automática cuando clase está llena |
| Comunicaciones | ✅ Activo | Email masivo segmentado |
| Portal del alumno | 🚧 V1 parcial | Horario, pagos, avisos — sin funcionalidades sociales |
| Exámenes/Certifier | ❌ Eliminado | Discontinuado en Sprint 0 del roadmap |
| Multi-sede | ❌ Eliminado | Discontinuado en Sprint 0 |
| Analíticas avanzadas | 🕐 Legacy | Código existe, UI oculta |

---

## Flujo de onboarding

El `OnboardingPanel` se muestra en primera sesión. 5 pasos:
1. Nombre de escuela + logo + ciudad → `updateSchoolSettings`
2. Primera clase → `createClass`
3. Primer alumno → `createStudent`
4. Configurar cobros → `updateSchoolSettings({payment})`
5. Preview del portal → abre `/s/{slug}`

Estado en `localStorage` con clave `nexa:onboarding:state:v1`.

---

## Billing / Trial

- Trial de 30 días desde creación del tenant
- Al expirar → `BillingShell` bloquea el acceso con modal de checkout
- El checkout llama a Stripe, que redirige de vuelta con `?stripe=success`
- `BillingShell` detecta el param y persiste `trialPaymentCompleted: true` en `school_settings.billing`
- `useBillingEntitlements` hook expone el estado de plan y features disponibles

---

## Convenciones de código

- TypeScript estricto (ver tsconfig — `noImplicitAny: false` por compatibilidad histórica)
- Lógica de negocio en custom hooks, no en componentes
- API calls en `src/lib/api/` — 1 fichero por dominio
- Errores: `toast.error()` para feedback al usuario, `console.error()` para logging
- `LucideIcon` type para props de iconos (no `any`)
- Imports de rutas con `@/` alias

---

## CI/CD

GitHub Actions en `.github/workflows/ci.yml`:
- TypeScript check (`tsc --noEmit`)
- Tests (`vitest run`)
- Build (`vite build`)

Se ejecuta en push y PR a `main`.

---

## Deuda técnica conocida

- `SettingsPage.tsx` original todavía existe como referencia pero fue reemplazada por sub-páginas en `src/pages/admin/settings/`
- `portalFoundationService.ts` en backend es un god file (3.648L) — pendiente de split cuando el portal social se active
- Tests: solo 1 test file (`src/test/example.test.ts`). Los servicios de pago e inscripción son los más críticos sin cobertura
- `src/lib/commercialCatalog.ts` contiene la configuración de planes — los price IDs de Stripe están en `.env.local`, no en el catálogo
