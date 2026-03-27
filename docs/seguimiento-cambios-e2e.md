# Modificaciones o apuntes en general:
- [x] Revisar precio y características de:
    "modernizationProBundle": {
      "label": "Pack Modernización Pro",
      "description": "La forma más rápida de digitalizar tu escuela con todo incluido.",
      "includes": [
        "proPlan",
        "modernizationPack",
        "integratedWebsite"
      ],
      "pricing": {
        "oneTimeEur": 1490,
        "note": "Ahorra más de 1.000€ frente a contratar servicios por separado"
      },
      "commercialPositioning": {
        "highlighted": true,
        "recommended": true,
        "conversionDriver": true
      }
    }
- [x] Revisar:
  "integratedWebsite": {
      "label": "Web integrada con DanceHub",
      "serviceType": "one_time",
      "shortDescription": "Web conectada al sistema para captar y matricular alumnos.",
      "pricingByPlanEur": {
        "starter": 1490,
        "pro": 1790,
        "enterprise": 2190
      },
      "installments": {
        "months": [3, 6],
        "interestFree": true,
        "exampleMonthlyEur": 199,
        "exampleMonths": 6
      },
      "commercialStrategy": {
        "starter": "paid",
        "pro": "included_or_discounted",
        "enterprise": "discounted"
      },
      "bundleEligible": true,
      "bundlePriceEur": 990
    },
    "standaloneWebsite": {
      "label": "Web independiente",
      "serviceType": "one_time",
      "shortDescription": "Web profesional para escuelas que no necesitan el SaaS.",
      "tierPricingEur": {
        "basic": 1390,
        "standard": 1590,
        "advanced": 2990
      },
      "maintenance": {
        "monthlyPriceEur": 29
      },
      "pricingFinal": false
    }

- [x] Incluir servicio de rebranding y de revisión. 
- [x] Incluir colaboración con estudio creativo Weydi para la creación de las páginas webs

- [x] Revisar descuento de lanzamiento, quiero centrarme en el plan anual, pero entonces cómo ofrezco el descuento durante los primeros meses? Pasar a descuento anual? 

- [x] Revisar documentos legales

- [x] Añadir campos de Domicilio y localidad (incluidos filtros, personalizable mediante toggles qué campos mostrar en las tablas de consultas)
- [x] Incluir ordenación ascendente o descendente con icono en cada columna de las tablas de consultas
- [] Mantener la paginación de las tablas al recargar la página (si el usuario estaba en la página 4 de una tabla y recarga, debe mantenerse en la página 4 en lugar de volver a la 1)
- [x] Añadir un estado de carga mientras se obtienen los datos en las tablas de resultados (actualmente aparece el mensaje de que no hay datos durante unos segundos hasta que estos cargan)

# /register
- [] Las opciones de planes no incluyen los pagos anuales

# Header:
- [x] El selector de organización sólo confunde y el selector de sede sólo debe estar disponible si el usuario está en el plan Enterprise
- [x] El selector de cursos no permite añadir nuevo curso
- [x] El badge con el número de notificaciones no aparece hasta pulsar por primera vez en el botón de notificaciones
- [x] Modificar subheader para incluir de forma no invasiva, pero como recordatorio constante la capacidad del plan con barra progresiva como en /students

# /auth
- [] El botón de "Recuérdame" no funciona y hay que volver a iniciar sesión cada vez que expira el tiempo de sesión


# /admin
- [] El modal de aviso de fin de la prueba gratuita puede no entrar en la pantalla no permitiendo continuar al pago y se puede borrar desde el inspector para continuar con el uso normal de la aplicacion. 
- [] En el modal de aviso de fin de la prueba gratuita no deja claro los precios reales de los planes (la suma de los addons confunde y los cálculos del ahorro no son suficientemente visibles para el usuario), además el plan preseleccionado debe ser el plan pro con facturación anual. Crea un badge con un código de descuento promocional y que indique que sólo se da el primer mes "FOUNDERS50"
    
# /alumnos
- [] Tratar de importar da error:
    client:702 [vite] Internal Server Error
    Failed to resolve import "xlsx" from "src/components/import/ImportWizard.tsx". Does the file exist?

- [] Validar campos al crear alumnos

# /form-builder
- [] El formulario por defecto debe ser el que se carga tras restablecer (actualmente es otro más básico, el objetivo es mostrar claramente las funcionalidades y capacidades que puede tener este formulario)
- [] Añadir aviso si se sale de la sección teniendo cambios sin guardar

# /enrollments
- [] Tras cambiar una matrícula de un alumno (de forma que se altere su cuota o clases) la inscripción no se actualiza. No tengo claro si simplemente mostrar un aviso en estos casos o si actualizar la inscripción de forma dinámica.

- [] Falta completar datos del alumno en la vista previa de la inscripción (fecha de nacimiento, tutores, etc.)
- [] Si el método de pago es transferencia, en la vista previa de la inscripción se debe mostrar el IBAN.

# /classes
- [] Al crear una clase, en el select de Aula no se preselecciona el valor "Seleccionar" como el resto de selects y queda vacío
- [] La ocupación de las clases no se obtiene, se muestran todas las clases con 0 de ocupación, en los alumnos sí se pueden ver las clases correctamente seleccionadas
- [] Los profesores de las clases no se obtienen, se muestran todas "Sin asignar" pero los profesores si tienen asignadas las clases correctamente desde su sección

# /schedule
- [] Crear apartado de pressets o horarios guardados que permita guardar horarios y reemplazar el actual por estos guardados.

- [] La cabecera de la tabla no se queda correctaemnte, pasa por encima del header pero no se fija en la parte superior de la tabla, se debe eliminar esta funcionalidad sticky

# /teachers
- [] Incluir una suma total de los salarios
- [] En tabla y vista previa se muestran las clases asignadas, pero en asignar clases no se obtiene las clases asignadas previamente y no se muestran las clases reales, parece que se siguen usando datos de ejemplo
