import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import {
  getOwnPortalProfile,
  listPortalFollowers,
  listPortalFollowing,
  type PortalFollowerItem,
} from "@/lib/api/portalFoundation";

export default function ConnectionsScreen() {
  const [followers, setFollowers] = useState<PortalFollowerItem[]>([]);
  const [following, setFollowing] = useState<PortalFollowerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const ownProfile = await getOwnPortalProfile();
        const [followerList, followingList] = await Promise.all([
          listPortalFollowers(ownProfile.id),
          listPortalFollowing(ownProfile.id),
        ]);

        if (cancelled) return;

        setFollowers(followerList);
        setFollowing(followingList);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar tus conexiones");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 pb-24 pt-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Comunidad</h1>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Cargando conexiones...</div>
      ) : null}

      {!isLoading ? (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Seguidores ({followers.length})</h2>
            <div className="space-y-2">
              {followers.map((item) => (
                <ProfileRow
                  key={`${item.profile?.id || "unknown"}-${item.createdAt}`}
                  name={item.profile?.displayName || "Usuario"}
                  subtitle={item.profile?.city || "Sin ciudad"}
                />
              ))}
              {followers.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aun no tienes seguidores.</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Siguiendo ({following.length})</h2>
            <div className="space-y-2">
              {following.map((item) => (
                <ProfileRow
                  key={`${item.profile?.id || "unknown"}-${item.createdAt}`}
                  name={item.profile?.displayName || "Usuario"}
                  subtitle={item.profile?.city || "Sin ciudad"}
                />
              ))}
              {following.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aun no sigues a nadie.</p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ProfileRow({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
      <div className="rounded-full bg-primary/10 p-2 text-primary">
        <Users className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
