import { Outlet, Link } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function GuidesLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <BookOpen className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold">Nexa - Guias</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Volver a la landing
          </Link>
        </div>
      </header>

      <main className="container max-w-4xl py-10">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="container flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>Guias practicas para equipos administrativos.</p>
          <div className="flex items-center gap-3">
            <Link to="/legal/privacy" className="hover:text-foreground">Privacidad</Link>
            <Link to="/legal/terms" className="hover:text-foreground">Terminos</Link>
            <Link to="/legal/cookies" className="hover:text-foreground">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
