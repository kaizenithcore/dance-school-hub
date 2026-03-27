import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Política de Privacidad" updatedAt="26 de marzo de 2026">
      <LegalSection title="1. Responsable del tratamiento">
        <p>
          <strong>Kaizenith</strong>
          <br />
          Sitio web:{" "}
          <a href="https://kaizenith.es" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            kaizenith.es
          </a>
          <br />
          Email: <strong>legal@kaizenith.es</strong>
        </p>
        <p><strong>En el uso de DanceHub:</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Las escuelas son responsables del tratamiento de los datos de sus alumnos.</li>
          <li>Kaizenith actúa como encargado del tratamiento, prestando soporte técnico y operativo.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Datos tratados">
        <p><strong>2.1 Datos de escuelas (clientes)</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Nombre, email y teléfono.</li>
          <li>Datos de la escuela.</li>
          <li>Información de facturación.</li>
        </ul>

        <p><strong>2.2 Datos de uso</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Actividad en la plataforma.</li>
          <li>Navegación.</li>
          <li>Dirección IP y dispositivo.</li>
        </ul>

        <p><strong>2.3 Datos de alumnos (gestionados por las escuelas)</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Nombre y apellidos.</li>
          <li>Contacto.</li>
          <li>Inscripciones y clases.</li>
          <li>Pagos.</li>
          <li>Asistencia.</li>
          <li>Progreso y certificaciones.</li>
          <li>Participación en eventos.</li>
        </ul>

        <p><strong>2.4 Datos del portal del alumno</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Perfil público básico (sin imágenes personales).</li>
          <li>Escuela asociada.</li>
          <li>Actividad (clases, eventos, logros).</li>
          <li>Interacciones (seguimientos, guardados, etc.).</li>
        </ul>

        <p>
          <strong>Importante:</strong>
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Los perfiles públicos de alumnos no incluyen fotografías ni contenido sensible.</li>
          <li>Los alumnos pueden configurar su perfil como privado.</li>
        </ul>

        <p><strong>2.5 Contenido publicado</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Solo escuelas y profesores pueden publicar contenido (imágenes, vídeos o información).</li>
          <li>Los alumnos no pueden publicar contenido.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidad del tratamiento">
        <ul className="list-disc space-y-1 pl-6">
          <li>Prestación del servicio SaaS.</li>
          <li>Gestión académica y administrativa.</li>
          <li>Matrícula online.</li>
          <li>Portal del alumno.</li>
          <li>Comunicación entre escuela y alumnos.</li>
          <li>Mejora del servicio.</li>
          <li>Seguridad del sistema.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base legal">
        <ul className="list-disc space-y-1 pl-6">
          <li>Ejecución del contrato.</li>
          <li>Consentimiento (cuando aplique).</li>
          <li>Interés legítimo (mejora y seguridad).</li>
          <li>Obligación legal.</li>
        </ul>
        <p>
          Para datos de alumnos: la base legal corresponde a la escuela.
        </p>
      </LegalSection>

      <LegalSection title="5. Menores de edad">
        <p>La plataforma permite el tratamiento de datos de menores.</p>
        <p>Las escuelas son responsables de:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Obtener consentimiento de padres/tutores.</li>
          <li>Cumplir normativa aplicable.</li>
        </ul>
        <p>Kaizenith actúa únicamente como encargado técnico.</p>
      </LegalSection>

      <LegalSection title="6. Comunicaciones">
        <ul className="list-disc space-y-1 pl-6">
          <li>Kaizenith puede enviar comunicaciones a escuelas (servicio, soporte, incidencias).</li>
          <li>Las escuelas pueden enviar comunicaciones a sus alumnos desde la plataforma.</li>
        </ul>
        <p>Kaizenith no envía comunicaciones directas a alumnos salvo necesidad técnica del servicio.</p>
      </LegalSection>

      <LegalSection title="7. Conservación">
        <ul className="list-disc space-y-1 pl-6">
          <li>Durante la relación contractual.</li>
          <li>Posteriormente según obligaciones legales.</li>
          <li>Eliminación bajo solicitud de la escuela o usuario.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Proveedores (encargados)">
        <p>Se utilizan proveedores como:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Supabase (infraestructura y base de datos).</li>
          <li>Resend / SendGrid (emails).</li>
          <li>Stripe (pagos de suscripción de escuelas).</li>
        </ul>
        <p>Todos cumplen RGPD.</p>
      </LegalSection>

      <LegalSection title="9. Transferencias internacionales">
        <p>Se aplican:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Decisiones de adecuación.</li>
          <li>Cláusulas contractuales tipo.</li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Seguridad">
        <p>Medidas técnicas y organizativas para:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Evitar accesos no autorizados.</li>
          <li>Proteger integridad.</li>
          <li>Garantizar disponibilidad.</li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Derechos">
        <p>
          Ejercicio en: <strong>legal@kaizenith.es</strong>
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Usuarios finales: pueden dirigirse a su escuela.</li>
          <li>Clientes (escuelas): directamente a Kaizenith.</li>
        </ul>
      </LegalSection>

      <LegalSection title="12. Contenido y visibilidad">
        <ul className="list-disc space-y-1 pl-6">
          <li>Perfiles de alumnos: sin fotos, con control de privacidad.</li>
          <li>Publicaciones: solo escuelas/profesores.</li>
          <li>El usuario puede gestionar visibilidad.</li>
        </ul>
      </LegalSection>

      <LegalSection title="13. Cambios">
        <p>Se notifican cambios relevantes.</p>
      </LegalSection>
    </LegalPage>
  );
}
