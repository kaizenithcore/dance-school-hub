import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock, Rocket } from "lucide-react";

interface UpgradeFeatureAlertProps {
  title: string;
  description: string;
  ctaLabel?: string;
  onUpgrade: () => void;
}

export function UpgradeFeatureAlert({ title, description, ctaLabel = "Mejorar plan", onUpgrade }: UpgradeFeatureAlertProps) {
  return (
    <Alert className="border-primary/25 bg-primary/5">
      <Lock className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{description}</span>
        <Button size="sm" onClick={onUpgrade}>
          <Rocket className="mr-1 h-4 w-4" />
          {ctaLabel}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
