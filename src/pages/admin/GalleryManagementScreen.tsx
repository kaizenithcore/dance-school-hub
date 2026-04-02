import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createSchoolGalleryAlbum,
  listPhotosByAlbum,
  listSchoolGalleryAlbums,
  type PortalGalleryAlbum,
  type PortalGalleryPhoto,
  uploadSchoolGalleryPhoto,
} from "@/lib/api/portalFoundation";
import { toast } from "sonner";
import { runWithSaveFeedback } from "@/lib/saveFeedback";
import { toastErrorOnce } from "@/lib/toastPremium";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";

export default function GalleryManagementScreen() {
  const [albums, setAlbums] = useState<PortalGalleryAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [photos, setPhotos] = useState<PortalGalleryPhoto[]>([]);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const albumNameInputRef = useRef<HTMLInputElement | null>(null);
  const photoUrlInputRef = useRef<HTMLInputElement | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasUnsavedChanges = Boolean(albumName.trim() || albumDescription.trim() || photoUrl.trim() || photoCaption.trim());

  useUnsavedChangesGuard({
    enabled: hasUnsavedChanges && !uploading,
    message: "Tienes cambios sin guardar en Galería. Si sales ahora, se perderán. ¿Quieres continuar?",
  });

  const selectedAlbum = useMemo(
    () => albums.find((item) => item.id === selectedAlbumId) ?? null,
    [albums, selectedAlbumId]
  );

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listSchoolGalleryAlbums();
      setAlbums(data);
      if (!selectedAlbumId && data.length > 0) {
        setSelectedAlbumId(data[0].id);
      }
    } catch (error) {
      console.error(error);
      const message = "No se pudieron cargar los álbumes";
      setLoadError(message);
      toastErrorOnce("gallery-albums-load", message);
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
      toastErrorOnce("gallery-photos-load", "No se pudieron cargar las fotos del álbum");
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
    const nextErrors: Record<string, string> = {};

    if (!albumName.trim()) {
      nextErrors.albumName = "El nombre del álbum es obligatorio";
    } else if (albumName.trim().length < 3) {
      nextErrors.albumName = "El nombre del álbum debe tener al menos 3 caracteres";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      toast.error("Revisa los datos del álbum antes de guardarlo");
      return;
    }

    setFieldErrors((prev) => {
      const { albumName: _albumName, ...rest } = prev;
      return rest;
    });

    try {
      const created = await runWithSaveFeedback(
        {
          loading: "Creando álbum...",
          success: "Álbum creado",
          error: "No se pudo crear el álbum",
          successDescription: "Ya puedes seleccionarlo y empezar a subir fotos.",
          errorHint: "Comprueba el nombre del álbum e inténtalo de nuevo.",
        },
        async () => {
          return await createSchoolGalleryAlbum({
            name: albumName.trim(),
            description: albumDescription.trim() || null,
            isPublic: true,
          });
        }
      );
      setAlbumName("");
      setAlbumDescription("");
      setSelectedAlbumId(created.id);
      await loadAlbums();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedAlbumId) {
      toast.error("Selecciona un álbum");
      return;
    }

    const nextErrors: Record<string, string> = {};

    if (!photoUrl.trim()) {
      nextErrors.photoUrl = "La URL de imagen es obligatoria";
    } else {
      const isValidUrl = /^https?:\/\//i.test(photoUrl.trim());
      if (!isValidUrl) {
        nextErrors.photoUrl = "La URL debe empezar por http:// o https://";
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
      toast.error("Revisa la URL de la imagen antes de subirla");
      return;
    }

    setFieldErrors((prev) => {
      const { photoUrl: _photoUrl, ...rest } = prev;
      return rest;
    });

    setUploading(true);
    try {
      await runWithSaveFeedback(
        {
          loading: "Subiendo foto...",
          success: "Foto subida",
          error: "No se pudo subir la foto",
          successDescription: "La imagen ya está disponible en el álbum seleccionado.",
          errorHint: "Verifica la URL y prueba nuevamente.",
        },
        async () => {
          await uploadSchoolGalleryPhoto({
            albumId: selectedAlbumId,
            imageUrl: photoUrl.trim(),
            caption: photoCaption.trim() || null,
          });
        }
      );
      setPhotoUrl("");
      setPhotoCaption("");
      await loadPhotos(selectedAlbumId);
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageContainer
      title="Fotogalería"
      description="Organiza álbumes y fotos públicas de la escuela"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crear álbum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="album-name">Nombre</Label>
              <Input
                id="album-name"
                ref={albumNameInputRef}
                value={albumName}
                onChange={(event) => {
                  setAlbumName(event.target.value);
                  if (fieldErrors.albumName) {
                    setFieldErrors((prev) => {
                      const { albumName: _albumName, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                aria-invalid={Boolean(fieldErrors.albumName)}
              />
              {fieldErrors.albumName ? <p className="mt-1 text-xs text-destructive">{fieldErrors.albumName}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="album-description">Descripción</Label>
              <Textarea id="album-description" rows={3} value={albumDescription} onChange={(event) => setAlbumDescription(event.target.value)} />
            </div>
            <div className="sticky bottom-0 -mx-6 mt-3 flex items-center justify-between border-t bg-card/90 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/75">
              <p className="text-xs text-muted-foreground">{albumName.trim() || albumDescription.trim() ? "Listo para guardar" : "Completa los datos del álbum"}</p>
              <Button onClick={() => void handleCreateAlbum()}>Crear álbum</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subir foto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Álbum seleccionado: {selectedAlbum?.name || "Ninguno"}</p>
            <div className="space-y-2">
              <Label htmlFor="photo-url">URL de imagen</Label>
              <Input
                id="photo-url"
                ref={photoUrlInputRef}
                placeholder="https://..."
                value={photoUrl}
                onChange={(event) => {
                  setPhotoUrl(event.target.value);
                  if (fieldErrors.photoUrl) {
                    setFieldErrors((prev) => {
                      const { photoUrl: _photoUrl, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                aria-invalid={Boolean(fieldErrors.photoUrl)}
              />
              {fieldErrors.photoUrl ? <p className="mt-1 text-xs text-destructive">{fieldErrors.photoUrl}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo-caption">Pie de foto</Label>
              <Input id="photo-caption" value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} />
            </div>
            <div className="sticky bottom-0 -mx-6 mt-3 flex items-center justify-between border-t bg-card/90 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/75">
              <p className="text-xs text-muted-foreground">{photoUrl.trim() ? "Imagen lista para subir" : "Pega una URL para habilitar la subida"}</p>
              <Button disabled={uploading} onClick={() => void handleUploadPhoto()}>
                {uploading ? "Subiendo..." : "Subir"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Álbumes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <EmptyState
              title="Cargando álbumes"
              description="Estamos sincronizando tu galería para continuar sin interrupciones."
            />
          ) : null}
          {!loading && loadError ? (
            <EmptyState
              type="error"
              title="No se pudo cargar la galería"
              description={loadError}
              actionLabel="Reintentar"
              onAction={() => void loadAlbums()}
            />
          ) : null}
          {!loading && albums.length === 0 ? (
            <EmptyState
              title="Aún no tienes álbumes"
              description="Crea tu primer álbum para empezar a organizar contenido de clases y eventos."
              actionLabel="Crear primer álbum"
              onAction={() => albumNameInputRef.current?.focus()}
            />
          ) : null}
          {albums.map((album) => (
            <button
              type="button"
              key={album.id}
              className={`w-full rounded-md border p-3 text-left ${selectedAlbumId === album.id ? "border-primary" : ""}`}
              onClick={() => setSelectedAlbumId(album.id)}
            >
              <p className="font-medium">{album.name}</p>
              <p className="text-xs text-muted-foreground">{album.description || "Sin descripción"}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos del álbum</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.length === 0 ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState
                title={selectedAlbum ? "Este álbum aún no tiene fotos" : "Selecciona un álbum"}
                description={
                  selectedAlbum
                    ? "Sube la primera foto para empezar a darle visibilidad al álbum."
                    : "Elige un álbum para revisar o cargar fotos."
                }
                actionLabel={selectedAlbum ? "Subir primera foto" : undefined}
                onAction={selectedAlbum ? () => photoUrlInputRef.current?.focus() : undefined}
              />
            </div>
          ) : null}
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
