import { GuideMediaPlaceholders } from "@/pages/guides/GuideMediaPlaceholders";

export default function GuideRenewalsPage() {
  return (
    <article className="max-w-3xl">
      <p className="text-sm font-semibold text-primary uppercase tracking-wide">Guia administrativa</p>
      <h1 className="mt-2 text-3xl font-bold">Como automatizar renovaciones de alumnos</h1>
      <p className="mt-3 text-muted-foreground">
        Objetivo: lanzar renovaciones de fin de curso con trazabilidad clara para saber que familias confirmaron y que plazas se liberan.
      </p>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Checklist previo</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- Definir fecha limite de respuesta por familia.</li>
          <li>- Revisar clases de continuidad para cada nivel.</li>
          <li>- Confirmar responsable de seguimiento diario.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Paso 1. Crear campana de renovacion</h2>
        <p className="text-muted-foreground">Define periodo actual y periodo destino para preparar ofertas de continuidad.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 2. Revisar alumnos elegibles</h2>
        <p className="text-muted-foreground">Comprueba que cada alumno tenga su propuesta correcta antes de enviarla.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 3. Enviar y seguir estados</h2>
        <p className="text-muted-foreground">Controla pendientes, confirmadas y liberadas desde el panel de renovaciones.</p>
        <p className="text-muted-foreground">Trabaja con una rutina fija: revisar pendientes cada manana y cierre al final del dia.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 4. Cerrar campana</h2>
        <p className="text-muted-foreground">Al finalizar el plazo, libera plazas no confirmadas para nuevas matriculas.</p>
        <p className="text-muted-foreground">Guarda un informe final con confirmadas, rechazos y plazas recuperadas.</p>
      </section>

      <GuideMediaPlaceholders
        imageLabel="Captura sugerida: panel de estados de renovacion"
        videoLabel="Video sugerido: cierre de campana y liberacion de plazas"
      />

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Indicadores recomendados</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- Porcentaje de renovacion confirmado.</li>
          <li>- Tiempo medio de respuesta de familias.</li>
          <li>- Plazas liberadas para nueva captacion.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Resultado esperado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tendras renovaciones ordenadas, menos seguimiento manual y cupos disponibles claros para la siguiente fase de captacion.
        </p>
      </section>
    </article>
  );
}
