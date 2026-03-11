import { GuideMediaPlaceholders } from "@/pages/guides/GuideMediaPlaceholders";

export default function GuideEnrollmentPage() {
  return (
    <article className="max-w-3xl">
      <p className="text-sm font-semibold text-primary uppercase tracking-wide">Guia administrativa</p>
      <h1 className="mt-2 text-3xl font-bold">Como crear tu matricula en 5 minutos</h1>
      <p className="mt-3 text-muted-foreground">
        Objetivo: publicar un formulario de matricula claro para que las familias puedan inscribirse sin llamadas ni correos manuales.
      </p>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Checklist previo (2 minutos)</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- Confirmar clases activas y precios del periodo.</li>
          <li>- Confirmar datos de contacto de la escuela.</li>
          <li>- Definir una fecha de cierre de matriculas.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Paso 1. Preparar datos basicos</h2>
        <p className="text-muted-foreground">Ten a mano nombre del curso, clases disponibles, precio y datos de contacto de la escuela.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 2. Configurar el formulario</h2>
        <p className="text-muted-foreground">En Form Builder, crea secciones simples: datos del alumno, persona responsable y seleccion de clases.</p>
        <p className="text-muted-foreground">Marca como obligatorios solo los campos necesarios para no alargar el proceso.</p>
        <p className="text-muted-foreground">Recomendacion administrativa: usa textos directos y evita preguntas duplicadas.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 3. Revisar la vista previa</h2>
        <p className="text-muted-foreground">Usa la vista previa para comprobar textos, orden de campos y que no falten opciones de clase.</p>
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xl font-semibold">Paso 4. Publicar y compartir</h2>
        <p className="text-muted-foreground">Copia el enlace publico y envialo por WhatsApp, email o redes de la escuela.</p>
        <p className="text-muted-foreground">Define una responsable interna para revisar entradas nuevas 2 veces al dia.</p>
      </section>

      <GuideMediaPlaceholders
        imageLabel="Captura sugerida: configuracion final del formulario"
        videoLabel="Video sugerido: publicacion y envio del enlace"
      />

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Errores comunes y solucion rapida</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- Error: faltan clases en el formulario. Solucion: revisar estado activo de la clase.</li>
          <li>- Error: muchas consultas por telefono. Solucion: incluir instrucciones breves al inicio del formulario.</li>
          <li>- Error: datos incompletos. Solucion: marcar obligatorios los campos minimos de contacto.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Resultado esperado</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          En menos de una jornada deberias recibir inscripciones ordenadas en un solo panel, con menos trabajo manual y menos errores de transcripcion.
        </p>
      </section>
    </article>
  );
}
