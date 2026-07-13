import { Link } from "react-router-dom";
import { useVerticalConfig } from "@/lib/vertical/context";

export function LandingFooter() {
  const { productName } = useVerticalConfig();
  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/nexa_graphics/icon_big_trans.PNG" alt={productName} className="h-7 w-7 object-contain" />
            <span className="text-sm font-medium text-foreground">{productName}</span>
          </div>

          <nav className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <a href="mailto:nexa@kaizenith.es" className="hover:text-foreground">Contacto</a>
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
