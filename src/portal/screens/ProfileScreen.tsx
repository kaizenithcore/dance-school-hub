/**
 * ProfileScreen V1 — operational profile.
 *
 * Shows:
 *   - Display name + enrolled class names
 *   - Dance styles + level
 *   - Links to Payments and Preferences
 *   - Sign out
 *
 * Removed for V1:
 *   - Followers / following (social)
 *   - XP / achievements / streaks (gamification)
 *   - Certifications (exams discontinued)
 *   - Public/private profile toggle (not relevant without community)
 *   - All mock data usage
 */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard, Settings, LogOut, ChevronRight,
  User, Loader2, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getOwnPortalProfile, type PortalProfile } from "@/lib/api/portalFoundation";
import { getStudentPortalClasses } from "@/lib/api/studentPortal";
import { supabase } from "@/lib/supabase";
import { usePortalBranding } from "@/portal/services/portalBranding";

const DANCE_STYLES = [
  "Ballet", "Contemporáneo", "Jazz", "Hip Hop", "Salsa", "Flamenco",
  "Tango", "Clásica", "Urbana", "Folclórica",
];

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { branding } = usePortalBranding();
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [ownProfile, classData] = await Promise.allSettled([
          getOwnPortalProfile(),
          getStudentPortalClasses(),
        ]);

        if (ownProfile.status === "fulfilled") setProfile(ownProfile.value);
        if (classData.status === "fulfilled") {
          const names = [...new Set(classData.value.classes.map((c) => c.name))];
          setClassNames(names);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      navigate("/portal", { replace: true });
    } catch {
      toast.error("No se pudo cerrar sesión. Inténtalo de nuevo.");
    } finally {
      setSigningOut(false);
    }
  }, [navigate, signingOut]);

  const displayName = profile?.displayName || branding.schoolName || "Mi perfil";
  const styles = profile?.styles ?? [];
  const level = profile?.level ?? "";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-6 pb-4">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-sm"
          style={{ backgroundColor: branding.primaryColor }}
        >
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-foreground truncate">{displayName}</p>
          {level && (
            <p className="text-sm text-muted-foreground">{level}</p>
          )}
          {classNames.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {classNames.slice(0, 2).join(" · ")}
              {classNames.length > 2 ? ` · +${classNames.length - 2}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Dance styles */}
      {styles.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mis estilos
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {styles.map((s) => (
              <span
                key={s}
                className="rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${branding.primaryColor}18`,
                  color: branding.primaryColor,
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        <ProfileAction
          icon={CreditCard}
          label="Mis cobros"
          description="Pagos, facturas y recibos"
          onClick={() => navigate("/portal/app/cobros")}
        />
        <ProfileAction
          icon={Settings}
          label="Preferencias"
          description="Tema, privacidad y datos"
          onClick={() => navigate("/portal/app/preferencias")}
        />
      </div>

      {/* Sign out */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50 disabled:opacity-50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin text-destructive" />
            ) : (
              <LogOut className="h-4 w-4 text-destructive" />
            )}
          </div>
          <span className="flex-1 text-sm font-medium text-destructive">
            {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </span>
        </button>
      </div>

      {/* Update profile hint */}
      <p className="text-center text-xs text-muted-foreground">
        Para actualizar tus datos de perfil, contacta con tu escuela.
      </p>
    </div>
  );
}

function ProfileAction({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
