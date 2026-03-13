import { GuideMediaPlaceholders } from "@/pages/guides/GuideMediaPlaceholders";

export default function GuideSchedulePage() {
  return (
    <article className="max-w-3xl">
      <p className="text-sm font-semibold text-primary uppercase tracking-wide">Guia administrativa</p>
      <h1 className="mt-2 text-3xl font-bold">Como organizar el horario de todo el curso</h1>
      <p className="mt-3 text-muted-foreground">
        Objetivo: construir un horario estable evitando solapes de aula y profesor con un proceso facil de revisar.
      </p>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Checklist previo</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- Lista de clases por nivel y edad.</li>
          <li>- Disponibilidad horaria de profesores.</li>
          <li>- Capacidad real de cada aula.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Paso 1. Definir bloques y dias</h2>
        <p className="text-muted-foreground">En Ajustes, revisa hora de inicio, hora de cierre y duracion de bloque.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 2. Cargar clases y responsables</h2>
        <p className="text-muted-foreground">Comprueba que cada clase tenga profesor asignado, capacidad y aula disponible.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 3. Ordenar en el calendario</h2>
        <p className="text-muted-foreground">En la vista de horario, mueve clases por franja hasta cubrir toda la semana sin conflictos.</p>
        <p className="text-muted-foreground">Prioriza primero clases con mayor demanda y despues completa los huecos secundarios.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 4. Verificacion final</h2>
        <p className="text-muted-foreground">Revisa ocupacion por clase y confirma que no haya huecos criticos para profesores.</p>
        <p className="text-muted-foreground">Comparte una version preliminar con direccion antes de publicarlo para alumnos.</p>
      </section>

      <GuideMediaPlaceholders
        imageLabel="Captura sugerida: vista semanal completa"
        videoLabel="Video sugerido: reordenar clases sin conflictos"
      />

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Controles de calidad antes de publicar</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- Ningun profesor asignado en dos aulas a la misma hora.</li>
          <li>- Clases de alta demanda ubicadas en aulas adecuadas.</li>
          <li>- Horarios de ninos y adultos claramente separados.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Resultado esperado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Obtendras un horario completo y comunicable a familias, reduciendo cambios de ultima hora y tareas de coordinacion manual.
        </p>
      </section>
    </article>
  );
}
