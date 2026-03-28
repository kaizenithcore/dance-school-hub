import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentAuthContext, logout as authLogout } from "@/lib/auth";
import type { AuthContextResponse } from "@/lib/api/auth";
import { getAuthContext } from "@/lib/api/auth";
import {
  getSelectedAdminOrganizationId,
  getSelectedAdminTenantId,
  setSelectedAdminOrganizationId,
  setSelectedAdminTenantId,
  syncSelectedAdminContext,
} from "@/lib/adminContextSelection";
import { getSchoolSettings } from "@/lib/api/settings";
import { parseSessionTimeoutMinutes } from "@/lib/security";
import { toast } from "sonner";

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  authContext: AuthContextResponse | null;
  refreshAuthContext: () => Promise<void>;
  setActiveTenant: (tenantId: string) => Promise<void>;
  setActiveOrganization: (organizationId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [authContext, setAuthContext] = useState<AuthContextResponse | null>(null);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(120);
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());

  const loadSecuritySettings = useCallback(async () => {
    try {
      const settings = await getSchoolSettings();
      const security = (settings?.security || {}) as Record<string, unknown>;
      setSessionTimeoutMinutes(parseSessionTimeoutMinutes(security.sessionTimeoutMinutes, 120));
      setLoginAlertsEnabled(security.loginAlerts !== false);
    } catch {
      setSessionTimeoutMinutes(120);
      setLoginAlertsEnabled(true);
    }
  }, []);

  const refreshAuthContext = useCallback(async () => {
    setIsLoading(true);
    try {
      const context = await getCurrentAuthContext();
      setAuthContext(context);
      syncSelectedAdminContext(context);
      if (context) {
        await loadSecuritySettings();
      }
    } catch (error) {
      console.error("Failed to refresh auth context:", error);
      setAuthContext(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadSecuritySettings]);

  const setActiveTenant = useCallback(async (tenantId: string) => {
    setIsLoading(true);
    try {
      setSelectedAdminTenantId(tenantId);
      const contextResult = await getAuthContext({
        tenantId,
        organizationId: getSelectedAdminOrganizationId() ?? undefined,
      });

      if (!contextResult.success || !contextResult.data) {
        throw new Error(contextResult.error?.message || "No se pudo cambiar la escuela activa");
      }

      syncSelectedAdminContext(contextResult.data);
      setAuthContext(contextResult.data);
      await loadSecuritySettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cambiar la escuela activa";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [loadSecuritySettings]);

  const setActiveOrganization = useCallback(async (organizationId: string) => {
    setIsLoading(true);
    try {
      setSelectedAdminOrganizationId(organizationId);
      const contextResult = await getAuthContext({
        organizationId,
        tenantId: getSelectedAdminTenantId() ?? undefined,
      });

      if (!contextResult.success || !contextResult.data) {
        throw new Error(contextResult.error?.message || "No se pudo cambiar la organización activa");
      }

      syncSelectedAdminContext(contextResult.data);
      setAuthContext(contextResult.data);
      await loadSecuritySettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cambiar la organización activa";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [loadSecuritySettings]);

  const handleLogout = async () => {
    await authLogout();
    setAuthContext(null);
  };

  const touchActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!authContext) {
      return;
    }

    const markActivity = () => touchActivity();
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));

    const interval = window.setInterval(() => {
      const timeoutMs = sessionTimeoutMinutes * 60 * 1000;
      const inactiveMs = Date.now() - lastActivityRef.current;
      if (inactiveMs <= timeoutMs) {
        return;
      }

      void (async () => {
        await authLogout();
        setAuthContext(null);
        toast.warning("Sesión cerrada por inactividad");
      })();
    }, 15000);

    return () => {
      window.clearInterval(interval);
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [authContext, sessionTimeoutMinutes, touchActivity]);

  useEffect(() => {
    // Initial auth check
    void refreshAuthContext();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        touchActivity();
        void refreshAuthContext();
        if (loginAlertsEnabled) {
          toast.info("Nuevo inicio de sesión detectado");
        }
      } else if (event === "SIGNED_OUT") {
        setAuthContext(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loginAlertsEnabled, refreshAuthContext, touchActivity]);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!authContext,
        authContext,
        refreshAuthContext,
        setActiveTenant,
        setActiveOrganization,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
