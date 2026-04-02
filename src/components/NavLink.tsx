import { NavLink as RouterNavLink, NavLinkProps, useLocation, type To } from "react-router-dom";
import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const FORM_BUILDER_UNSAVED_KEY = "nexa:form-builder:unsaved";
const FORM_BUILDER_SAVE_REQUEST_EVENT = "nexa:form-builder:request-save";
const FORM_BUILDER_SAVE_RESULT_EVENT = "nexa:form-builder:save-result";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingTarget, setPendingTarget] = useState<To | null>(null);
    const [processingSave, setProcessingSave] = useState(false);

    const getTargetPathname = (target: To): string => {
      if (typeof target === "string") {
        return target;
      }

      return target.pathname || "";
    };

    const continueNavigation = (target: To) => {
      window.localStorage.removeItem(FORM_BUILDER_UNSAVED_KEY);
      setDialogOpen(false);
      setPendingTarget(null);
      navigate(target);
    };

    const requestFormBuilderSave = async (): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const timeout = window.setTimeout(() => {
          window.removeEventListener(FORM_BUILDER_SAVE_RESULT_EVENT, onResult as EventListener);
          resolve(false);
        }, 8000);

        const onResult = (event: Event) => {
          window.clearTimeout(timeout);
          const customEvent = event as CustomEvent<{ success?: boolean }>;
          resolve(Boolean(customEvent.detail?.success));
        };

        window.addEventListener(FORM_BUILDER_SAVE_RESULT_EVENT, onResult as EventListener, { once: true });
        window.dispatchEvent(new CustomEvent(FORM_BUILDER_SAVE_REQUEST_EVENT));
      });
    };

    const handleClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      const targetPath = getTargetPathname(to);
      const isChangingRoute = targetPath && targetPath !== location.pathname;
      const hasUnsavedFormBuilderChanges = window.localStorage.getItem(FORM_BUILDER_UNSAVED_KEY) === "1";

      if (isChangingRoute && hasUnsavedFormBuilderChanges) {
        event.preventDefault();
        setPendingTarget(to);
        setDialogOpen(true);
        return;
      }

      props.onClick?.(event);
    };

    return (
      <>
        <RouterNavLink
          ref={ref}
          to={to}
          onClick={handleClick}
          className={({ isActive, isPending }) =>
            cn(className, isActive && activeClassName, isPending && pendingClassName)
          }
          {...props}
        />

        <Dialog open={dialogOpen} onOpenChange={(open) => !processingSave && setDialogOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambios sin guardar</DialogTitle>
              <DialogDescription>
                Tienes cambios sin guardar en el Form Builder. Antes de salir puedes guardarlos o descartarlos.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={processingSave}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!pendingTarget) {
                    setDialogOpen(false);
                    return;
                  }
                  continueNavigation(pendingTarget);
                }}
                disabled={processingSave}
              >
                Descartar cambios
              </Button>
              <Button
                onClick={() => {
                  if (!pendingTarget) {
                    setDialogOpen(false);
                    return;
                  }

                  void (async () => {
                    setProcessingSave(true);
                    const saved = await requestFormBuilderSave();
                    setProcessingSave(false);

                    if (!saved) {
                      toast.error("No se pudieron guardar los cambios");
                      return;
                    }

                    continueNavigation(pendingTarget);
                  })();
                }}
                disabled={processingSave}
              >
                {processingSave ? "Guardando..." : "Guardar y salir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
