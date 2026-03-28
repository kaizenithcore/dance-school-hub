import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Política de Privacidad" updatedAt="7 de marzo de 2026">
      <LegalSection title="1. Responsable del tratamiento">
        <p>
          El responsable del tratamiento de los datos es <strong>Kaizenith</strong>, con domicilio digital en{" "}
          <a href="https://kaizenith.es" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            kaizenith.es
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Datos que recopilamos">
        <ul className="list-disc space-y-1 pl-6">
          <li><strong>Datos de registro:</strong> nombre, correo electrónico, nombre de la escuela, teléfono y ciudad.</li>
          <li><strong>Datos de uso:</strong> páginas visitadas, acciones realizadas en la plataforma y dispositivo utilizado.</li>
          <li><strong>Datos de alumnos:</strong> la información que las escuelas introduzcan sobre sus alumnos (nombre, contacto, inscripciones, pagos).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidad del tratamiento">
        <ul className="list-disc space-y-1 pl-6">
          <li>Prestación del servicio SaaS DanceHub.</li>
          <li>Gestión de la relación contractual.</li>
          <li>Comunicaciones relacionadas con el servicio.</li>
          <li>Mejora y análisis de la plataforma.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base legal">
        <p>
          El tratamiento se basa en la ejecución del contrato de servicio, el consentimiento del usuario y el interés legítimo de
          Kaizenith para mejorar la plataforma, conforme al RGPD (UE) 2016/679 y la LOPDGDD (Ley Orgánica 3/2018).
        </p>
      </LegalSection>

      <LegalSection title="5. Conservación de datos">
        <p>
          Los datos se conservarán mientras dure la relación contractual y, posteriormente, durante los plazos legales exigidos por
          la normativa aplicable.
        </p>
      </LegalSection>

      <LegalSection title="6. Derechos del usuario">
        <p>
          Puedes ejercer tus derechos de acceso, rectificación, supresión, portabilidad, limitación y oposición escribiendo a{" "}
          <strong>legal@kaizenith.es</strong>.
        </p>
      </LegalSection>

      <LegalSection title="7. Transferencias internacionales">
        <p>
          Los datos pueden ser almacenados en servidores ubicados en la Unión Europea o en países con nivel de protección adecuado
          conforme a la Comisión Europea.
        </p>
      </LegalSection>

      <LegalSection title="8. Seguridad">
        <p>
          Implementamos medidas técnicas y organizativas apropiadas para proteger los datos personales contra accesos no autorizados,
          alteración, divulgación o destrucción.
        </p>
      </LegalSection>

      <LegalSection title="9. Contacto">
        <p>
          Para cualquier consulta relativa a esta política, contacta con nosotros en <strong>legal@kaizenith.es</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
