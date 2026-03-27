import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Términos de Servicio" updatedAt="26 de marzo de 2026">
      <LegalSection title="1. Objeto">
        <p>
          Estos términos regulan el acceso y uso de DanceHub, plataforma SaaS desarrollada por <strong>Kaizenith</strong> para
          la gestión de escuelas.
        </p>
        <p>El servicio está dirigido a escuelas y profesionales, no a consumidores finales.</p>
      </LegalSection>

      <LegalSection title="2. Registro y cuentas">
        <ul className="list-disc space-y-1 pl-6">
          <li>La escuela debe proporcionar información veraz.</li>
          <li>Es responsable de su cuenta y credenciales.</li>
          <li>Puede crear usuarios internos (staff/profesores).</li>
          <li>Debe garantizar el uso adecuado por parte de su equipo.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Rol del servicio">
        <p>DanceHub actúa como:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Herramienta de gestión.</li>
          <li>Infraestructura tecnológica.</li>
        </ul>
        <p>La escuela es responsable de:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Los datos que introduce.</li>
          <li>El uso del sistema.</li>
          <li>El cumplimiento legal (especialmente RGPD).</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Uso aceptable">
        <p>Queda prohibido:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Introducir datos ilícitos o falsos.</li>
          <li>Vulnerar derechos de terceros.</li>
          <li>Acceder a datos de otros usuarios.</li>
          <li>Realizar ingeniería inversa.</li>
          <li>Usar la plataforma con fines ilegales.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Portal y contenido">
        <ul className="list-disc space-y-1 pl-6">
          <li>Solo escuelas y profesores pueden publicar contenido.</li>
          <li>Los alumnos no pueden publicar contenido.</li>
          <li>Las escuelas son responsables del contenido que publiquen.</li>
        </ul>
        <p>Kaizenith podrá:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Retirar contenido inapropiado.</li>
          <li>Suspender cuentas por uso indebido.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Datos y responsabilidad">
        <ul className="list-disc space-y-1 pl-6">
          <li>Los datos introducidos pertenecen a la escuela.</li>
          <li>La escuela es responsable del tratamiento de datos personales.</li>
          <li>Kaizenith actúa como encargado del tratamiento.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Propiedad intelectual">
        <p>
          El software es propiedad de Kaizenith. El cliente no adquiere derechos sobre el mismo. Los datos del cliente son del
          cliente.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidad">
        <p>
          No se garantiza disponibilidad continua. Puede haber interrupciones por mantenimiento o causas externas.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitación de responsabilidad">
        <p>Kaizenith no será responsable de:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Pérdidas de ingresos.</li>
          <li>Daños indirectos.</li>
          <li>Decisiones tomadas por la escuela usando la plataforma.</li>
          <li>Errores en datos introducidos por el usuario.</li>
        </ul>
        <p>
          La responsabilidad total de Kaizenith quedará, en todo caso, limitada al importe efectivamente abonado por la escuela en
          los últimos 12 meses.
        </p>
      </LegalSection>

      <LegalSection title="10. Pagos y facturación">
        <ul className="list-disc space-y-1 pl-6">
          <li>El servicio funciona mediante suscripción.</li>
          <li>Puede ser mensual o anual.</li>
          <li>El pago es anticipado.</li>
          <li>No se realizan devoluciones salvo obligación legal.</li>
          <li>El impago puede implicar suspensión del servicio.</li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Cancelación">
        <ul className="list-disc space-y-1 pl-6">
          <li>La escuela puede cancelar en cualquier momento.</li>
          <li>La cancelación no implica devolución de importes ya abonados.</li>
          <li>Kaizenith puede suspender cuentas por incumplimiento.</li>
        </ul>
      </LegalSection>

      <LegalSection title="12. Eliminación de datos">
        <ul className="list-disc space-y-1 pl-6">
          <li>La escuela puede solicitar eliminación de datos.</li>
          <li>Tras cancelación, los datos pueden eliminarse tras un periodo razonable.</li>
        </ul>
      </LegalSection>

      <LegalSection title="13. Modificaciones">
        <p>
          Kaizenith puede modificar estos términos con preaviso razonable. El uso continuado de la plataforma implica la aceptación
          de dichas modificaciones.
        </p>
      </LegalSection>

      <LegalSection title="14. Legislación">
        <p>
          Estos términos se rigen por la legislación española. Las partes se someten a los tribunales competentes en España.
        </p>
      </LegalSection>

      <LegalSection title="15. Contacto">
        <p>Para consultas: <strong>legal@kaizenith.es</strong></p>
      </LegalSection>
    </LegalPage>
  );
}
