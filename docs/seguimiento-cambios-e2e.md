# Seguimiento de Cambios E2E

Documento vivo para registrar todas las peticiones de cambios, manteniendo el formato original y marcando estado de integración.

Estado:
- [x] Completado e integrado
- [-] No completado o no verificado
- [ ] Pendiente

En la landing:
- [x] No entiendo la función del botón de "solicitar demo" ya se ofrece una prueba gratuita por lo que este botón podría ser "ver en acción" o algo similar que muestre la aplicación con un set de datos de ejemplo (aun no creado)
- [x] El precio del plan pro ha subido a 499, el enterprise a 949, el add on de dominio personalizado cuesta 29, el de branding 39, el de prioriry support 79, el bloque de alumnos (100) para starter 24, (300) para pro 59 y (500) para enterprise 119 (todos los pagos son mensuales)
- [x] Hay que revisar el estilo de las páginas legales para que sea más coherente con el resto del estilo visual moderno del sitio.

En /auth:
- [x] Se debe dejar claro qué plan se esta eligiendo y permitir cambiar de plan durante la fase de registro así como indicar que add ons se quiere tener y que se calcule un precio a pagar tras la prueba en base a ello.
- [x] Prefiero pedir el correo en el primer paso al número de teléfono
- [x] Los avisos de errores (campos incompletos o no válidos) se deben mostrar sobre el propio campo con un pequeño texto de advertencia en lugar de una notificación en la esquina de la pantalla.
- [ ] Opción de recuperar contraseña no envía correo

En /admin:
- [x] La primera vez que un usuario entra debe aparecer una guía de primeros pasos
- [x] La primera vez que se entra en cada sección debe aparecer un breve resumen de qué hace esa sección
- [x] En el banner que indica el plan actual y alumnos se debe incluir también los días restantes del periodo de prueba y un botón que lleve a completar el pago.
- [x] Ver página pública debe abrir en una pestaña nueva
- [x] El sidebar debe llevar un orden lógico (primero aulas, luego profesores, luego clases, luego horarios ...) en el orden correcto del flujo esperado

En /schedule:
- [x] El bloque de propuestas debe estar debajo de la tabla de horario.
- [x] Al tratar de guardar el horario se obtiene el error:
Error saving schedule: Error: An unexpected error occurred
    at batchSaveSchedules (schedules.ts:190:11)
    at async useScheduleEditor.ts:298:20
    at async handleSave (ScheduleEditor.tsx:71:22)
- [x] Las propuestas no se aplican y parecen no tener en cuenta el bloqueo de la posición de las clases
- [x] La sección de alertas de horarios se deben poder mostrar u ocultar con un toggle
- [x] El tamaño de los botones no coincide con el espacio del grid (sobresalen por debajo, el alto deberían ser 60px)
- [x] El nombre del profesor no se obtiene correctamente
- [x] En la vista de todas las aulas las clases pueden superponerse de forma que no queda claro qué va en cada tramo horario (técnicamente funciona bien ya que cada una está en su clase y desde las vistas de las clases se ve correctamente, pero al tener una vista general de todas las aulas los textos se superponen, propón una forma de hacer más clara la legibilidad en estos casos)
- [x] Al pasar el cursor sobre un card de las propuestas esta debe aplicarse únicamnete de forma visual con la transparencia baja a modo de previsualización. 

En /teachers:
- [x] Al abrir la vista previa se muestra un campo "Especialidades" pero este no es un campo real del profesor.
- [x] No se obtienen las clases de los profesores.

En /classes:
- [x] El profesor no tiene por qué ser obligatorio en el momento de creación de la clase, pero si una clase se trata de poner en el horario y no tiene profesor debe no permitirse y aparecer una alerta.
- [x] El placeholder del select de clases no se muestra, debe mostrar una opción de "Seleccionar" igual que en el select de profesor.
- [x] Si un select no tiene valores aun, debe mostrarse la opción de añadir que tenga la misma funcionalidad que el botón de añadir generalmente adyacente que se encargue de crear la disciplina/categoría o redirigir a la sección correspondiente y llamar a la función de crear.
- [x] Disciplina y categoría no deben ser obligatorios para la creación (puede que sólo tenga una de estas o puede que no aplique)
- [x] El texto "clase/semana" es demasiado largo y ocupa 2 líneas cuando el resto de títulos ocupan 1
- [x] Al editar una clase creada, los selects no recuperan su valor (únicamente el de profesor)
- [x] En los resultados, todas las clases aparecen sin profesor asignado, pero al ver la vista previa se muestra correctamente.

En /students:
- [x] Al crear un alumno, si este es menor se deben requerir datos del tutor legal o madre y padre
- [x] Al modificar un alumno agregando datos sobre el tutor se obtiene un error:
client.ts:82
PUT http://localhost:3000/api/admin/students/2788fb16-ed72-41d8-9ffe-2633375f9560 400 (Bad Request)
- [x] Se deben poder permitir alumnos con el mismo email
    Nota: requiere ejecutar migración backend/supabase/migrations/20260311193000_allow_duplicate_student_emails.sql en Supabase.
- [x] Al editar las clases de un alumno se debe poder marcar como alumno de matrícula conjunta y buscar el alumno/s para formar esta matrícula conjunta de modo que también se actualizen estos alumnos (por ejemplo un hijo se apunta en febrero y tras un mes, su madre se apunta con él de forma que se debe crear una matrícula conjunta con ambos), así como eliminar la matrícula conjunta o sólo un alumno de esta en caso de haber más (el caso contrario, una madre se apunta con su hijo, pero tras un mes la madre se da de baja y por tanto el alumno pasa a tener una matrícula individual)
- [x] Al editar las clases de un alumno se debe poder especificar de nuevo el horaio (no solo seleccionar una clase, por ejemplo una clase que tiene varias horas se debe poder elegir a cuales se está modificando, no solo el nombre de la clase)

En matriculación pública:
- [x] Se deben tener en cuenta casos de alumnos ya matriculados para las matrículas conjuntas (por ejemplo un hijo se apunta en febrero y tras un mes, su madre se apunta con él de forma que se debe crear una matrícula conjunta con ambos)

En /form-builder:
- [x] La sección de vista preferida (calendario/lista), clases recurrentes y campos visibles en tarjetas del calendario deben estar siempre como opción y no sólo aparecer al marcar la opción de matrícula conjunta (esta sólo debe indicar si se permite o no y el máximo de alumnos)
- [x] Los campos visibles en tarjetas de calendario no tienen efecto real
- [x] Como campo se debe poder permitir escribir un texto (por ejemplo informativo)
- [x] En las casillas se debe poder diferenciar el tíutlo y el texto de la casilla (por ejemplo el título "Consentimiento" y el valor "He leído y acepto") puedes usar el input actual para el placeholder ya que una casilla no tiene placeholder
- [x] Crea la condición anterior y posterior para fechas
- [x] La condición de la información de selector no esta creada por defecto, debe estarlo para indicar cómo funciona (si fecha de nacimiento es anterior a hoy hace 18 años)
- [x] Se debe crear una sección con los datos de pagador y forma de pago (puede ser el propio alumno o tutor para evitar volver a introducir datos o una persona distinta)

En /s/slug:
- [x] El botón de ver clases en el hero no hace nada
- [x] Si seleccionas una clase y luego vas a la inscripción esta no queda seleccionada
- [x] La previsualización del horario no se muestra correctamente, en cambio el horario mostrado en la inscripción sí.
- [x] En la previsualización del horario en la inscripción el left de los botones de las clases no se calcula bien (por ejmeplo en lugar de 33 debería ser 31 o en lugar de 50, 47)

En /pricing:
- [x] Las categorías de las tarifas resultan confusas por usar el mismo nombre que las categorías de las clases (pensé que las categorías no estaban cargando) Prueba a cambiar el término por otro similar o que represente lo mismo pero sea distinto a los usados en las clases.
- [x] Si no existen categorías, en el select de estas debe aparecer un mensaje indicando que aun no se han creado categorías para bonos.
- [x] La opción del tipo de tarifa debe ser "Tarifa por Disciplina" (sin el + Horas, esto confunde)

En /payments:
- [x] El orden esperado de flujo no queda claro
- [x] Mueve el bloque de generar facturas debajo de la tabla de resultados de pago
- [x] Registrar un pago da un error pero al refrescar la página se ha añadido correctamente:
PaymentsTable.tsx:49 Uncaught TypeError: Cannot read properties of undefined (reading 'toLowerCase')
- [x] El botón de generar recibo debe desactivarse temporalmente mientras se genera para evitar que el usuario le pulse varias veces seguidas
- [x] El flujo actual es confuso (se generan facturas por un lado, pagos por otro, luego se pueden marcar como realizdos los pagos indicando la forma de pago, pero luego las facturas también se deben marcar como pagadas o no otra vez indicando el método de pago)
- [x] Marcar como pagada una factura crea un registro en los pagos, pero se registrar un pago sin la factura y luego marcar desde la factura duplicando el registro (son dos registros distintos pero sobre el mismo pago)
- [x] Los alumos deben mantener su forma de pago seleccionada en el registro a no ser que se modifique.
- [x] Los alumnos con forma de pago de transferencia deben mostrar su número de cuenta

Pendiente por hacer de las marcadas [x]:
- [-] Propuestas de horario - No se aplican, no respetan bloqueos
- [x] Selectores de Clases - No muestran valores al editar, falta placeholder
- [-] Banner de plan: Agregar días restantes de prueba + botón pagar
- [-] "Ver página pública" en nueva pestaña
- [-] Orden sidebar: Aulas → Profesores → Clases → Horarios
- [-] Guía de primeros pasos + resúmenes de secciones
- [-] Asignar clases directamente en formulario de profesor
- [-] Estilo de páginas legales
- [ ] Otros ajustes UI/UX menores

En sidebar:
- [x] Las características bloqueadas por plan deben tener otro estilo en el sidebar para mostrar su bloqueo junto a un icono de un candado.
    Nota de verificación (2026-03-12): revisado en sidebar desktop/mobile con opacidad reducida e icono de candado en opciones bloqueadas.

En general:
- [x] Las características bloqueadas por plan deben dehar más claro que no están disponibles (por ejemplo un pequeño efecto de blur sobre el bloque pero que deje claramente visible el banner)
- [x] En las páginas con características bloqueadas, al cargar siempre aparece el banner, luego cuando detecta que es pro desaparece, pero el efecto que da no resulta profesional. El banner no debe aparecer desde el principio si el usuario no tiene la característica desbloqueada
    Nota de verificación (2026-03-12): revisado en módulos bloqueados con alerta + blur del contenido y control de render usando `!billingLoading && !billing.features.*` para evitar parpadeos iniciales del banner.

En waitlist:
- [x] El bloque de "Añadir desde recepción" debería estar en /reception no en /waitlist
    Nota de verificación (2026-03-12): revisado; el alta a lista de espera está en /reception y no en /waitlist.

En /exams:
- [x] Obtengo un 404, al haber hecho algunos cambios con git no tengo claro en qué estado se encuentra esta sección en mi proyecto actual. 
    Nota de verificación (2026-03-12): revisado; existe ruta /admin/exams y página operativa (sin 404 en la configuración actual).

En /settings:
- [x] Los campos de cuenta se deben poder editar
- [x] La moneda por defecto debe ser el EUR
- [x] Actualizar precios de addons e incluir renovaciones automáticas como add on para starter
- [x] El selector de plan debe pasar de ser un select a una selección entre botones como en el modal de la comparativa de planes y deben actualizarse los precios. 
- [x] Si se detecta un cambio en el apartado de billing y se guarda, se debe redirigir automáticamente a Stripe para continuar con el pago antes de guardar los cambios. 
    Nota de verificación (2026-03-12): revisado en Settings, con edición de cuenta, moneda por defecto EUR, selector de plan por botones y redirección a Stripe cuando cambia billing.

En /communications:
- [ ] Cuando un alumno se elimina se debe borrar de la lista de comunicados pendientes de envío
- [ ] Se deben poder eliminar mensajes en cola
    Nota de verificación (2026-03-12): sigue pendiente; no hay endpoint/UI para eliminar mensajes en cola y al borrar alumno las entregas quedan con recipient_student_id en null (on delete set null), por lo que no se depuran automáticamente.

En /renewals:
- [ ] Las renovaciones las deben poder hacer los alumnos, por lo que las propuestas de renovación deben poder tener un enlace público para que las personas matriculadas renueven su plaza, por ejemplo creando una nueva página pública donde se tengan que buscar rellenando sus datos (sólo pueden ver el resultado de la búsqueda si introducen los datos completos para verificar que se trata de la persona y no se muestren datos de otras personas), y entonces confirmar su plaza (se debe poder dejar la opción de confirmar manualmente desde /renewals) (confirmar la renovaciónd desde esta página pública realizaría la misma función que confirmar manualmente desde /renewals)
    Nota de verificación (2026-03-12): sigue pendiente; RenewalsPage.tsx existe en admin para gestionar campañas (crear, cambiar estado), pero no hay página pública para alumnos ni endpoints públicos. Se necesita crear `/pages/public/RenewalPage.tsx` con búsqueda de alumno por datos de verificación y confirmación de renovación.

En /course-clone:
- [ ] Al duplicar obtengo eun error "Failed to load source classes: column classes.discipline does not exist" (la simulación obtiene los datos correctamente)
    Nota de verificación (2026-03-12): bloqueado por error de schema. La migración 20260307140000_sprint4_enhancements.sql cambió la columna `discipline` (text) a `discipline_id` (uuid->disciplines); pero courseCloneService.ts en línea 234 sigue seleccionando `select("id, name, discipline, category, ...)` cuando debería ser `select("id, name, discipline_id, category, ...)` y la interfaz ClassCloneRow usa `discipline: string` cuando debería ser `discipline_id: string`.

En general:
- [x] En algún sitio visible debe haber un selector del curso académico actual (se deben poder soportar varios cursos académicos de forma simultanea así como un registro de durante cuanto tiempo se van a conservar los datos entre cursos)
    Nota de verificación (2026-03-12): implementado. Tabla academic_years con campos year_code, display_name, start_date, end_date, data_retention_months (default 36 meses), is_active, archived_at. Campo current_academic_year_id añadido a school_settings. API endpoints GET/POST /academic-years, PATCH /academic-years/current. Selector visible en Topbar con AcademicYearSelector component. Hook useAcademicYear disponible para toda la app. Se seeded 2025-2026 como año inicial activo.

En analytics:
- [ ] Ticket medio por alumno
- [ ] Tooltip con más info sobre la estadística o fórmula utilizada