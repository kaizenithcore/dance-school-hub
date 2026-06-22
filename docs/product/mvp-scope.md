# MVP Scope — Dance School Hub

Estado: fase 2 (Sprint 2) — Aislamiento del dominio core y reducción de visibilidad de módulos no-MVP.

## Objetivo
Convertir la aplicación en una experiencia centrada en el MVP para escuelas de baile, sin eliminar código ni romper compatibilidad. Cambios mínimos y estratégicos: ocultar, etiquetar y documentar módulos fuera del alcance.

## Módulos Core (mantener visibles y activos)
- Alumnos
- Clases
- Horarios
- Profesores
- Matrículas (inscripciones)
- Pagos (cobros básicos)
- Lista de espera
- Comunicación básica (emails/avisos)
- Portal del alumno (core)
- Branding simple / Página web
- Formularios públicos (matrícula online)

## Módulos fuera del MVP (marcar como legacy/disabled/future)
- Exámenes (exams) — legacy
- Multisede (branches) — legacy
- Analíticas avanzadas (analytics) — legacy
- Eventos avanzados (events) — legacy
- Automatizaciones complejas (renewals, course-clone, etc.) — legacy
- Billing complejo / enterprise billing (billing_complex) — legacy
- Enterprise avanzado / access control (organization-access, enterprise) — future

## Dependencias detectadas
- Algunas rutas y servicios del backend referencian módulos legacy (p.ej. endpoints de examenes). Se mantendrán pero con gating y/o respuestas "disabled".
- Hooks frontend (`useBillingEntitlements`, `usePermissions`) continúan obligatorios; se usan para mostrar lock/upgrade en funciones de pago.
- Catálogo comercial (pricing) depende de flags de features para mostrar addons/enterprise.

## Impacto técnico
- Bajo en core: no se eliminan archivos ni se hacen refactors profundos.
- Medio en surface UX: se ocultarán elementos de navegación, widgets y CTAs; rutas no visibles mostraran una página informativa (ModuleDisabledPage) o redirección a core.
- Riesgo: eliminaciones visuales pueden ocultar dependencias dinámicas; se mantendrá el código y tests/manual smoke para detectar regresiones.

## Impacto comercial
- Ventaja: producto percibido como más simple y directo para escuelas de baile; reduce fricción de venta y onboarding.
- Riesgo: ciertas cuentas avanzadas podrían perder acceso público a features; plan de comunicación interna y notas en docs para equipos de ventas y soporte.

## Validaciones a ejecutar tras cambios
- La app arranca localmente (dev) y rutas core funcionan.
- Navegación principal intacta (students, classes, schedule, teachers, enrollments, payments, waitlist, communications, portal).
- Módulos marcados legacy/disabled no aparecen en sidebar ni dashboard.
- Typecheck del core (TS) sin errores en editor/CI.

---

Siguientes pasos: crear `docs/product/module-map.md` con tabla canonical y `docs/refactor/sprint-2-1-report.md` con actividades realizadas y riesgos pendientes.
