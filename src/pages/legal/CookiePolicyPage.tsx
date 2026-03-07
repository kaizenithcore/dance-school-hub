export default function CookiePolicyPage() {
  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      <h1>Política de Cookies</h1>
      <p className="text-muted-foreground">Última actualización: 7 de marzo de 2026</p>

      <h2>1. ¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas
        un sitio web. Permiten recordar tus preferencias y mejorar tu experiencia de navegación.
      </p>

      <h2>2. Cookies que utilizamos</h2>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Finalidad</th>
            <th>Duración</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Técnicas</td>
            <td>Funcionamiento esencial de la plataforma (sesión, autenticación)</td>
            <td>Sesión / 30 días</td>
          </tr>
          <tr>
            <td>Preferencias</td>
            <td>Recordar configuración del usuario (idioma, tema)</td>
            <td>1 año</td>
          </tr>
          <tr>
            <td>Analíticas</td>
            <td>Análisis de uso y rendimiento de la plataforma</td>
            <td>2 años</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Gestión de cookies</h2>
      <p>
        Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que desactivar
        las cookies técnicas puede afectar al funcionamiento de la plataforma.
      </p>

      <h2>4. Cookies de terceros</h2>
      <p>
        Podemos utilizar servicios de terceros (como herramientas de analítica) que instalan sus
        propias cookies. Estos servicios tienen sus propias políticas de privacidad.
      </p>

      <h2>5. Contacto</h2>
      <p>
        Si tienes preguntas sobre nuestra política de cookies, escríbenos a{" "}
        <strong>legal@kaizenith.es</strong>.
      </p>
    </article>
  );
}
