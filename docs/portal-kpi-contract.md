# Contrato Oficial de KPIs Portal

Version de contrato: 1.0.0
Ultima actualizacion: 2026-03-24

Fuente tecnica de verdad:
- API: GET /api/school/portal/analytics/kpis
- Backend: backend/lib/constants/portalKpiDefinitions.ts

## KPIs cerrados

| KPI | Categoria | Formula | Fuente | Frecuencia | Owner | Target |
|---|---|---|---|---|---|---|
| dau_students | engagement | Usuarios unicos con actividad portal en el dia | portal_analytics_events, student_profiles | daily | product | >= 35% de alumnos activos/mes |
| mau_students | adoption | Usuarios unicos con actividad portal en ventana movil de 30 dias | portal_analytics_events, student_profiles | monthly | growth | >= 70% de alumnos activos |
| visitor_to_student_conversion | funnel | enrollment_completions / (explorer_views + onboarding_completions) * 100 | portal_analytics_events, enrollments | weekly | growth | >= 8% |
| school_retention_30d | retention | alumnos activos con evento en dias 1-30 y 31-60 / alumnos activos en dias 1-30 * 100 | portal_analytics_events, tenant_memberships, student_profiles | monthly | school-ops | >= 55% |
| feed_engagement_rate | engagement | (likes + saves) / views * 100 | portal_analytics_events, feed_interactions | daily | product | >= 12% |

## Notas de implementación
- Las definiciones de este documento son de contrato de producto y deben coincidir 1:1 con el endpoint.
- Cualquier cambio de formula requiere subir version de contrato.
- El dashboard de escuela debe mostrar tanto valor actual como definicion del KPI.
