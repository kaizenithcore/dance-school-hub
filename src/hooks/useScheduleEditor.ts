import { useState, useCallback } from "react";

export interface ScheduleBlock {
  id: string;
  classId: string;
  name: string;
  teacher: string;
  day: string;
  startHour: number;
  duration: number; // in hours
  room: string;
  color: string;
}

const COLORS = [
  "hsl(263 70% 58%)",   // primary purple
  "hsl(210 92% 55%)",   // blue
  "hsl(142 71% 45%)",   // green
  "hsl(38 92% 50%)",    // amber
  "hsl(0 84% 60%)",     // red
  "hsl(280 60% 55%)",   // violet
  "hsl(190 80% 45%)",   // teal
  "hsl(330 70% 55%)",   // pink
];

let colorIndex = 0;
function nextColor() {
  const c = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return c;
}

const INITIAL_BLOCKS: ScheduleBlock[] = [
  { id: "b1", classId: "1", name: "Ballet Principiantes", teacher: "Prof. Rivera", day: "Lunes", startHour: 9, duration: 1.5, room: "Sala A", color: COLORS[0] },
  { id: "b2", classId: "2", name: "Danza Contemporánea", teacher: "Prof. Lima", day: "Lunes", startHour: 11, duration: 1.5, room: "Sala B", color: COLORS[1] },
  { id: "b3", classId: "3", name: "Hip Hop Niños", teacher: "Prof. Costa", day: "Martes", startHour: 15, duration: 1, room: "Sala A", color: COLORS[2] },
  { id: "b4", classId: "5", name: "Ballet Avanzado", teacher: "Prof. Rivera", day: "Jueves", startHour: 10, duration: 1.5, room: "Sala A", color: COLORS[3] },
  { id: "b5", classId: "6", name: "Salsa y Bachata", teacher: "Prof. Reyes", day: "Viernes", startHour: 19, duration: 1.5, room: "Sala C", color: COLORS[4] },
  { id: "b6", classId: "10", name: "Danza Moderna", teacher: "Prof. Lima", day: "Miércoles", startHour: 9, duration: 1.5, room: "Sala B", color: COLORS[5] },
  { id: "b7", classId: "7", name: "Tango Intensivo", teacher: "Prof. Morales", day: "Sábado", startHour: 16, duration: 2, room: "Sala A", color: COLORS[6] },
];

export function useScheduleEditor() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(INITIAL_BLOCKS);
  const [selectedRoom, setSelectedRoom] = useState<string>("all");

  const filteredBlocks = selectedRoom === "all"
    ? blocks
    : blocks.filter((b) => b.room === selectedRoom);

  const addBlock = useCallback((block: Omit<ScheduleBlock, "id" | "color">) => {
    setBlocks((prev) => [
      ...prev,
      { ...block, id: `b${Date.now()}`, color: nextColor() },
    ]);
  }, []);

  const moveBlock = useCallback((blockId: string, day: string, startHour: number) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, day, startHour } : b))
    );
  }, []);

  const resizeBlock = useCallback((blockId: string, duration: number) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, duration: Math.max(0.5, duration) } : b))
    );
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }, []);

  const updateBlockRoom = useCallback((blockId: string, room: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, room } : b))
    );
  }, []);

  const hasConflict = useCallback(
    (blockId: string, day: string, startHour: number, duration: number, room: string) => {
      return blocks.some(
        (b) =>
          b.id !== blockId &&
          b.day === day &&
          b.room === room &&
          startHour < b.startHour + b.duration &&
          startHour + duration > b.startHour
      );
    },
    [blocks]
  );

  return {
    blocks,
    filteredBlocks,
    selectedRoom,
    setSelectedRoom,
    addBlock,
    moveBlock,
    resizeBlock,
    removeBlock,
    updateBlockRoom,
    hasConflict,
  };
}
