import { cn } from "@/lib/utils";
import type { PortalAchievement } from "../data/mockData";

interface Props {
  achievement: PortalAchievement;
  size?: "sm" | "md";
}

export function AchievementBadge({ achievement, size = "md" }: Props) {
  const earned = achievement.earned;
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 text-center",
        size === "sm" ? "w-16" : "w-20"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-2 transition-all",
          size === "sm" ? "h-12 w-12 text-xl" : "h-16 w-16 text-2xl",
          earned
            ? "border-primary bg-accent shadow-md"
            : "border-border bg-muted opacity-40 grayscale"
        )}
      >
        {achievement.icon}
      </div>
      <span
        className={cn(
          "leading-tight font-medium",
          size === "sm" ? "text-[10px]" : "text-xs",
          !earned && "text-muted-foreground"
        )}
      >
        {achievement.name}
      </span>
    </div>
  );
}
