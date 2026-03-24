import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPortalMediaFromUrl, createTeacherPortalPost, type PortalFeedType, uploadPortalMediaFile } from "@/lib/api/portalFoundation";
import { toast } from "sonner";

export default function TeacherCreatePostScreen() {
  const [type, setType] = useState<PortalFeedType>("class");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mediaKind, setMediaKind] = useState<"image" | "video">("image");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

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
    setMediaKind(file.type.startsWith("video/") ? "video" : "image");
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("El contenido es obligatorio");
      return;
    }

    setSaving(true);
    try {
      let mediaIds: string[] = [];
      if (mediaFile) {
        const uploaded = await uploadPortalMediaFile({
          file: mediaFile,
          kind: mediaKind,
          isPublic: true,
        });
        mediaIds = [uploaded.id];
      } else if (imageUrl.trim()) {
        const uploaded = await createPortalMediaFromUrl({
          url: imageUrl.trim(),
          kind: mediaKind,
          isPublic: true,
        });
        mediaIds = [uploaded.id];
      }

      const created = await createTeacherPortalPost({
        type,
        content: content.trim(),
        mediaIds,
        requiresApproval: true,
        isPublic: true,
      });

      const status = typeof created.approval_status === "string" ? created.approval_status : "pending_approval";
      toast.success(`Publicacion enviada. Estado: ${status}`);
      setContent("");
      setImageUrl("");
      setMediaFile(null);
      if (mediaPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
      setMediaPreviewUrl("");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo enviar la publicacion");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-2">
        <Link to="/portal/app/profile" className="rounded-full border border-border p-2 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Nueva publicacion docente</h1>
          <p className="text-xs text-muted-foreground">Se enviara a revision de la escuela</p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="teacher-post-type">Tipo</Label>
          <Select value={type} onValueChange={(value) => setType(value as PortalFeedType)}>
            <SelectTrigger id="teacher-post-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="class">Clase</SelectItem>
              <SelectItem value="event">Evento</SelectItem>
              <SelectItem value="achievement">Logro</SelectItem>
              <SelectItem value="announcement">Anuncio</SelectItem>
              <SelectItem value="choreography">Coreografia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teacher-post-content">Contenido</Label>
          <Textarea id="teacher-post-content" rows={6} value={content} onChange={(event) => setContent(event.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="teacher-post-image">Imagen (opcional)</Label>
          <Input id="teacher-post-image" placeholder="https://..." value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          <p className="text-xs text-muted-foreground">Si adjuntas archivo, se prioriza sobre la URL.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teacher-post-file">Archivo multimedia (opcional)</Label>
          <Input
            id="teacher-post-file"
            type="file"
            accept="image/*,video/*"
            onChange={(event) => handleMediaFileChange(event.target.files?.[0] ?? null)}
          />
        </div>

        {(mediaPreviewUrl || imageUrl.trim()) ? (
          <div className="space-y-2">
            <Label>Vista previa</Label>
            <div className="overflow-hidden rounded-md border">
              {mediaKind === "video" ? (
                <video
                  src={mediaPreviewUrl || imageUrl.trim()}
                  controls
                  className="max-h-64 w-full bg-black object-contain"
                />
              ) : (
                <img
                  src={mediaPreviewUrl || imageUrl.trim()}
                  alt="Vista previa multimedia"
                  className="max-h-64 w-full object-contain"
                />
              )}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="teacher-post-kind">Tipo multimedia</Label>
          <Select value={mediaKind} onValueChange={(value) => setMediaKind(value as "image" | "video")}>
            <SelectTrigger id="teacher-post-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Imagen</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? "Enviando..." : "Enviar a aprobacion"}
        </Button>
      </div>
    </div>
  );
}
