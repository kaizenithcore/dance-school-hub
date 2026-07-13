import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nexa_cookie_banner_dismissed";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur px-4 py-3 shadow-lg">
      <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Esta web utiliza únicamente cookies técnicas estrictamente necesarias para mantener tu sesión activa. No usamos cookies publicitarias ni de seguimiento.{" "}
          <Link to="/legal/cookies" className="text-primary underline underline-offset-2 hover:no-underline">
            Política de cookies
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={dismiss} className="h-8 text-xs px-4">
            Entendido
          </Button>
          <button
            onClick={dismiss}
            aria-label="Cerrar"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
