# Guía de Configuración: Autenticación Frontend-Backend

Esta guía explica cómo configurar y probar la integración de autenticación entre el frontend y backend de DanceHub.

## 📋 Resumen de Cambios

Se ha implementado la integración completa de autenticación:

### Backend (Sprint 2)
- ✅ Endpoint `POST /api/tenants` para registro de escuelas
- ✅ Endpoint `GET /api/auth/me` para contexto de usuario/tenant
- ✅ Autenticación mediante Bearer tokens de Supabase
- ✅ Resolución automática de tenant memberships

### Frontend
- ✅ Cliente de Supabase instalado y configurado
- ✅ Servicio de autenticación (`src/lib/auth.ts`)
- ✅ Cliente API con Bearer token automático (`src/lib/api/client.ts`)
- ✅ Contexto de autenticación global (`src/contexts/AuthContext.tsx`)
- ✅ Páginas de Login y Registro actualizadas con flujo real

## 🔧 Configuración Requerida

### 1. Variables de Entorno del Frontend

Crea un archivo `.env.local` en la raíz del proyecto (frontend):

```bash
# Copia el template
cp .env.local.example .env.local
```

Completa las variables con tus valores reales:

```env
# Supabase Configuration (mismos valores que en backend/.env.local)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Backend API URL
VITE_API_URL=http://localhost:3000
```

**Dónde encontrar las credenciales de Supabase:**
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a Settings → API
4. Copia:
   - `URL` → `VITE_SUPABASE_URL`
   - `anon public` → `VITE_SUPABASE_ANON_KEY`

### 2. Variables de Entorno del Backend

Asegúrate de que `backend/.env.local` tenga:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

**Nota importante:** El `SERVICE_ROLE_KEY` solo se usa en el backend.

## 🚀 Flujo de Autenticación

### Registro de Nueva Escuela

1. Usuario visita `/auth/register`
2. Completa formulario en 2 pasos:
   - **Paso 1:** Nombre escuela, teléfono (opcional), ciudad (opcional)
   - **Paso 2:** Nombre, email, contraseña, confirmación, términos
3. Frontend llama a `POST /api/tenants`:
   ```json
   {
     "tenantName": "Academia de Baile Sol",
     "tenantSlug": "academia-de-baile-sol",
     "ownerEmail": "admin@academia.com",
     "ownerDisplayName": "María García",
     "ownerPassword": "password123"
   }
   ```
4. Backend crea:
   - Usuario en Supabase Auth
   - Tenant en la base de datos
   - User profile
   - Tenant membership (owner)
   - School settings por defecto
5. Frontend hace login automático con las credenciales
6. Redirige a `/admin`

### Login

1. Usuario visita `/auth/login`
2. Introduce email y contraseña
3. Frontend llama a `supabase.auth.signInWithPassword()`
4. Frontend obtiene access token y llama `GET /api/auth/me`
5. Backend valida token y devuelve:
   ```json
   {
     "user": {
       "id": "uuid",
       "email": "admin@academia.com"
     },
     "tenant": {
       "id": "uuid",
       "role": "owner"
     },
     "memberships": [
       {
         "tenantId": "uuid",
         "tenantName": "Academia de Baile Sol",
         "tenantSlug": "academia-de-baile-sol",
         "role": "owner"
       }
     ]
   }
   ```
6. Redirige a `/admin`

### Estado de Sesión

El `AuthContext` mantiene:
- `isLoading`: Estado de carga inicial
- `isAuthenticated`: Si hay sesión válida
- `authContext`: Datos completos del usuario y tenant
- `refreshAuthContext()`: Refrescar contexto manualmente
- `logout()`: Cerrar sesión

## 🧪 Pruebas Manuales

### 1. Iniciar Servidores

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Debería correr en http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Debería correr en http://localhost:5173
```

### 2. Verificar Salud del Backend

```bash
curl http://localhost:3000/api/health
```

Deberías ver:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-03-07T...",
    "environment": "development"
  }
}
```

### 3. Probar Registro

1. Abre `http://localhost:5173/auth/register`
2. Completa el formulario:
   - Nombre escuela: "Test School"
   - Email: `test@example.com`
   - Contraseña: `test1234` (mínimo 8 caracteres)
3. Acepta términos y haz clic en "Crear cuenta"
4. Deberías:
   - Ver toast de éxito
   - Ser redirigido a `/admin`
   - Ver el panel de administración

**Verificar en Supabase:**
- Ve a Authentication → Users
- Deberías ver el nuevo usuario
- Ve a Table Editor → `tenants`
- Deberías ver el nuevo tenant con slug "test-school"

### 4. Probar Login

1. Cierra sesión (si tienes el botón implementado) o usa modo incógnito
2. Abre `http://localhost:5173/auth/login`
3. Introduce las credenciales creadas anteriormente
4. Haz clic en "Iniciar sesión"
5. Deberías ser redirigido a `/admin`

### 5. Verificar Contexto de Autenticación

En la consola del navegador (DevTools):

```javascript
// El AuthContext debería estar disponible
// Si tienes React DevTools, puedes inspeccionar el AuthContext Provider
```

## 🐛 Solución de Problemas

### Error: "Missing Supabase environment variables"

**Causa:** No se encontró `.env.local` o faltan variables.

**Solución:**
1. Verifica que `.env.local` existe en la raíz del proyecto
2. Verifica que todas las variables están definidas
3. Reinicia el servidor de desarrollo (`npm run dev`)

### Error: "Network request failed"

**Causa:** El backend no está corriendo o la URL es incorrecta.

**Solución:**
1. Verifica que el backend corre en `http://localhost:3000`
2. Verifica `VITE_API_URL` en `.env.local`
3. Comprueba que no hay problemas de CORS (el backend usa Next.js que maneja CORS automáticamente)

### Error: "No school associated with this account"

**Causa:** El usuario existe en Supabase Auth pero no tiene tenant membership.

**Solución:**
1. Verifica en Supabase Table Editor → `tenant_memberships`
2. Asegúrate de que hay un registro con:
   - `user_id` = ID del usuario
   - `is_active` = true
3. Si falta, algo falló durante el registro. Intenta registrar una nueva escuela.

### Error: "Tenant slug is already in use"

**Causa:** Ya existe un tenant con ese slug.

**Solución:**
1. Cambia el nombre de la escuela en el formulario
2. O elimina el tenant existente en Supabase
3. El slug se genera automáticamente del nombre (ej: "Mi Escuela" → "mi-escuela")

## 📁 Estructura de Archivos Clave

```
src/
├── lib/
│   ├── supabase.ts          # Cliente de Supabase
│   ├── auth.ts              # Funciones de registro/login/logout
│   └── api/
│       ├── client.ts        # Cliente HTTP base
│       └── auth.ts          # Endpoints de autenticación
├── contexts/
│   └── AuthContext.tsx      # Contexto global de auth
├── pages/
│   └── auth/
│       ├── LoginPage.tsx    # Página de login
│       └── RegisterPage.tsx # Página de registro
└── main.tsx                 # AuthProvider wrapper

backend/
├── app/api/
│   ├── tenants/
│   │   └── route.ts         # POST /api/tenants
│   └── auth/
│       └── me/
│           └── route.ts     # GET /api/auth/me
└── lib/
    ├── auth/
    │   ├── requireAuth.ts   # Middleware de autenticación
    │   └── tenantContext.ts # Helpers de contexto
    └── services/
        └── tenantService.ts # Lógica de onboarding
```

## ✅ Checklist de Validación

Antes de continuar con Sprint 3, verifica:

- [ ] `.env.local` existe y tiene todas las variables configuradas (frontend y backend)
- [ ] Backend corre en http://localhost:3000 sin errores
- [ ] Frontend corre en http://localhost:5173 sin errores
- [ ] `/api/health` responde correctamente
- [ ] Puedes registrar una nueva escuela exitosamente
- [ ] El usuario aparece en Supabase Auth
- [ ] El tenant aparece en la tabla `tenants`
- [ ] La membership aparece en `tenant_memberships`
- [ ] Puedes hacer login con las credenciales creadas
- [ ] Eres redirigido a `/admin` después del login
- [ ] El contexto de autenticación está disponible en el estado global

## 🎯 Próximos Pasos

Una vez validada la integración:

1. **Proteger rutas admin** con guard basado en `useAuth()`
2. **Implementar Sprint 3:** Endpoints de teachers, rooms, classes
3. **Conectar frontend con endpoints reales** de clases/alumnos/pagos
4. **Refinar UX:** Loading states, error handling, redirects

---

**Nota:** Esta integración usa Supabase Auth para gestión de usuarios y el backend Next.js para lógica de negocio multi-tenant. El flujo es híbrido pero seguro: Supabase maneja contraseñas/tokens, el backend valida permisos y gestiona datos de negocio.
