import {
  LayoutDashboard, Calendar, GraduationCap, Users, BookOpen, ClipboardList,
  CreditCard, BarChart3, Settings, ChevronLeft, Music, Menu, X, DoorOpen, FileEdit, Tags, Megaphone, ListOrdered, Repeat, Copy, Monitor, Award,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { title: "Panel", url: "/admin", icon: LayoutDashboard },
  { title: "Horarios", url: "/admin/schedule", icon: Calendar },
  { title: "Clases", url: "/admin/classes", icon: GraduationCap },
  { title: "Aulas", url: "/admin/rooms", icon: DoorOpen },
  { title: "Profesores", url: "/admin/teachers", icon: BookOpen },
  { title: "Alumnos", url: "/admin/students", icon: Users },
  { title: "Inscripciones", url: "/admin/enrollments", icon: ClipboardList },
  { title: "Formulario de inscripción", url: "/admin/form-builder", icon: FileEdit },
  { title: "Tarifas y Bonos", url: "/admin/pricing", icon: Tags },
  { title: "Pagos", url: "/admin/payments", icon: CreditCard },
  { title: "Comunicación", url: "/admin/communications", icon: Megaphone },
  { title: "Lista de Espera", url: "/admin/waitlist", icon: ListOrdered },
  { title: "Renovaciones", url: "/admin/renewals", icon: Repeat },
  { title: "Duplicar cursos", url: "/admin/course-clone", icon: Copy },
  { title: "Recepción", url: "/admin/reception", icon: Monitor },
  { title: "Analíticas", url: "/admin/analytics", icon: BarChart3 },
  { title: "Configuración", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Mobile: hamburger trigger is in Topbar; this renders the overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button — fixed */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden h-9 w-9"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
        )}

        {/* Sidebar drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[260px] flex flex-col border-r border-border bg-card transition-transform duration-300 md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Music className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold text-foreground">DanceHub</span>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = item.url === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.url);
              return (
                <NavLink
                  key={item.url}
                  to={item.url}
                  end={item.url === "/admin"}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  activeClassName="bg-accent text-accent-foreground"
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>
      </>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex-col border-r border-border bg-card transition-all duration-300 ease-in-out hidden md:flex",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Music className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-base font-semibold text-foreground animate-fade-in">DanceHub</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.url === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/admin"}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                "text-muted-foreground hover:text-foreground hover:bg-accent",
                collapsed && "justify-center px-0"
              )}
              activeClassName="bg-accent text-accent-foreground"
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="animate-fade-in">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </div>
    </aside>
  );
}
