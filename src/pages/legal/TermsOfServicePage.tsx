import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Términos de Servicio" updatedAt="7 de marzo de 2026">
      <LegalSection title="1. Objeto">
        <p>
          Los presentes términos regulan el acceso y uso de la plataforma DanceHub, un servicio SaaS desarrollado por{" "}
          <strong>Kaizenith</strong>{" "}
          (
          <a href="https://kaizenith.es" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            kaizenith.es
          </a>
          ) para la gestión integral de escuelas de baile.
        </p>
      </LegalSection>

      <LegalSection title="2. Registro y cuenta">
        <ul className="list-disc space-y-1 pl-6">
          <li>El usuario debe proporcionar información veraz y mantenerla actualizada.</li>
          <li>Cada escuela debe registrarse con una única cuenta de administrador.</li>
          <li>El usuario es responsable de mantener la confidencialidad de sus credenciales.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Uso aceptable">
        <p>El usuario se compromete a:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Utilizar la plataforma conforme a la ley y estos términos.</li>
          <li>No introducir datos falsos, ofensivos o que vulneren derechos de terceros.</li>
          <li>No intentar acceder a cuentas o datos de otros usuarios.</li>
          <li>No realizar ingeniería inversa ni modificar el software.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Propiedad intelectual">
        <p>
          La plataforma, su código, diseño, logotipos y contenido son propiedad de Kaizenith y están protegidos por la legislación
          de propiedad intelectual e industrial. Los datos introducidos por el usuario pertenecen al usuario.
        </p>
      </LegalSection>

      <LegalSection title="5. Disponibilidad del servicio">
        <p>
          Kaizenith se esfuerza por mantener la plataforma disponible 24/7, pero no garantiza la ausencia de interrupciones por
          mantenimiento, actualizaciones o causas de fuerza mayor.
        </p>
      </LegalSection>

      <LegalSection title="6. Limitación de responsabilidad">
        <p>
          Kaizenith no será responsable de daños indirectos, lucro cesante o pérdida de datos derivados del uso de la plataforma,
          salvo en los casos previstos por la ley.
        </p>
      </LegalSection>

      <LegalSection title="7. Modificaciones">
        <p>
          Kaizenith se reserva el derecho de modificar estos términos. Las modificaciones se comunicarán con antelación razonable.
          El uso continuado del servicio implica la aceptación de los nuevos términos.
        </p>
      </LegalSection>

      <LegalSection title="8. Resolución">
        <p>
          El usuario puede cancelar su cuenta en cualquier momento. Kaizenith puede suspender o cancelar cuentas que infrinjan estos
          términos, previo aviso al usuario.
        </p>
      </LegalSection>

      <LegalSection title="9. Legislación y jurisdicción">
        <p>
          Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y
          tribunales competentes.
        </p>
      </LegalSection>

      <LegalSection title="10. Contacto">
        <p>Para consultas: <strong>legal@kaizenith.es</strong></p>
      </LegalSection>
    </LegalPage>
  );
}
