import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Bookmark, GraduationCap, Megaphone, Camera, Trophy, Video, School } from "lucide-react";
import { MOCK_FEED_POSTS, type FeedPost } from "../data/mockData";
import { cn } from "@/lib/utils";
import { usePortalPersona } from "../services/portalPersona";

const filters = ["Todas", "Mi escuela", "Eventos", "Clases", "Destacados"] as const;

const typeIcon: Record<FeedPost["type"], React.ReactNode> = {
  class: <Camera className="h-3.5 w-3.5" />,
  event: <Megaphone className="h-3.5 w-3.5" />,
  achievement: <Trophy className="h-3.5 w-3.5" />,
  announcement: <Megaphone className="h-3.5 w-3.5" />,
  choreography: <Video className="h-3.5 w-3.5" />,
};

const typeLabel: Record<FeedPost["type"], string> = {
  class: "Clase / Ensayo",
  event: "Evento",
  achievement: "Logro",
  announcement: "Anuncio",
  choreography: "Coreografía",
};

const typeColor: Record<FeedPost["type"], string> = {
  class: "bg-primary/10 text-primary",
  event: "bg-accent text-accent-foreground",
  achievement: "bg-yellow-500/10 text-yellow-600",
  announcement: "bg-muted text-muted-foreground",
  choreography: "bg-primary/10 text-primary",
};

export default function FeedScreen() {
  const { persona } = usePortalPersona();
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [posts, setPosts] = useState(MOCK_FEED_POSTS);

  if (persona === "prospect") {
    return (
      <div className="px-4 pb-24 pt-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Feed</h1>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Descubre lo que pasa en el mundo de la danza</p>
          <p className="text-xs text-muted-foreground">
            Sigue a escuelas y descubre eventos, clases y logros. Conéctate para ver más.
          </p>
        </div>
        {posts.slice(0, 2).map((post) => (
          <FeedCard key={post.id} post={post} onToggleLike={() => {}} onToggleSave={() => {}} />
        ))}
      </div>
    );
  }

  const filtered = activeFilter === "Todas"
    ? posts
    : activeFilter === "Destacados"
      ? posts.filter((p) => p.likes > 30)
      : activeFilter === "Mi escuela"
        ? posts.filter((p) => p.schoolName === "Estudio Ballet Norte")
        : activeFilter === "Eventos"
          ? posts.filter((p) => p.type === "event")
          : posts.filter((p) => p.type === "class" || p.type === "choreography");

  const toggleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
      )
    );
  };

  const toggleSave = (id: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p))
    );
  };

  return (
    <div className="px-4 pb-24 pt-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Feed</h1>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
              activeFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {persona === "community" && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
          Comunidad activa: puedes interactuar con publicaciones y seguir a más escuelas.
        </div>
      )}

      {/* Feed */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-4">
          {filtered.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              layout
            >
              <FeedCard post={post} onToggleLike={() => toggleLike(post.id)} onToggleSave={() => toggleSave(post.id)} />
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No hay publicaciones en esta categoría.
        </div>
      )}
    </div>
  );
}

function FeedCard({
  post,
  onToggleLike,
  onToggleSave,
}: {
  post: FeedPost;
  onToggleLike: () => void;
  onToggleSave: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Author */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          {post.authorRole === "school" ? (
            <School className="h-4 w-4 text-primary" />
          ) : (
            <GraduationCap className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{post.authorName}</p>
          <p className="text-[11px] text-muted-foreground">{post.schoolName} · {post.date}</p>
        </div>
        <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", typeColor[post.type])}>
          {typeIcon[post.type]}
          {typeLabel[post.type]}
        </span>
      </div>

      {/* Image */}
      {post.imageUrl && (
        <div className="relative aspect-video w-full bg-muted">
          <img
            src={post.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Text */}
      <div className="px-4 py-3">
        <p className="text-sm leading-relaxed text-foreground">{post.text}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5">
        <button
          onClick={onToggleLike}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium transition",
            post.liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("h-4 w-4", post.liked && "fill-current")} />
          {post.likes}
        </button>
        <button
          onClick={onToggleSave}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium transition ml-auto",
            post.saved ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bookmark className={cn("h-4 w-4", post.saved && "fill-current")} />
          {post.saved ? "Guardado" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
