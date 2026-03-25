import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trackPortalEvent } from "@/lib/portalTelemetry";

const nav = [
  { label: "Solución", href: "#solution" },
  { label: "Modernización", href: "#modernization" },
  { label: "Portal alumno", href: "#student-portal" },
  { label: "Webs", href: "#web-service" },
  { label: "Precios", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  const handlePrimaryClick = (placement: "header_desktop" | "header_mobile") => {
    trackPortalEvent({
      eventName: "click_cta_primary",
      category: "funnel",
      metadata: {
        section: "header",
        placement,
        ctaLabel: "Probar gratis",
        destination: "/auth/register",
      },
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">D</span>
          </div>
          <span className="text-base font-semibold text-foreground">DanceHub</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {nav.map((n) => (
            <a key={n.label} href={n.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth/login">Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth/register" onClick={() => handlePrimaryClick("header_desktop")}>Probar gratis</Link>
          </Button>
        </div>

        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="landing-mobile-menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div id="landing-mobile-menu" className="md:hidden border-t border-border bg-card px-6 py-4 space-y-3">
          {nav.map((n) => (
            <a key={n.label} href={n.href} className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>
              {n.label}
            </a>
          ))}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link to="/auth/login">Iniciar sesión</Link>
            </Button>
            <Button size="sm" className="flex-1" asChild>
              <Link to="/auth/register" onClick={() => handlePrimaryClick("header_mobile")}>Probar gratis</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
