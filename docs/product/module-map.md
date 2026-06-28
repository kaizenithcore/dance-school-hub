# Mapa de módulos — Nexa V1

> Actualizado: junio 2026

## Módulos activos (MVP)

| Módulo | Ruta | Visible | Notas |
|--------|------|---------|-------|
| dashboard | `/admin` | ✅ | Vista operativa diaria |
| students | `/admin/students` | ✅ | Fichas, campos personalizados, importación |
| form-builder | `/admin/form-builder` | ✅ | Formulario de matrícula público |
| enrollments | `/admin/enrollments` | ✅ | Inscripciones (Matrículas) |
| classes | `/admin/classes` | ✅ | Catálogo de clases |
| schedule | `/admin/schedule` | ✅ | Horario semanal (separado de /classes) |
| teachers | `/admin/teachers` | ✅ | Directorio de profesores |
| rooms | `/admin/rooms` | ✅ | Gestión de aulas |
| payments | `/admin/payments` | ✅ | Cobros, facturas, recibos |
| economia | `/admin/economia` | ✅ | Balance financiero |
| pricing | `/admin/pricing` | ✅ | Tarifas y paquetes |
| waitlist | `/admin/waitlist` | ✅ | Lista de espera |
| communications | `/admin/communications` | ✅ | Email masivo segmentado |
| renewals | `/admin/renewals` | ✅ | Renovación por año académico |
| reception | `/admin/reception` | ✅ | Operativa diaria de recepción |
| school-portal | `/admin/school/portal` | ✅ | Gestión del portal (Nexa Club) |
| course-clone | `/admin/course-clone` | ✅ | Clonar curso entre años académicos |
| website | `/admin/website` | ✅ | Info sobre servicios web, branding |
| settings | `/admin/settings/*` | ✅ | Configuración general |

## Módulos legacy (ocultos del sidebar, rutas activas → "Próximamente")

| Módulo | Ruta | Motivo |
|--------|------|--------|
| analytics | `/admin/analytics` | Analíticas avanzadas fuera del MVP |
| events | `/admin/events` | Gestión de eventos avanzados fuera del MVP |

## Módulos discontinuados en V1

| Módulo | Estado | Notas |
|--------|--------|-------|
| exams / certifier | ❌ Eliminado | Código removido del frontend. Ver `docs/examsuit-estado-integracion-y-pendientes.md` para referencia futura |
| branches | ❌ Eliminado | Multi-sede descartado en Sprint 0 |
| organization-access | ❌ Eliminado | Enterprise access descartado en Sprint 0 |

---

## Módulos del Portal del alumno (Nexa Club)

| Pantalla | Ruta | Estado |
|----------|------|--------|
| Home | `/portal/app` | ✅ V1 activo |
| Clases | `/portal/app/clases` | ✅ V1 activo |
| Cobros | `/portal/app/cobros` | ✅ V1 activo |
| Avisos | `/portal/app/avisos` | ✅ V1 activo |
| Perfil | `/portal/app/perfil` | ✅ V1 activo |
| Login alumno | `/portal/login` | ✅ Magic link OTP |
| Feed social | `/portal/app/feed` | 🔮 V2 — Próximamente |
| Conexiones | `/portal/app/connections` | 🔮 V2 — Próximamente |
| Progreso/Logros | `/portal/app/progress` | 🔮 V2 — Próximamente |
| Certificaciones | `/portal/app/certifications` | 🔮 V2 — Próximamente |

---

## Notas

- `visible` indica si el módulo aparece en el sidebar de navegación.
- Los módulos legacy muestran una página "Próximamente" si se accede por URL directa.
- Los módulos eliminados no tienen código ni rutas en el frontend.
- La `moduleLifecyclePolicy` en `src/lib/moduleLifecyclePolicy.ts` es la fuente de verdad para el estado de cada módulo.
