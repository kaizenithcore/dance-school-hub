/**
 * BottomNav — V1 operational navigation (5 tabs).
 * Replaces the social/community tabs with operational ones.
 */
import { Link, useLocation } from "react-router-dom";
import { Home, CalendarDays, CreditCard, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/portal/app", icon: Home, label: "Inicio", exact: true },
  { to: "/portal/app/clases", icon: CalendarDays, label: "Clases" },
  { to: "/portal/app/cobros", icon: CreditCard, label: "Cobros" },
  { to: "/portal/app/avisos", icon: Bell, label: "Avisos" },
  { to: "/portal/app/perfil", icon: User, label: "Perfil" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  const isActive = (to: string, exact?: boolean) => {
    if (exact || to === "/portal/app") return pathname === to;
    return pathname.startsWith(to);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2 pb-safe">
        {tabs.map(({ to, icon: Icon, label, exact }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "text-primary")}
                strokeWidth={active ? 2.5 : 2}
              />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
