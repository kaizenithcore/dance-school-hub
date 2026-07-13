import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buildRegisterHref } from "@/lib/commercialCatalog";
import { trackPortalEvent } from "@/lib/portalTelemetry";
import { useVerticalConfig } from "@/lib/vertical/context";

const nav = [
  { label: "Funciones", href: "#features" },
  { label: "Precios", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const PRO_ANNUAL_CTA_HREF = buildRegisterHref("landing_header");

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const { productName } = useVerticalConfig();

  const handlePrimaryClick = (placement: "header_desktop" | "header_mobile") => {
    trackPortalEvent({
      eventName: "click_cta_primary",
      category: "funnel",
      metadata: { section: "header", placement, ctaLabel: "Probar gratis", destination: PRO_ANNUAL_CTA_HREF },
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/nexa_graphics/icon_big_trans.PNG" alt={productName} className="h-8 w-8 object-contain" />
          <span className="text-base font-semibold text-foreground">{productName}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {nav.map((n) => (
            <a key={n.label} href={n.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle size="sm" />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth/login">Iniciar sesión</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={PRO_ANNUAL_CTA_HREF} className="rounded-xl" onClick={() => handlePrimaryClick("header_desktop")}>Probar gratis</Link>
          </Button>
        </div>

        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle size="sm" />
          <button className="p-2 text-foreground" onClick={() => setOpen(!open)} aria-label={open ? "Cerrar menú" : "Abrir menú"}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-card px-6 py-4 space-y-3">
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
              <Link to={PRO_ANNUAL_CTA_HREF} onClick={() => handlePrimaryClick("header_mobile")}>Probar gratis</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
