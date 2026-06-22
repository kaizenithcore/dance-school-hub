import {
  LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardList,
  CreditCard, Settings, ChevronLeft, Music, Menu, X, DoorOpen, FileEdit, Tags,
  Megaphone, ListOrdered, Repeat, Building2, Wallet, ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBillingEntitlements } from "@/hooks/useBillingEntitlements";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { isModuleVisible } from "@/lib/moduleLifecyclePolicy";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeatureKey = "waitlistAutomation" | "renewalAutomation" | "massCommunicationEmail";

type SubNavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  featureKey?: FeatureKey;
  module?: string;
};

type SimpleNavItem = {
  type: "simple";
  key: string;
  title: string;
  icon: LucideIcon;
  url: string;
  module?: string;
  exact?: boolean;
};

type GroupNavItem = {
  type: "group";
  key: string;
  title: string;
  icon: LucideIcon;
  items: SubNavItem[];
};

type NavEntry = SimpleNavItem | GroupNavItem;

// ─── Navigation definition ────────────────────────────────────────────────────

const NAV_ENTRIES: NavEntry[] = [
  {
    type: "simple",
    key: "inicio",
    title: "Inicio",
    icon: LayoutDashboard,
    url: "/admin",
    module: "dashboard",
    exact: true,
  },
  {
    type: "group",
    key: "alumnos",
    title: "Alumnos",
    icon: Users,
    items: [
      { title: "Todos los alumnos", url: "/admin/students", icon: Users, module: "students" },
      { title: "Inscripciones", url: "/admin/enrollments", icon: ClipboardList, module: "enrollments" },
      { title: "Lista de espera", url: "/admin/waitlist", icon: ListOrdered, featureKey: "waitlistAutomation", module: "waitlist" },
      { title: "Formulario de matrícula", url: "/admin/form-builder", icon: FileEdit, module: "form-builder" },
    ],
  },
  {
    type: "group",
    key: "clases",
    title: "Clases",
    icon: GraduationCap,
    items: [
      { title: "Clases y horarios", url: "/admin/classes", icon: GraduationCap, module: "classes" },
      { title: "Profesores", url: "/admin/teachers", icon: BookOpen, module: "teachers" },
      { title: "Aulas", url: "/admin/rooms", icon: DoorOpen, module: "rooms" },
    ],
  },
  {
    type: "group",
    key: "cobros",
    title: "Cobros",
    icon: CreditCard,
    items: [
      { title: "Pagos", url: "/admin/payments", icon: CreditCard, module: "payments" },
      { title: "Economía", url: "/admin/economia", icon: Wallet, module: "economia" },
      { title: "Tarifas", url: "/admin/pricing", icon: Tags, module: "pricing" },
    ],
  },
  {
    type: "group",
    key: "comunicaciones",
    title: "Comunicaciones",
    icon: Megaphone,
    items: [
      { title: "Renovaciones", url: "/admin/renewals", icon: Repeat, featureKey: "renewalAutomation", module: "renewals" },
      { title: "Campañas de email", url: "/admin/communications", icon: Megaphone, featureKey: "massCommunicationEmail", module: "communications" },
    ],
  },
  {
    type: "simple",
    key: "portal",
    title: "Portal del alumno",
    icon: Building2,
    url: "/admin/school/portal",
    module: "school-portal",
  },
  {
    type: "simple",
    key: "configuracion",
    title: "Configuración",
    icon: Settings,
    url: "/admin/settings",
    module: "settings",
    // Note: /admin/settings redirects to /admin/settings/escuela
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPANDED_GROUPS_KEY = "nexa:admin:sidebar:expanded-groups:v1";

const legalLinks = [
  { label: "Privacidad", to: "/legal/privacy" },
  { label: "Terminos", to: "/legal/terms" },
  { label: "Cookies", to: "/legal/cookies" },
  { label: "Aviso legal", to: "/legal/notice" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readExpandedGroups(): Set<string> {
  try {
    const raw = window.localStorage.getItem(EXPANDED_GROUPS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistExpandedGroups(groups: Set<string>) {
  window.localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify(Array.from(groups)));
}

function getActiveGroupKey(pathname: string): string | null {
  for (const entry of NAV_ENTRIES) {
    if (entry.type === "group") {
      const isActive = entry.items.some((item) => pathname.startsWith(item.url));
      if (isActive) return entry.key;
    }
  }
  return null;
}

// ─── PRO badge ────────────────────────────────────────────────────────────────

function ProBadge() {
  return (
    <span className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary">
      PRO
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminSidebar() {
  const { billing, loading } = useBillingEntitlements();
  const { canView } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(readExpandedGroups);
  const location = useLocation();
  const isMobile = useIsMobile();

  // Auto-expand the group that contains the current route
  useEffect(() => {
    const activeKey = getActiveGroupKey(location.pathname);
    if (activeKey) {
      setExpandedGroups((prev) => {
        if (prev.has(activeKey)) return prev;
        const next = new Set(prev);
        next.add(activeKey);
        persistExpandedGroups(next);
        return next;
      });
    }
  }, [location.pathname]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      persistExpandedGroups(next);
      return next;
    });
  }, []);

  const isItemGated = useCallback((featureKey?: FeatureKey): boolean => {
    if (!featureKey || loading) return false;
    return !billing.features[featureKey];
  }, [billing.features, loading]);

  const canShowItem = useCallback((item: SubNavItem): boolean => {
    if (!isModuleVisible(item.module)) return false;
    if (item.module && !canView(item.module)) return false;
    return true;
  }, [canView]);

  const canShowSimple = useCallback((entry: SimpleNavItem): boolean => {
    if (!isModuleVisible(entry.module)) return false;
    if (entry.module && !canView(entry.module)) return false;
    return true;
  }, [canView]);

  const isGroupActive = useCallback((entry: GroupNavItem): boolean => {
    return entry.items.some((item) => location.pathname.startsWith(item.url));
  }, [location.pathname]);

  // ── Nav content (shared between mobile and desktop) ─────────────────────────

  function renderNavContent(isCollapsedView: boolean) {
    return (
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ENTRIES.map((entry) => {
          if (entry.type === "simple") {
            if (!canShowSimple(entry)) return null;
            return (
              <NavLink
                key={entry.key}
                to={entry.url}
                end={entry.exact}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  isCollapsedView && "justify-center px-2"
                )}
                activeClassName="bg-accent text-accent-foreground"
                title={isCollapsedView ? entry.title : undefined}
              >
                <entry.icon className="h-[18px] w-[18px] shrink-0" />
                {!isCollapsedView && <span>{entry.title}</span>}
              </NavLink>
            );
          }

          // Group
          const visibleItems = entry.items.filter(canShowItem);
          if (visibleItems.length === 0) return null;

          const isExpanded = expandedGroups.has(entry.key);
          const isActive = isGroupActive(entry);

          if (isCollapsedView) {
            // Collapsed: show group icon, clicking expands sidebar + group
            return (
              <button
                key={entry.key}
                type="button"
                title={entry.title}
                onClick={() => {
                  setCollapsed(false);
                  setExpandedGroups((prev) => {
                    const next = new Set(prev);
                    next.add(entry.key);
                    persistExpandedGroups(next);
                    return next;
                  });
                }}
                className={cn(
                  "w-full flex justify-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-150",
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <entry.icon className="h-[18px] w-[18px] shrink-0" />
              </button>
            );
          }

          return (
            <div key={entry.key}>
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleGroup(entry.key)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  isActive && !isExpanded && "text-foreground"
                )}
              >
                <entry.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1 text-left">{entry.title}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {/* Sub-items */}
              {isExpanded && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-border space-y-0.5 pb-1">
                  {visibleItems.map((item) => {
                    const gated = isItemGated(item.featureKey);
                    return (
                      <NavLink
                        key={item.url}
                        to={item.url}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all duration-150",
                          "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-[16px] w-[16px] shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {gated && <ProBadge />}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  }

  // ── Footer (legal + kaizenith) ───────────────────────────────────────────────

  function renderFooter(isCollapsedView: boolean) {
    if (!isCollapsedView) {
      return (
        <div className="px-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <HoverCard openDelay={120} closeDelay={120}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 uppercase tracking-wide hover:bg-accent hover:text-foreground"
                aria-label="Ver enlaces legales"
              >
                Legal
              </button>
            </HoverCardTrigger>
            <HoverCardContent align="start" className="w-44 p-2">
              <div className="flex flex-col">
                {legalLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </HoverCardContent>
          </HoverCard>
          <a href="https://kaizenith.es" target="_blank" rel="noreferrer" className="hover:text-foreground">
            kaizenith
          </a>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center">
        <HoverCard openDelay={120} closeDelay={120}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              title="Legal"
              className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Ver enlaces legales"
            >
              LG
            </button>
          </HoverCardTrigger>
          <HoverCardContent align="end" className="w-40 p-2">
            <div className="flex flex-col">
              {legalLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden h-9 w-9"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-[260px] flex flex-col border-r border-border bg-card transition-transform duration-300 md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Music className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-base font-semibold text-foreground">Nexa</span>
              <p className="text-[11px] text-muted-foreground">Menos gestión. Más control.</p>
            </div>
          </div>

          {renderNavContent(false)}

          <div className="border-t border-border px-4 py-3 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 uppercase tracking-wide hover:bg-accent hover:text-foreground"
                    aria-label="Abrir enlaces legales"
                  >
                    Legal
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {legalLinks.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to}>{item.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <a href="https://kaizenith.es" target="_blank" rel="noreferrer" className="hover:text-foreground">
                kaizenith
              </a>
            </div>
          </div>
        </aside>
      </>
    );
  }

  // ── Desktop ─────────────────────────────────────────────────────────────────

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex-col border-r border-border bg-card transition-all duration-300 ease-in-out hidden md:flex",
        collapsed ? "w-[64px]" : "w-[256px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Music className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <span className="text-base font-semibold text-foreground">Nexa</span>
            <p className="text-[11px] text-muted-foreground truncate">El sistema que tu academia se merece</p>
          </div>
        )}
      </div>

      {/* Nav */}
      {renderNavContent(collapsed)}

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 space-y-2 shrink-0">
        {renderFooter(collapsed)}
        <div className="flex items-center justify-between">
          <ThemeToggle size="sm" />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
          </button>
        </div>
      </div>
    </aside>
  );
}
