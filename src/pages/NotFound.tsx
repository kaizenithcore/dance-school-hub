import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Compass, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-12%] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-16%] right-[-8%] h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-6 py-14">
        <div className="w-full rounded-2xl border border-border/80 bg-card/85 p-8 text-center shadow-soft backdrop-blur sm:p-10">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Compass className="h-7 w-7" />
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Ruta no disponible</p>
          <h1 className="mt-3 text-6xl font-black leading-none text-foreground sm:text-7xl">404</h1>
          <h2 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">Esta coreografia no existe</h2>

          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            La URL <span className="font-medium text-foreground">{location.pathname}</span> no apunta a una pagina valida.
            Puede que se haya movido, cambiado o que el enlace este incompleto.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Volver al inicio
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to={isAdminRoute ? "/admin" : "/auth/login"}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {isAdminRoute ? "Ir al panel" : "Ir a acceso"}
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Consejo: revisa la URL o vuelve al menu principal para continuar.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
