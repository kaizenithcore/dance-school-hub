/**
 * OfflineGuard — renders a banner when the user loses network connectivity.
 * Renders null when online; call it in the layout column before the main content.
 */
import { useEffect, useState } from "react";

export function OfflineGuard() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-900 md:px-6">
      Sin conexión. Mostramos los últimos datos disponibles y algunas acciones pueden fallar hasta reconectar.
    </div>
  );
}
