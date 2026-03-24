import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { listStudentAnnouncements, type PortalFeedPost } from "@/lib/api/portalFoundation";

export function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<PortalFeedPost[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listStudentAnnouncements();
        if (!cancelled) {
          setAnnouncements(data.slice(0, 3));
        }
      } catch {
        if (!cancelled) {
          setAnnouncements([]);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Anuncios</p>
      </div>
      {announcements.map((item) => (
        <div key={item.id} className="rounded-md bg-muted/60 px-2.5 py-2">
          <p className="text-xs font-medium text-foreground line-clamp-1">{item.content.split("\n")[0]}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{item.content}</p>
        </div>
      ))}
    </div>
  );
}
