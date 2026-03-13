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

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-accent/50 via-accent/15 to-transparent" />
        <div className="container grid gap-6 py-10 md:grid-cols-[260px_minmax(0,1fr)] md:py-12">
          <aside className="h-fit rounded-2xl border border-border bg-card/70 p-4 shadow-soft backdrop-blur md:sticky md:top-20">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Documentación
            </p>
            <nav className="space-y-1.5">
              {legalLinks.map((link) => {
                const active = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <section>
            <Outlet />
          </section>
        </div>
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
