import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { createSchoolAnnouncement, listSchoolAnnouncements, type PortalSchoolAnnouncement } from "@/lib/api/portalFoundation";
import { toast } from "sonner";

export default function AnnouncementsScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [notifyAll, setNotifyAll] = useState(true);
  const [announcements, setAnnouncements] = useState<PortalSchoolAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await listSchoolAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar los anuncios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Titulo y contenido son obligatorios");
      return;
    }

    setSaving(true);
    try {
      await createSchoolAnnouncement({
        title: title.trim(),
        content: content.trim(),
        isImportant,
        isUrgent,
        notifyAll,
      });

      setTitle("");
      setContent("");
      setIsImportant(false);
      setIsUrgent(false);
      toast.success("Anuncio creado");
      await loadAnnouncements();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo crear el anuncio");
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
            <Label htmlFor="announcement-title">Titulo</Label>
            <Input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="announcement-content">Contenido</Label>
            <Textarea id="announcement-content" rows={4} value={content} onChange={(event) => setContent(event.target.value)} />
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

          <Button disabled={saving} onClick={() => void handleCreate()}>{saving ? "Publicando..." : "Publicar anuncio"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de anuncios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Cargando anuncios...</p> : null}
          {!loading && announcements.length === 0 ? <p className="text-sm text-muted-foreground">No hay anuncios publicados.</p> : null}
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
