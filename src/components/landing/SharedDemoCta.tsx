import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackPortalEvent } from "@/lib/portalTelemetry";

type DemoCtaSection = "hero" | "launch_offer" | "modernization_pack" | "final_cta";

interface SharedDemoCtaProps {
  section: DemoCtaSection;
  subject?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  className?: string;
}

export function SharedDemoCta({
  section,
  subject = "Solicitar demo DanceHub",
  label = "Ver demo",
  variant = "outline",
  className,
}: SharedDemoCtaProps) {
  const href = `mailto:hola@dancehub.es?subject=${encodeURIComponent(subject)}`;

  const handleClick = () => {
    trackPortalEvent({
      eventName: "click_cta_secondary",
      category: "funnel",
      metadata: {
        section,
        ctaLabel: label,
        destination: href,
      },
    });
  };

  return (
    <Button size="lg" variant={variant} className={className} asChild>
      <a href={href} onClick={handleClick}>
        <Play className="mr-1 h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}
