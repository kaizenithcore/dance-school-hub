import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function LegalNoticePage() {
  return (
    <LegalPage title="Aviso Legal" updatedAt="7 de marzo de 2026">
      <LegalSection title="1. Datos identificativos">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de
          Comercio Electrónico (LSSI-CE), se informa:
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
          <li><strong>Actividad:</strong> Desarrollo de software y servicios digitales</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Objeto">
        <p>
          El presente sitio web tiene por objeto poner a disposición de los usuarios la plataforma DanceHub, un sistema de gestión
          integral para escuelas de baile.
        </p>
      </LegalSection>

      <LegalSection title="3. Condiciones de uso">
        <p>
          El acceso al sitio web atribuye la condición de usuario e implica la aceptación plena de todas las condiciones incluidas
          en este aviso legal, así como en la política de privacidad, la política de cookies y los términos de servicio.
        </p>
      </LegalSection>

      <LegalSection title="4. Propiedad intelectual e industrial">
        <p>
          Todos los contenidos del sitio web (textos, imágenes, código fuente, logotipos, marcas, diseños) son propiedad de
          Kaizenith o de sus licenciantes y están protegidos por las leyes de propiedad intelectual e industrial.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilidad">
        <p>
          Kaizenith no se hace responsable del uso incorrecto de la plataforma por parte de los usuarios ni de los contenidos que
          estos introduzcan en el sistema.
        </p>
      </LegalSection>

      <LegalSection title="6. Legislación aplicable">
        <p>
          Este aviso legal se rige por la legislación española. Para la resolución de controversias, las partes se someten a los
          juzgados y tribunales competentes.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
