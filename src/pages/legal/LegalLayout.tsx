import { Outlet, Link, useLocation } from "react-router-dom";
import { Music, ArrowLeft } from "lucide-react";

const legalLinks = [
  { to: "/legal/privacy", label: "Política de Privacidad" },
  { to: "/legal/cookies", label: "Política de Cookies" },
  { to: "/legal/terms", label: "Términos de Servicio" },
  { to: "/legal/notice", label: "Aviso Legal" },
];

export default function LegalLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Music className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">DanceHub</span>
          </Link>
          <Link to="/auth/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Volver
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-12">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="container">
          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            {legalLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`hover:text-foreground hover:underline ${location.pathname === link.to ? "text-foreground font-medium" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Desarrollado por{" "}
            <a href="https://kaizenith.es" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Kaizenith
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
