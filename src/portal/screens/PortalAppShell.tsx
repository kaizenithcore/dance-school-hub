/**
 * PortalAppShell — V1 production shell.
 *
 * Removed for V1:
 *   - PortalPersonaProvider / PersonaSwitcher (demo-only)
 *   - Theme toggle (minimal shell)
 *
 * Added for V1:
 *   - Offline banner (non-intrusive)
 *   - Clean header with school name
 */
import { Outlet } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function PortalAppShell() {
  const isOnline = useOnlineStatus();

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      {!isOnline && (
        <div className="sticky top-0 z-40 border-b border-warning/30 bg-warning/10 px-4 py-2 text-[11px] text-warning">
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
