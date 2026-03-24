import { useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createSchoolGalleryAlbum,
  listPhotosByAlbum,
  listSchoolGalleryAlbums,
  type PortalGalleryAlbum,
  type PortalGalleryPhoto,
  uploadSchoolGalleryPhoto,
} from "@/lib/api/portalFoundation";
import { toast } from "sonner";

export default function GalleryManagementScreen() {
  const [albums, setAlbums] = useState<PortalGalleryAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [photos, setPhotos] = useState<PortalGalleryPhoto[]>([]);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const selectedAlbum = useMemo(
    () => albums.find((item) => item.id === selectedAlbumId) ?? null,
    [albums, selectedAlbumId]
  );

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSchoolGalleryAlbums();
      setAlbums(data);
      if (!selectedAlbumId && data.length > 0) {
        setSelectedAlbumId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar los albumes");
    } finally {
      setLoading(false);
    }
  }, [selectedAlbumId]);

  const loadPhotos = useCallback(async (albumId: string) => {
    try {
      const data = await listPhotosByAlbum(albumId, { limit: 120 });
      setPhotos(data.items);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar las fotos del album");
    }
  }, []);

  useEffect(() => {
    void loadAlbums();
  }, [loadAlbums]);

  useEffect(() => {
    if (selectedAlbumId) {
      void loadPhotos(selectedAlbumId);
    } else {
      setPhotos([]);
    }
  }, [selectedAlbumId, loadPhotos]);

  const handleCreateAlbum = async () => {
    if (!albumName.trim()) {
      toast.error("Nombre de album obligatorio");
      return;
    }

    try {
      const created = await createSchoolGalleryAlbum({
        name: albumName.trim(),
        description: albumDescription.trim() || null,
        isPublic: true,
      });
      setAlbumName("");
      setAlbumDescription("");
      setSelectedAlbumId(created.id);
      toast.success("Album creado");
      await loadAlbums();
    } catch (error) {
      console.error(error);
      toast.error("No se pudo crear el album");
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedAlbumId) {
      toast.error("Selecciona un album");
      return;
    }

    if (!photoUrl.trim()) {
      toast.error("URL de imagen obligatoria");
      return;
    }

    setUploading(true);
    try {
      await uploadSchoolGalleryPhoto({
        albumId: selectedAlbumId,
        imageUrl: photoUrl.trim(),
        caption: photoCaption.trim() || null,
      });
      setPhotoUrl("");
      setPhotoCaption("");
      toast.success("Foto subida");
      await loadPhotos(selectedAlbumId);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageContainer
      title="Fotogaleria"
      description="Organiza albumes y fotos publicas de la escuela"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crear album</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="album-name">Nombre</Label>
              <Input id="album-name" value={albumName} onChange={(event) => setAlbumName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="album-description">Descripcion</Label>
              <Textarea id="album-description" rows={3} value={albumDescription} onChange={(event) => setAlbumDescription(event.target.value)} />
            </div>
            <Button onClick={() => void handleCreateAlbum()}>Crear album</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subir foto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Album seleccionado: {selectedAlbum?.name || "Ninguno"}</p>
            <div className="space-y-2">
              <Label htmlFor="photo-url">URL de imagen</Label>
              <Input id="photo-url" placeholder="https://..." value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo-caption">Pie de foto</Label>
              <Input id="photo-caption" value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} />
            </div>
            <Button disabled={uploading} onClick={() => void handleUploadPhoto()}>
              {uploading ? "Subiendo..." : "Subir"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Albumes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? <p className="text-sm text-muted-foreground">Cargando albumes...</p> : null}
          {!loading && albums.length === 0 ? <p className="text-sm text-muted-foreground">No hay albumes creados.</p> : null}
          {albums.map((album) => (
            <button
              type="button"
              key={album.id}
              className={`w-full rounded-md border p-3 text-left ${selectedAlbumId === album.id ? "border-primary" : ""}`}
              onClick={() => setSelectedAlbumId(album.id)}
            >
              <p className="font-medium">{album.name}</p>
              <p className="text-xs text-muted-foreground">{album.description || "Sin descripcion"}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos del album</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.length === 0 ? <p className="text-sm text-muted-foreground">No hay fotos en este album.</p> : null}
          {photos.map((photo) => (
            <div key={photo.id} className="rounded-md border overflow-hidden">
              <img src={photo.imageUrl} alt={photo.caption || "Foto"} className="h-40 w-full object-cover" />
              <div className="p-2">
                <p className="text-xs text-muted-foreground">{photo.caption || "Sin pie"}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
