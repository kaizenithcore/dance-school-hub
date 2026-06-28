/**
 * PortalLoginPage — login/signup for students accessing Nexa Club.
 * Separate from the school admin auth (/auth/*).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, ArrowRight, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Introduce tu email"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/portal/app`,
          shouldCreateUser: false, // Only allow existing users
        },
      });
      if (error) {
        // If user doesn't exist, show a friendly message
        if (error.message.toLowerCase().includes("user") || error.status === 422) {
          toast.error("No encontramos una cuenta con ese email. Pide a tu escuela que te envíe una invitación.");
          return;
        }
        throw error;
      }
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar el enlace. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Music className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold text-foreground">
          Nexa <span className="font-normal text-muted-foreground">Club</span>
        </span>
      </div>

      <div className="w-full max-w-sm space-y-6">
        {sent ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <Mail className="h-7 w-7 text-success" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Revisa tu email</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Te hemos enviado un enlace de acceso directo a <strong>{email}</strong>.
                Haz clic en él para entrar a tu portal.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">¿No lo encuentras? Revisa la carpeta de spam.</p>
            <Button variant="ghost" size="sm" onClick={() => setSent(false)}>
              Usar otro email
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm space-y-5">
            <div>
              <p className="text-xl font-bold text-foreground">Accede a tu portal</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Introduce tu email y te enviamos un enlace de acceso directo. Sin contraseña.
              </p>
            </div>

            <form onSubmit={(e) => void handleSendLink(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoFocus
                  autoComplete="email"
                  className="h-10"
                />
              </div>
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Enviar enlace de acceso <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                ¿No tienes acceso? Pide a tu academia que te envíe una invitación.
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          ¿Eres una academia?{" "}
          <Link to="/auth/login" className="underline hover:text-foreground">
            Accede al panel de gestión
          </Link>
        </p>
      </div>
    </div>
  );
}
