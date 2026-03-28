import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <span className="text-xs font-bold text-primary-foreground">D</span>
            </div>
            <span className="text-sm font-medium text-foreground">DanceHub</span>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <a href="mailto:hola@dancehub.es" className="hover:text-foreground">Contacto</a>
            <span>·</span>
            <Link to="/legal/privacy" className="hover:text-foreground">Privacidad</Link>
            <span>·</span>
            <Link to="/legal/terms" className="hover:text-foreground">Términos</Link>
            <span>·</span>
            <Link to="/legal/cookies" className="hover:text-foreground">Cookies</Link>
          </nav>
        </div>
        <p className="mt-4 text-center sm:text-left text-xs text-muted-foreground">
          © {new Date().getFullYear()} Desarrollado por{" "}
          <a href="https://kaizenith.es" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Kaizenith
          </a>
          . Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
