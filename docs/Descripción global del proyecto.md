Nexa es una plataforma SaaS B2B diseñada para la gestión integral de academias, centros formativos y organizaciones educativas/deportivas, con un enfoque claro en operaciones, automatización y conectividad interna.

El sistema centraliza en una única plataforma:

Gestión de alumnos
Gestión académica (clases, horarios, inscripciones)
Operativa administrativa (pagos, comunicaciones)
Experiencia del alumno (portal Nexa Club)
Módulos específicos (como certificaciones/exámenes → Certifier)

El posicionamiento actual es premium accesible, orientado a centros que quieren profesionalizar su operativa sin adoptar soluciones fragmentadas.

🏗️ Estado actual del producto (visión técnica)
Arquitectura
Frontend: SPA moderna (React + Vite + Tailwind)
Backend: Next.js (API routes)
Base de datos: Supabase (PostgreSQL + RLS)
Auth + storage: Supabase
Pagos: Stripe (con fallback manual)
Emails: Resend (opcional)
Modelo técnico clave
1. Multi-tenant
Aislamiento por escuela/asociación mediante RLS
Soporte multi-sede (Enterprise)
Asociaciones con acceso multi-escuela (Certifier)
2. Modelo de datos principal
students (núcleo)
classes, schedules
enrollments
payments
guardians
exam_sessions, exam_results, certificates (Certifier)
3. Backend modular por dominios
Student Service
Enrollment Service
Payment/Analytics
ExamSuite (Certifier)
Notification Service (con outbox)
Estado funcional actual
Core SaaS (estable)
CRUD completo de alumnos
Sistema de clases + horarios
Matrícula online (form builder configurable)
Portal alumno (lite / full)
Gestión básica de pagos
Analítica operativa
Certifier (exámenes)
Ciclo completo:
convocatoria → inscripción → evaluación → certificación
RBAC granular (examiner, grader, supervisor…)
Multi-escuela
Generación de certificados PDF
Analytics específicos
Infraestructura avanzada
RLS endurecido
Sistema de jobs (certificados async)
Auditoría de eventos
Feature flags por plan
Fallback sin Stripe
Estado real
Backend completo (Sprint 1–19 + hardening)
Frontend funcional
Falta:
E2E testing completo
Operativa (jobs, notificaciones, billing manual)
Refinamiento UX/UI
💼 Modelo de negocio (Business Model Canvas)
1. Segmentos de clientes
Primarios
Academias medianas/grandes (>400 alumnos)
Idiomas
Formación privada
Centros deportivos
Escuelas artísticas
Secundarios
Academias pequeñas en digitalización inicial
Asociaciones educativas/deportivas (Certifier)
2. Propuesta de valor
Core

Sistema todo-en-uno que conecta toda la operativa de una academia

Diferenciales clave
Conectividad total
Matrícula → alumno → clases → pagos → portal
Reducción de fricción operativa
Visión unificada del negocio
Portal del alumno como extensión del sistema
Modularidad sin complejidad visible
3. Canales
Landing web (principal canal de adquisición)
Venta directa (email / contacto)
Asociaciones (canal indirecto → Certifier)
Web integrada como canal de conversión
4. Relación con clientes
Onboarding guiado (Pack modernización)
Soporte continuo
Producto self-service + capa consultiva
5. Fuentes de ingresos
SaaS (recurring)
Starter — 199€/mes
Pro — 349€/mes
Enterprise — 649€/mes
Servicios (one-time)
Web integrada (399€ / 849€)
Branding (Kaizenith)
Implementación
Certifier
Asociaciones (modelo recurrente)
Escuelas (Lite)
6. Recursos clave
Plataforma SaaS (core)
Infraestructura cloud (Supabase)
Marca Nexa (posicionamiento premium)
Know-how en procesos operativos de academias
7. Actividades clave
Desarrollo producto
Optimización UX/UI
Ventas B2B
Onboarding clientes
Soporte
8. Socios clave
Stripe (billing)
Supabase (infraestructura)
Resend (comunicaciones)
Kaizenith (branding/servicios)
9. Estructura de costes
Infraestructura cloud
Desarrollo (principal)
Marketing
Soporte
🎯 Segmentación y targeting
Estrategia actual
Enfoque principal
Academias con complejidad operativa real
Negocios que:
ya facturan
tienen volumen
sufren desorganización interna
Insight clave

El cliente no compra software, compra orden y control

Problemas del cliente
Gestión manual (Excel, WhatsApp, papel)
Falta de visibilidad financiera
Procesos desconectados
Pérdida de tiempo administrativo
Mala experiencia del alumno
💎 Propuesta de valor refinada
Nivel funcional
Centralización operativa
Nivel económico
Reducción de costes administrativos
Aumento de conversión (matrícula online)
Nivel emocional
Sensación de control
Profesionalización del negocio
Percepción de “academia moderna”
⚔️ Competencia
Competencia directa
Vertical SaaS (academias)
Bsport
Virtuagym
Class Manager
Mindbody
Características comunes:
Gestión de clases
Pagos
CRM básico
Debilidades:
Sistemas fragmentados
UX compleja
Poco enfoque en conectividad real
Competencia indirecta
Notion
Airtable
Excel
Google Sheets
Problema:
Soluciones DIY → no escalables
Posicionamiento competitivo
Factor	Nexa
Conectividad	Muy alta
UX	En mejora (objetivo premium)
Especialización	Media-alta
Flexibilidad	Alta
Complejidad percibida	Baja (objetivo)
🧠 Ventaja competitiva real
1. Sistema conectado

No son módulos → es un flujo continuo:

Captación → matrícula → operación → alumno → analytics
2. Portal del alumno (Nexa Club)
Extensión directa del sistema
Diferenciador clave frente a competencia
3. Certifier como canal de adquisición
Entrada indirecta de escuelas
Estrategia de expansión
4. Arquitectura moderna
Escalable
Multi-tenant real
Preparado para expansión modular
📈 Estado estratégico
Fortalezas
Producto técnicamente avanzado
Visión clara de sistema unificado
Base sólida para escalar
Debilidades
UX aún compleja
Posicionamiento en transición
Catálogo todavía en simplificación
Oportunidades
Mercado fragmentado
Baja digitalización en academias
Alto valor percibido en automatización
Riesgos
Competidores con más marketing
Complejidad si no se simplifica UX
Percepción de “demasiado completo”
🚀 Conclusión

Nexa no es simplemente un software de gestión, sino un sistema operativo para academias, cuyo valor principal radica en:

conectar procesos
reducir fricción
ofrecer control total del negocio

El reto actual no es técnico, sino estratégico:

simplificar la percepción del producto sin reducir su potencia real

Ahí es donde está la clave de crecimiento.