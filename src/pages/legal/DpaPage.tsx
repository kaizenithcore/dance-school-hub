import { LegalPage, LegalSection } from "@/pages/legal/LegalContent";

export default function DpaPage() {
  return (
    <LegalPage title="Contrato de Encargado del Tratamiento (DPA)" updatedAt="marzo 2026">
      <LegalSection title="DanceHub - Kaizenith">
        <p>
          Documento contractual de encargo del tratamiento aplicable al uso de la plataforma DanceHub por parte de escuelas,
          academias y entidades clientes.
        </p>
      </LegalSection>

      <LegalSection title="1. Partes">
        <p><strong>Responsable del tratamiento (Cliente):</strong></p>
        <p>
          La escuela, academia o entidad que contrata DanceHub y decide sobre los datos personales tratados.
        </p>
        <p><strong>Encargado del tratamiento (Proveedor):</strong></p>
        <p>
          Kaizenith, titular de DanceHub, accesible en{" "}
          <a href="https://kaizenith.es" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">
            kaizenith.es
          </a>
          .
        </p>
        <p>Ambas partes, en adelante, "las Partes".</p>
      </LegalSection>

      <LegalSection title="2. Objeto del contrato">
        <p>
          El presente contrato regula el tratamiento de datos personales por parte de Kaizenith como encargado del tratamiento,
          conforme al artículo 28 del Reglamento (UE) 2016/679 (RGPD).
        </p>
        <p>Kaizenith tratará datos personales únicamente para prestar el servicio SaaS DanceHub, incluyendo:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Gestión de alumnos, profesores y clases.</li>
          <li>Matrículas online.</li>
          <li>Gestión de pagos y facturación.</li>
          <li>Portal del alumno.</li>
          <li>Eventos y escaletas.</li>
          <li>Comunicación interna de la escuela.</li>
          <li>Funcionalidades sociales controladas (sin contenido generado por alumnos).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Naturaleza y finalidad del tratamiento">
        <p><strong>3.1 Naturaleza</strong></p>
        <p>Tratamiento automatizado de datos en infraestructura cloud.</p>

        <p><strong>3.2 Finalidad</strong></p>
        <p>Prestación del servicio contratado por el Cliente.</p>

        <p><strong>3.3 Duración</strong></p>
        <p>Durante la vigencia del contrato principal de prestación de servicios.</p>
      </LegalSection>

      <LegalSection title="4. Tipos de datos y categorías de interesados">
        <p><strong>4.1 Tipos de datos</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Datos identificativos: nombre, apellidos.</li>
          <li>Datos de contacto: email, teléfono.</li>
          <li>Datos académicos: clases, asistencia, progreso.</li>
          <li>Datos económicos: pagos, facturación.</li>
          <li>Datos de uso de la plataforma.</li>
        </ul>
        <p>
          No se tratan categorías especiales de datos salvo que el Cliente los introduzca bajo su responsabilidad.
        </p>

        <p><strong>4.2 Categorías de interesados</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Alumnos (incluyendo menores).</li>
          <li>Padres/tutores (cuando aplique).</li>
          <li>Profesores.</li>
          <li>Personal de la escuela.</li>
          <li>Usuarios administradores.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Obligaciones del encargado (Kaizenith)">
        <p>Kaizenith se compromete a:</p>

        <p><strong>5.1 Uso limitado</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Tratar los datos únicamente siguiendo instrucciones documentadas del Cliente.</li>
          <li>No utilizar los datos para fines propios.</li>
        </ul>

        <p><strong>5.2 Confidencialidad</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Garantizar que el personal autorizado está sujeto a deber de confidencialidad.</li>
        </ul>

        <p><strong>5.3 Seguridad</strong></p>
        <p>Aplicar medidas técnicas y organizativas adecuadas, incluyendo:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Control de accesos.</li>
          <li>Cifrado en tránsito (HTTPS).</li>
          <li>Protección de bases de datos.</li>
          <li>Auditoría y logs.</li>
          <li>Aislamiento por tenant.</li>
        </ul>

        <p><strong>5.4 Subencargados</strong></p>
        <p>Kaizenith podrá utilizar subencargados necesarios para el servicio:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Infraestructura cloud (ej. Supabase u otros proveedores europeos).</li>
          <li>Envío de emails (si se activa funcionalidad).</li>
        </ul>
        <p>Condiciones:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Se seleccionan proveedores con garantías RGPD.</li>
          <li>Se firman contratos de encargo con ellos.</li>
          <li>El Cliente autoriza su uso de forma general.</li>
        </ul>

        <p><strong>5.5 Asistencia al responsable</strong></p>
        <p>Kaizenith asistirá al Cliente en:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Ejercicio de derechos (acceso, rectificación, supresión, etc.).</li>
          <li>Notificación de brechas de seguridad.</li>
          <li>Evaluaciones de impacto (cuando sea necesario).</li>
        </ul>

        <p><strong>5.6 Notificación de brechas</strong></p>
        <p>En caso de violación de seguridad:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Se notificará al Cliente sin dilación indebida.</li>
          <li>Incluyendo naturaleza, impacto y medidas adoptadas.</li>
        </ul>

        <p><strong>5.7 Devolución o eliminación de datos</strong></p>
        <p>Al finalizar el servicio, el Cliente podrá:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Solicitar exportación de datos.</li>
          <li>Solicitar eliminación completa.</li>
        </ul>
        <p>En ausencia de solicitud expresa:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Los datos serán eliminados en un plazo razonable.</li>
          <li>Se conservarán solo los estrictamente necesarios por obligación legal.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Obligaciones del responsable (Cliente)">
        <p>El Cliente declara y garantiza que:</p>

        <p><strong>6.1 Legitimación</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Tiene base legal para tratar los datos (contrato, consentimiento, etc.).</li>
          <li>Ha informado correctamente a los interesados.</li>
        </ul>

        <p><strong>6.2 Uso correcto</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>No introducirá datos ilícitos o innecesarios.</li>
          <li>No utilizará la plataforma para fines ilegales.</li>
        </ul>

        <p><strong>6.3 Datos de menores</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>En caso de menores, dispone del consentimiento de padres/tutores cuando sea necesario.</li>
        </ul>

        <p><strong>6.4 Instrucciones</strong></p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Proporcionará instrucciones claras y lícitas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Transferencias internacionales">
        <p>Los datos podrán ser tratados en:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Unión Europea.</li>
          <li>Países con decisión de adecuación.</li>
        </ul>
        <p>En caso de transferencias fuera del EEE:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Se aplicarán cláusulas contractuales tipo (SCC) u otras garantías legales.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Medidas de seguridad (detalle)">
        <p>Kaizenith implementa, entre otras:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Autenticación segura.</li>
          <li>Separación lógica de datos por escuela (multi-tenant).</li>
          <li>Copias de seguridad periódicas.</li>
          <li>Monitorización de actividad.</li>
          <li>Protección frente a accesos no autorizados.</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Auditorías">
        <p>El Cliente podrá:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Solicitar información sobre medidas de seguridad.</li>
          <li>Realizar auditorías razonables (previo aviso y sin interferir en el servicio).</li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Responsabilidad">
        <ul className="list-disc space-y-1 pl-6">
          <li>Cada parte responde por sus propias obligaciones RGPD.</li>
          <li>Kaizenith no será responsable del uso indebido de datos por parte del Cliente.</li>
        </ul>
      </LegalSection>

      <LegalSection title="11. Jerarquía contractual">
        <p>Este DPA forma parte del contrato principal de uso de DanceHub.</p>
        <p>En caso de conflicto, prevalecerá este documento en materia de protección de datos.</p>
      </LegalSection>

      <LegalSection title="12. Legislación aplicable">
        <ul className="list-disc space-y-1 pl-6">
          <li>Reglamento (UE) 2016/679 (RGPD).</li>
          <li>Ley Orgánica 3/2018 (LOPDGDD).</li>
          <li>Legislación española aplicable.</li>
        </ul>
      </LegalSection>

      <LegalSection title="13. Contacto">
        <p>Para cuestiones de protección de datos: <strong>legal@kaizenith.es</strong></p>
      </LegalSection>
    </LegalPage>
  );
}
