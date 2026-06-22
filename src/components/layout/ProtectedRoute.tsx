import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  module: string;
  fallback?: "redirect" | "message";
}

/**
 * Wraps a route to check if current user has access to a module
 * Based on RBAC MODULE_PERMISSIONS
 */
export function ProtectedRoute({ children, module, fallback = "message" }: ProtectedRouteProps) {
  const { canView } = usePermissions();

  if (!canView(module)) {
    if (fallback === "redirect") {
      return <Navigate to="/admin" replace />;
    }

    // Show access denied message
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <div>
                <CardTitle>Acceso denegado</CardTitle>
                <CardDescription>No tienes permisos para acceder a este módulo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tu rol actual no tiene acceso a esta funcionalidad. Si crees que esto es un error, contacta al administrador.
            </p>
            <Button asChild className="w-full">
              <a href="/admin">Volver al dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
