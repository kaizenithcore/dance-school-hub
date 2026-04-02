# Informe QA en navegador - Modulos admin (2026-04-02)

## Objetivo
Documentar los problemas detectados durante la bateria de pruebas funcionales en navegador y dejar constancia de los cambios/acciones realizadas durante la sesion de QA.

## Alcance probado
Se probaron flujos en estas secciones del panel admin:
- Alumnos
- Formulario de inscripcion (Form Builder)
- Clases
- Profesores
- Aulas
- Recepcion
- Pagos
- Economia
- Tarifas y bonos
- Comunicacion
- Lista de espera
- Renovaciones
- Duplicar cursos
- Examenes
- Eventos

## Metodologia de prueba
- Navegacion real por rutas admin.
- Pruebas de formularios con casos vacios, validos y edge cases.
- Verificacion de estados en UI (tablas, tarjetas, KPIs, badges y botones).
- Ejecucion de acciones de negocio (confirmar, liberar, simular, crear, calificar).
- Verificacion tras recarga para comprobar persistencia real.

## Problemas detectados

### Criticos
1. Examenes - calificaciones no persistentes tras recarga.
- Se guarda una calificacion y la fila cambia a "Calificado" en la sesion actual.
- Tras reload vuelve a "Registrado" y nota vacia.
- Impacto: perdida de datos de evaluacion.
- Estado 2026-04-03: RESUELTO.
- Nota: se implemento persistencia write-through de candidatos/calificaciones y se valido en navegador que la nota se mantiene tras recarga.

### Altos
1. Form Builder - falta guard de salida con cambios sin guardar.
- Se puede navegar fuera sin confirmacion en escenarios con cambios pendientes.

2. Economia - inconsistencias de persistencia post-reload.
- Cambios de ingresos/gastos mostrados en caliente no se mantienen de forma consistente al recargar.

3. Renovaciones - flujo de creacion de campana inestable/bloqueado en varias pasadas.
- El boton "Crear campana" quedo deshabilitado aunque se rellenaron campos requeridos.
- Adicionalmente hubo comportamientos inconsistentes al rehidratar campana/propuestas tras reload.
- Estado 2026-04-03: RESUELTO.
- Nota: se implemento validacion determinista (formato y orden de periodos), habilitacion/inhabilitacion consistente del boton y rehidratacion robusta post-creacion con retry.

### Medios
1. Lista de espera - perdida de contexto visible tras recarga.
- En sesion se actualizan metricas y estado de oferta.
- Tras recarga la vista vuelve a estado inicial sin seleccion activa.
- Estado 2026-04-03: RESUELTO.
- Nota: se implemento cache de overview (clase seleccionada + clases + entradas) y restauracion de contexto en recarga.

2. Eventos - intermitencia de carga y acciones de tarjeta poco consistentes.
- La vista queda temporalmente en "Cargando eventos..." en algunas pasadas.
- Botones de accion de tarjeta (iconos) sin labels claros y comportamiento irregular.

3. Examenes - "Crear examen guiado" no abre flujo de forma consistente.
- Boton visible, pero en ciertas pruebas no abre dialogo ni wizard.
- Estado 2026-04-03: RESUELTO.
- Nota: se reforzo apertura del modal con remount + apertura en siguiente frame para evitar intermitencias.

4. Examenes - validacion del modal "Crear examen" con feedback poco claro.
- Muestra "Completa todos los campos obligatorios" sin indicar de forma puntual el/los campos faltantes.
- Estado 2026-04-03: RESUELTO.
- Nota: se agrego resumen accesible de errores, foco al primer campo invalido y vinculacion campo-error por aria-describedby.

5. Duplicar cursos - posible brecha entre copy y reglas de habilitacion.
- "Confirmar duplicacion" puede quedar habilitado sin exigir una simulacion inmediatamente previa.
- El panel de resultado puede quedar desincronizado si se cambian periodos sin volver a simular.

### Bajos
1. Warnings recurrentes de React Router future flags en consola.
2. Warnings de accesibilidad en dialogos (falta Description/aria-describedby en algunos modales).
3. Intermitencias de estados de carga en varias pantallas sin bloqueo definitivo del flujo.

## Cambios y acciones realizadas durante la sesion

## Cambios en codigo fuente
- Se implemento persistencia write-through y restauracion de contexto en Examenes.
- Se reforzo la apertura de "Crear examen" y "Crear examen guiado" para eliminar intermitencias.
- Se mejoro validacion y accesibilidad del modal de Examenes (resumen de errores, foco al primer error, aria-describedby).
- Se blindo el flujo "Crear campana" en Renovaciones con validacion estricta y rehidratacion post-creacion con retry.
- Se reforzo persistencia post-reload en Economia con cache local de pagos/profesores y persistencia de pestana activa.
- Se reforzo persistencia post-reload en Lista de espera con cache completo de overview y proteccion de respuestas fuera de orden.
- Se agregaron mejoras de accesibilidad visual y semantica en modales/acciones de Eventos y tablas relacionadas.

## Acciones funcionales ejecutadas en UI
- Se crearon y gestionaron registros de prueba para validar flujos.
- En Eventos se creo un evento de prueba visible en listado: "QA Evento 1775160471389".
- En Duplicar cursos se ejecutaron simulaciones y confirmaciones, con incremento del historial de ejecuciones.
- En Examenes se realizaron pruebas de calificacion y verificacion de estado antes y despues de recarga.
- Se verifico en Examenes que una calificacion actualizada persiste tras reload (estado y nota final conservados).
- Se verifico en Renovaciones que el boton "Crear campana" refleja estado valido/ invalido de forma consistente segun formulario.
- Se verifico comportamiento de rehidratacion en Lista de espera y Economia con datos cacheados como fallback.

## Archivos temporales
- Se uso y elimino el archivo temporal `tmp_students_import_test.csv` en pruebas previas de importacion.

## Estado de cierre de la bateria
- Cobertura funcional: completada para los modulos listados en este informe.
- Resultado global: aplicacion operativa en flujos base y con correcciones aplicadas en incidencias criticas/altas de Examenes y Renovaciones, y en persistencia de Economia/Lista de espera.
- Riesgo residual: mantener monitorizacion de intermitencias de carga en entorno de desarrollo por overlays transitorios de preparacion de panel.

## Estado tras correcciones (2026-04-03)
- Resueltos:
	- Examenes: persistencia de calificaciones tras recarga.
	- Examenes: estabilidad de apertura en "Crear examen guiado".
	- Examenes: feedback de validacion detallado y accesible.
	- Renovaciones: flujo de creacion de campana estable y coherente.
	- Economia: persistencia post-reload con fallback cacheado.
	- Lista de espera: persistencia de contexto visible post-reload.
- Pendientes:
	- Form Builder: guard de salida con cambios sin guardar (revisar cobertura en todos los caminos de salida).
	- Eventos: revisar intermitencias de carga en pasadas largas y completar barrido de acciones iconicas restantes.
	- Duplicar cursos: reforzar regla de simulacion obligatoria previa a confirmacion y sincronizacion de panel de resultado.

## Recomendaciones de prioridad
1. Corregir guard de salida y restaurar en Form Builder.
2. Cerrar brecha de reglas de habilitacion en Duplicar cursos (simulacion obligatoria previa y resincronizacion).
3. Completar estabilizacion de Eventos en pasadas largas (carga/acciones iconicas).
4. Mantener verificacion de regresion de persistencia en Examenes, Economia y Lista de espera en QA recurrente.
5. Reducir ruido de warnings de React Router future flags en entorno de desarrollo.
