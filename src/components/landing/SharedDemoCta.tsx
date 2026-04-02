import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackPortalEvent } from "@/lib/portalTelemetry";
import { Link } from "react-router-dom";
import { activateDemoAdminSession, DEMO_ADMIN_SLUG } from "@/lib/demoAdmin";

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
  subject = "Demo + prueba gratis Pro anual",
  label = "Ver demo + prueba gratis",
  variant = "outline",
  className,
}: SharedDemoCtaProps) {
  const href = `/admin?demo=${DEMO_ADMIN_SLUG}`;

  const handleClick = () => {
    activateDemoAdminSession(DEMO_ADMIN_SLUG);
    trackPortalEvent({
      eventName: "click_cta_secondary",
      category: "funnel",
      metadata: {
        section,
        ctaLabel: label,
        destination: href,
        subject,
      },
    });
  };

  return (
    <Button size="lg" variant={variant} className={className} asChild>
      <Link to={href} onClick={handleClick}>
        <Play className="mr-1 h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
