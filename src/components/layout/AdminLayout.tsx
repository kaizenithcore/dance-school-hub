import { useEffect, useRef, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { Topbar } from "./Topbar";
import { motion } from "framer-motion";
import { AnimatedPage } from "@/components/ui/animated";

const LOGIN_WELCOME_KEY = "dancehub:welcome-overlay-until";
const LOGIN_WELCOME_DURATION_MS = 2000;
const ROUTE_TRANSITION_BLOCK_MS = 260;

export function AdminLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const [displayedPathname, setDisplayedPathname] = useState(location.pathname);
  const [displayedOutlet, setDisplayedOutlet] = useState(outlet);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(LOGIN_WELCOME_KEY);
    if (!raw) {
      return;
    }

    const until = Number(raw);
    window.sessionStorage.removeItem(LOGIN_WELCOME_KEY);

    if (!Number.isFinite(until)) {
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, until - now);

    if (remaining === 0) {
      return;
    }

    setShowWelcomeOverlay(true);
    const timer = window.setTimeout(() => setShowWelcomeOverlay(false), Math.min(remaining, LOGIN_WELCOME_DURATION_MS));
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (location.pathname === displayedPathname) {
      return;
    }

    setIsRouteTransitioning(true);
    const timer = window.setTimeout(() => {
      setDisplayedPathname(location.pathname);
      setDisplayedOutlet(outlet);
      setIsRouteTransitioning(false);
    }, ROUTE_TRANSITION_BLOCK_MS);

    return () => window.clearTimeout(timer);
  }, [displayedPathname, location.pathname, outlet]);

  useEffect(() => {
    firstRenderRef.current = false;
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="relative flex-1 overflow-hidden p-4 md:p-6">
          <AnimatedPage key={displayedPathname} animateOnMount={!firstRenderRef.current}>
            {displayedOutlet}
          </AnimatedPage>

          {isRouteTransitioning ? (
            <motion.div
              key={`route-transition-${location.pathname}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ROUTE_TRANSITION_BLOCK_MS / 1000, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 z-30 bg-background/90 backdrop-blur-[1px]"
            />
          ) : null}

          {showWelcomeOverlay ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-40 flex items-center justify-center bg-background/95"
            >
              <div className="rounded-xl border border-border bg-card px-6 py-5 shadow-medium">
                <p className="text-base font-semibold text-foreground">Bienvenido a DanceHub</p>
                <p className="mt-1 text-sm text-muted-foreground">Preparando tus datos...</p>
              </div>
            </motion.div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
