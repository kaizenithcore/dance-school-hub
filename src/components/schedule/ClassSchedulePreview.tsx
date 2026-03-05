import { ClassCard } from "@/components/cards/ClassCard";

const MOCK_CLASSES = [
  { id: "1", name: "Ballet Beginners", teacher: "Ms. Rivera", time: "Mon 9:00–10:30", room: "Studio A", price: 85, spotsLeft: 6, totalSpots: 15, day: "Monday" },
  { id: "2", name: "Contemporary Dance", teacher: "Ms. Lima", time: "Mon 11:00–12:30", room: "Studio B", price: 90, spotsLeft: 3, totalSpots: 12, day: "Monday" },
  { id: "3", name: "Hip Hop Kids", teacher: "Mr. Costa", time: "Tue 15:00–16:00", room: "Studio A", price: 65, spotsLeft: 8, totalSpots: 15, day: "Tuesday" },
  { id: "4", name: "Jazz Fusion", teacher: "Mr. Costa", time: "Wed 18:00–19:30", room: "Studio B", price: 90, spotsLeft: 0, totalSpots: 12, day: "Wednesday" },
  { id: "5", name: "Ballet Advanced", teacher: "Ms. Rivera", time: "Thu 10:00–11:30", room: "Studio A", price: 95, spotsLeft: 4, totalSpots: 15, day: "Thursday" },
  { id: "6", name: "Salsa & Bachata", teacher: "Mr. Reyes", time: "Fri 19:00–20:30", room: "Studio C", price: 80, spotsLeft: 10, totalSpots: 20, day: "Friday" },
];

interface ClassSchedulePreviewProps {
  selectedClassIds: string[];
  onToggleClass: (id: string) => void;
}

export function ClassSchedulePreview({ selectedClassIds, onToggleClass }: ClassSchedulePreviewProps) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_CLASSES.map((cls) => (
          <ClassCard
            key={cls.id}
            {...cls}
            selected={selectedClassIds.includes(cls.id)}
            onSelect={() => onToggleClass(cls.id)}
          />
        ))}
      </div>
    </div>
  );
}
