import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Política de Cookies" updatedAt="7 de marzo de 2026">
      <LegalSection title="1. ¿Qué son las cookies?">
        <p>
          Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Permiten
          recordar tus preferencias y mejorar tu experiencia de navegación.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies que utilizamos">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60 text-left text-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Finalidad</th>
                <th className="px-3 py-2 font-semibold">Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-3 py-2 font-medium">Técnicas</td>
                <td className="px-3 py-2">Funcionamiento esencial de la plataforma (sesión, autenticación)</td>
                <td className="px-3 py-2">Sesión / 30 días</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2 font-medium">Preferencias</td>
                <td className="px-3 py-2">Recordar configuración del usuario (idioma, tema)</td>
                <td className="px-3 py-2">1 año</td>
              </tr>
              <tr className="border-t border-border">
                <td className="px-3 py-2 font-medium">Analíticas</td>
                <td className="px-3 py-2">Análisis de uso y rendimiento de la plataforma</td>
                <td className="px-3 py-2">2 años</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="3. Gestión de cookies">
        <p>
          Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que desactivar las cookies técnicas puede
          afectar al funcionamiento de la plataforma.
        </p>
      </LegalSection>

      <LegalSection title="4. Cookies de terceros">
        <p>
          Podemos utilizar servicios de terceros (como herramientas de analítica) que instalan sus propias cookies. Estos servicios
          tienen sus propias políticas de privacidad.
        </p>
      </LegalSection>

      <LegalSection title="5. Contacto">
        <p>
          Si tienes preguntas sobre nuestra política de cookies, escríbenos a <strong>legal@kaizenith.es</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
