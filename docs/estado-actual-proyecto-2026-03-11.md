# Estado actual del proyecto - 2026-03-11

## 1. Resumen ejecutivo
El proyecto se encuentra funcional y compilable en frontend y backend con los modulos operativos principales activos.

Durante esta fase se cerraron integraciones relevantes en backend (ExamSuite) y se mejoro la capa comercial en frontend para mostrar limites de plan y bloquear funciones premium con CTA de mejora.

Estado general:
- Frontend: build correcto.
- Backend: typecheck y build correctos.
- Lint backend: con deuda tecnica historica preexistente fuera del alcance de los cambios recientes.

## 2. Cambios relevantes implementados

### 2.1 Backend - modulo ExamSuite
Implementado de extremo a extremo:
- CRUD de examenes.
- Publicacion de registro.
- Registro de candidatos (admin y publico).
- Calificacion por categorias con nota final ponderada.
- Plantillas de certificado y generacion de certificado.
- Historial de certificaciones por alumno.
- Control multi-tenant y permisos por rol.
- Feature flag por tenant para activar/desactivar modulo.

Archivos clave:
- backend/lib/services/examSuiteService.ts
- backend/lib/services/examSuiteFeatureService.ts
- backend/lib/validators/examSuiteSchemas.ts
- backend/lib/types/examSuite.ts
- backend/app/api/admin/exams/**
- backend/app/api/public/exams/[examId]/register/route.ts

### 2.2 Frontend - visibilidad de limites y upgrade
Implementado:
- Franja global en admin con plan y limites visibles.
- Banner de funcion bloqueada por plan.
- Modal al intentar usar funcion premium sin entitlement.
- Bloqueos en modulos premium: Waitlist, Renovaciones, Duplicar cursos, Comunicacion masiva, Examenes.

Archivos clave:
- src/hooks/useBillingEntitlements.ts
- src/components/billing/UpgradeFeatureAlert.tsx
- src/components/billing/FeatureLockDialog.tsx
- src/components/layout/AdminLayout.tsx
- src/pages/admin/WaitlistPage.tsx
- src/pages/admin/RenewalsPage.tsx
- src/pages/admin/CourseClonePage.tsx
- src/pages/admin/CommunicationsPage.tsx
- src/pages/admin/ExamsPage.tsx

## 3. Pruebas ejecutadas y resultado

### 3.1 Backend
- npm run typecheck: OK.
- npm run build: OK.
- Smoke tests HTTP de ExamSuite:
- Endpoints admin sin token: 401 esperado.
- Validacion payload publico: 400 esperado.
- Preflight CORS: 204 esperado.
- Health endpoint: 200 esperado.
- Caso corregido: examId malformado en registro publico devuelve 400 (antes devolvia 500).

### 3.2 Frontend
- npm run build: OK.
- Carga de bundles correcta para nuevas piezas de billing/upgrade.

### 3.3 Lint
- Backend lint: FAIL por deuda historica en servicios previos.
- Los archivos nuevos del modulo ExamSuite quedaron sin errores de typecheck.

## 4. Deuda tecnica abierta (actual)
Quedan errores de lint preexistentes en backend, principalmente por uso de any y ajustes de estilo:
- backend/lib/services/communicationService.ts
- backend/lib/services/paymentService.ts
- backend/lib/services/studentService.ts
- backend/lib/services/invoiceService.ts
- backend/lib/services/enrollmentService.ts
- backend/lib/services/outboxService.ts
- backend/lib/services/publicEnrollmentService.ts

Impacto:
- No bloquea build ni typecheck.
- Si bloquea un criterio estricto de calidad basado en lint en CI.

## 5. Configuraciones manuales pendientes

### 5.1 Supabase Storage para certificados
Necesario para certificados ExamSuite:
- Crear bucket: generated-certificates.
- Definir politicas de acceso/escritura segun tenant.

Sin este bucket:
- La generacion de certificado falla en upload.

### 5.2 Feature flags por tenant
El modulo ExamSuite depende de flags en configuracion de tenant:
- school_settings.payment_config.features.examSuite (o variantes compatibles).

Recomendacion:
- Definir una clave canonica unica para produccion y mantener compatibilidad temporal con legacy keys.

### 5.3 Variables de entorno
Validar que existan y sean consistentes por entorno:
- Backend: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.
- Backend opcionales: RESEND_API_KEY, STRIPE_*.
- Frontend: VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_PUBLISHABLE_KEY si aplica.

### 5.4 Stripe Billing
Para que los botones de mejora funcionen end-to-end en produccion:
- Verificar price IDs de planes y addons.
- Verificar redirect URLs de success/cancel en cada entorno.

## 6. Recomendaciones inmediatas

### Prioridad alta
- Completar configuracion de bucket y politicas de certificados.
- Normalizar feature flags de ExamSuite en tenants activos.
- Definir smoke tests autenticados con tenant real en pipeline interno.

### Prioridad media
- Reducir deuda de lint backend por lotes (servicio por servicio).
- Agregar tests de integracion para rutas admin de ExamSuite con token real y tenant header.

### Prioridad baja
- Mostrar etiquetas Pro/Enterprise en sidebar para anticipar funciones premium.
- Añadir analitica de conversion de upgrade desde banners/modales.

## 7. Checklist de salida a produccion
- [ ] Bucket generated-certificates creado y validado.
- [ ] Feature flags de ExamSuite habilitados en tenants objetivo.
- [ ] Variables de entorno verificadas en staging/prod.
- [ ] Checkout Stripe billing probado end-to-end.
- [ ] Smoke tests autenticados de ExamSuite ejecutados con datos reales.
- [ ] Plan de reduccion de deuda lint aprobado.

---
Documento preparado para seguimiento operativo, QA y despliegue controlado.
