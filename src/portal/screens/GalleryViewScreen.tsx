import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { listPhotosByAlbum, listSchoolGalleryAlbums, type PortalGalleryAlbum, type PortalGalleryPhoto } from "@/lib/api/portalFoundation";

export default function GalleryViewScreen() {
  const [albums, setAlbums] = useState<PortalGalleryAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [photos, setPhotos] = useState<PortalGalleryPhoto[]>([]);

  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const data = await listSchoolGalleryAlbums();
        setAlbums(data);
        if (data.length > 0) {
          setSelectedAlbumId(data[0].id);
        }
      } catch {
        setAlbums([]);
      }
    };

    void loadAlbums();
  }, []);

  useEffect(() => {
    if (!selectedAlbumId) {
      setPhotos([]);
      return;
    }

    const loadPhotos = async () => {
      try {
        const data = await listPhotosByAlbum(selectedAlbumId, { limit: 120 });
        setPhotos(data.items);
      } catch {
        setPhotos([]);
      }
    };

    void loadPhotos();
  }, [selectedAlbumId]);

  return (
    <div className="space-y-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-2">
        <Link to="/portal/app/profile" className="rounded-full border border-border p-2 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Galeria</h1>
          <p className="text-xs text-muted-foreground">Recuerdos de eventos y clases</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {albums.map((album) => (
          <button
            key={album.id}
            type="button"
            onClick={() => setSelectedAlbumId(album.id)}
            className={`rounded-full border px-3 py-1.5 text-xs ${selectedAlbumId === album.id ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            {album.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <div key={photo.id} className="rounded-xl overflow-hidden border border-border bg-card">
            <img src={photo.imageUrl} alt={photo.caption || "Foto"} className="h-36 w-full object-cover" loading="lazy" />
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground">{photo.caption || "Sin descripcion"}</p>
          </div>
        ))}
      </div>

      {selectedAlbumId && photos.length === 0 ? <p className="text-sm text-muted-foreground">Este album no tiene fotos.</p> : null}
      {!selectedAlbumId && albums.length === 0 ? <p className="text-sm text-muted-foreground">La escuela aun no publico galeria.</p> : null}
    </div>
  );
}
