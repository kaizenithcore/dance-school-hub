# Nexa — Documentación del proyecto

Plataforma SaaS de gestión para escuelas de danza. Este directorio contiene la documentación técnica, de producto y de arquitectura del sistema.

---

## Índice

### Estado y funcionalidades actuales

| Documento | Descripción |
|-----------|-------------|
| [Estado actual del sistema](./estado-actual.md) | Módulos activos, stack técnico, flujos principales y deuda técnica conocida |
| [Descripción global del proyecto](./Descripción%20global%20del%20proyecto.md) | Visión de producto, arquitectura, modelo de negocio y posicionamiento |
| [Funcionalidades actuales](./funcionalidades-actuales.md) | Inventario completo de endpoints, módulos y capacidades implementadas |

### Arquitectura y seguridad

| Documento | Descripción |
|-----------|-------------|
| [RBAC — Guía de implementación](./RBAC_IMPLEMENTATION_GUIDE.md) | Arquitectura completa del sistema de permisos por rol |
| [RBAC — Ejemplos de integración](./RBAC_INTEGRATION_EXAMPLES.md) | Patrones de código para implementar permisos en nuevas funcionalidades |
| [RBAC — Estado](./RBAC_STATUS.md) | Qué capas de permisos están activas y cuáles pendientes |
| [Matriz de permisos (sprint 5)](./sprint5-permissions-matrix.md) | Tabla completa de 31 permisos por rol de tenant y organización |

### Módulos y producto

| Documento | Descripción |
|-----------|-------------|
| [Mapa de módulos](./product/module-map.md) | Estado de visibilidad de cada módulo (MVP, legacy, futuro) |
| [Scope del MVP](./product/mvp-scope.md) | Qué módulos están activos y cuáles están ocultos, con justificación |
| [Horario — Insights (sprint 6)](./sprint6-schedule-insights.md) | Spec técnica del sistema de detección de problemas en el horario |
| [Portal del alumno — Plan](./PORTAL_ALUMNO_IMPLEMENTATION_PLAN.md) | Plan estratégico en 7 fases para el portal del alumno (Nexa Club) |
| [Portal — KPIs](./portal-kpi-contract.md) | Definiciones oficiales de métricas, fórmulas y objetivos |
| [Portal — Feature matrix](./portal-pricing-feature-matrix.md) | Qué funcionalidades del portal corresponden a cada plan |

### Roadmap y planes

| Documento | Descripción |
|-----------|-------------|
| [Funciones avanzadas — Sprints](./plan-sprints-funciones-avanzadas.md) | Roadmap detallado de 11 funcionalidades avanzadas con scoping técnico y comercial |
| [Plan nuevo MVP](./plan-new-mvp.md) | Plan de hardening y reestructuración del MVP en 7 fases |
| [Plan de rediseño](./plan-claude-redisign.md) | Visión UX completa: navegación, onboarding, portal, dashboard |

### Refactoring

| Documento | Descripción |
|-----------|-------------|
| [Frontend shell](./refactor/frontend-shell.md) | Plan de reorganización de la arquitectura del shell de admin |
| [Responsabilidades de layout](./refactor/layout-responsibilities.md) | Inventario de componentes de layout y su responsabilidad |

### Referencia futura (características no implementadas)

| Documento | Descripción |
|-----------|-------------|
| [ExamSuite — Estado de integración](./examsuit-estado-integracion-y-pendientes.md) | Especificación completa del módulo de exámenes (discontinuado en V1, referencia para V2+) |

---

## Convenciones

- **Módulo activo (MVP)**: visible en el sidebar, funcional en producción.
- **Legacy**: oculto del sidebar, código existe, pendiente de limpieza.
- **Futuro / V2**: no implementado, documentado como referencia de diseño.
- **Discontinuado en V1**: descartado del MVP actual pero documentado para posible reactivación.
