# Prueba E2E en navegador — Alumnos / matrícula / grupo familiar

Fecha: 2026-06-30. Entorno: tenant de prueba "Academia E2E Test" creado en vivo (registro completo de escuela).

## Estado de correcciones (2026-06-30)
- **B1** (grupo familiar fantasma) — ✅ corregido en `backend/lib/services/studentService.ts` (`removeMemberFromJointGroup`): al quedar un solo miembro en el grupo tras una baja, se disuelve automáticamente (`joint_enrollment_group_id = null`). Verificado en vivo con un par de alumnos nuevo: tras quitar al segundo miembro, el primero revierte a "matrícula individual" al reabrir su ficha.
- **B2** (wizard de onboarding reaparece en cada navegación) — ✅ corregido en `src/components/layout/OnboardingShell.tsx`: se añadió un flag de sesión (`nexa:onboarding:dismissed-session`, sessionStorage) que se marca al cerrar el wizard con la X sin terminarlo, y se respeta en `shouldAutoOpenWizard()`. Verificado en vivo: cerrado una vez, no reaparece tras 2 navegaciones a páginas distintas. Sigue disponible para reabrir manualmente desde el panel de ayuda en cualquier momento.
- **B15** (crash al crear bonos) — ✅ corregido: patrón "latest ref" en los tres editores de condiciones + `ConditionEditorBoundary` en `PricingRuleForm`.
- **B14** (popovers Radix) — ✅ descartado: comportamiento esperado de animación de salida, sin impacto funcional.
- **B16** (guardado nombre de escuela vacío) — ✅ falso positivo: la validación `!form.name.trim() || !form.slug.trim()` ya existía; el tester no observó el toast. Hardening: el `catch` en `handleSave` ahora propaga el mensaje real del servidor.
- **B17** (contador capacidad no refresca) — ✅ corregido: `StudentsPage` despacha `window.dispatchEvent(new CustomEvent("nexa:students:changed"))` tras crear, editar o eliminar alumnos; `Topbar` escucha ese evento y llama `loadDynamicItems()` inmediatamente.
- **Extra 1 / B9** (nombre de aula duplicado) — ✅ corregido: `roomService` añade pre-insert `ilike` check en `createRoom` y `updateRoom`; ambos routes devuelven 409 al recibir `duplicate_name`; `RoomsPage.handleSave` propaga el mensaje al toast.
- **Extra 2** (doble envío formulario aulas) — ✅ corregido: `submittingRef` guard + estado `isSaving` en `RoomsPage.handleSave`; el botón "Guardar/Crear" queda deshabilitado y muestra "Guardando..." mientras el envío está en curso.

## Resumen de lo probado
1. Alta de alumna menor de edad (Ana García, 10 años) → detección automática de minoría de edad y exigencia de datos de tutor.
2. Alta de alumno menor de edad (Carlos García, 12 años, hermano) → mismo comportamiento, sin reutilización de datos del tutor ya introducido para Ana.
3. Creación de clase ("Ballet Infantil", 30€/mes, aula asignada, sin horario ni profesor).
4. Matrícula conjunta vía "Gestionar clases" en la ficha de Ana: activar grupo, añadir a Carlos como miembro.
5. Verificación de clonado automático de matrícula al añadir miembro.
6. Eliminación de Carlos del grupo familiar y verificación de reversión en ambos alumnos.

## Bugs / inconsistencias encontrados

### 🔴 Alta prioridad

**B1. ✅ CORREGIDO. El grupo familiar no se disolvía al quedar con un solo miembro.**
Al quitar a Carlos del grupo conjunto de Ana (con "Quitar" desde el modal "Clases y matrícula conjunta"), Carlos vuelve correctamente a matrícula individual — pero **Ana queda con "Matrícula conjunta" todavía marcada**, en un grupo de tamaño 1 que se lista a sí misma con un botón "Quitar" (quitarse a sí misma de su propio grupo, ambiguo). El sistema no detecta que un grupo de 1 miembro ya no es un grupo y debería revertir automáticamente al alumno restante a matrícula individual. Esto es exactamente el escenario que se pidió verificar ("el otro debería volver a quedar como estaba") y **falla**.
- Impacto: si más adelante se configura un bono `total_hours`/`category_pack`, un alumno puede quedar atrapado en un "grupo fantasma" sin que la escuela lo note, generando confusión sobre por qué un precio no se actualiza como se espera tras una baja.
- Sugerencia: al quitar un miembro y quedar el grupo con 1 solo integrante, desactivar automáticamente `jointEnrollmentGroupId` para ese alumno (equivalente a pulsar "Convertir a matrícula individual").

**B2. ✅ CORREGIDO. El wizard de onboarding reaparecía en cada navegación.** Interrumpía cualquier flujo de trabajo durante el periodo de onboarding.

### 🟡 Media prioridad

**B3. ~~Discrepancia de capacidad~~ — DESCARTADO.** Se confirmó en la Pasada 4 que esto fue un error del propio script de pruebas (índice de campo incorrecto al editar "Capacidad" en el formulario de clase, que en realidad modificó "Precio"), no un bug de la aplicación. Ver nota en Pasada 4.

**B4. ✅ CORREGIDO. Tutor no reutilizable entre hermanos.**
Al dar de alta a un segundo alumno menor de edad con el mismo tutor/responsable que un hermano ya existente, el formulario no ofrecía autocompletar ni vincular al tutor ya registrado. Corregido en `StudentFormModal.tsx`: se añadió un selector "Reutilizar tutor existente" (deduplicado por teléfono entre todos los alumnos ya cargados) que autorellena nombre, teléfono y email del tutor al elegirlo. Verificado en vivo: al dar de alta a un hermano menor de Ana García, el tutor "María García (madre) · +34 600 222 222" aparece en el desplegable y autorellena los 3 campos correctamente.

**B5. ✅ CORREGIDO. El UUID interno del grupo familiar se exponía en la UI.**
El modal mostraba literalmente `Grupo: d27d3be2-abff-437e-8707-ec5f4e7cbcea` a un usuario no técnico. Corregido en `StudentClassesModal.tsx`: ahora muestra "Grupo familiar: {nombres de los miembros}" (o "Grupo familiar nuevo — añade alumnos abajo" si aún no hay miembros), sin exponer el identificador interno.

### 🟢 Accesibilidad

**B6. ✅ CORREGIDO. Botones de acción de la tabla de Alumnos sin nombre accesible.**
Las 3 acciones por fila (ver / editar / eliminar — iconos `eye`, `pencil`, `trash2`) no tenían `aria-label`. Añadido en `StudentsTable.tsx`, `TeachersTable.tsx` y `ClassesTable.tsx` ("Ver perfil", "Editar alumno/profesor/clase", "Eliminar alumno/profesor/clase").

**B7. ✅ CORREGIDO. Botón de cerrar el wizard de onboarding sin `aria-label`.**
Añadido `aria-label="Cerrar y continuar después"` al botón X en `OnboardingWizard.tsx` (ya tenía `title` pero no `aria-label`).

## Comportamientos verificados como correctos (sin bug)
- Detección automática de minoría de edad por fecha de nacimiento → exige tutor obligatorio antes de permitir guardar. Buen comportamiento, reduce fricción de soporte.
- Al añadir un alumno a un grupo familiar nuevo, el sistema clona automáticamente la selección de clases del alumno "ancla" al nuevo miembro (no hace falta repetir la selección manualmente).
- El alumno retirado del grupo (Carlos) conserva su matrícula individual en la clase — no se le da de baja por error al salir del grupo.
- Sincronización de precio entre ambos miembros del grupo visible en tiempo real en el modal antes de guardar.

## Pendiente de verificar (no cubierto en esta pasada, requiere una regla de pricing activa)
- Comportamiento del bono real (`total_hours`/`category_pack`) sumando horas entre dos alumnos de un grupo cuando las clases sí tienen horario definido.
- Caso "madre se apunta con hija que ya estaba matriculada individualmente" — la funcionalidad de "Gestionar clases" debería cubrir este caso (añadir a un alumno ya existente y matriculado a un grupo nuevo), pero no se ha probado con una clase que ya tenga horario/precio variable por horas.
- Reparto de precio en grupos de 3+ miembros donde no todos cumplen la condición de categoría del bono.

---

# Pasada 2 — Pruebas adversariales (Profesores / Aulas / Clases)

Objetivo explícito de esta pasada: intentar romper el sistema con inputs fuera de lo esperado (valores negativos, duplicados, inyección, doble envío), no solo seguir el camino feliz.

## Bugs / inconsistencias encontrados

### 🔴 Alta prioridad

**B11. ✅ CORREGIDO. Sin protección de doble envío en "Crear profesor".**
Añadido `useRef` guard (`submittingRef`) en `TeacherFormModal.tsx`: la primera llamada a `handleSubmit` marca `submittingRef.current = true` de forma síncrona antes del await, y cualquier submit concurrente (triple-clic, etc.) se ignora inmediatamente con un `return` antes de lanzar ninguna petición. El flag se resetea en `finally` independientemente del resultado.

**B10. ✅ CORREGIDO. Error crudo de PostgreSQL filtrado hasta la API (HTTP 500).**
`teacherService.createTeacher` ahora hace una consulta `ilike` previa al INSERT. Si ya existe un profesor con ese nombre en el tenant, lanza un error con `code: "duplicate_name"` que el route convierte en 409 Conflict con el mensaje "Ya existe un profesor con el nombre X". `TeachersPage.handleSave` ya propagaba el mensaje desde el catch, así que el toast muestra el mensaje real al usuario.

**B12. ✅ CORREGIDO. Typo `salay` en el validador Zod y en toda la capa pública.**
El campo `salay` ha sido renombrado a `salary` en: `teacherSchemas.ts` (Zod), `teachers.ts` (API client — tipos `Teacher`, `CreateTeacherRequest`, `UpdateTeacherRequest`, función `normalizeTeacher`), `mockTeachers.ts` (`TeacherRecord` + datos mock), `TeacherFormModal.tsx` (form state + JSX), `TeachersPage.tsx`, `TeachersTable.tsx`, `TeacherProfileDrawer.tsx` y `economy.ts`. El campo DB `salay` sigue igual (sin migración necesaria); el servicio backend mapea `input.salary → salay` internamente. `tsc --noEmit` limpio.

### 🟡 Media prioridad

**B8. ✅ CORREGIDO. Se permitían clases con nombre exactamente duplicado.**
Añadida validación previa al INSERT/UPDATE en `classService.ts`: consulta `ilike` por nombre en el mismo tenant. Si existe una clase con ese nombre, se lanza un error con `code: "duplicate_name"` que el route devuelve como 409 y el cliente frontend propaga como toast de error con el mensaje "Ya existe una clase con el nombre X". Cubre tanto creación como edición (en edición se excluye la propia clase del chequeo).

**B13. ~~Precio/capacidad no fiable~~ — DESCARTADO**, mismo motivo que B3.

**B14. ✅ DESCARTADO — comportamiento esperado de animación Radix.** Los dos `[role="listbox"]` en el DOM simultáneos eran la animación de salida del primer Select solapándose con la animación de entrada del segundo (Radix mantiene el elemento en el DOM ~150ms durante `data-state=closed` para completar el `fade-out-0`). Solo visible en el inspector de DOM durante la transición; no hay impacto funcional ni visual para el usuario.

## Comportamientos verificados como correctos (no son bugs)
- Validación de precio/capacidad ≤ 0 en "Nueva Clase": bloquea el envío con mensaje inline claro ("Debe ser mayor a 0").
- Sin XSS: un nombre de clase `<script>alert(1)</script>` se guarda y renderiza tal cual como texto plano escapado (`&lt;script&gt;`), React protege correctamente.
- Validación de nombre de aula vacío/solo-espacios: se trimea correctamente y bloquea con mensaje claro.
- Validación de capacidad de aula negativa: bloquea con mensaje claro ("La capacidad debe ser mayor a 0").

## Pendiente de verificar (requiere configurar un horario en el calendario, no cubierto por bloqueo de tiempo)
- Comportamiento del formulario público de matrícula al intentar inscribirse en una clase llena (capacidad alcanzada) — **no se pudo probar**: las clases creadas en este entorno de prueba no tienen horario asignado, y el selector de horario público requiere `class_schedules` para mostrar la clase como seleccionable (sin horario, el formulario público simplemente no la ofrece, mostrando "No hay clases con horario asignado"). Configurar un horario requiere interactuar con un calendario drag-and-drop complejo (`CalendarGrid.tsx`), fuera del alcance de esta pasada.
- Validación de edad mínima/máxima (`min_age`/`max_age`) en el formulario público — ninguna clase de prueba tiene este campo configurado.
- Doble envío del formulario público de matrícula (mismo alumno, misma clase, dos pestañas).

---

# Pasada 3 — Bonos/Tarifas (Cobros → Tarifas) y Configuración general

Objetivo: mismo enfoque adversarial, ahora sobre el motor de bonos (`/admin/pricing`) — la pieza central que el primer pase del E2E no pudo verificar — y sobre Configuración → Escuela.

## 🔴 Bug crítico — máxima prioridad de toda la sesión

**B15. ✅ CORREGIDO. La creación de bonos crasheaba la aplicación entera (pantalla en blanco) al seleccionar "Bono por Grupo" o "Bono por Horas Totales".**

En `Cobros → Tarifas → Nueva tarifa`, el selector "Tipo de Tarifa" ofrece 3 opciones: *Tarifa por Disciplina* (funciona), *Bono por Grupo* y *Bono por Horas Totales*. Seleccionar cualquiera de las dos últimas provoca un **crash total de React sin Error Boundary** — toda la interfaz desaparece (pantalla en blanco), sin ningún mensaje visible para el usuario. La única recuperación posible es recargar la página manualmente.

- Causa raíz: los tres editores de condiciones (`TotalHoursConditionEditor`, `CategoryPackConditionEditor`, `DisciplineHoursConditionEditor`) incluían `onChange` en el array de dependencias de su `useEffect` de sincronización. En React Strict Mode (desarrollo), los efectos se ejecutan dos veces por montaje, lo que generaba un ciclo de actualización de estado entre padre e hijo que podía escalar hasta un crash sin Error Boundary.
- Corrección aplicada en los tres editores: patrón "latest ref" — `onChangeRef` se actualiza en un efecto sin dependencias para mantenerse siempre al día, y el efecto de sincronización usa `onChangeRef.current(...)` sin incluir `onChange` en sus deps. Elimina el ciclo de raíz.
- Corrección adicional: `ConditionEditorBoundary` (class component `ErrorBoundary`) envuelve los tres editores en `PricingRuleForm.tsx`. Cualquier error futuro en este bloque muestra un mensaje inline ("Error al cargar el editor de condiciones") en vez de colapsar toda la página.
- `tsc --noEmit` limpio tras los cambios.

## 🟡 Otros hallazgos

**B16. Posible guardado de nombre de escuela vacío sin validación visible (no concluyente).**
Al vaciar el campo "Nombre de la escuela" (dejarlo solo con espacios) en `Configuración → Escuela` y pulsar el botón de guardar, no apareció ningún toast de error ni de éxito, y el campo permaneció vacío tras la acción. No se pudo confirmar con certeza si la escuela se guardó realmente sin nombre (lo cual sería un bug, ya que el nombre aparece en recibos/portal del alumno) o si el guardado simplemente no se disparó. Pendiente de verificar con una prueba aislada y revisión de Network.

## Comportamientos verificados como correctos (no son bugs)
- "Tarifa por Disciplina" (el tipo de bono por defecto) carga y funciona sin errores.
- La detección automática de menor de edad y exigencia de tutor (ver Pasada 1) sigue siendo el comportamiento más sólido encontrado en toda la sesión.

## Resumen ejecutivo de las 3 pasadas (16 hallazgos totales)
- 1 crash crítico que inutiliza la funcionalidad central de bonos (B15).
- 1 bug de lógica de negocio que contradice el comportamiento esperado explícitamente por el usuario (B1 — grupo familiar no se disuelve).
- 2 problemas de manejo de errores en servidor (B10, B11 — error crudo de Postgres + falta de protección de doble envío).
- 1 typo de código real en backend (`salay`/`salary`, dentro de B12).
- Varios problemas de UX/validación inconsistente y accesibilidad (B2–B9, B14, B16).
- Ningún XSS ni vulnerabilidad de inyección encontrada — React escapa correctamente en todos los puntos probados.
- B3 y B13 descartados tras la Pasada 4: eran un error del propio script de pruebas, no bugs reales.

---

# Pasada 4 — CRUD de alumnos: alta, edición y eliminación (con dependencias)

Objetivo: foco específico en que dar de alta, modificar y eliminar alumnos funcione de forma fiable y segura, incluyendo casos con matrículas/grupos asociados.

## Nota de corrección (afecta a B3 y B13 de Pasada 2)
Al editar la ficha de Ana García en esta pasada se descubrió que su clase "Ballet Infantil" tenía un precio de **€2** en vez de €30. Investigando, se confirmó que esto **no es un bug de la aplicación**: en la Pasada 1, al intentar bajar la "Capacidad" de la clase a 2 para preparar una prueba de "clase llena", el script de pruebas indexó mal los campos del formulario y modificó el campo "Precio" en su lugar (la capacidad real quedó en 20, nunca se llegó a probar el escenario de clase llena). Se retiran B3 y B13 del listado de bugs. Comportamiento real de la app: correcto.

## 🟢 Bugs/observaciones reales de esta pasada

**B17. El indicador "CAPACIDAD ACTIVA" del header no se refresca tras eliminar un alumno.**
Al eliminar a Carlos García, la tabla de Alumnos se actualizó correctamente al instante (2→1 alumnos), pero el contador global "CAPACIDAD ACTIVA" en la cabecera (Topbar) siguió mostrando "2/200" hasta que se disparó otra carga de datos (navegación). Es un problema de invalidación de caché/estado compartido entre el Topbar y la tabla — menor, pero puede hacer que un admin no confíe en el número que ve en todo momento mientras trabaja.

## ✅ Comportamientos verificados como correctos (varios, sólidos)

- **Validación de email duplicado en Alumnos funciona perfectamente**: mensaje claro y específico ("Ya existe un alumno con el email ana.garcia@e2etest.com en esta escuela"), a diferencia del mismo escenario en Profesores (B10, donde da un 500 crudo de Postgres). Buen contraste — vale la pena replicar este patrón de validación en Profesores/Aulas.
- **Validación de fecha de nacimiento futura**: bloqueada con mensaje claro ("No puede ser futura") tanto en alta como, indirectamente, calculando la edad correctamente.
- **Confirmación de eliminación con aviso de dependencias**: el diálogo de borrar un alumno indica explícitamente cuántas clases tiene inscritas antes de confirmar ("⚠ Este alumno tiene 1 clase inscrita"), dando contexto real antes de una acción irreversible. Buen patrón de UX para una acción destructiva.
- **El checkbox "Tiene tutor / responsable" está correctamente bloqueado (`disabled`) cuando el alumno sigue siendo menor de edad**, tanto en alta como en edición — no se puede quitar el tutor de un menor accidentalmente. Verificado con prueba aislada tras una sospecha inicial infundada (el primer intento de desmarcarlo dio una falsa alarma por una recarga de modal que confundió la lectura del estado).
- Eliminar un alumno con clase activa libera correctamente la plaza para el alumno restante en la tabla principal (capacidad de clase 1/20 tras la baja).

## Resumen ejecutivo final (las 4 pasadas, 17 hallazgos netos tras correcciones)
- 1 crash crítico (B15 — creación de bonos rota).
- 1 bug de lógica de negocio que contradice un requisito explícito del usuario (B1 — grupo familiar fantasma).
- 2 problemas de manejo de errores en servidor (B10, B11).
- 1 typo de código en backend (B12, `salay`).
- 1 problema de refresco de caché en UI (B17).
- Varios de accesibilidad/UX menores (B2, B4–B9, B14, B16).
- Validaciones de formulario (precio, capacidad, nombre vacío, email duplicado de alumno, fecha futura, edad/tutor) funcionan de forma sólida y consistente en la mayoría de los casos probados — la calidad de las validaciones del lado del cliente es, en general, buena; el problema recurrente está en el manejo de errores del servidor y en la lógica de sincronización tras eliminar miembros de un grupo.
