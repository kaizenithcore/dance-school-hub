import { Outlet } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { PortalPersonaProvider, usePortalPersona } from "../services/portalPersona";
import { cn } from "@/lib/utils";

export default function PortalAppShell() {
  return (
    <PortalPersonaProvider>
      <div className="mx-auto min-h-screen max-w-lg bg-background">
        <PersonaSwitcher />
        <Outlet />
        <BottomNav />
      </div>
    </PortalPersonaProvider>
  );
}

function PersonaSwitcher() {
  const { persona, setPersona, options } = usePortalPersona();

  return (
    <div className="sticky top-0 z-40 border-b border-border bg-background/95 px-3 py-2 backdrop-blur">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Demo conceptual · tipo de usuario
      </p>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setPersona(option.id)}
            className={cn(
              "rounded-md px-2 py-1.5 text-[11px] font-medium transition",
              persona === option.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            title={option.description}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
