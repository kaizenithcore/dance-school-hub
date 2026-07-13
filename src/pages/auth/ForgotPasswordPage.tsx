import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error("Introduce tu correo electrónico.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      toast.error("Introduce un correo electrónico válido.");
      return;
    }

    if (!isSupabaseConfigured) {
      toast.error("La recuperación no está disponible en este entorno.");
      return;
    }

    setIsLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });

      if (error) {
        toast.error(error.message || "No se pudo enviar el enlace de recuperación.");
        return;
      }

      setSent(true);
      setEmail(normalizedEmail);
    } catch {
      toast.error("No se pudo enviar el enlace de recuperación.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center gap-3">
          <img src="/nexa_graphics/icon_big_trans.PNG" alt="Nexa" className="h-12 w-12 object-contain" />
          <h1 className="text-2xl font-bold text-foreground">Recuperar contraseña</h1>
        </div>

        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <p className="text-center text-sm text-muted-foreground">
                Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" placeholder="tu@escuela.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar enlace
              </Button>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Hemos enviado un enlace de recuperación a <strong className="text-foreground">{email}</strong>. Revisa tu bandeja de entrada.
              </p>
              <Button variant="outline" onClick={() => setSent(false)}>
                Reenviar enlace
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center">
          <Link to="/auth/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-3 w-3" /> Volver al inicio de sesión
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
