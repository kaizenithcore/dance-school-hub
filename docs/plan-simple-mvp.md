🧱 FASE 1 — HARDENING (Semana 1)

Objetivo: estabilizar el sistema actual para poder trabajar encima sin romperlo constantemente.

🔹 Sprint 1.1 — Quality baseline

Objetivo: poner el proyecto en un estado mínamente fiable

Acciones
Corregir errores de TypeScript críticos (backend primero)
Reducir uso de any en:
studentService
paymentService
invoiceService
Arreglar contrato de commercialCatalog (frontend ↔ backend)
Resultado esperado
Typecheck OK (mínimo en core)
Backend ejecutable sin errores
Contratos consistentes
🔹 Sprint 1.2 — Limpieza quirúrgica
Acciones
Eliminar:
mocks no usados (apiMock)
TODOs en flujos críticos
endpoints no utilizados
Marcar módulos NO MVP como:
disabled
legacy

Ejemplo:

exams
eventos avanzados
multisede
Resultado
Código más pequeño y entendible
Menos riesgo al refactor
✂️ FASE 2 — REDUCCIÓN A MVP (Semana 2)

Objetivo: dejar SOLO lo que aporta valor real al segmento (escuelas de baile medianas)

🔹 Sprint 2.1 — Definición de dominio core
Mantener:
alumnos
clases
horarios
profesores
matrículas
lista de espera
comunicación
pagos
portal alumno
Eliminar del flujo principal:
exams
analytics avanzados
features experimentales
🔹 Sprint 2.2 — Desacoplar frontend
Problema actual:

AdminLayout.tsx = monstruo

Acciones:

Crear nuevo shell:

/app/(admin)
  /dashboard
  /students
  /classes
  /schedule
  /billing
  /messages
Sacar fuera:
lógica de billing
onboarding
upsells
Resultado
Navegación clara
Base para UX premium

🧼 FASE 3 — RECONSTRUCCIÓN UX (Semana 3)

Objetivo: transformar la experiencia en algo simple, premium y usable por no técnicos

🔹 Sprint 3.1 — Dashboard simplificado
Cambios clave
4–5 métricas máximo
2 gráficas útiles
CTA claros

Ejemplo:

ingresos del mes
alumnos activos
pagos pendientes
ocupación de clases
🔹 Sprint 3.2 — Flujos críticos

Optimizar:

1. Alta de alumno
1 pantalla
campos mínimos
sin fricción
2. Crear clase
flujo guiado
horario + precio + profesor
3. Matrícula
ultra directa
sin pasos innecesarios
🔹 Sprint 3.3 — Portal alumno (arma principal)
Mejorar:
diseño limpio
acceso fácil
valor visible:
horarios
pagos
comunicación
🧠 FASE 4 — BACKEND RESTRUCTURE (Semana 4)

Objetivo: preparar sistema para escalar y vender

🔹 Sprint 4.1 — Capa repositorio

Problema actual:

servicios acceden directamente a Supabase

Solución:
services → repositories → DB

Ejemplo:

studentRepository
paymentRepository
🔹 Sprint 4.2 — Servicios por dominio

Dividir:

studentService → (students, enrollments, guardians)
paymentService → (invoices, transactions)
🔹 Sprint 4.3 — Tests mínimos

Añadir:

3 tests API:
crear alumno
matricular
generar cobro
🎨 FASE 5 — NARRATIVA + LANDING (Semana 4–5)

Objetivo: que lo que vendes coincida EXACTAMENTE con lo que el producto hace

🔹 Sprint 5.1 — Nueva narrativa

Eliminar:

“software de gestión”

Introducir:

“sistema operativo para tu escuela”
“menos caos, más control”
“todo conectado”
🔹 Sprint 5.2 — Landing MVP
Estructura:
Hero
“El sistema que tu escuela se merece”
Problema
Excel + WhatsApp = caos
Solución
Todo en uno conectado
Qué incluye (solo core)
alumnos
clases
pagos
portal alumno
Demo visual (clave)
Pricing simple
1 plan
prueba gratis
💰 FASE 6 — MODELO DE NEGOCIO (Semana 5)
🔹 Sprint 6.1 — Simplificación radical

Eliminar:

múltiples planes
addons complejos
MVP:
Plan único:
→ 199–249€/mes
→ 1 mes gratis
🔹 Sprint 6.2 — Oferta clara

Mensaje:

“Si tienes +50 alumnos, esto te ahorra más dinero del que cuesta”

🚀 FASE 7 — VALIDACIÓN REAL (Semana 6)
🔹 Sprint 7.1 — Onboarding real
Crear 5–10 cuentas reales
Acompañar onboarding manual
🔹 Sprint 7.2 — Feedback

Medir:

activación
uso diario
abandono