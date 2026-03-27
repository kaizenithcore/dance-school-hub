import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function LegalNoticePage() {
  return (
    <LegalPage title="Aviso Legal" updatedAt="marzo 2026">
      <LegalSection title="1. Datos identificativos">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002 (LSSI-CE):
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Titular:</strong> Kaizenith</li>
          <li>
            <strong>Sitio web:</strong>{" "}
            <a href="https://kaizenith.es" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
              kaizenith.es
            </a>
          </li>
          <li><strong>Correo electrónico:</strong> legal@kaizenith.es</li>
          <li><strong>Actividad:</strong> Desarrollo de software, servicios SaaS y soluciones digitales</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Objeto del sitio web">
        <p>
          El presente sitio web tiene por objeto:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Informar sobre los servicios de Kaizenith.</li>
          <li>Permitir el acceso a la plataforma DanceHub.</li>
          <li>Facilitar la contratación de servicios SaaS y servicios digitales asociados (webs, modernización, etc.).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Condiciones de acceso y uso">
        <p>
          El acceso y uso del sitio web implica:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Aceptación de este Aviso Legal.</li>
          <li>Aceptación de la Política de Privacidad, Cookies y Términos de Servicio.</li>
        </ul>
        <p>El usuario se compromete a:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Utilizar el sitio conforme a la ley.</li>
          <li>No realizar actividades ilícitas o perjudiciales.</li>
          <li>No dañar, inutilizar o sobrecargar la plataforma.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Uso de la plataforma">
        <p>DanceHub es una herramienta profesional dirigida a:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Escuelas de danza.</li>
          <li>Profesores.</li>
          <li>Alumnos (a través de la escuela).</li>
        </ul>
        <p><strong>Importante:</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Las escuelas son responsables de los datos que introducen.</li>
          <li>Solo escuelas y profesores pueden publicar contenido.</li>
          <li>Los perfiles públicos de alumnos no incluyen contenido sensible ni imágenes.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Propiedad intelectual e industrial">
        <p>
          Todos los contenidos del sitio web y la plataforma, incluyendo código, diseño, interfaces, textos, marca y logotipos,
          son propiedad de Kaizenith o de sus licenciantes.
        </p>
        <p>Queda prohibido:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Reproducir, distribuir o modificar sin autorización.</li>
          <li>Realizar ingeniería inversa del software.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Contenidos generados por usuarios">
        <p>Kaizenith no es responsable de:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Los datos introducidos por las escuelas.</li>
          <li>El uso que estas hagan de la plataforma.</li>
          <li>Comunicaciones enviadas a alumnos.</li>
        </ul>
        <p>Kaizenith podrá:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Eliminar contenido que incumpla la ley o estos términos.</li>
          <li>Suspender cuentas en caso de uso indebido.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Disponibilidad y funcionamiento">
        <p>
          Kaizenith no garantiza disponibilidad continua (puede haber mantenimiento o incidencias) y se reserva el derecho a
          modificar el sitio y funcionalidades.
        </p>
      </LegalSection>

      <LegalSection title="8. Enlaces externos">
        <p>
          El sitio puede contener enlaces a terceros. Kaizenith no controla ni responde por dichos contenidos y el acceso a estos
          enlaces es responsabilidad exclusiva del usuario.
        </p>
      </LegalSection>

      <LegalSection title="9. Protección de datos">
        <p>
          El tratamiento de datos personales se rige por la Política de Privacidad.
        </p>
      </LegalSection>

      <LegalSection title="10. Legislación y jurisdicción">
        <p>
          Legislación aplicable: española.
        </p>
        <p>
          Jurisdicción: juzgados y tribunales competentes del domicilio del usuario, cuando proceda legalmente.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
