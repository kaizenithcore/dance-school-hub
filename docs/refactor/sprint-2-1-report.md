# Sprint 2.1 Report — MVP focus (Aislamiento de dominio core)

Fecha: 2026-05-16

## Resumen
Acciones realizadas para centrar el producto en el MVP y reducir complejidad visible sin eliminar módulos ni romper compatibilidad.

## Módulos desacoplados (visualmente)
- Exámenes (`exams`) — ocultado del sidebar y reemplazo de ruta pública por página informativa.
- Multisede (`branches`) — marcado legacy y ocultado.
- Analíticas avanzadas (`analytics`) — ocultado.
- Eventos avanzados (`events`) — ocultado.
- Automatizaciones complejas (`renewals`, `course-clone`) — ocultadas.
- Billing complejo/Enterprise (`billing_complex`, `organization-access`, `enterprise`) — ocultados / marcados future.

## Navegación eliminada / Ocultada
- Los items de la barra lateral correspondientes a módulos no-MVP se ocultan dinámicamente por estado de módulo (registro central).
- CTAs y widgets relacionados con addons enterprise quedaron ocultos en la primera iteración (se recomienda auditoría visual). 

## Cambios técnicos realizados
- Añadido registro central de módulos y helpers: `src/lib/moduleLifecyclePolicy.ts` (ahora contiene `ModuleStatus`, `getModuleEntry`, `isModuleMVP`, `isModuleVisible`).
- Barra lateral (`src/components/layout/AdminSidebar.tsx`) adaptada para ocultar automáticamente módulos cuyo estado no sea `mvp`.
- Página informativa para módulos fuera del MVP: `src/pages/admin/ModuleDisabledPage.tsx` (actualizada para leer la entrada del registro).
- Enrutado de `exams` actualizado en `src/App.tsx` para mostrar la `ModuleDisabledPage` cuando corresponda.
- Documentación creada: `docs/product/mvp-scope.md`, `docs/product/module-map.md`, `docs/refactor/sprint-2-1-report.md`.

## Riesgos detectados
- Dependencias dinámicas: existen endpoints o integraciones que pueden invocar funcionalidades ocultas; es necesario ejecutar smoke tests y revisar logs después del despliegue.
- Frontend lint: la verificación de lint en entorno local mostró problemas de resolución de plugins (herramienta), no necesariamente errores de código; CI debería validar tras instalar dependencias.
- Comunicación: clientes actuales con features avanzadas deben ser notificados internamente antes de cualquier cambio de visibilidad en staging/producción.

## Dependencias pendientes
- Actualizar catálogo comercial para ocultar addons avanzados y enterprise (siguiente tarea).
- Revisar widgets del dashboard que muestren métricas de módulos ocultos y reemplazarlos o eliminarlos visualmente.
- Ejecutar pruebas de integración end-to-end para flujos core (matrícula, pago, portal).

## Próximos pasos recomendados (priorizados)
1. Crear y aplicar `module-map` en componentes de dashboard y pricing para ocultar addons empresariales.
2. Simplificar catálogo comercial (mostrar trial, plan principal, branding) — UI only.
3. Ejecutar pruebas de smoke y typecheck en CI.
4. Preparar notas para soporte/comercial sobre módulos ocultos y cómo habilitarlos temporalmente para clientes existentes.

---

Report preparado por: Lead Product Engineer (acción automatizada).
