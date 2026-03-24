import { useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default function PostsManagementScreen() {
  const [posts, setPosts] = useState<PortalFeedPost[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  const filteredPosts = useMemo(
    () => posts.filter((item) => statusFilter === "all" || item.approvalStatus === statusFilter),
    [posts, statusFilter]
  );

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await listSchoolPortalPosts({ limit: 100 });
      setPosts(data.items);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar las publicaciones");
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
        toast.success("Publicacion actualizada");
      } else {
        await createSchoolPortalPost({
          authorType: "school",
          authorName: form.authorName.trim(),
          type: form.type,
          content: form.content.trim(),
          mediaIds,
          isPublic: true,
        });
        toast.success("Publicacion creada");
      }

      resetForm();
      await loadPosts();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo guardar la publicacion");
    } finally {
      setSaving(false);
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
      title="Gestion de Publicaciones"
      description="Crea, edita y modera publicaciones de escuela y profesores"
      actions={
        editingPostId ? (
          <Button variant="outline" onClick={resetForm}>Cancelar edicion</Button>
        ) : null
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{editingPostId ? "Editar publicacion" : "Nueva publicacion"}</CardTitle>
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
                  <SelectItem value="choreography">Coreografia</SelectItem>
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
          <Button disabled={saving} onClick={() => void handleCreateOrUpdate()}>
            {saving ? "Guardando..." : editingPostId ? "Actualizar" : "Publicar"}
          </Button>
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
          {loading ? <p className="text-sm text-muted-foreground">Cargando publicaciones...</p> : null}
          {!loading && filteredPosts.length === 0 ? <p className="text-sm text-muted-foreground">Sin publicaciones.</p> : null}
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
                      alt="Media de la publicacion"
                      className="max-h-64 w-full object-contain"
                      loading="lazy"
                    />
                  )}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(post)}>Editar</Button>
                <Button size="sm" variant="destructive" onClick={() => void deleteSchoolPortalPost(post.id).then(loadPosts).catch(() => toast.error("No se pudo eliminar"))}>
                  Eliminar
                </Button>
                {post.approvalStatus === "pending_approval" ? (
                  <>
                    <Button size="sm" onClick={() => void approveTeacherPortalPost(post.id).then(loadPosts).catch(() => toast.error("No se pudo aprobar"))}>
                      Aprobar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void rejectTeacherPortalPost(post.id, "Revisar formato").then(loadPosts).catch(() => toast.error("No se pudo rechazar"))}>
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
