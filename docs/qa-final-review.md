# QA Final Review - Nexa Pre-Launch

**Fecha**: 9 de abril de 2026  
**Entorno**: Real navegador (localhost:8080 frontend + localhost:3000 backend)  
**Tenant QA creada**: `qa-escuela-nexa-final`  
**Enfoque**: Validación pre-lanzamiento con criterio producto premium

---

## Cobertura Ejecutada

### 3.0 Landing
- ✅ Navegación principal y CTAs revisadas
- ✅ Copy consistente con posicionamiento premium (beneficio + claridad)
- ✅ Flujo a login/register funcional

### 3.1 Auth & Onboarding
- ✅ Redirección de ruta protegida a login (`/admin` -> `/auth/login?next=...`)
- ✅ Login inválido muestra error claro (`Invalid login credentials`)
- ✅ Registro completo de tenant desde onboarding (3 pasos) + entrada al panel
- ✅ Sesión persistida tras navegación entre módulos

### 3.2 Dashboard
- ✅ Carga de módulos y widgets principal sin bloqueo tras registro
- ✅ Estructura entendible en primera lectura

### 3.3 Alumnos
- ✅ Módulo accesible y tabla renderizada
- ✅ Estado vacío correctamente comunicado (sin alumnos)
- ✅ CRUD real validado: crear, editar y eliminar alumno en navegador
- ✅ Validación condicional correcta para menores: tutor/representante obligatorio
- ✅ Duplicado real de email bloqueado tras fix backend
- ✅ Import CSV con errores parciales validado: 1 creado, 2 errores esperados (duplicado + nombre requerido)

### 3.4 Clases y Horarios
- ✅ Vista de clases accesible y cargando contra backend
- ✅ Navegación a módulo corregida (ver bugs corregidos)
- 🔄 Pendiente: creación/edición real de clase, solapamientos y dependencias de borrado

### 3.5 Matrícula pública (`/s/:slug`)
- ✅ Landing pública de tenant operativa (`/s/qa-escuela-nexa-final`)
- ✅ Formulario de matrícula carga completo
- ✅ Validación de incompletos correcta (campos obligatorios + clase requerida)
- ✅ Mensajes de error comprensibles y contextualizados

### 3.6 Pagos
- ✅ Módulo carga y muestra estados vacíos de forma clara
- ✅ Flujo recomendado visible (generar facturas -> registrar pagos)
- 🔄 Pendiente: alta de cobro manual con datos reales y edge cases (negativo/duplicado)

### 3.7 Comunicación
- ✅ Restricción por plan Starter coherente en UI
- ✅ Gate comercial visible con CTA de upgrade

### 3.11 Web pública
- ✅ Coherencia visual y de copy entre landing y matrícula pública
- ✅ Footer/legal consistente

### 3.12 Roles y permisos
- ✅ Ruta no listada probada manualmente (`/admin/communications`)
- ✅ Restricción funcional aplicada por backend (403) y UI protegida por plan
- 🔄 Pendiente: validación completa multi-rol (owner/admin/staff/profesor/alumno)

---

## 🔴 Decisiones necesarias

- [ ] **Modo demo en `/admin?demo=...`**
Contexto: al iniciar sin sesión se prioriza seguridad y redirección a login; no existe acceso demo directo en esta tenant.
Opciones: mantener solo acceso autenticado / habilitar modo demo público explícito con banner de solo lectura.
Recomendación: habilitar modo demo explícito para comercial, con trazabilidad y límites de escritura.

- [ ] **Tratamiento de errores 403 en módulos capados por plan**
Contexto: la UI informa bien el bloqueo, pero en consola aparecen errores 403 durante fetch.
Opciones: mantener 403 en consola / interceptar y convertir en estado esperado silencioso.
Recomendación: interceptar 403 de features capadas para reducir ruido técnico en QA y soporte.

- [ ] **Cobertura de QA multi-rol en entorno pre-lanzamiento**
Contexto: en esta ejecución se validó owner; faltan cuentas activas para admin/staff/profesor/alumno.
Opciones: crear seed fija por rol / flujo de invitación rápido desde UI / test matrix automatizada parcial.
Recomendación: seed estable por rol antes del go-live para QA repetible de permisos.

---

## 🟡 Mejoras detectadas

- Mejorar feedback de cargas largas por módulo con skeleton contextual (evitar percepciones de bloqueo).
- En matrícula pública, unificar acentos en copy: `Informacion` -> `Información`, `electronico` -> `electrónico`.
- En panel admin, reforzar consistencia de jerarquía visual entre topbar de sección y contenido principal cuando se navega rápido.

---

## 🟢 Bugs corregidos

- **Bloqueo de pantalla blanca en rutas protegidas**
	- Síntoma: navegación a `/admin` podía quedar en blanco sin feedback si el contexto de auth tardaba o no resolvía.
	- Fix aplicado:
		- timeout al resolver contexto de sesión en `src/lib/auth.ts`
		- estado de carga visible en `src/App.tsx` (guard y suspense)

- **Desalineación de contenido entre rutas admin**
	- Síntoma: al cambiar entre módulos (ej. clases/pagos) se mostraba contenido de módulo previo por outlet stale.
	- Fix aplicado:
		- simplificación de render de outlet activo y transición por pathname en `src/components/layout/AdminLayout.tsx`

- **Alta de alumnos permitía emails duplicados dentro de la misma escuela**
	- Síntoma: el alta manual aceptaba dos alumnos con el mismo email y los mostraba como registros distintos en tabla.
	- Fix aplicado:
		- validación de unicidad por tenant en `backend/lib/services/studentService.ts`
		- respuesta HTTP 409 específica en `backend/app/api/admin/students/route.ts` y `backend/app/api/admin/students/[id]/route.ts`

- **Import CSV fallaba filas válidas y no soportaba bien errores parciales en entorno real**
	- Síntoma: el import podía fallar por `phone = null` en columna `NOT NULL`, y en navegador local el POST del import degradaba a error de transporte en vez de devolver resultado.
	- Fix aplicado:
		- fallback de teléfono no nulo + validación de email duplicado también en `backend/lib/services/importService.ts`
		- proxy dev `/api` en `vite.config.ts` y prioridad de same-origin en `src/lib/api/client.ts`
		- revalidado en navegador con resultado correcto: 1 alumno creado y 2 errores mostrados por fila

---

## Estado de QA Final

Estado: **EN PROGRESO (72%)**

Pendiente para cierre total:
- Flujo crítico completo con clases reales (matrícula pública -> backend -> reflejo en admin)
- Pagos con escenarios negativos/duplicados
- Certifier end-to-end
- Portal alumno + validación de acceso a datos ajenos
- Matriz completa multi-rol (owner/admin/staff/profesor/alumno)
