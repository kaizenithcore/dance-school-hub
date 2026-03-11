# Mapa de Funcionalidades - Dance School Hub (Actuales + Avanzadas)

## 1) Objetivo del documento
Este documento ofrece una vista rapida y funcional de lo que la aplicacion ya resuelve y de las capacidades avanzadas planificadas.

Se usa para:
- Poner en contexto al equipo de producto, ventas y operaciones en pocos minutos.
- Distinguir claramente entre capacidades operativas actuales y capacidades avanzadas en despliegue.
- Facilitar decisiones de roadmap, empaquetado comercial y priorizacion.

## 2) Resumen ejecutivo
La plataforma cubre el ciclo principal de una escuela de danza de punta a punta:
- Captacion y matricula online.
- Gestion academica diaria (clases, horarios, alumnos, profesores, aulas).
- Cobros y facturacion.
- Analiticas y configuracion centralizada.

Sobre esta base, el roadmap avanzado agrega automatizacion operativa, mejor soporte para picos de demanda y nuevas herramientas de comunicacion y planificacion.

## 3) Capacidades actuales en produccion

### 3.1 Acceso, cuentas y sesion
- Inicio de sesion con email y contrasena.
- Registro de nueva escuela en flujo guiado.
- Cambio/restablecimiento de contrasena con politicas de seguridad activas.
- Timeout de sesion por inactividad y alertas de inicio de sesion configurables.

### 3.2 Operacion administrativa diaria
- Dashboard con KPIs y alertas accionables.
- Gestion completa de clases, aulas, profesores y alumnos (alta, edicion, baja, busqueda, filtros y vistas de detalle).
- Gestion de inscripciones con cambio de estado (pendiente, aceptada, rechazada, cancelada).
- Editor visual de horarios con arrastrar y soltar.

### 3.3 Cobros y facturacion
- Registro manual de pagos y cambio de estado (pagado/reembolsado).
- Generacion de recibo PDF individual.
- Facturacion mensual con listados, filtros y marcado de pago.
- Generacion de recibos en lote (efectivo).
- Alertas operativas de cobranza (facturas faltantes y alumnos sin cobro registrado del mes).

### 3.4 Experiencia publica y matricula
- Landing publica por escuela (slug).
- Horario publico con seleccion de clases.
- Matricula online publica con formulario dinamico configurable.
- Soporte de secciones, campos condicionales, seleccion de horarios, resumen de precio y matricula conjunta (si esta habilitada).

### 3.5 Form builder, tarifas y configuracion
- Constructor de formulario de matricula por secciones y campos.
- Gestion de tarifas/bonos con reglas y categorias.
- Ajustes centrales de escuela, horarios, pagos, notificaciones, seguridad y billing.
- El plan seleccionado (Starter/Pro/Enterprise) queda persistido para activar reglas comerciales.

### 3.6 Productividad y soporte legal
- Topbar con busqueda global de registros y acciones rapidas.
- Centro de notificaciones operativas.
- Perfil de cuenta con cambio real de contrasena y cierre de sesion.
- Publicacion de paginas legales (privacidad, cookies, terminos, aviso legal).

## 4) Funcionalidades avanzadas (estado y alcance)

### 4.1 Sprint 1 - Fundacion transversal
Estado: planificado.

Incluye:
- Entitlements por plan/add-on para activar modulos avanzados por tenant.
- Infra asincrona ligera (outbox + procesamiento) para flujos no bloqueantes.
- Base de comunicacion por email con plantillas operativas.

### 4.2 Sprint 2 - Lista de espera automatica + matricula inteligente
Estado: planificado.

Incluye:
- Lista de espera cuando una clase esta completa.
- Oferta automatica de plaza con vencimiento configurable.
- Flujo de aceptacion que puede confirmar automaticamente si hay cupo.
- Enlaces de matricula con parametros inteligentes (preseleccion y filtros).

### 4.3 Sprint 3 - Renovaciones + copia de curso
Estado: planificado.

Incluye:
- Campanas de renovacion para alumnos actuales con prioridad sobre nuevos ingresos.
- Reserva de cupo desde la oferta con plazo configurable para confirmar.
- Panel de renovaciones (confirmadas, pendientes, plazas liberadas).
- Copia del curso anterior con modo de simulacion (dry-run) y aplicacion real.

### 4.4 Sprint 4 - Asistencia PDF + incidencias + modo recepcion
Estado: planificado.

Incluye:
- Hojas de asistencia PDF por clase/periodo para profesores.
- Registro rapido de incidencias de alumnos.
- Vista simplificada de recepcion para tareas de mostrador.

### 4.5 Sprint 5 - Comunicacion masiva
Estado: planificado.

Incluye:
- Campanas segmentadas por clase, disciplina o escuela completa.
- Historial y seguimiento por destinatario.
- Canal email end-to-end.

Nota de alcance actual:
- WhatsApp no entra en la implementacion inicial.

### 4.6 Sprint 6 - Deteccion automatica de problemas de horario
Estado: planificado.

Incluye:
- Alertas por baja/sobredemanda.
- Deteccion de huecos de profesor.
- Identificacion de aulas infrautilizadas.
- Recomendaciones accionables desde dashboard y modulo de horarios.

### 4.7 Sprint 7 - Propuestas automaticas de horario (A/B/C)
Estado: planificado.

Incluye:
- Generacion de alternativas A/B/C segun disponibilidad, demanda y ocupacion.
- Comparador de propuestas y aplicacion guiada.
- Modo semiautomatico con clases bloqueadas manualmente por el usuario.

## 5) Mapa rapido por area funcional

### 5.1 Captacion y conversion
- Actual: landing publica, horario publico, matricula online configurable.
- Avanzado: enlaces inteligentes de matricula, lista de espera automatica.

### 5.2 Operacion academica
- Actual: CRUD de alumnos, profesores, clases, aulas; editor de horario.
- Avanzado: renovaciones, copia de curso, incidencias, recepcion simplificada.

### 5.3 Cobros y administracion
- Actual: pagos, facturas, recibos PDF, alertas de cobro.
- Avanzado: comunicacion segmentada para mejorar seguimiento operativo.

### 5.4 Inteligencia operativa
- Actual: analiticas y KPIs base.
- Avanzado: deteccion automatica de problemas y propuestas de horario optimizadas.

## 6) Funcionalidades parcialmente cerradas (actuales)
Estas piezas existen pero no estan completamente cerradas:
- Recuperacion de contrasena: flujo de UI listo, con integracion de envio de email aun pendiente de cierre final.
- Horario publico: existen casos con fallback de datos no definitivos.
- 2FA: politica disponible en configuracion, con enrolamiento MFA aun por cerrar end-to-end.
- Perfil avanzado de cuenta: previsto, aun no como modulo completo.

## 7) Implicaciones para planes comerciales

### 7.1 Starter
- Base operativa completa + herramientas de captacion y cobro.
- Posibles extras de entrada: asistencia PDF, incidencias y enlace inteligente.

### 7.2 Pro
- Automatizacion de operacion academica y de cupos.
- Enfoque: waitlist automatica, renovaciones y copia de curso.

### 7.3 Enterprise
- Control avanzado de operaciones y optimizacion.
- Enfoque: permisos mas granulares/roles personalizados, insights avanzados y motor de propuestas de horario.

## 8) Prioridades para producto
- Cerrar brechas actuales criticas: recuperacion de contrasena, 2FA end-to-end y datos definitivos en horario publico.
- Activar primero capacidades con impacto operativo inmediato: waitlist, renovaciones y copia de curso.
- Escalar luego a inteligencia de planificacion: deteccion automatica e IA semiautomatica de horarios.

---
Documento de referencia funcional para contexto rapido de capacidades actuales y avanzadas.
