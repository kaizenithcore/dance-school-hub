/**
 * PortalAppShell — V1 production shell with school branding.
 *
 * Wraps all portal routes with:
 *   - PortalBrandingProvider (loads school colors/logo, applies CSS vars)
 *   - PortalHeader (branded top bar with school logo/name + notification badge)
 *   - OfflineGuard banner
 *   - BottomNav (5 operational tabs)
 */
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { PortalHeader } from "../components/PortalHeader";
import { PortalBrandingProvider } from "../services/portalBranding";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { listPortalNotifications } from "@/lib/api/portalFoundation";

function PortalShellInner() {
  const isOnline = useOnlineStatus();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const items = await listPortalNotifications({ onlyUnread: true, limit: 20 });
        const arr = items as { isRead?: boolean }[];
        const unread = arr.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      } catch {
        // Non-fatal
      }
    })();
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <PortalHeader unreadNotifications={unreadCount} />

      {!isOnline && (
        <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-[11px] text-warning">
          Estás en modo sin conexión. Mostrando datos recientes en caché.
        </div>
      )}

      <div className="pb-20">
        <Outlet />
      </div>

      <BottomNav />
    </div>
  );
}

export default function PortalAppShell() {
  return (
    <PortalBrandingProvider>
      <PortalShellInner />
    </PortalBrandingProvider>
  );
}
