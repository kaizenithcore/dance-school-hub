Plan de integración backend — Sistema social (Portal del alumno)

Arquitectura base: Next.js 14 API-only + Supabase (Postgres + Auth + Storage) + RLS multi-tenant
Objetivo: integrar feed social controlado (escuelas/profesores publican, alumnos interactúan) sin romper el frontend actual.

🧭 VISIÓN GENERAL

Se implementan 5 bloques:

Contenido (posts, media)
Interacción (likes, guardados)
Relaciones (seguidores)
Perfiles públicos
Integración frontend + optimización
⚙️ FASE 0 — FUNDACIÓN SOCIAL (1–2 días)
🎯 Objetivo

Preparar base técnica reutilizable (auth + tenant + roles)

🧩 Sprint 0 — Contexto social y roles
Prompt para Copilot

Implementar extensión del sistema de auth actual para soportar roles sociales:

Requisitos:
1. Extender contexto de usuario
Añadir a sesión:
type SocialUserContext = {
  userId: string
  tenantId: string
  role: "admin" | "teacher" | "student"
  profileType: "school" | "teacher" | "student"
}
2. Helpers backend

Crear:

lib/auth/getSocialContext.ts

Debe:

Obtener usuario desde Supabase Auth
Resolver:
tenant_id
role
relación con student/teacher
3. Guards
lib/auth/guards.ts

Funciones:

requireAuth()
requireRole(["teacher", "admin"])
requireStudent()
4. Convención API

Todas las rutas sociales:

/api/social/*
🧱 FASE 1 — MODELO DE DATOS SOCIAL (2–3 días)
🎯 Objetivo

Definir tablas base con RLS

🧩 Sprint 1 — Tablas principales
Prompt para Copilot

Crear estructura de tablas:

1. posts
posts {
  id: uuid
  tenant_id: uuid

  author_id: uuid
  author_type: "school" | "teacher"

  content: text
  media_type: "image" | "video"
  media_url: text

  visibility: "public" | "private"

  likes_count: int
  created_at: timestamp
}
2. post_likes
post_likes {
  id: uuid
  post_id: uuid
  user_id: uuid
  created_at: timestamp
}
3. post_saves
post_saves {
  id: uuid
  post_id: uuid
  user_id: uuid
}
4. follows
follows {
  id: uuid

  follower_user_id: uuid
  following_user_id: uuid

  created_at: timestamp
}
5. profiles_public
profiles_public {
  user_id: uuid

  display_name: text
  avatar_url: text

  is_public: boolean

  followers_count: int
  following_count: int
}
6. media_storage (usar Supabase Storage)

Bucket:

social-media (public read)
🔒 RLS
posts:
SELECT → público
INSERT → solo teacher/admin
likes:
INSERT → authenticated
DELETE → owner
follows:
solo usuario autenticado
🚀 FASE 2 — PUBLICACIÓN DE CONTENIDO (3–4 días)
🧩 Sprint 2 — Crear posts
Prompt para Copilot

Implementar:

Endpoint:
POST /api/social/posts
Validación (Zod)
{
  content: string
  media_type?: "image" | "video"
  file?: File
}
Lógica:
Validar rol:
SOLO teacher/admin
Subir archivo a Supabase Storage:
/social-media/{tenantId}/{postId}
Insertar en posts
Endpoint GET feed:
GET /api/social/feed

Query params:

filter: all | following | my_school
cursor (pagination)
Response:
{
  posts: [
    {
      id,
      content,
      media_url,
      author,
      likes_count,
      liked_by_user,
      saved_by_user
    }
  ],
  nextCursor
}
❤️ FASE 3 — INTERACCIONES (2–3 días)
🧩 Sprint 3 — Likes y guardados
Prompt para Copilot
1. Like
POST /api/social/posts/:id/like
DELETE /api/social/posts/:id/like
Insert/delete en post_likes
Actualizar contador
2. Save
POST /api/social/posts/:id/save
DELETE /api/social/posts/:id/save
3. Optimización
Evitar duplicados (unique constraint)
Contadores denormalizados
👥 FASE 4 — FOLLOW SYSTEM (2–3 días)
🧩 Sprint 4 — Seguidores
Prompt para Copilot
Endpoints:
POST /api/social/follow/:userId
DELETE /api/social/follow/:userId
Reglas:
No follow a uno mismo
Idempotencia
Listados:
GET /api/social/profile/:id/followers
GET /api/social/profile/:id/following
👤 FASE 5 — PERFILES PÚBLICOS (2–3 días)
🧩 Sprint 5 — Perfil social
Prompt para Copilot
Endpoint:
GET /api/social/profile/:id
Response:
{
  profile: {
    name,
    avatar,
    followers_count,
    following_count,
    is_public
  },
  posts: []
}
Update perfil:
PATCH /api/social/profile

Campos:

display_name
avatar
is_public
🔗 FASE 6 — INTEGRACIÓN FRONTEND (3–4 días)
🧩 Sprint 6 — Conectar UI
Prompt para Copilot
1. Crear cliente API:
src/lib/api/social.ts

Funciones:

getFeed()
likePost()
followUser()
getProfile()
2. Integraciones:
/feed
Reemplazar mock → API real
/home
Cargar preview feed
/profile
Followers + posts
3. Estados UI
loading
empty
optimistic updates (likes)
⚡ FASE 7 — PERFORMANCE + ESCALADO (2–3 días)
🧩 Sprint 7 — Optimización
Prompt para Copilot
Implementar:
Paginación cursor-based
Índices:
posts(created_at)
post_likes(post_id)
follows(follower_user_id)
Caché ligera (opcional)
feed caching por tenant
🔐 FASE 8 — SEGURIDAD Y CONTROL (2 días)
🧩 Sprint 8 — Hardening
Prompt para Copilot
Reglas:
Rate limit:
likes
follows
posts
Moderación básica:
Flag is_active en posts
Soft delete
Validaciones:
Tamaño imagen/video
Tipos MIME
✅ RESULTADO FINAL

Sistema completo:

Feed funcional
Publicación controlada
Interacciones sociales
Perfiles públicos
Integración total con frontend

# A integrar en la aplicación
Rankings, eventos sociales, badges visibles en feed