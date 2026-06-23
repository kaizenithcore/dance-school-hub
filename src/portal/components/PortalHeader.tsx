/**
 * PortalHeader — branded header for the student portal.
 *
 * Shows school logo (if set) + school name on the left.
 * Shows a profile avatar + notification badge on the right.
 * Uses branding colors via CSS variables applied by PortalBrandingProvider.
 */
import { useNavigate } from "react-router-dom";
import { Bell, User } from "lucide-react";
import { usePortalBranding } from "@/portal/services/portalBranding";

interface PortalHeaderProps {
  unreadNotifications?: number;
}

export function PortalHeader({ unreadNotifications = 0 }: PortalHeaderProps) {
  const navigate = useNavigate();
  const { branding, isLoading } = usePortalBranding();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        {/* School identity */}
        <button
          type="button"
          className="flex items-center gap-2.5 min-w-0"
          onClick={() => navigate("/portal/app")}
          aria-label="Ir al inicio"
        >
          {!isLoading && branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.schoolName}
              className="h-8 w-8 rounded-lg object-cover shrink-0 shadow-sm"
            />
          ) : (
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {branding.schoolName
                ? branding.schoolName.slice(0, 1).toUpperCase()
                : "N"}
            </div>
          )}
          <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
            {branding.schoolName || "Mi escuela"}
          </span>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notifications bell */}
          <button
            type="button"
            onClick={() => navigate("/portal/app/avisos")}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Ver avisos"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => navigate("/portal/app/perfil")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            aria-label="Mi perfil"
          >
            <User className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
