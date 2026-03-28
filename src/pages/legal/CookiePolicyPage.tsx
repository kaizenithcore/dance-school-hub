import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Política de Cookies" updatedAt="marzo 2026">
      <LegalSection title="1. ¿Qué son las cookies?">
        <p>
          Las cookies son archivos que se descargan en tu dispositivo al acceder a determinadas páginas web. Permiten almacenar y
          recuperar información sobre tu navegación.
        </p>
      </LegalSection>

      <LegalSection title="2. Tipos de cookies utilizadas">
        <p><strong>2.1 Cookies técnicas (necesarias)</strong></p>
        <p>Permiten el funcionamiento básico de la plataforma.</p>
        <p>Ejemplos:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Inicio de sesión.</li>
          <li>Seguridad.</li>
          <li>Navegación entre páginas.</li>
        </ul>
        <p>Duración: sesión / hasta 30 días.</p>

        <p><strong>2.2 Cookies de preferencias</strong></p>
        <p>Permiten recordar configuraciones del usuario.</p>
        <p>Ejemplos:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Idioma.</li>
          <li>Preferencias visuales.</li>
        </ul>
        <p>Duración: hasta 1 año.</p>

        <p><strong>2.3 Cookies analíticas</strong></p>
        <p>Permiten analizar el uso de la plataforma para mejorarla.</p>
        <p>Ejemplos:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Páginas visitadas.</li>
          <li>Tiempo de uso.</li>
          <li>Interacciones.</li>
        </ul>
        <p>Duración: hasta 2 años.</p>
      </LegalSection>

      <LegalSection title="3. Base legal para el uso de cookies">
        <ul className="list-disc space-y-1 pl-6">
          <li>Cookies técnicas: interés legítimo (no requieren consentimiento).</li>
          <li>Cookies analíticas: consentimiento del usuario.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Gestión del consentimiento">
        <p>
          Al acceder al sitio se mostrará un banner de cookies. El usuario podrá aceptar todas, rechazar no esenciales o
          configurar preferencias.
        </p>
        <p>El usuario puede modificar su consentimiento en cualquier momento.</p>
      </LegalSection>

      <LegalSection title="5. Cookies de terceros">
        <p>
          Nexa puede utilizar servicios de terceros, como herramientas de analítica e infraestructura tecnológica. Estos
          proveedores pueden instalar cookies propias, sujetas a sus políticas.
        </p>
      </LegalSection>

      <LegalSection title="6. Configuración del navegador">
        <p>El usuario puede bloquear, eliminar o configurar cookies desde su navegador.</p>
        <p>Nota: desactivar cookies técnicas puede afectar al funcionamiento del servicio.</p>
      </LegalSection>

      <LegalSection title="7. Actualizaciones">
        <p>
          Kaizenith puede actualizar esta política para adaptarla a cambios legales o técnicos.
        </p>
      </LegalSection>

      <LegalSection title="8. Contacto">
        <p>
          Para consultas sobre cookies: <strong>legal@kaizenith.es</strong>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
