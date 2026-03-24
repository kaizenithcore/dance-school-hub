import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Bookmark, GraduationCap, Megaphone, Camera, Trophy, Video, School } from "lucide-react";
import { MOCK_FEED_POSTS, type FeedPost } from "../data/mockData";
import { cn } from "@/lib/utils";
import { usePortalPersona } from "../services/portalPersona";
import {
  listPersonalizedPortalFeed,
  listPublicPortalFeed,
  listLikedPortalPostIds,
  listSavedPortalItems,
  likePortalPost,
  savePortalItem,
  unlikePortalPost,
  unsavePortalItem,
} from "@/lib/api/portalFoundation";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const filters = ["Todas", "Mi escuela", "Eventos", "Clases", "Destacados"] as const;
const PAGE_SIZE = 20;

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
  choreography: "Coreografia",
};

const typeColor: Record<FeedPost["type"], string> = {
  class: "bg-primary/10 text-primary",
  event: "bg-accent text-accent-foreground",
  achievement: "bg-yellow-500/10 text-yellow-600",
  announcement: "bg-muted text-muted-foreground",
  choreography: "bg-primary/10 text-primary",
};

function mapFeedItems(
  items: Array<{
    id: string;
    type: FeedPost["type"];
    authorName: string;
    authorType: "school" | "teacher";
    authorAvatarUrl: string | null;
    content: string;
    imageUrls: string[];
    videoUrl: string | null;
    likesCount: number;
    publishedAt: string;
  }>,
  savedIds: Set<string>,
  likedIds: Set<string>
): FeedPost[] {
  return items.map((item) => ({
    id: item.id,
    type: item.type,
    authorName: item.authorName,
    authorRole: item.authorType,
    authorAvatar: item.authorAvatarUrl ?? "",
    schoolName: "Dance School",
    text: item.content,
    imageUrl: item.imageUrls[0],
    videoUrl: item.videoUrl ?? undefined,
    date: new Date(item.publishedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" }),
    likes: item.likesCount,
    liked: likedIds.has(item.id),
    saved: savedIds.has(item.id),
  }));
}

export default function FeedScreen() {
  const { persona } = usePortalPersona();
  const [activeFilter, setActiveFilter] = useState("Todas");
  const [posts, setPosts] = useState<FeedPost[]>(MOCK_FEED_POSTS);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    trackPortalEvent({
      eventName: "feed_view",
      category: "engagement",
      metadata: { persona },
    });
  }, [persona]);

  useEffect(() => {
    let cancelled = false;

    const loadInitial = async () => {
      setIsLoading(true);
      setOffset(0);
      setHasMore(true);

      try {
        const [saved, liked, feed] = await Promise.all([
          persona === "prospect"
            ? Promise.resolve({ items: [] as Array<{ itemId: string }> })
            : listSavedPortalItems({ itemType: "post", limit: 200, offset: 0 }),
          persona === "prospect" ? Promise.resolve([] as string[]) : listLikedPortalPostIds(),
          persona === "prospect"
            ? listPublicPortalFeed({ limit: PAGE_SIZE, offset: 0 })
            : listPersonalizedPortalFeed({ limit: PAGE_SIZE, offset: 0 }),
        ]);

        if (cancelled) {
          return;
        }

        const nextSaved = new Set(saved.items.map((item) => item.itemId));
        const nextLiked = new Set(liked);
        const mapped = mapFeedItems(feed.items, nextSaved, nextLiked);

        setSavedIds(nextSaved);
        setLikedIds(nextLiked);
        setPosts(mapped);
        setOffset(mapped.length);
        setHasMore(persona === "prospect" ? false : mapped.length < feed.total);
      } catch {
        if (!cancelled) {
          setPosts(MOCK_FEED_POSTS);
          setSavedIds(new Set(MOCK_FEED_POSTS.filter((item) => item.saved).map((item) => item.id)));
          setLikedIds(new Set(MOCK_FEED_POSTS.filter((item) => item.liked).map((item) => item.id)));
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [persona]);

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) {
          return;
        }

        setIsLoadingMore(true);
        const loadMorePromise = listPersonalizedPortalFeed({ limit: PAGE_SIZE, offset });

        void loadMorePromise
          .then((feed) => {
            const mapped = mapFeedItems(feed.items, savedIds, likedIds);
            setPosts((prev) => {
              const existingIds = new Set(prev.map((item) => item.id));
              const merged = [...prev, ...mapped.filter((item) => !existingIds.has(item.id))];
              return merged;
            });
            setOffset((prev) => prev + mapped.length);
            setHasMore(offset + mapped.length < feed.total);
          })
          .catch(() => {
            setHasMore(false);
          })
          .finally(() => {
            setIsLoadingMore(false);
          });
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore, offset, likedIds, persona, savedIds]);

  const filtered = useMemo(
    () =>
      activeFilter === "Todas"
        ? posts
        : activeFilter === "Destacados"
          ? posts.filter((p) => p.likes > 30)
          : activeFilter === "Mi escuela"
            ? posts.filter((p) => p.authorRole === "school")
            : activeFilter === "Eventos"
              ? posts.filter((p) => p.type === "event")
              : posts.filter((p) => p.type === "class" || p.type === "choreography"),
    [activeFilter, posts]
  );

  if (persona === "prospect") {
    return (
      <div className="px-4 pb-24 pt-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Feed</h1>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Descubre lo que pasa en el mundo de la danza</p>
          <p className="text-xs text-muted-foreground">
            Sigue a escuelas y descubre eventos, clases y logros. Conectate para ver mas.
          </p>
        </div>
        {posts.slice(0, 2).map((post) => (
          <FeedCard key={post.id} post={post} onToggleLike={() => {}} onToggleSave={() => {}} />
        ))}
      </div>
    );
  }

  const toggleLike = (id: string) => {
    const current = posts.find((post) => post.id === id);
    if (!current) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
      )
    );

    const request = current.liked ? unlikePortalPost(id) : likePortalPost(id);
    request
      .then(() => {
        trackPortalEvent({
          eventName: "post_like",
          category: "engagement",
          metadata: { postId: id, action: current.liked ? "unlike" : "like" },
        });
      })
      .catch(() => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, liked: current.liked, likes: current.likes } : p
          )
        );
      });
  };

  const toggleSave = (id: string) => {
    const current = posts.find((post) => post.id === id);
    if (!current) return;

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));

    const request = current.saved ? unsavePortalItem("post", id) : savePortalItem("post", id);
    request
      .then(() => {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (current.saved) next.delete(id);
          else next.add(id);
          return next;
        });

        trackPortalEvent({
          eventName: "post_save",
          category: "adoption",
          metadata: { postId: id, action: current.saved ? "unsave" : "save" },
        });
      })
      .catch(() => {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: current.saved } : p)));
      });
  };

  return (
    <div className="px-4 pb-24 pt-6 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Feed</h1>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition touch-manipulation active:scale-[0.98]",
              activeFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {persona === "community" && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
          Comunidad activa: puedes interactuar con publicaciones y seguir a mas escuelas.
        </div>
      )}

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

      {isLoading ? <p className="text-sm text-muted-foreground">Cargando feed...</p> : null}
      {filtered.length === 0 && !isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No hay publicaciones en esta categoria.</div>
      ) : null}

      <div ref={sentinelRef} className="h-1 w-full" />
      {isLoadingMore ? <p className="text-center text-xs text-muted-foreground">Cargando mas publicaciones...</p> : null}
      {!hasMore && !isLoading && filtered.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">Llegaste al final del feed.</p>
      ) : null}
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

      {(post.videoUrl || post.imageUrl) && (
        <div className="relative aspect-video w-full bg-muted">
          {post.videoUrl ? (
            <video
              src={post.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={post.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}

      <div className="px-4 py-3">
        <p className="text-sm leading-relaxed text-foreground">{post.text}</p>
      </div>

      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5">
        <button
          onClick={onToggleLike}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium transition touch-manipulation active:scale-[0.97]",
            post.liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Heart className={cn("h-4 w-4", post.liked && "fill-current")} />
          {post.likes}
        </button>
        <button
          onClick={onToggleSave}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium transition ml-auto touch-manipulation active:scale-[0.97]",
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
