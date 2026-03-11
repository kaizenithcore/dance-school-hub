import { GuideMediaPlaceholders } from "@/pages/guides/GuideMediaPlaceholders";

export default function GuideCollectionsPage() {
  return (
    <article className="max-w-3xl">
      <p className="text-sm font-semibold text-primary uppercase tracking-wide">Guia administrativa</p>
      <h1 className="mt-2 text-3xl font-bold">Como controlar cobros vencidos y reducir impagos</h1>
      <p className="mt-3 text-muted-foreground">
        Objetivo: centralizar pagos pendientes, actuar con orden y reducir morosidad sin depender de hojas externas.
      </p>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Checklist previo</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- Confirmar moneda, vencimiento y dias de gracia en Ajustes.</li>
          <li>- Revisar metodos de pago activos.</li>
          <li>- Definir responsable de seguimiento semanal.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Paso 1. Revisar panel de pagos</h2>
        <p className="text-muted-foreground">Filtra por periodo y estado para detectar pagos pendientes y vencidos del mes actual.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 2. Priorizar casos</h2>
        <p className="text-muted-foreground">Empieza por importes altos o alumnos con varias cuotas pendientes para evitar acumulacion.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 3. Registrar cobros al dia</h2>
        <p className="text-muted-foreground">Cada cobro debe quedar registrado en el mismo momento para mantener reportes fiables.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 4. Cerrar mes con verificacion</h2>
        <p className="text-muted-foreground">Compara facturas, pagos y alumnos activos para detectar diferencias antes del cierre.</p>
      </section>

      <GuideMediaPlaceholders
        imageLabel="Captura sugerida: listado de pagos pendientes"
        videoLabel="Video sugerido: rutina semanal de seguimiento"
      />

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Resultado esperado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Menos impagos acumulados, cierre mensual mas ordenado y mejor visibilidad para direccion sobre el estado real de cobros.
        </p>
      </section>
    </article>
  );
}
