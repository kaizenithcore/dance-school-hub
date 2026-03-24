# Matriz Canónica Feature -> Plan (Portal)

Version de contrato: 1.0.0
Ultima actualizacion: 2026-03-24

Fuente tecnica de verdad:
- API: GET /api/public/portal/pricing/feature-matrix
- Backend: backend/lib/constants/portalPlanFeatureMatrix.ts

## Objetivo
Esta matriz define la disponibilidad por plan de capacidades del portal alumno/social/eventos/escuela para alinear producto, ventas y soporte.

## Resumen por capacidad

| Feature Key | Area | Starter | Pro | Enterprise |
|---|---|---|---|---|
| portal.student.profile | portal-alumno | included | included | included |
| portal.student.events.attendance | portal-eventos | limited | included | included |
| portal.student.gamification | portal-alumno | limited | included | included |
| portal.social.feed | portal-social | limited | included | included |
| portal.social.moderation | portal-social | not_included | included | included |
| portal.school.analytics | portal-escuela | not_included | included | included |
| portal.school.mass-communications | portal-escuela | not_included | included | included |
| portal.school.custom-roles | portal-escuela | not_included | not_included | included |

## Criterios de estado
- included: funcionalidad habilitada sin restricciones de plan.
- limited: funcionalidad disponible con alcance reducido y/o limites operativos.
- not_included: requiere upgrade para habilitarse.

## Gobierno
- Owner producto: Product
- Owner comercial: Sales
- Owner tecnico: Engineering
- Frecuencia de revision: mensual o ante cambios de pricing
