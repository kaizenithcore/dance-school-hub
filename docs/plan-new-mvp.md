# Plan de Accion para Nuevo MVP (Escuelas de Baile)

## 1. Objetivo del Plan
En 4-6 semanas lograr:

- MVP usable, limpio y coherente.
- UX simple y premium para usuarios no tecnicos.
- Landing alineada con el producto real.
- Sistema listo para validacion con clientes reales.
- Base tecnica apta para continuar escalando y preparar venta futura.

## 2. Alcance MVP
### Se mantiene en MVP

- Alumnos
- Clases
- Horarios
- Profesores
- Matriculas
- Lista de espera
- Comunicacion
- Pagos
- Portal del alumno

### Se saca del flujo principal MVP

- Exams
- Eventos avanzados
- Multisede
- Analytics avanzados
- Features experimentales y upsells no esenciales

Nota: no se elimina necesariamente todo del codigo en Semana 1-2. Primero se desactiva, se aisla y se etiqueta como legacy para reducir riesgo de ruptura.

## 3. Fase 1 - Hardening (Semana 1)
Objetivo: estabilizar la base actual antes de refactor grande.

### Sprint 1.1 - Quality baseline
Acciones:

- Corregir errores TypeScript criticos (backend primero).
- Reducir uso de any en servicios de mayor impacto:
  - studentService
  - paymentService
  - invoiceService
- Armonizar contrato commercialCatalog (frontend y backend).
- Corregir violaciones graves de hooks y errores de lint bloqueantes en flujos core.

Criterio de salida:

- Typecheck backend en verde para modulos core.
- Typecheck frontend en verde para modulos core.
- Lint sin errores criticos en flujos core.
- Backend ejecutable sin errores.

### Sprint 1.2 - Limpieza quirurgica
Acciones:

- Eliminar mocks no usados y codigo muerto detectado.
- Resolver TODOs en flujos criticos (auth, matricula, pagos).
- Retirar endpoints no utilizados o marcarlos como legacy.
- Etiquetar modulos no-MVP como disabled/legacy con politica explicita.

Criterio de salida:

- Menos superficie activa y menos riesgo de regresion.
- Inventario de modulos legacy documentado.

Estado aplicado (2026-04-15):

- Modulo no-MVP etiquetado con politica explicita: `examSuite` => `disabled_legacy`.
- Enforcement frontend: ruta `/admin/exams` redirigida a pantalla de modulo deshabilitado con metadatos de politica.
- Enforcement backend: `examSuiteFeatureService` bloquea activacion del modulo por politica aunque exista flag comercial.
- Politica centralizada en constantes de ciclo de vida para frontend y backend.

## 4. Fase 2 - Reduccion a MVP (Semana 2)
Objetivo: concentrar producto en valor real para escuelas de baile.

### Sprint 2.1 - Congelacion del dominio core
Acciones:

- Bloquear nuevas features fuera de core.
- Reordenar menu y rutas para que solo expongan dominio core.
- Quitar accesos visibles a modulos fuera de MVP.

Criterio de salida:

- Navegacion enfocada 100% en core.
- Menos ruido funcional para usuario final.

### Sprint 2.2 - Desacoplar frontend
Problema actual: AdminLayout concentra demasiadas responsabilidades.

Acciones:

- Crear shell nuevo y delgado para admin.
- Mover fuera del shell:
  - logica de checkout/billing extendido
  - onboarding no esencial
  - upsells
- Mantener estructura clara de vistas:
  - dashboard
  - students
  - classes
  - schedule
  - billing
  - messages

Criterio de salida:

- Navegacion clara.
- Menor acoplamiento entre dominios.
- Base lista para UX premium.

## 5. Fase 3 - Reconstruccion UX (Semana 3)
Objetivo: experiencia simple, premium y operable sin friccion.

### Sprint 3.1 - Dashboard simplificado
Acciones:

- Limitar dashboard a 4-5 metricas realmente accionables.
- Mantener 2 graficas utiles maximo.
- Definir CTA directos por problema.

Metricas sugeridas:

- Ingresos del mes
- Alumnos activos
- Pagos pendientes
- Ocupacion de clases

### Sprint 3.2 - Flujos criticos
Optimizar flujos end-to-end:

1. Alta de alumno:
   - 1 pantalla
   - campos minimos
   - cero friccion
2. Crear clase:
   - flujo guiado
   - horario + precio + profesor
3. Matricula:
   - directa
   - sin pasos innecesarios

### Sprint 3.3 - Portal del alumno
Acciones:

- Mejorar diseño y claridad visual.
- Priorizar valor visible inmediato:
  - horarios
  - pagos
  - comunicacion

Criterio de salida Fase 3:

- Flujos core completables sin soporte manual.
- Tiempo de tarea reducido en operaciones habituales.

## 6. Fase 4 - Reestructura Backend (Semana 4)
Objetivo: preparar backend para mantenibilidad, escalado y due diligence.

### Sprint 4.1 - Capa repositorio
Problema actual: servicios acoplados a Supabase directo.

Acciones:

- Introducir capa repositories entre servicios y DB.
- Empezar por dominios core:
  - studentRepository
  - paymentRepository
  - enrollmentRepository

### Sprint 4.2 - Servicios por dominio
Acciones:

- Dividir servicios gigantes por responsabilidad:
  - studentService -> students, enrollments, guardians
  - paymentService -> invoices, transactions, collections
- Extraer logica duplicada a modulos compartidos.

### Sprint 4.3 - Tests minimos obligatorios
Acciones:

- API tests minimo para:
  - crear alumno
  - matricular alumno
  - generar cobro
- Agregar smoke tests de rutas criticas auth + core.

Criterio de salida Fase 4:

- Servicios core desacoplados de DB directa.
- Pruebas minimas automatizadas ejecutando en CI local.

## 7. Fase 5 - Narrativa y Landing (Semana 4-5)
Objetivo: alinear promesa comercial con producto real.

### Sprint 5.1 - Nueva narrativa
Acciones:

- Sustituir mensajes genericos por posicionamiento especifico de escuelas de baile.
- Mantener consistencia de lenguaje entre app, onboarding y landing.

Mensajes base:

- "Sistema operativo para tu escuela"
- "Menos caos, mas control"
- "Todo conectado"

### Sprint 5.2 - Landing MVP
Estructura sugerida:

- Hero con propuesta concreta
- Problema (Excel + WhatsApp = caos)
- Solucion orientada a operacion diaria
- Modulos incluidos (solo core)
- Demo visual real
- Pricing simple

Criterio de salida:

- Lo que se promete en landing existe en producto.
- No hay promesas de modulos fuera del MVP.

## 8. Fase 6 - Modelo de Negocio (Semana 5)
Objetivo: reducir friccion comercial para validar rapido.

### Sprint 6.1 - Simplificacion radical
Acciones:

- Eliminar complejidad de multiples planes y addons no esenciales.
- Definir oferta MVP:
  - Plan unico 199-249 EUR/mes
  - 1 mes gratis

### Sprint 6.2 - Oferta clara
Mensaje operativo:

- "Si tienes +50 alumnos, esto te ahorra mas dinero del que cuesta"

Criterio de salida:

- Pricing entendible en menos de 30 segundos.
- Sin dudas comerciales recurrentes por estructura de oferta.

## 9. Fase 7 - Validacion Real (Semana 6)
Objetivo: validar producto con usuarios reales y medir traccion.

### Sprint 7.1 - Onboarding real
Acciones:

- Crear 5-10 cuentas reales.
- Acompanamiento manual de onboarding.

### Sprint 7.2 - Feedback y metricas
Medir:

- Activacion
- Uso diario/semanal
- Abandono
- Tiempo hasta primer valor
- Conversion prueba -> pago

Criterio de salida:

- Evidencia de uso real y puntos de friccion priorizados.
- Lista cerrada de mejoras para iteracion siguiente.

## 10. Riesgos Criticos y Mitigacion
1. Deuda tecnica reintroducida por cambios rapidos.
   - Mitigacion: quality gates por fase + no mezclar core con legacy.
2. Scope creep fuera de MVP.
   - Mitigacion: bloqueo explicito de features no-core durante 6 semanas.
3. Acoplamiento frontend-backend sin resolver.
   - Mitigacion: contratos versionados y capa repositorio en core.
4. Validacion comercial poco representativa.
   - Mitigacion: cohortes reales y seguimiento semanal con metricas.
5. Riesgo de venta tecnica futura por baja trazabilidad.
   - Mitigacion: documentar decisiones, runbooks y matriz de modulos.

## 11. Preparacion para Venta Tecnica (paralelo a Fases 4-7)
Checklist minimo:

- README tecnico real y actualizado.
- Arquitectura resumida (dominios, dependencias, limites).
- CI basica con typecheck, lint y tests core.
- Inventario de modulos legacy y plan de retiro.
- Runbook de despliegue, incidentes y operaciones.
- Riesgos conocidos y estado de mitigacion.

## 12. Decision Gate al Final de Semana 6
Decidir con datos entre:

- Continuar con refactor progresivo sobre esta base.
- Rehacer solo frontend manteniendo backend core.
- Rehacer partes clave adicionales si los riesgos no bajan.

Condicion para continuar sin rehacer mas:

- Core estable
- UX validada por usuarios reales
- Calidad tecnica en umbral aceptable
- Narrativa y oferta comercial alineadas