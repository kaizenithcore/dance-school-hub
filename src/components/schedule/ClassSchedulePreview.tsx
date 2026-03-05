import { ClassCard } from "@/components/cards/ClassCard";
import { MOCK_CLASSES } from "@/lib/data/mockClasses";

interface ClassSchedulePreviewProps {
  selectedClassIds: string[];
  onToggleClass: (id: string) => void;
}

export function ClassSchedulePreview({ selectedClassIds, onToggleClass }: ClassSchedulePreviewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MOCK_CLASSES.slice(0, 6).map((cls) => (
        <ClassCard
          key={cls.id}
          {...cls}
          selected={selectedClassIds.includes(cls.id)}
          onSelect={() => onToggleClass(cls.id)}
        />
      ))}
    </div>
  );
}
