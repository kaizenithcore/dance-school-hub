import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Newspaper, CalendarDays, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/portal/app", icon: Home, label: "Inicio" },
  { to: "/portal/app/classes", icon: BookOpen, label: "Clases" },
  { to: "/portal/app/feed", icon: Newspaper, label: "Feed" },
  { to: "/portal/app/events", icon: CalendarDays, label: "Eventos" },
  { to: "/portal/app/profile", icon: User, label: "Perfil" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  const isActive = (to: string) => {
    if (to === "/portal/app") return pathname === "/portal/app";
    return pathname.startsWith(to);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
