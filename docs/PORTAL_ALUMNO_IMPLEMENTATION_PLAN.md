# Plan de Implementación - Portal del Alumno (Ecosistema Integral)

## Visión General

El portal del alumno es un ecosistema de identidad, seguimiento y relación que funciona en **3 niveles de uso**:
1. **Alumno sin escuela** → Exploración, FOMO, descubrimiento
2. **Alumno matriculado** → Gestión personal, progreso, participación
3. **Escuela/Profesor** → Administración, comunicación, comunidad

---

## FASE 0 - FUNDACIÓN (Baseline Requerida)

Before starting any portal phase, ensure these backend systems are ready:

### 0.1 Backend Core Services
- [ ] `authService` con soporte multi-tenant y roles (student, teacher, school, admin)
- [ ] `studentService` con profile completo (name, avatar, bio, styles, level, yearsExperience)
- [ ] `classService` con horarios, aulas, profesores
- [ ] `enrollmentService` con estados (pending, confirmed, active, completed, cancelled)
- [ ] `eventService` con datos de evento, sesiones y escaleta
- [ ] `certificationsService` con exámenes, estados, calificaciones
- [ ] `attendanceService` con tracking de asistencia por clase

### 0.2 Backend Database Tables (Beyond existing)
```sql
-- Identity & Gamification
student_profiles (id, tenant_id, user_id, public_profile, xp, level, streak_count, streak_start_date)
student_achievements (id, tenant_id, student_id, achievement_type, earned_date, xp_earned)
student_followers (id, tenant_id, follower_id, following_id, followed_at, is_public)

-- Social & Content
school_feed_posts (id, tenant_id, author_id, author_type, type, content, image_urls, likes_count, created_at)
feed_interactions (id, tenant_id, user_id, post_id, interaction_type, created_at)  -- like, comment (future), share

-- Notifications
user_notifications (id, tenant_id, user_id, type, title, message, action_url, is_read, created_at)

-- School Discovery
school_public_profiles (id, tenant_id, name, description, logo_url, location, activity_level, total_students, created_at)
school_discovery_metrics (id, tenant_id, views_count, followers_count, conversion_rate, featured_until)
```

### 0.3 Base Frontend Structure (Already exists in src/portal/)
- ✅ PortalAppShell (layout principal)
- ✅ Mock data models (PortalStudent, PortalClass, PortalEvent, etc.)
- ✅ Persona system (para demostración de 3 niveles)
- ⚠️ Componentes básicos (necesitan integración real con backend)
- ⚠️ Pantallas principales (necesitan conectar a APIs)

---

## FASE 1 - ALUMNO SIN ESCUELA (Discovery & Exploration)

**Objetivo:** Crear FOMO y valor antes de matricularse.

**Duración:** 2-3 semanas

### 1.1 Perfil Público Básico del Bailarín
**Componentes:**
- [ ] Crear/editar perfil: nombre, foto, estilos de baile, nivel declarado, bio, redes
- [ ] Perfil público visible: tarjeta bailarín, stats (seguidores, posts guardados)
- [ ] Privacidad: opción de perfil público/privado

**Backend Requerido:**
- [ ] `POST /api/public/profile` - crear perfil inicial
- [ ] `PATCH /api/public/profile` - actualizar perfil
- [ ] `GET /api/public/profiles/:studentId` - ver perfil público

**Frontend:**
- [ ] `ProfileScreen.tsx` - edición de perfil
- [ ] `ProfileHeader.tsx` - visualización pública
- [ ] `pages/public/StudentProfilePage.tsx` - perfil como página pública

### 1.2 Descubrimiento de Escuelas
**Componentes:**
- [ ] Listado de escuelas públicas (nombre, logo, ubicación, actividad)
- [ ] Filtros: escuelas cercanas, más activas, recientes
- [ ] Card de escuela: nombre, descripción, eventos activos, alumnus count
- [ ] Ver detalles de escuela (al hacerclickear)

**Backend Requerido:**
- [ ] `GET /api/public/schools` - listar escuelas (con paginación, filtros)
- [ ] `GET /api/public/schools/:schoolId` - detalles de escuela

**Frontend:**
- [ ] `pages/public/SchoolDiscoveryPage.tsx` - explorador de escuelas
- [ ] `components/SchoolCard.tsx` - card de escuela

### 1.3 Ver Eventos y Publicaciones Públicas
**Componentes:**
- [ ] Feed público: eventos, galas, festivales de escuelas
- [ ] Filtros: por escuela, tipo de evento, próximos
- [ ] Card de evento: nombre, fecha, escuela, descripción
- [ ] Detalles del evento

**Backend Requerido:**
- [ ] `GET /api/public/events` - eventos públicos (filtrado, paginado)
- [ ] `GET /api/public/posts` - publicaciones públicas de escuelas/profesores

**Frontend:**
- [ ] `EventsScreen.tsx` - adaptado para modo público
- [ ] `FeedScreen.tsx` - feed público

### 1.4 Seguir Perfiles (Sin Suscripción)
**Componentes:**
- [ ] Botón "Seguir" en perfiles de escuelas, profesores, otros bailarines
- [ ] Ver lista de seguidos
- [ ] Ver lista de seguidores
- [ ] Notificación cuando alguien te sigue

**Backend Requerido:**
- [ ] `POST /api/public/follow/:profileId` - seguir
- [ ] `DELETE /api/public/follow/:profileId` - dejar de seguir
- [ ] `GET /api/public/followers/:studentId` - listar seguidores
- [ ] `GET /api/public/following/:studentId` - listar seguidos

**Frontend:**
- [ ] Botón follow/unfollow en perfiles
- [ ] FollowersList.tsx
- [ ] FollowingList.tsx

### 1.5 Guardar Publicaciones y Eventos
**Componentes:**
- [ ] Botón "Guardar" en posts/eventos
- [ ] Sección "Guardados" en el perfil
- [ ] Sincronización de guardados

**Backend Requerido:**
- [ ] `POST /api/public/save/:itemType/:itemId` - guardar
- [ ] `DELETE /api/public/save/:itemType/:itemId` - quitar de guardados
- [ ] `GET /api/public/saved` - listar guardados

**Frontend:**
- [ ] SavedScreen.tsx - ver guardados

### 1.6 Onboarding Completo
**Componentes:**
- [ ] Flujo de onboarding: foto -> estilos -> nivel -> bio -> intereses
- [ ] Sugerencia de escuelas cercanas al completar
- [ ] Acceso a búsqueda de escuelas post-onboarding

**Frontend:**
- [ ] `OnboardingScreen.tsx` - mejorado con todos los pasos

### 1.7 Gestión de Seguidores para Escuelas/Profesores
**Componentes:**
- [ ] Las escuelas y profesores pueden tener perfiles públicos
- [ ] Mostrar estadísticas: posts, seguidores, actividad
- [ ] Verificación de escuela (badge)

---

## FASE 2 - ALUMNO MATRICULADO (Core Functionality)

**Objetivo:** Acceso completo a gestión académica, progreso y participación en comunidad.

**Duración:** 3-4 semanas

### 2.1 Gestión Personal - Dashboard Académico
**Componentes:**
- [ ] Horario semanal personalizado (mis clases)
- [ ] Lista de clases activas (con profesor, aula, observaciones)
- [ ] Avisos de cambios de horario
- [ ] Estado de inscripción en clases/eventos
- [ ] Historial de matrícula (cursos anteriores)

**Backend Requerido:**
- [ ] `GET /api/student/schedule` - horario semanal del alumno
- [ ] `GET /api/student/classes` - clases activas
- [ ] `GET /api/student/enrollments` - historial de matrículas

**Frontend:**
- [ ] `ClassesScreen.tsx` - lista de clases + horario semanal
- [ ] `ScheduleView.tsx` - visualización calendario
- [ ] `EnrollmentHistoryScreen.tsx` - historial de matrículas

### 2.2 Seguimiento de Progreso
**Componentes:**
- [ ] Clases completadas (contador)
- [ ] Racha de asistencia (días consecutivos)
- [ ] Nivel actual y progreso a siguiente nivel
- [ ] XP ganado (por clases, eventos, logros)
- [ ] Timeline visual de progreso

**Backend Requerido:**
- [ ] `GET /api/student/progress` - data de progreso
- [ ] `GET /api/student/attendance-stats` - estadísticas de asistencia
- [ ] `GET /api/student/xp-history` - historial de XP

**Frontend:**
- [ ] `ProgressScreen.tsx` - dashboard de progreso
- [ ] `ProgressCard.tsx` - componente de progreso
- [ ] `StreakDisplay.tsx` - visualización de racha

### 2.3 Logros y Gamificación
**Componentes:**
- [ ] Insignias desbloqueadas (asistencia, eventos, milestones, certificaciones)
- [ ] Progreso hacia insignias futuras
- [ ] Niveles de usuario visible en perfil
- [ ] Tabla de rankings en escuela (opcional)
- [ ] Desbloqueos visuales conforme progresa

**Backend Requerido:**
- [ ] `GET /api/student/achievements` - logros del alumno
- [ ] `GET /api/student/next-achievements` - próximos logros
- [ ] `POST /api/student/achievements/:id/claim` - reclamar reward
- [ ] Lógica de triggers: completar clase X, evento Y, cert Z → unlock achievement

**Frontend:**
- [ ] `AchievementBadge.tsx` - componente de insignia
- [ ] `AchievementsScreen.tsx` - galería de logros

### 2.4 Certificaciones y Evaluación
**Componentes:**
- [ ] Ver exámenes tomados (nombre, disciplina, nivel, fecha)
- [ ] Estado: aprobado/reprobado/pendiente
- [ ] Calificaciones y detalles
- [ ] Descargar certificado PDF (cuando esté disponible)
- [ ] Historial de certificaciones

**Backend Requerido:**
- [ ] `GET /api/student/certifications` - listado de certificaciones
- [ ] `GET /api/student/certifications/:id` - detalles
- [ ] `GET /api/student/certifications/:id/download` - descargar PDF

**Frontend:**
- [ ] `CertificationsScreen.tsx` - galería de certificaciones
- [ ] `CertificationCard.tsx` - card individual

### 2.5 Eventos y Participación
**Componentes:**
- [ ] Ver eventos de su escuela
- [ ] Confirmar asistencia a evento
- [ ] Ver cuando participa (como performer)
- [ ] Ver escaleta del evento (si está disponible)
- [ ] Galería/fotos de eventos pasados
- [ ] Estado de confirmación

**Backend Requerido:**
- [ ] `GET /api/student/events` - eventos relevantes
- [ ] `POST /api/student/events/:id/attend` - confirmar asistencia
- [ ] `DELETE /api/student/events/:id/attend` - cancelar asistencia
- [ ] `GET /api/student/event-participations` - eventos donde participa

**Frontend:**
- [ ] `EventsScreen.tsx` - adaptado para alumno matriculado
- [ ] `EventDetailScreen.tsx` - detalles + confirmar asistencia
- [ ] `EventGalleryScreen.tsx` - fotos de eventos

### 2.6 Perfil Público del Alumno Matriculado
**Componentes:**
- [ ] Mostrar logros en perfil público
- [ ] Mostrar certificaciones en perfil público
- [ ] Mostrar escuela actual y nivel
- [ ] Mostrar stats: clases completadas, racha, eventos
- [ ] Opción de mostrar/ocultar información según privacidad

**Backend Requerido:**
- Ya cubierto en FASE 1

**Frontend:**
- [ ] `ProfileScreen.tsx` - mejorado con más info
- [ ] Adaptación de perfilpúblico para mostrar más datos

### 2.7 Homepage Personalizado
**Componentes:**
- [ ] Saludos personalizados
- [ ] Próximas clases hoy/esta semana
- [ ] Recordatorios de cambios
- [ ] Feed de escuela (publicaciones, anuncios)
- [ ] Eventos próximos
- [ ] Logros recientes
- [ ] Quick stats (clases, racha, nivel)

**Frontend:**
- [ ] `HomeScreen.tsx` - mejorado con versión alumno matriculado

---

## FASE 3 - CONTENIDO SOCIAL Y COMUNICACIÓN

**Objetivo:** Crear comunidad alrededor de la escuela sin abrir red social completa.

**Duración:** 2-3 semanas

### 3.1 Feed de Escuela (Publicaciones Controladas)
**Componentes:**
- [ ] Feed de publicaciones: fotos de clases, videos, eventos, anuncios
- [ ] Autores: escuela, profesor
- [ ] Tipos de contenido: clase, evento, logro, certificación, anuncio, coreografía
- [ ] Interacciones limitadas: like, guardar (NO comentarios abiertos)
- [ ] Timestamps y metadata

**Backend Requerido:**
- [ ] `POST /api/school/feed-posts` - crear publicación (solo escuela/profesor)
- [ ] `GET /api/school/feed-posts` - listar feed
- [ ] `POST /api/feed/posts/:id/like` - dar like
- [ ] `DELETE /api/feed/posts/:id/like` - quitar like
- [ ] `POST /api/feed/posts/:id/save` - guardar
- [ ] `DELETE /api/feed/posts/:id/save` - quitar de guardados

**Models:**
```typescript
interface FeedPost {
  id: string;
  tenantId: string;
  authorId: string;
  authorType: 'school' | 'teacher';
  authorName: string;
  authorAvatar: string;
  type: 'class' | 'event' | 'achievement' | 'announcement' | 'choreography';
  content: string;
  imageUrls?: string[];
  videoUrl?: string;
  likesCount: number;
  savesCount: number;
  hasLiked?: boolean;
  hasSaved?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Frontend:**
- [ ] `FeedScreen.tsx` - feed de escuela
- [ ] `FeedPostCard.tsx` - componente de post
- [ ] `SavedPostsScreen.tsx` - posts guardados

### 3.2 Perfil Público de Escuela
**Componentes:**
- [ ] Nombre, logo, descripción, ubicación
- [ ] Estadísticas: alumnos totales, posts, seguidores, actividad
- [ ] Últimas publicaciones
- [ ] Botón seguir/dejar de seguir
- [ ] Badge de verificación
- [ ] Link a matrícula pública

**Backend Requerido:**
- [ ] `GET /api/public/schools/:schoolId/full-profile` - perfil completo

**Frontend:**
- [ ] `pages/public/SchoolProfilePage.tsx` - perfil de escuela público

### 3.3 Perfil Público de Profesor
**Componentes:**
- [ ] Nombre, foto, especialidades, bio
- [ ] Clases que imparte
- [ ] Publicaciones (si la escuela lo permite)
- [ ] Seguir/dejar de seguir
- [ ] Certificaciones (si la escuela lo muestra)

**Backend Requerido:**
- [ ] `GET /api/public/teachers/:teacherId` - perfil de profesor

**Frontend:**
- [ ] `pages/public/TeacherProfilePage.tsx` - perfil de profesor

### 3.4 Notificaciones (Push/In-App)
**Componentes:**
- [ ] Centro de notificaciones in-app
- [ ] Tipos: cambio de horario, evento, logro, evento escuela, anuncio
- [ ] Marcar como leído
- [ ] Push notifications (opcional v2)
- [ ] Preferencias de notificación

**Backend Requerido:**
- [ ] `GET /api/student/notifications` - listar notificaciones
- [ ] `PATCH /api/student/notifications/:id/read` - marcar como leído
- [ ] Triggers: eventos de cambios, logros, posts de escuela

**Frontend:**
- [ ] `NotificationCenter.tsx` - centro de notificaciones
- [ ] Badge en BottomNav

---

## FASE 4 - ESCUELA & PROFESOR (Admin y Creación de Contenido)

**Objetivo:** Capacidades de administración y publicación para escuelas.

**Duración:** 3-4 semanas

### 4.1 Perfil de Escuela (Admin)
**Componentes:**
- [ ] Editar información: nombre, descripción, logo, ubicación, contacto
- [ ] Configurar branding: colores, logo
- [ ] Gestionar staff: profesores, recepcionistas
- [ ] Ver analytics: alumnos, actividad, engagement

**Backend Requerido:**
- [ ] PATCH `/api/school/profile` - actualizar datos escuela
- [ ] GET `/api/school/analytics` - view datos de escuela

**Frontend:**
- [ ] `admin/SchoolSettingsScreen.tsx`
- [ ] `admin/SchoolAnalyticsScreen.tsx`

### 4.2 Crear y Publicar Contenido (Escuela/Profesor)
**Componentes:**
- [ ] Editor de posts: texto, imágenes, video
- [ ] Seleccionar tipo: clase, evento, logro, anuncio, coreografía
- [ ] Publicar inmediato o programar
- [ ] Borrador automático
- [ ] Historial de publicaciones

**Backend Requerido:**
- [ ] POST `/api/school/posts` - crear post
- [ ] PUT `/api/school/posts/:id` - editar
- [ ] DELETE `/api/school/posts/:id` - borrar
- [ ] GET `/api/school/posts` - listar posts de escuela

**Frontend:**
- [ ] `admin/CreatePostScreen.tsx` - editor de post
- [ ] `admin/PostsManagementScreen.tsx` - gestión de posts

### 4.3 Gestión de Fotogalería
**Componentes:**
- [ ] Subir fotos (eventos, clases)
- [ ] Organizarlas en álbumes
- [ ] Asociar a eventos específicos
- [ ] Configurar privacidad por álbum
- [ ] Ver galería como alumno

**Backend Requerido:**
- [ ] POST `/api/school/albums` - crear álbum
- [ ] POST `/api/school/photos` - subir foto
- [ ] GET `/api/school/photos/album/:albumId` - fotos por álbum

**Frontend:**
- [ ] `admin/GalleryManagementScreen.tsx` - gestión
- [ ] `GalleryViewScreen.tsx` - vista de alumno

### 4.4 Anuncios y Comunicaciones
**Componentes:**
- [ ] Tablero de anuncios: crear anuncio para escuela
- [ ] Marcar como importante/urgente
- [ ] Notificar a alumnos específicos o todos
- [ ] Historial de anuncios

**Backend Requerido:**
- [ ] POST `/api/school/announcements` - crear anuncio
- [ ] GET `/api/school/announcements` - listar (para escuela)
- [ ] GET `/api/student/announcements` - anuncios para alumno

**Frontend:**
- [ ] `admin/AnnouncementsScreen.tsx` - crear/gestionar
- [ ] `AnnouncementsWidget.tsx` - widget en home

### 4.5 Profesor: Vista de Clases y Horario
**Componentes:**
- [ ] Consultar mis clases asignadas
- [ ] Horario semanal
- [ ] Participantes por grupo
- [ ] Acceso a hojas de asistencia
- [ ] Notas o datos relevantes

**Backend Requerido:**
- [ ] GET `/api/teacher/schedule` - horario del profesor
- [ ] GET `/api/teacher/classes` - clases asignadas
- [ ] GET `/api/teacher/classes/:classId/students` - alumnos en clase

**Frontend:**
- [ ] `teacher/TeacherScheduleScreen.tsx`
- [ ] `teacher/TeacherClassesScreen.tsx`

### 4.6 Profesor: Publicar Contenido
**Componentes:**
- [ ] Profesor puede publicar previa aprobación de escuela (o auto si tiene permisos)
- [ ] Publicaciones de clases, ensayos, logros de alumnos
- [ ] Aparecer como autor

**Backend Requerido:**
- [ ] POST `/api/teacher/posts` - crear post (con workflow de aprobación)
- [ ] Estado: draft, pending_approval, published, rejected

**Frontend:**
- [ ] `teacher/CreatePostScreen.tsx` - crear post

---

## FASE 5 - DESCUBRIMIENTO Y EFECTO RED

**Objetivo:** Crear red de escuelas visibles e impulsar crecimiento.

**Duración:** 2 semanas

### 5.1 Exploración de Escuelas (Mejorado)
**Componentes:**
- [ ] Rankings: más activas, más alumnos, más engagement
- [ ] Recomendaciones personalizadas (basadas en ubicación, estilos seguidos)
- [ ] Buscar escuela por nombre/ubicación
- [ ] Filtros: tamaño, estilos, nivel
- [ ] Ver actividad reciente de cada escuela

**Backend Requerido:**
- [ ] GET `/api/public/schools/trending` - escuelas trending
- [ ] GET `/api/public/schools/recommended` - recomendadas
- [ ] GET `/api/public/schools/search` - búsqueda

**Frontend:**
- [ ] `pages/public/SchoolExplorerPage.tsx` - explorador mejorado
- [ ] Implementar recomendaciones

### 5.2 Métricas de Escuela Pública
**Componentes:**
- [ ] Mostrar: alumnos activos, posts recientes, tasa de engagement
- [ ] Trending badge para escuelas activas
- [ ] "Escuelas cerca de ti" - geolocalización (opcional)
- [ ] Comparador de escuelas (side-by-side)

**Backend Requerido:**
- [ ] GET `/api/public/schools/:schoolId/metrics` - métricas públicas
- [ ] Cálculos: engagement rate, posts/week, student growth

**Frontend:**
- [ ] `SchoolMetricsCard.tsx` - componente de métricas
- [ ] `SchoolComparerScreen.tsx` - comparador

### 5.3 Efecto Red Visible
**Componentes:**
- [ ] Mostrar número de escuelas en el ecosistema
- [ ] Mostrar número de bailarines activos
- [ ] Stats globales (opcional)
- [ ] "Escuelas que usan la plataforma" en landing pública

**Backend Requerido:**
- [ ] GET `/api/public/ecosystem-stats` - estadísticas globales

**Frontend:**
- [ ] `pages/public/EcosystemStatsWidget.tsx` - widget en landing

---

## FASE 6 - OPTIMIZACIONES Y PULIDO

**Objetivo:** Performance, experiencia y características secundarias.

**Duración:** 2 semanas

### 6.1 Performance
- [ ] Lazy loading de imágenes
- [ ] Paginación infinita en feeds
- [ ] Caching de datos (student profile, schedule, events)
- [ ] Optimizar queries: N+1 problems
- [ ] Índices en base de datos

### 6.2 Experiencia Móvil
- [ ] Responsive design completo
- [ ] Touch-optimized interactions
- [ ] Offline mode básico (lectura cached)
- [ ] Native app capacities (cámara para foto, etc.)

### 6.3 Características Secundarias
- [ ] Búsqueda global (escuelas, eventos, perfiles)
- [ ] Exportar datos personales (GDPR)
- [ ] Dark mode mejorado
- [ ] Preferences de privacidad granulares

### 6.4 Analytics y Telemetría
- [ ] Tracking de engagement (vistas, interacciones)
- [ ] Funnel de descubrimiento → matrícula
- [ ] Churn rate de alumnos
- [ ] Feature adoption

---

## FASE 7 - INTEGRACIONES Y EXTENSIONES (Future)

### 7.1 API Pública para Terceros
- [ ] Endpoints públicos read-only de calendario, eventos
- [ ] Webhooks para eventos (nuevo alumno, evento publicado)
- [ ] OAuth para sistemas externos

### 7.2 Exportación de Datos
- [ ] Exportar horario a iCal/Google Calendar
- [ ] Descargar historial de actividad
- [ ] Compartir enlace de perfil

### 7.3 Integraciones de Pago
- [ ] Checkout integrado para matrículas desde portal
- [ ] Historial de pagos en portal alumno
- [ ] Descargar recibos

---

## DEPENDENCIAS CRÍTICAS (Order Blocker)

1. ✅ **Autenticación multi-tenant** → Fase 0
2. ✅ **Student profile con avatar** → Fase 1
3. ✅ **Followers system** → Fase 1
4. ✅ **Enrollment system con estados** → Fase 2
5. ✅ **Attendance service** → Fase 2
6. ⚠️ **Feed posts infrastructure** → Fase 3
7. ⚠️ **Achievements/XP system** → Fase 2
8. ⚠️ **Notifications system** → Fase 3

---

## MODELO DE DATOS CONSOLIDADO (Ver Arriba: Backend Tables)

```typescript
// AUTH & IDENTITY
user_accounts (tenantId, userId, email, role, hashedPassword, createdAt)
student_profiles (tenantId, studentId, userId, name, avatar, bio, level, streakCount, xp, level)

// RELATIONSHIPS
student_followers (tenantId, followerId, followingId, followedAt)

// SOCIAL & CONTENT
feed_posts (tenantId, authorId, authorType, type, content, imageUrls, likesCount, savesCount, createdAt)
feed_interactions (tenantId, userId, postId, interactionType, createdAt)

// GAMIFICATION
student_achievements (tenantId, studentId, achievementType, earnedDate, xpEarned)

// NOTIFICATIONS
user_notifications (tenantId, userId, type, title, message, actionUrl, isRead, createdAt)

// DISCOVERY
school_public_profiles (tenantId, name, description, logo, location, createdAt)
school_discovery_metrics (tenantId, viewsCount, followersCount, conversionRate)
```

---

## IMPLEMENTACIÓN POR TRIBU (Equipo)

### Backend Tribe
- [ ] Implementar servicios y rutas REST
- [ ] Validaciones y autorización
- [ ] Cálculo de métricas
- [ ] Triggers para achievements

### Frontend Tribe (Portal)
- [ ] Componentes reutilizables
- [ ] Screens por feature
- [ ] Integración con APIs
- [ ] Testing de UI

### Design Tribe
- [ ] Sistema de componentes
- [ ] Diseño de pantallas
- [ ] Prototipos interactivos

### QA Tribe
- [ ] Test de flujos completos
- [ ] Testing móvil
- [ ] Performance testing

---

## RISKS Y MITIGATION

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Data privacy (menores) | Critical | High | GDPR/COPPA compliance, parental controls |
| Spam/Inappropriate content | High | Medium | Moderation tools, automated filters |
| Performance con muchos usuarios | High | Medium | Caching strategy, DB optimization |
| Adoption (escuelas no usan) | High | High | Onboarding, demo content, early adopters |
| Latency en streaming vídeo | Medium | Low | CDN, transcoding lazy |

---

## Success Metrics (KPIs)

- **Adoption:** % de escuelas con al menos 1 post/mes
- **Engagement:** daily active users, daily session time
- **Discovery:** % de prospect alumnos → registrados
- **Retention:** % de alumnos matriculados que vuelven cada mes
- **Conversion:** % de discovery → matrícula real (integración con pág. pública)
- **Community:** % de alumnos que siguen a escuela, % de posts con likes
