import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function LegalNoticePage() {
  return (
    <LegalPage title="Aviso Legal" updatedAt="junio 2026">
      <LegalSection title="1. Datos identificativos">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Titular:</strong> Kaizenith — [RAZÓN SOCIAL COMPLETA, S.L. / autónomo]</li>
          <li><strong>NIF:</strong> [NÚMERO DE NIF — obligatorio LSSI-CE Art. 10]</li>
          <li><strong>Domicilio social:</strong> [DIRECCIÓN FISCAL COMPLETA — obligatorio LSSI-CE Art. 10]</li>
          <li>
            <strong>Sitio web:</strong>{" "}
            <a href="https://nexa.kaizenith.es" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
              nexa.kaizenith.es
            </a>
          </li>
          <li><strong>Correo electrónico:</strong> nexa@kaizenith.es</li>
          <li><strong>Actividad:</strong> Prestación de Nexa, plataforma SaaS de gestión para escuelas de danza, y servicios digitales asociados</li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          <em>Nota: Los campos entre corchetes [·] deben completarse con los datos reales del titular antes de publicar este documento.</em>
        </p>
      </LegalSection>

      <LegalSection title="2. Objeto del sitio web">
        <p>
          El presente sitio web tiene por objeto:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Informar sobre los servicios de Kaizenith.</li>
          <li>Permitir el acceso a la plataforma Nexa.</li>
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
        <p>Nexa es una herramienta profesional dirigida a:</p>
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

      <LegalSection title="9. Protección de datos y Autoridad de Control">
        <p>
          El tratamiento de datos personales se rige por la Política de Privacidad y el Acuerdo de Tratamiento de Datos.
        </p>
        <p>
          Sin perjuicio de cualquier otro recurso administrativo o acción judicial, si considera que el tratamiento de sus datos
          personales infringe el Reglamento General de Protección de Datos (RGPD) o la Ley Orgánica de Protección de Datos
          (LOPDGDD), tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD):
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Web:</strong>{" "}
            <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
              www.aepd.es
            </a>
          </li>
          <li><strong>Dirección:</strong> C/ Jorge Juan, 6, 28001 Madrid</li>
          <li><strong>Teléfono:</strong> 901 100 099 / 912 663 517</li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Reclamaciones y resolución de conflictos">
        <p>
          Para cualquier reclamación relacionada con nuestros servicios, puede dirigirse a <strong>nexa@kaizenith.es</strong>.
          Nos comprometemos a responder en un plazo máximo de 15 días hábiles.
        </p>
        <p>
          En caso de no obtener respuesta satisfactoria, podrá acudir a los mecanismos de resolución alternativa de conflictos
          disponibles en España antes de iniciar acciones judiciales.
        </p>
      </LegalSection>

      <LegalSection title="11. Legislación y jurisdicción">
        <p>
          Legislación aplicable: española (LSSI-CE, RGPD, LOPDGDD y demás normativa vigente).
        </p>
        <p>
          Jurisdicción: juzgados y tribunales competentes conforme a la normativa aplicable.
          Cuando el usuario actúe como consumidor, será competente el tribunal de su domicilio.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
