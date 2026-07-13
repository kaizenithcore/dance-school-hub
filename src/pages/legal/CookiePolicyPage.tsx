import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Política de Cookies" updatedAt="julio 2026">
      <LegalSection title="1. ¿Qué son las cookies?">
        <p>
          Las cookies son pequeños archivos que un sitio web almacena en tu navegador para recordar información entre
          páginas o visitas. Existen también tecnologías similares como el almacenamiento local (localStorage) que
          funcionan de forma análoga pero sin enviarse al servidor.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies y almacenamiento local utilizados">
        <p>
          Nexa utiliza <strong>únicamente cookies y almacenamiento local de carácter técnico</strong>, estrictamente
          necesarios para el funcionamiento del servicio. No usamos cookies publicitarias, de seguimiento ni de
          analítica de terceros.
        </p>

        <div className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left font-semibold text-foreground">Nombre / clave</th>
                <th className="py-2 pr-4 text-left font-semibold text-foreground">Tipo</th>
                <th className="py-2 pr-4 text-left font-semibold text-foreground">Finalidad</th>
                <th className="py-2 text-left font-semibold text-foreground">Duración</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono text-xs">sb-*-auth-token</td>
                <td className="py-2 pr-4">Cookie (HttpOnly)</td>
                <td className="py-2 pr-4">Sesión de autenticación (Supabase)</td>
                <td className="py-2">Sesión / hasta 7 días</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono text-xs">nexa_cookie_banner_dismissed</td>
                <td className="py-2 pr-4">localStorage</td>
                <td className="py-2 pr-4">Recuerda que el aviso de cookies ha sido cerrado</td>
                <td className="py-2">Persistente (manual)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">nexa.notifications.read</td>
                <td className="py-2 pr-4">localStorage</td>
                <td className="py-2 pr-4">Recuerda qué notificaciones del panel han sido leídas</td>
                <td className="py-2">Persistente (manual)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Las entradas de localStorage no se envían al servidor y no son cookies en sentido estricto, pero se
          documentan aquí por transparencia.
        </p>
      </LegalSection>

      <LegalSection title="3. Base legal">
        <p>
          Las cookies y el almacenamiento local descritos son de carácter técnico necesario. Su uso se ampara en el
          interés legítimo del prestador del servicio (art. 22.2 LSSI) y no requieren consentimiento previo.
        </p>
      </LegalSection>

      <LegalSection title="4. Aviso de cookies">
        <p>
          Al acceder por primera vez se muestra un aviso informativo en la parte inferior de la pantalla. Al cerrarlo
          queda registrado en localStorage para no volver a mostrarse. No existen categorías opcionales que
          aceptar o rechazar porque no usamos cookies no esenciales.
        </p>
      </LegalSection>

      <LegalSection title="5. Proveedores externos">
        <p>
          La autenticación está gestionada por <strong>Supabase</strong> (infraestructura de base de datos y
          autenticación). Las cookies de sesión son generadas por Supabase y están sujetas a su propia política de
          privacidad. Supabase no instala cookies de seguimiento ni publicitarias.
        </p>
        <p>
          No utilizamos Google Analytics, Meta Pixel, ni ninguna otra herramienta de analítica o publicidad de
          terceros.
        </p>
      </LegalSection>

      <LegalSection title="6. Configuración del navegador">
        <p>
          Puedes bloquear, eliminar o configurar cookies desde la configuración de tu navegador. Ten en cuenta que
          bloquear la cookie de sesión impedirá el acceso a la plataforma.
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Chrome: Configuración → Privacidad y seguridad → Cookies</li>
          <li>Firefox: Opciones → Privacidad y seguridad</li>
          <li>Safari: Preferencias → Privacidad</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Actualizaciones">
        <p>
          Si en el futuro incorporamos cookies adicionales (p. ej. analítica), actualizaremos esta política con al
          menos 30 días de antelación e informaremos por email a los usuarios registrados.
        </p>
      </LegalSection>

      <LegalSection title="8. Contacto">
        <p>
          Para consultas sobre cookies: <strong>nexa@kaizenith.es</strong>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
