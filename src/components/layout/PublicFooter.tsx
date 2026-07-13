import { Link } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-card py-10">
      <div className="container">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <img src="/nexa_graphics/icon_big_trans.PNG" alt="Nexa" className="h-7 w-7 object-contain" />
            <span className="text-sm font-medium text-foreground">Nexa</span>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Link to="/legal/privacy" className="hover:text-foreground hover:underline">Privacidad</Link>
            <span>·</span>
            <Link to="/legal/terms" className="hover:text-foreground hover:underline">Términos</Link>
            <span>·</span>
            <Link to="/legal/cookies" className="hover:text-foreground hover:underline">Cookies</Link>
            <span>·</span>
            <Link to="/legal/notice" className="hover:text-foreground hover:underline">Aviso Legal</Link>
          </nav>
        </div>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Desarrollado por{" "}
            <a href="https://kaizenith.es" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Kaizenith</a>. Todos los derechos reservados.
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Funciona con <span className="font-medium text-muted-foreground">Nexa</span> · Sistema inteligente para escuelas
          </p>
        </div>
      </div>
    </footer>
  );
}
