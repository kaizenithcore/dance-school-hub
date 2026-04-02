import { useEffect, useMemo, useRef, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModuleHelpShortcut } from "@/components/layout/ModuleHelpShortcut";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  approveTeacherPortalPost,
  createPortalMediaFromUrl,
  createSchoolPortalPost,
  deleteSchoolPortalPost,
  listSchoolPortalPosts,
  rejectTeacherPortalPost,
  type PortalFeedPost,
  type PortalFeedType,
  uploadPortalMediaFile,
  updateSchoolPortalPost,
} from "@/lib/api/portalFoundation";
import { getSchoolSettings } from "@/lib/api/settings";
import { toast } from "sonner";
import { runWithSaveFeedback } from "@/lib/saveFeedback";
import { toastErrorOnce } from "@/lib/toastPremium";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { Loader2, RefreshCw } from "lucide-react";

interface FormState {
  authorName: string;
  type: PortalFeedType;
  content: string;
  mediaUrl: string;
  mediaKind: "image" | "video";
  existingMediaIds: string[];
}

const initialForm: FormState = {
  authorName: "",
  type: "announcement",
  content: "",
  mediaUrl: "",
  mediaKind: "image",
  existingMediaIds: [],
};

const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  published: "default",
  pending_approval: "secondary",
  rejected: "destructive",
  draft: "outline",
};

const POST_DELETE_UNDO_MS = 5000;

export default function PostsManagementScreen() {
  const [posts, setPosts] = useState<PortalFeedPost[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pendingDeleteMapRef = useRef<Map<string, { post: PortalFeedPost; index: number }>>(new Map());
  const pendingDeleteTimersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }

      pendingDeleteTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      pendingDeleteTimersRef.current.clear();
      pendingDeleteMapRef.current.clear();
    };
  }, [mediaPreviewUrl]);

  const editingPost = useMemo(
    () => (editingPostId ? posts.find((item) => item.id === editingPostId) ?? null : null),
    [editingPostId, posts]
  );

  const formHasUnsavedChanges = useMemo(() => {
    if (saving) {
      return false;
    }

    if (editingPost) {
      const originalMediaUrl = editingPost.mediaItems[0]?.url ?? editingPost.imageUrls[0] ?? editingPost.videoUrl ?? "";
      const originalMediaKind: "image" | "video" = editingPost.videoUrl ? "video" : "image";

      return Boolean(
        mediaFile
        || form.authorName.trim() !== editingPost.authorName.trim()
        || form.type !== editingPost.type
        || form.content.trim() !== editingPost.content.trim()
        || form.mediaUrl.trim() !== originalMediaUrl.trim()
        || form.mediaKind !== originalMediaKind
      );
    }

    return Boolean(
      form.content.trim()
      || form.mediaUrl.trim()
      || mediaFile
      || form.type !== "announcement"
    );
  }, [editingPost, form.authorName, form.content, form.mediaKind, form.mediaUrl, form.type, mediaFile, saving]);

  useUnsavedChangesGuard({
    enabled: formHasUnsavedChanges,
    message: "Tienes cambios sin guardar en Publicaciones. Si sales ahora, se perderán. ¿Quieres continuar?",
  });

  const filteredPosts = useMemo(
    () => posts.filter((item) => statusFilter === "all" || item.approvalStatus === statusFilter),
    [posts, statusFilter]
  );

  const loadPosts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listSchoolPortalPosts({ limit: 100 });
      setPosts(data.items);
    } catch (error) {
      console.error(error);
      const message = "No se pudieron cargar las publicaciones";
      setLoadError(message);
      toastErrorOnce("posts-load", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();

    const loadDefaults = async () => {
      const settings = await getSchoolSettings();
      if (settings?.school?.name) {
        setForm((prev) => ({ ...prev, authorName: settings.school.name }));
      }
    };

    void loadDefaults();
  }, []);

  const resetForm = () => {
    setEditingPostId(null);
    setForm((prev) => ({ ...initialForm, authorName: prev.authorName }));
    setMediaFile(null);
    if (mediaPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaPreviewUrl("");
  };

  const handleMediaFileChange = (file: File | null) => {
    if (mediaPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    setMediaFile(file);

    if (!file) {
      setMediaPreviewUrl("");
      return;
    }

    setMediaPreviewUrl(URL.createObjectURL(file));
    setForm((prev) => ({
      ...prev,
      mediaKind: file.type.startsWith("video/") ? "video" : "image",
    }));
  };

  const handleCreateOrUpdate = async () => {
    if (!form.authorName.trim() || !form.content.trim()) {
      toast.error("Autor y contenido son obligatorios");
      return;
    }

    setSaving(true);
    try {
      await runWithSaveFeedback(
        {
          loading: editingPostId ? "Guardando publicación..." : "Publicando contenido...",
          success: editingPostId ? "Publicación guardada" : "Publicación creada",
          error: "No se pudo guardar la publicación",
          successDescription: editingPostId
            ? "Se actualizó en el historial de publicaciones."
            : "Ya puedes verla y moderarla desde el historial.",
          errorHint: "Revisa autor, contenido y multimedia antes de reintentar.",
        },
        async () => {
          let mediaIds = form.existingMediaIds;
          if (mediaFile) {
            const uploaded = await uploadPortalMediaFile({
              file: mediaFile,
              kind: form.mediaKind,
              isPublic: true,
            });
            mediaIds = [uploaded.id];
          } else if (form.mediaUrl.trim()) {
            const uploaded = await createPortalMediaFromUrl({
              url: form.mediaUrl.trim(),
              kind: form.mediaKind,
              isPublic: true,
            });
            mediaIds = [uploaded.id];
          }

          if (editingPostId) {
            await updateSchoolPortalPost(editingPostId, {
              authorName: form.authorName.trim(),
              type: form.type,
              content: form.content.trim(),
              mediaIds,
            });
            return;
          }

          await createSchoolPortalPost({
            authorType: "school",
            authorName: form.authorName.trim(),
            type: form.type,
            content: form.content.trim(),
            mediaIds,
            isPublic: true,
          });
        }
      );

      resetForm();
      await loadPosts();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWithUndo = (post: PortalFeedPost) => {
    if (pendingDeleteTimersRef.current.has(post.id)) {
      return;
    }

    const index = filteredPosts.findIndex((item) => item.id === post.id);
    pendingDeleteMapRef.current.set(post.id, { post, index: index >= 0 ? index : 0 });
    setPosts((prev) => prev.filter((item) => item.id !== post.id));

    toast.warning("Publicación preparada para eliminar", {
      description: "Puedes deshacer durante unos segundos.",
      action: {
        label: "Deshacer",
        onClick: () => {
          const pending = pendingDeleteMapRef.current.get(post.id);
          const timerId = pendingDeleteTimersRef.current.get(post.id);
          if (!pending) {
            return;
          }

          if (timerId) {
            window.clearTimeout(timerId);
          }

          pendingDeleteMapRef.current.delete(post.id);
          pendingDeleteTimersRef.current.delete(post.id);
          setPosts((prev) => {
            const next = [...prev];
            next.splice(Math.min(pending.index, next.length), 0, pending.post);
            return next;
          });
          toast.success("Eliminación cancelada");
        },
      },
    });

    const timerId = window.setTimeout(() => {
      pendingDeleteTimersRef.current.delete(post.id);
      const pending = pendingDeleteMapRef.current.get(post.id);
      pendingDeleteMapRef.current.delete(post.id);

      if (!pending) {
        return;
      }

      void runWithSaveFeedback(
        {
          loading: "Eliminando publicación...",
          success: "Publicación eliminada",
          error: "No se pudo eliminar la publicación",
          successDescription: "El contenido dejó de mostrarse en el listado.",
          errorHint: "Inténtalo de nuevo en unos segundos.",
        },
        async () => {
          await deleteSchoolPortalPost(post.id);
        }
      ).catch((error) => {
        console.error(error);
        setPosts((prev) => {
          const next = [...prev];
          next.splice(Math.min(pending.index, next.length), 0, pending.post);
          return next;
        });
      });
    }, POST_DELETE_UNDO_MS);

    pendingDeleteTimersRef.current.set(post.id, timerId);
  };

  const handleApprovePost = async (postId: string) => {
    try {
      await runWithSaveFeedback(
        {
          loading: "Aprobando publicación...",
          success: "Publicación aprobada",
          error: "No se pudo aprobar la publicación",
          successDescription: "El contenido ya puede mostrarse a los alumnos.",
          errorHint: "Inténtalo de nuevo en unos segundos.",
        },
        async () => {
          await approveTeacherPortalPost(postId);
        }
      );
      await loadPosts();
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectPost = async (postId: string) => {
    try {
      await runWithSaveFeedback(
        {
          loading: "Rechazando publicación...",
          success: "Publicación rechazada",
          error: "No se pudo rechazar la publicación",
          successDescription: "La publicación quedó marcada para revisión del autor.",
          errorHint: "Comprueba la conexión e inténtalo nuevamente.",
        },
        async () => {
          await rejectTeacherPortalPost(postId, "Revisar formato");
        }
      );
      await loadPosts();
    } catch (error) {
      console.error(error);
    }
  };

  const startEdit = (post: PortalFeedPost) => {
    setEditingPostId(post.id);
    setForm({
      authorName: post.authorName,
      type: post.type,
      content: post.content,
      mediaUrl: post.mediaItems[0]?.url ?? post.imageUrls[0] ?? post.videoUrl ?? "",
      mediaKind: post.videoUrl ? "video" : "image",
      existingMediaIds: post.mediaIds,
    });
    setMediaFile(null);
    if (mediaPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setMediaPreviewUrl("");
  };

  return (
    <PageContainer
      title="Gestión de Publicaciones"
      description="Crea, edita y modera publicaciones de escuela y profesores"
      actions={
        <>
          <ModuleHelpShortcut module="school-posts" />
          <Button variant="outline" onClick={() => void loadPosts()} disabled={loading || saving}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Recargar</span>
          </Button>
          {editingPostId ? (
            <Button variant="outline" onClick={resetForm}>Cancelar edición</Button>
          ) : null}
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{editingPostId ? "Editar publicación" : "Nueva publicación"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="author-name">Autor</Label>
              <Input
                id="author-name"
                value={form.authorName}
                onChange={(event) => setForm((prev) => ({ ...prev, authorName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-type">Tipo</Label>
              <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value as PortalFeedType }))}>
                <SelectTrigger id="post-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Anuncio</SelectItem>
                  <SelectItem value="class">Clase</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="achievement">Logro</SelectItem>
                  <SelectItem value="choreography">Coreografía</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-content">Contenido</Label>
            <Textarea
              id="post-content"
              rows={5}
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="media-url">URL multimedia (opcional)</Label>
              <Input
                id="media-url"
                placeholder="https://..."
                value={form.mediaUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, mediaUrl: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Si adjuntas archivo, tiene prioridad sobre esta URL.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="media-file">Archivo multimedia (opcional)</Label>
              <Input
                id="media-file"
                type="file"
                accept="image/*,video/*"
                onChange={(event) => handleMediaFileChange(event.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          {(mediaPreviewUrl || form.mediaUrl.trim()) ? (
            <div className="space-y-2">
              <Label>Vista previa</Label>
              <div className="overflow-hidden rounded-md border">
                {form.mediaKind === "video" ? (
                  <video
                    src={mediaPreviewUrl || form.mediaUrl.trim()}
                    controls
                    className="max-h-64 w-full bg-black object-contain"
                  />
                ) : (
                  <img
                    src={mediaPreviewUrl || form.mediaUrl.trim()}
                    alt="Vista previa multimedia"
                    className="max-h-64 w-full object-contain"
                  />
                )}
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="media-kind">Tipo multimedia</Label>
              <Select
                value={form.mediaKind}
                onValueChange={(value) => setForm((prev) => ({ ...prev, mediaKind: value as "image" | "video" }))}
              >
                <SelectTrigger id="media-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagen</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="sticky bottom-0 -mx-6 mt-4 flex items-center justify-between border-t bg-card/90 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/75">
            <p className="text-xs text-muted-foreground">
              {formHasUnsavedChanges ? "Cambios sin guardar" : "Sin cambios pendientes"}
            </p>
            <Button disabled={saving} onClick={() => void handleCreateOrUpdate()}>
              {saving ? "Guardando..." : editingPostId ? "Actualizar" : "Publicar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Historial</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="published">Publicados</SelectItem>
              <SelectItem value="pending_approval">Pendientes</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <EmptyState
              title="Cargando publicaciones"
              description="Estamos preparando el historial para que puedas seguir moderando sin perder contexto."
            />
          ) : null}
          {!loading && loadError ? (
            <EmptyState
              type="error"
              title="No se pudo cargar el historial"
              description={loadError}
              actionLabel="Reintentar"
              onAction={() => void loadPosts()}
            />
          ) : null}
          {!loading && !loadError && filteredPosts.length === 0 ? (
            <EmptyState
              title={posts.length === 0 ? "Aún no hay publicaciones" : "Sin resultados para este filtro"}
              description={
                posts.length === 0
                  ? "Publica el primer contenido para activar el canal social de la escuela."
                  : "Ajusta el estado para recuperar publicaciones rápidamente."
              }
              actionLabel={posts.length === 0 ? "Crear publicación" : "Ver todas"}
              onAction={posts.length === 0 ? () => {
                setEditingPostId(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              } : () => setStatusFilter("all")}
            />
          ) : null}
          {filteredPosts.map((post) => (
            <div key={post.id} className="rounded-md border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{post.authorName}</p>
                <Badge variant={statusColor[post.approvalStatus || "published"] || "outline"}>
                  {post.approvalStatus || "published"}
                </Badge>
                <Badge variant="outline">{post.type}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{post.content}</p>
              {(post.mediaItems[0]?.url || post.videoUrl || post.imageUrls[0]) ? (
                <div className="overflow-hidden rounded-md border">
                  {(post.mediaItems[0]?.kind === "video" || (!post.mediaItems[0] && post.videoUrl)) ? (
                    <video
                      src={post.mediaItems[0]?.url ?? post.videoUrl ?? ""}
                      controls
                      className="max-h-64 w-full bg-black object-contain"
                    />
                  ) : (
                    <img
                      src={post.mediaItems[0]?.url ?? post.imageUrls[0] ?? ""}
                      alt="Media de la publicación"
                      className="max-h-64 w-full object-contain"
                      loading="lazy"
                    />
                  )}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(post)}>Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDeleteWithUndo(post)}>
                  Eliminar
                </Button>
                {post.approvalStatus === "pending_approval" ? (
                  <>
                    <Button size="sm" onClick={() => void handleApprovePost(post.id)}>
                      Aprobar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void handleRejectPost(post.id)}>
                      Rechazar
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
