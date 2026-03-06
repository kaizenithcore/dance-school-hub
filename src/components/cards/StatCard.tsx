import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  tooltip?: string;
  delay?: number;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, tooltip, delay = 0 }: StatCardProps) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      className="rounded-lg border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-medium"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
      {change && (
        <p
          className={cn(
            "mt-1 text-xs font-medium",
            changeType === "positive" && "text-success",
            changeType === "negative" && "text-destructive",
            changeType === "neutral" && "text-muted-foreground"
          )}
        >
          {change}
        </p>
      )}
    </motion.div>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent><p>{tooltip}</p></TooltipContent>
      </Tooltip>
    );
  }

  return card;
}
