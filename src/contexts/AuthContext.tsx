import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentAuthContext, logout as authLogout } from "@/lib/auth";
import type { AuthContextResponse } from "@/lib/api/auth";

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  authContext: AuthContextResponse | null;
  refreshAuthContext: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [authContext, setAuthContext] = useState<AuthContextResponse | null>(null);

  const refreshAuthContext = async () => {
    setIsLoading(true);
    try {
      const context = await getCurrentAuthContext();
      setAuthContext(context);
    } catch (error) {
      console.error("Failed to refresh auth context:", error);
      setAuthContext(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await authLogout();
    setAuthContext(null);
  };

  useEffect(() => {
    // Initial auth check
    refreshAuthContext();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        await refreshAuthContext();
      } else if (event === "SIGNED_OUT") {
        setAuthContext(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!authContext,
        authContext,
        refreshAuthContext,
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
