# Funcionalidades actuales — Nexa V1

> Este documento lista todas las capacidades operativas implementadas y funcionales en producción (V1, junio 2026).  
> Para el estado de cada módulo ver [estado-actual.md](./estado-actual.md).

---

## Autenticación y acceso

- **Academias**: registro de nueva escuela (wizard de 3 pasos), login por email/contraseña, recuperación de contraseña
- **Alumnos (Nexa Club)**: login por magic link (OTP, sin contraseña) en `/portal/login`, acceso directo a `/portal/app`
- Sesión con JWT via Supabase Auth, renovación automática
- Trial de 30 días sin tarjeta; modal de checkout al expirar
- Roles de tenant: `owner`, `admin`, `staff` (ver [sprint5-permissions-matrix.md](./sprint5-permissions-matrix.md))

---

## Panel de administración

### Dashboard
- Vista operativa diaria: cobros pendientes (de facturas + pagos), inscripciones pendientes, horario de la semana
- Alumnos recientes, búsqueda rápida desde el panel
- Estado de la campaña de renovación activa
- Acciones rápidas contextuales

### Alumnos
- Ficha completa: datos de contacto, fecha de nacimiento, estado, método de pago, tipo de pago, notas
- Campos personalizados configurables por escuela (texto, fecha, select, checkbox, número)
- Filtros: estado, localidad, DNI, domicilio
- Búsqueda por nombre, email, teléfono, DNI
- Importación masiva desde Excel/CSV (mapeo automático de columnas)
- Gestión de tutores/pagadores (para alumnos menores)
- Envío de invitación al portal desde la ficha (email con magic link)
- Métodos de pago disponibles según configuración de la escuela (efectivo / transferencia)

### Clases y horarios
- Catálogo de clases: nombre, disciplina, categoría, precio, capacidad (auto-fill desde aula), estado
- Campo "Información extra" visible en el formulario de matrícula
- Tipo de frecuencia: semanal, quincenal, clase única, personalizada
- Tooltips de ayuda en todos los campos del formulario
- Vista de semana con drag & drop (`/admin/schedule`)
- Insights automáticos: detección de problemas de capacidad, aulas sin usar, teachers sin clases (spec en [sprint6-schedule-insights.md](./sprint6-schedule-insights.md))
- Descarga de hojas de asistencia en PDF (individual por clase o todas las clases del mes)

### Profesores
- Directorio con clases asignadas, salario mensual (usado en economía), estado
- Asignación de clases desde la ficha del profesor o desde la edición de clase

### Aulas
- Capacidad de cada aula (auto-rellena la capacidad en el formulario de clase)
- Estado activo/inactivo

### Inscripciones (Matrículas)
- Gestión de solicitudes: pendiente → confirmada / rechazada / cancelada
- Vista de detalle con datos del alumno, clase y método de pago
- Inscripción manual desde recepción o desde la ficha del alumno

### Lista de espera
- Registro automático cuando la clase está llena
- Conversión a inscripción cuando se libera plaza

### Formulario de matrícula
- Editor visual con drag & drop (secciones, campos, condiciones)
- Tipos de campo: texto, email, teléfono, fecha, select, checkbox, textarea, separador, info
- Condiciones de visibilidad por campo y sección
- Soporte para matrícula individual y conjunta (varios alumnos, un pagador)
- URL pública en `/s/{slug}/enroll`
- Modo de matrícula conjunta con estilo coherente con el individual

### Pagos, facturas y recibos
- Registro manual de pagos (efectivo / transferencia / tarjeta)
- Generación de facturas mensuales para todos los alumnos activos
  - El método de pago se lee del alumno/inscripción y se guarda en la factura
- Recibos en efectivo: se generan desde facturas PENDIENTES (antes del pago, para entregar al alumno)
- Descarga de recibo individual en PDF
- Descarga de lote de recibos en PDF (todos los del mes)
- Todos los PDFs incluyen logo, colores y nombre de la escuela
- Tabla de facturas: filtro por mes, estado, búsqueda; badges coherentes con el resto de páginas
- Imprimir vista filtrada de la tabla de pagos (con branding)

### Economía
- Ingresos calculados desde pagos confirmados
- Gastos: salarios de profesores + gastos manuales
- Balance mensual y gráficas de tendencia (6 y 12 meses)
- Registro manual de ingresos y gastos adicionales

### Tarifas y paquetes
- Tarifas: precio fijo por clase o tipo de servicio
- Paquetes: agrupaciones de disciplinas para descuento combinado (bonos)
- Distinción visual clara Tarifas vs Paquetes

### Comunicados
- Email masivo segmentado: toda la escuela, una clase, una disciplina
- WhatsApp (enlace externo)
- Vista previa de destinatarios antes de enviar
- Historial de envíos con estado por destinatario
- Cola de mensajes procesada manualmente o en background

### Renovaciones
- Flujo de renovación por año académico (no por mes)
- Generación automática de propuestas para todos los alumnos con matrícula confirmada
- Email personalizado con tabla del horario del próximo curso (generado desde el sistema)
- Presets de horario guardados en localStorage para reutilizar
- Vista previa del email en iframe antes de enviar
- Envío inmediato o programado
- Alumno confirma/rechaza cada clase individualmente desde `/renovar?offer=<id>`
- Tabla de resultados con búsqueda, filtros, paginación y acciones (confirmar, liberar, enviar email)

### Portal del alumno — gestión (admin)
- Configuración de branding (logo, colores, fuente)
- Vista previa como alumno (`/portal/app` en nueva pestaña)
- Enlace a página pública de la escuela
- Invitación a alumnos con email de magic link

### Recepción
- Búsqueda rápida de alumnos (nombre, email, teléfono)
- Cobro express desde recepción
- Registro de incidencias (ausencia, lesión, cambio de grupo)
- Descarga de hoja de asistencia por clase/mes
- Descarga masiva de todas las hojas del mes

### Clonar curso
- Duplica clases + horarios + asignación de profesores de un año académico al siguiente
- Vista previa del recuento antes de confirmar
- Pantalla de resultado con guía de pasos siguientes

### Año académico
- Crear y nombrar años académicos con fechas de inicio y fin
- Selector en el header (cambia `school_settings.current_academic_year_id`)
- Clases e inscripciones filtradas por el año activo
- Al crear clases/inscripciones se asignan automáticamente al año actual

### Configuración
- **Escuela**: nombre, ciudad, email, teléfono, dirección, redes sociales
- **Branding**: logo, color principal, color secundario, acento, tipografía, variante de estilo
- **Agenda**: configuración del horario semanal
- **Cobros**: moneda, día de vencimiento, métodos de pago activos (efectivo / transferencia)
- **Plan y facturación**: cambio de plan, bloques de alumnos extra, checkout con Stripe
- **Página web**: información sobre servicios de web integrada o independiente

### Documentos impresos
- Botón de impresión en tablas de alumnos, profesores y pagos
- Genera HTML branded (logo + colores) que abre nueva pestaña con `window.print()`

---

## Portal del alumno — Nexa Club (V1)

- Login por magic link (sin contraseña) en `/portal/login`
- **Home**: próxima clase, estado de pagos, avisos recientes
- **Clases**: lista de clases inscritas con horario y sala
- **Cobros**: facturas y estado de pago, descarga de recibos
- **Avisos**: comunicados de la escuela
- **Perfil**: datos básicos, cerrar sesión
- Branding de la escuela aplicado (colores, logo, nombre)

### Página pública de la escuela (`/s/{slug}`)
- Horario de clases público
- Información de la academia
- Formulario de matrícula online

---

## APIs públicas (sin autenticación)

| Endpoint | Función |
|----------|---------|
| `GET /api/public/form/{slug}` | Configuración del formulario de matrícula |
| `POST /api/public/enroll` | Envío de solicitud de inscripción |
| `GET /api/public/schedule/{slug}` | Horario público de la escuela |
| `GET /api/public/branding/{slug}` | Branding de la escuela (para portal) |
| `GET /api/public/renewals/offer?id=` | Detalles de oferta de renovación para alumno |
| `POST /api/public/renewals/respond` | Confirmar/rechazar renovación por clase |
| `GET /api/public/portal/context` | Contexto del alumno en el portal |

---

## Funcionalidades pendientes / V2

- Portal del alumno: feed social, perfiles públicos, logros/gamificación, certificaciones
- Módulo de eventos avanzados (festivales, exhibiciones)
- Analíticas avanzadas de negocio
- Dominio personalizado para el portal
- Exámenes y certificaciones (spec en [examsuit-estado-integracion-y-pendientes.md](./examsuit-estado-integracion-y-pendientes.md))
