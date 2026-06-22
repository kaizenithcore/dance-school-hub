import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Building2, Clock, CreditCard, Bell, ShieldCheck, Monitor, Globe, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SettingsNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const PRIMARY_NAV: SettingsNavItem[] = [
  { to: "/admin/settings/escuela", label: "Escuela", icon: Building2 },
  { to: "/admin/settings/agenda", label: "Agenda", icon: Clock },
  { to: "/admin/settings/cobros", label: "Cobros", icon: CreditCard },
  { to: "/admin/settings/avisos", label: "Avisos", icon: Bell },
  { to: "/admin/settings/acceso", label: "Acceso", icon: ShieldCheck },
  { to: "/admin/settings/plan", label: "Plan y facturación", icon: Sparkles },
];

const SECONDARY_NAV: SettingsNavItem[] = [
  { to: "/admin/settings/recepcion", label: "Recepción", icon: Monitor },
  { to: "/admin/settings/pagina-web", label: "Página web", icon: Globe },
];

function NavItem({ item }: { item: SettingsNavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </NavLink>
  );
}

export default function SettingsLayout() {
  const location = useLocation();

  return (
    <div className="flex gap-0 min-h-full">
      {/* ── Secondary sidebar — desktop ── */}
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border pr-2 py-1 mr-6">
        <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Configuración
        </p>
        <nav className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
        <div className="my-3 border-t border-border" />
        <nav className="space-y-0.5">
          {SECONDARY_NAV.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
      </aside>

      {/* ── Horizontal nav — mobile ── */}
      <div className="md:hidden w-full mb-4">
        <nav className="flex gap-1 overflow-x-auto pb-2 border-b border-border">
          {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors shrink-0",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
