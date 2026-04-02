import { useContext, useEffect } from "react";
import { UNSAFE_NavigationContext as NavigationContext } from "react-router-dom";

interface UnsavedChangesGuardOptions {
  enabled: boolean;
  message?: string;
}

const DEFAULT_MESSAGE = "Tienes cambios sin guardar. Si sales ahora, se perderán. ¿Quieres continuar?";

export function useUnsavedChangesGuard({ enabled, message = DEFAULT_MESSAGE }: UnsavedChangesGuardOptions) {
  const navigationContext = useContext(NavigationContext);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabled) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const navigator = navigationContext.navigator as {
      block?: (blocker: (tx: { retry: () => void }) => void) => () => void;
    };

    if (typeof navigator.block !== "function") {
      return;
    }

    const unblock = navigator.block((tx) => {
      const confirmLeave = window.confirm(message);
      if (!confirmLeave) {
        return;
      }

      unblock();
      tx.retry();
    });

    return unblock;
  }, [enabled, message, navigationContext]);
}
