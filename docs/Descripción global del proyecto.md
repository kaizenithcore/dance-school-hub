# Nexa — Descripción global del proyecto

## ¿Qué es Nexa?

Nexa es una plataforma SaaS de gestión para escuelas de danza. Está diseñada para academias de 50 a 500 alumnos que actualmente trabajan con Excel, WhatsApp y herramientas desconectadas. El objetivo es centralizar la gestión operativa en una única herramienta, reducir el tiempo administrativo y mejorar la experiencia del alumno.

---

## Propuesta de valor

**Para la academia:**
- Gestión de alumnos, clases, horarios, inscripciones y cobros en un único panel
- Formulario de matrícula online configurable y público
- Recibos, facturas y hojas de asistencia con branding de la escuela
- Renovaciones automáticas con emails personalizados al alumno
- Portal del alumno (Nexa Club) listo para usar sin desarrollo adicional

**Para el alumno:**
- Acceso al portal sin contraseña (magic link)
- Consulta de horario, estado de pagos y avisos de la escuela
- Proceso de renovación de plaza guiado (confirmar/rechazar por clase)

---

## Modelo de negocio

Suscripción mensual o anual. Dos planes activos:

| Plan | Alumnos incluidos | Precio mensual |
|------|-------------------|----------------|
| Starter | Hasta 200 | 89 €/mes |
| Pro | Hasta 500 | 179 €/mes |

Bloques de alumnos adicionales disponibles en incrementos. Trial gratuito de 30 días sin tarjeta.

> Los precios y límites exactos se gestionan en `catalog/commercialCatalog.json`.

---

## Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Vite)                     │
│  React 18 + TypeScript + Tailwind CSS + shadcn/ui       │
│  Puerto 8080 en dev                                     │
│                                                         │
│  ┌──────────────────┐   ┌──────────────────────────┐    │
│  │  Admin Panel     │   │  Portal del alumno        │    │
│  │  /admin/*        │   │  /portal/app/*            │    │
│  │  (Nexa)          │   │  (Nexa Club)              │    │
│  └──────────────────┘   └──────────────────────────┘    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Páginas públicas: /s/{slug}, /portal/login      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                   Proxy /api/* → 3000
                          │
┌─────────────────────────────────────────────────────────┐
│                   Backend (Next.js 16)                  │
│  Solo API routes (no SSR)                               │
│  Puerto 3000 en dev                                     │
│                                                         │
│  /api/admin/*   → Requieren auth de admin               │
│  /api/student/* → Requieren auth de alumno              │
│  /api/public/*  → Sin autenticación                     │
│  /api/auth/me   → Contexto de tenant                    │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                      Supabase                           │
│  PostgreSQL + Auth + Storage (tenant-assets)            │
│  RLS habilitado — todos los datos tienen tenant_id      │
└─────────────────────────────────────────────────────────┘
```

---

## Modelo de datos clave

**Multi-tenancy**: cada escuela es un tenant. Todo dato tiene `tenant_id`. El aislamiento se garantiza via RLS en Supabase.

**Año académico**: las clases e inscripciones se vinculan a `academic_year_id`. El selector en el header cambia el año activo y filtra automáticamente todos los datos.

**Relaciones principales**:
```
tenants
  └── students
  └── classes (academic_year_id)
       └── class_schedules
       └── class_teachers
  └── enrollments (student → class, academic_year_id)
  └── monthly_invoices (student, month, payment_method)
       └── receipts
  └── teachers
  └── rooms
  └── school_settings (branding, payment config, billing)
  └── academic_years
  └── renewal_campaigns
       └── renewal_offers
```

---

## Segmentación de clientes objetivo

- **Primario**: Academias de danza independientes, 50-300 alumnos, España
- **Secundario**: Academias con múltiples disciplinas (ballet, contemporáneo, hip hop, flamenco)
- **No objetivo (V1)**: Franquicias multi-sede, cadenas con >500 alumnos

---

## Competidores relevantes

- **Classgap, Acuity, Mindbody**: enfocados en booking/reservas, no en gestión integral
- **Excel + WhatsApp**: el statu quo más extendido
- **ERP genéricos**: demasiado complejos y no especializados

**Ventaja competitiva de Nexa**: diseño específico para escuelas de danza españolas con flujo completo (matrícula → clase → pago → renovación → portal del alumno) y precio accesible.

---

## Equipo y contacto

Desarrollado por **Kaizenith** (kaizenith.es).  
Contacto: hola@nexa.es

---

## Estado del producto

**Versión actual**: V1 — Early Adopters  
El núcleo operativo (alumnos, clases, pagos, portal) está completo y funcional. El portal del alumno (Nexa Club) está en V1 sin funcionalidades sociales. Las funcionalidades de comunidad (feed, perfiles públicos, logros) están planificadas para V2.

Ver [estado-actual.md](./estado-actual.md) para el detalle completo de módulos y estado de cada uno.
