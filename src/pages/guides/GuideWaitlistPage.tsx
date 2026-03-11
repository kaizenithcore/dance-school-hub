import { GuideMediaPlaceholders } from "@/pages/guides/GuideMediaPlaceholders";

export default function GuideWaitlistPage() {
  return (
    <article className="max-w-3xl">
      <p className="text-sm font-semibold text-primary uppercase tracking-wide">Guia administrativa</p>
      <h1 className="mt-2 text-3xl font-bold">Como gestionar lista de espera sin llamadas</h1>
      <p className="mt-3 text-muted-foreground">
        Objetivo: mantener orden cuando una clase esta completa y asignar plazas libres sin seguimiento manual por telefono.
      </p>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Checklist previo</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- Verificar capacidad maxima por clase.</li>
          <li>- Activar lista de espera en matricula.</li>
          <li>- Definir plazo de aceptacion de oferta.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Paso 1. Activar lista de espera</h2>
        <p className="text-muted-foreground">Cuando una clase alcanza cupo, el formulario debe ofrecer unirse a lista de espera.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 2. Revisar orden de prioridad</h2>
        <p className="text-muted-foreground">En el panel, comprueba que la cola refleje orden de entrada y notas administrativas.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 3. Lanzar oferta de plaza</h2>
        <p className="text-muted-foreground">Cuando se libera un cupo, envia oferta al siguiente alumno y deja registrado el vencimiento.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 4. Confirmar o pasar al siguiente</h2>
        <p className="text-muted-foreground">Si no responde dentro del plazo, el sistema debe permitir avanzar sin rehacer la gestion.</p>
      </section>

      <GuideMediaPlaceholders
        imageLabel="Captura sugerida: cola de lista de espera por clase"
        videoLabel="Video sugerido: flujo de oferta y confirmacion"
      />

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Resultado esperado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cupos libres cubiertos con mayor rapidez, menos llamadas de seguimiento y trazabilidad completa de cada oferta enviada.
        </p>
      </section>
    </article>
  );
}
