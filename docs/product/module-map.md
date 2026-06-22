| modulo | estado | visible | motivo |
|---|---:|---:|---|
| dashboard | mvp | yes | Núcleo del panel administrativo |
| students | mvp | yes | Gestión de alumnos — core MVP |
| form-builder | mvp | yes | Matrícula online / formularios públicos |
| enrollments | mvp | yes | Inscripciones y matrículas |
| classes | mvp | yes | Gestión de clases |
| schedule | mvp | yes | Horarios y aulas |
| teachers | mvp | yes | Gestión de profesores |
| payments | mvp | yes | Cobros básicos (core) |
| waitlist | mvp | yes | Lista de espera (core) |
| communications | mvp | yes | Comunicaciones básicas (emails/avisos) |
| school-portal | mvp | yes | Portal del alumno (core) |
| website | mvp | yes | Branding simple / página web |
| pricing | mvp | yes | Plan principal y trial |

| exams | legacy | no | Exámenes avanzados fuera del MVP — oculto de la UX |
| branches | legacy | no | Multisede fuera del MVP |
| analytics | legacy | no | Analíticas avanzadas ocultas |
| events | legacy | no | Eventos avanzados ocultos |
| renewals | legacy | no | Automatizaciones complejas ocultas |
| course-clone | legacy | no | Herramientas de gestión avanzadas ocultas |
| organization-access | legacy | no | Enterprise access oculto |
| billing_complex | legacy | no | Facturación avanzada / enterprise oculto |
| enterprise | future | no | Funcionalidades enterprise planificadas para futuro |

Notas:
- `visible` indica si el módulo aparece en la navegación y widgets principales. Todos los módulos con estado distinto a `mvp` quedan ocultos de la UX primaria.
- La implementación mantiene el código vivo y accesible (no se elimina). El objetivo es reducir complejidad visible sin romper compatibilidad.
