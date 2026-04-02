import { useEffect, useRef, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { createSchoolAnnouncement, listSchoolAnnouncements, type PortalSchoolAnnouncement } from "@/lib/api/portalFoundation";
import { toast } from "sonner";
import { runWithSaveFeedback } from "@/lib/saveFeedback";
import { toastErrorOnce } from "@/lib/toastPremium";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

export default function AnnouncementsScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [notifyAll, setNotifyAll] = useState(true);
  const [announcements, setAnnouncements] = useState<PortalSchoolAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasUnsavedChanges = Boolean(title.trim() || content.trim() || isImportant || isUrgent || !notifyAll);

  useUnsavedChangesGuard({
    enabled: hasUnsavedChanges && !saving,
    message: "Tienes cambios sin guardar en Anuncios. Si sales ahora, se perderán. ¿Quieres continuar?",
  });

  const loadAnnouncements = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listSchoolAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error(error);
      const message = "No se pudieron cargar los anuncios";
      setLoadError(message);
      toastErrorOnce("announcements-load", message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  const handleCreate = async () => {
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) {
      nextErrors.title = "El título es obligatorio";
    }
    if (!content.trim()) {
      nextErrors.content = "El contenido es obligatorio";
    }
    if (content.trim().length > 0 && content.trim().length < 12) {
      nextErrors.content = "El contenido debe tener al menos 12 caracteres";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      toast.error("Revisa los campos marcados para publicar el anuncio");
      return;
    }

    setFieldErrors({});

    setSaving(true);
    try {
      await runWithSaveFeedback(
        {
          loading: "Publicando anuncio...",
          success: "Anuncio publicado",
          error: "No se pudo publicar el anuncio",
          successDescription: "Ya está disponible en el historial y en el portal de alumnos.",
          errorHint: "Revisa el contenido y vuelve a intentarlo.",
        },
        async () => {
          await createSchoolAnnouncement({
            title: title.trim(),
            content: content.trim(),
            isImportant,
            isUrgent,
            notifyAll,
          });
        }
      );

      setTitle("");
      setContent("");
      setIsImportant(false);
      setIsUrgent(false);
      await loadAnnouncements();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title="Anuncios"
      description="Publica comunicaciones internas y urgentes para alumnos"
    >
      <Card>
        <CardHeader>
          <CardTitle>Nuevo anuncio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="announcement-title">Título</Label>
            <Input
              id="announcement-title"
              ref={titleInputRef}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (fieldErrors.title) {
                  setFieldErrors((prev) => {
                    const { title: _title, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              aria-invalid={Boolean(fieldErrors.title)}
            />
            {fieldErrors.title ? <p className="mt-1 text-xs text-destructive">{fieldErrors.title}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-content">Contenido</Label>
            <Textarea
              id="announcement-content"
              rows={4}
              value={content}
              onChange={(event) => {
                setContent(event.target.value);
                if (fieldErrors.content) {
                  setFieldErrors((prev) => {
                    const { content: _content, ...rest } = prev;
                    return rest;
                  });
                }
              }}
              aria-invalid={Boolean(fieldErrors.content)}
            />
            {fieldErrors.content ? <p className="mt-1 text-xs text-destructive">{fieldErrors.content}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm">Importante</span>
              <Switch checked={isImportant} onCheckedChange={setIsImportant} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm">Urgente</span>
              <Switch checked={isUrgent} onCheckedChange={setIsUrgent} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm">Notificar a todos</span>
              <Switch checked={notifyAll} onCheckedChange={setNotifyAll} />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-6 mt-4 flex items-center justify-between border-t bg-card/90 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/75">
            <p className="text-xs text-muted-foreground">
              {hasUnsavedChanges ? "Cambios sin guardar" : "Sin cambios pendientes"}
            </p>
            <Button disabled={saving} onClick={() => void handleCreate()}>{saving ? "Publicando..." : "Publicar anuncio"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de anuncios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <EmptyState
              title="Cargando anuncios"
              description="Estamos preparando el historial para que puedas publicar con contexto."
            />
          ) : null}
          {!loading && loadError ? (
            <EmptyState
              type="error"
              title="No se pudo cargar el historial"
              description={loadError}
              actionLabel="Reintentar"
              onAction={() => void loadAnnouncements()}
            />
          ) : null}
          {!loading && announcements.length === 0 ? (
            <EmptyState
              title="Aún no hay anuncios"
              description="Publica el primero para informar novedades, avisos importantes o cambios urgentes."
              actionLabel="Redactar anuncio"
              onAction={() => titleInputRef.current?.focus()}
            />
          ) : null}
          {announcements.map((item) => (
            <div key={item.id} className="rounded-md border p-3">
              <p className="font-medium">{item.announcementTitle || "Anuncio"}</p>
              <p className="text-sm text-muted-foreground mt-1">{item.content}</p>
              <p className="text-xs text-muted-foreground mt-2">{new Date(item.publishedAt).toLocaleString("es-ES")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
