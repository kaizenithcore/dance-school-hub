# Nexa — Gestión para escuelas de danza

SaaS de gestión operativa para academias de danza de 50 a 500 alumnos. Reemplaza Excel, WhatsApp y herramientas desconectadas con un sistema unificado pensado para directores de escuela.

## Características principales

- **Alumnos** — fichas, historial, importación masiva desde Excel/CSV
- **Clases y horarios** — creación de clases, editor de horario semanal con detección de solapamientos
- **Matrícula online** — formulario público configurable con landing de escuela
- **Pagos** — registro manual, generación de facturas y recibos PDF
- **Renovaciones** — campañas automáticas de renovación de matrícula por curso
- **Lista de espera** — gestión automática cuando las clases están completas
- **Comunicaciones** — email masivo segmentado por clase, estado o categoría
- **Portal del alumno** — horario personal, estado de pagos y avisos de la escuela
- **Configuración completa** — branding, agenda, cobros, avisos, seguridad y plan

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + TypeScript + Vite (puerto 8080) |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | Supabase (PostgreSQL + Auth + Storage + RLS) |
| API backend | Next.js 16 API routes (puerto 3000) |
| Pagos | Stripe |
| Email | Resend |

## Arrancar en local

### Requisitos
- Node.js 20+
- Cuenta Supabase con proyecto configurado
- (Opcional) Cuenta Stripe para pagos

### Frontend
```bash
npm install
cp .env.local.example .env.local   # rellenar variables
npm run dev                         # http://localhost:8080
```

### Backend (necesario para datos reales)
```bash
cd backend
npm install
cp .env.local.example .env.local   # rellenar variables
npm run dev                         # http://localhost:3000
```

El frontend proxea `/api/*` → `localhost:3000` automáticamente. Sin el backend, el admin carga en modo degradado (empty states).

## Variables de entorno

### Frontend (`.env.local`)
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:3000
```

### Backend (`backend/.env.local`)
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hola@tudominio.com
NODE_ENV=development
```

## Estructura del proyecto

```
/                     ← Frontend React
├── src/
│   ├── components/   ← Componentes UI por dominio
│   ├── hooks/        ← Custom hooks de negocio
│   ├── lib/          ← API clients, auth, catalog, constants
│   ├── pages/
│   │   ├── admin/    ← Panel de administración
│   │   ├── auth/     ← Login, registro, recuperación
│   │   └── public/   ← Formulario de matrícula, horario
│   └── portal/       ← Portal del alumno (V1)

/backend              ← API Next.js
├── app/api/          ← Route handlers por dominio
└── lib/
    ├── auth/         ← Middleware de autenticación con tenant
    └── services/     ← Lógica de negocio
```

Para documentación técnica detallada ver [CLAUDE.md](./CLAUDE.md).

## CI

GitHub Actions ejecuta en cada PR:
1. `tsc --noEmit` — comprobación de tipos
2. `vitest run` — tests
3. `vite build` — build completo

## Licencia

Propietario — todos los derechos reservados.
