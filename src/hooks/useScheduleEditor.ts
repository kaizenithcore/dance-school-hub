import { useState, useCallback, useEffect, useRef } from "react";
import { batchSaveSchedules, getSchedules } from "@/lib/api/schedules";
import { getRooms, Room } from "@/lib/api/rooms";
import { getClasses } from "@/lib/api/classes";

export interface ScheduleBlock {
  id: string;
  classId: string;
  name: string;
  teacher: string;
  day: string;
  startHour: number;
  duration: number; // in hours
  roomId: string;
  room: string;
  color: string;
  isPersisted?: boolean;
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

const DAY_BY_WEEKDAY: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

const WEEKDAY_BY_DAY: Record<string, number> = {
  Lunes: 1,
  Martes: 2,
  Miércoles: 3,
  Jueves: 4,
  Viernes: 5,
  Sábado: 6,
  Domingo: 7,
};

interface AvailableScheduleClass {
  id: string;
  name: string;
  teacher: string;
  capacity: number;
  spotsLeft: number;
  duration: number;
  roomId?: string;
  roomName?: string;
}

function toTime(decimalHour: number): string {
  const h = Math.floor(decimalHour);
  let m = Math.round((decimalHour - h) * 60);
  let hour = h;
  if (m === 60) {
    hour += 1;
    m = 0;
  }
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function signature(block: ScheduleBlock): string {
  return [block.classId, block.roomId, block.day, block.startHour, block.duration].join("|");
}

export function useScheduleEditor() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [availableClasses, setAvailableClasses] = useState<AvailableScheduleClass[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [deletedPersistedIds, setDeletedPersistedIds] = useState<string[]>([]);

  const originalByIdRef = useRef<Record<string, string>>({});
  const effectiveFromByIdRef = useRef<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsData, classesData, schedules] = await Promise.all([
        getRooms(),
        getClasses(),
        getSchedules(),
      ]);

      const roomById = new Map(roomsData.map((room) => [room.id, room]));
      const classById = new Map(classesData.map((klass) => [klass.id, klass]));

      const mappedBlocks: ScheduleBlock[] = schedules.map((schedule, index) => {
        const [startHour, startMin] = schedule.start_time.split(":").map(Number);
        const [endHour, endMin] = schedule.end_time.split(":").map(Number);
        const durationHours = (endHour - startHour) + ((endMin - startMin) / 60);

        const room = roomById.get(schedule.room_id);
        const klass = classById.get(schedule.class_id);

        return {
          id: schedule.id,
          classId: schedule.class_id,
          name: schedule.className || klass?.name || "Clase",
          teacher: "Profesor",
          day: DAY_BY_WEEKDAY[schedule.weekday] || "Lunes",
          startHour,
          duration: durationHours,
          roomId: schedule.room_id,
          room: schedule.roomName || room?.name || "Sin aula",
          color: COLORS[index % COLORS.length],
          isPersisted: true,
        };
      });

      const mappedClasses: AvailableScheduleClass[] = classesData
        .filter((klass) => klass.status !== "inactive")
        .map((klass) => ({
          id: klass.id,
          name: klass.name,
          teacher: "Profesor",
          capacity: klass.capacity,
          spotsLeft: klass.capacity,
          duration: 1.5,
          roomId: klass.roomId || roomsData[0]?.id,
          roomName: (klass.roomId ? roomById.get(klass.roomId)?.name : roomsData[0]?.name) || "Sin aula",
        }));

      const signatures: Record<string, string> = {};
      const effectiveFrom: Record<string, string> = {};
      mappedBlocks.forEach((block) => {
        signatures[block.id] = signature(block);
      });
      schedules.forEach((schedule) => {
        effectiveFrom[schedule.id] = schedule.effective_from;
      });

      originalByIdRef.current = signatures;
      effectiveFromByIdRef.current = effectiveFrom;
      setDeletedPersistedIds([]);
      setRooms(roomsData.filter((room) => room.isActive));
      setAvailableClasses(mappedClasses);
      setBlocks(mappedBlocks);
    } catch (error) {
      console.error("Error loading schedule editor data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredBlocks = selectedRoom === "all"
    ? blocks
    : blocks.filter((b) => b.roomId === selectedRoom);

  const addBlock = useCallback((block: Omit<ScheduleBlock, "id" | "color">) => {
    setBlocks((prev) => [
      ...prev,
      { ...block, id: `tmp-${Date.now()}`, color: nextColor(), isPersisted: false },
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
    setBlocks((prev) => {
      const found = prev.find((b) => b.id === blockId);
      if (found?.isPersisted) {
        setDeletedPersistedIds((ids) => Array.from(new Set([...ids, blockId])));
      }
      return prev.filter((b) => b.id !== blockId);
    });
  }, []);

  const updateBlockRoom = useCallback((blockId: string, roomId: string, roomName: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, roomId, room: roomName } : b))
    );
  }, []);

  const hasConflict = useCallback(
    (blockId: string, day: string, startHour: number, duration: number, room: string) => {
      return blocks.some(
        (b) =>
          b.id !== blockId &&
          b.day === day &&
          b.roomId === room &&
          startHour < b.startHour + b.duration &&
          startHour + duration > b.startHour
      );
    },
    [blocks]
  );

  const saveChanges = useCallback(async () => {
    const creates = blocks
      .filter((block) => !block.isPersisted)
      .map((block) => ({
        classId: block.classId,
        roomId: block.roomId,
        weekday: WEEKDAY_BY_DAY[block.day] || 1,
        startTime: toTime(block.startHour),
        endTime: toTime(block.startHour + block.duration),
        effectiveFrom: new Date().toISOString().split("T")[0],
        isActive: true,
      }));

    const updates = blocks
      .filter((block) => block.isPersisted)
      .filter((block) => signature(block) !== originalByIdRef.current[block.id])
      .map((block) => ({
        id: block.id,
        classId: block.classId,
        roomId: block.roomId,
        weekday: WEEKDAY_BY_DAY[block.day] || 1,
        startTime: toTime(block.startHour),
        endTime: toTime(block.startHour + block.duration),
        effectiveFrom:
          effectiveFromByIdRef.current[block.id] || new Date().toISOString().split("T")[0],
        isActive: true,
      }));

    const deletes = Array.from(new Set(deletedPersistedIds));

    if (creates.length === 0 && updates.length === 0 && deletes.length === 0) {
      return { saved: false, created: 0, updated: 0, deleted: 0, errors: 0 };
    }

    const result = await batchSaveSchedules({ creates, updates, deletes });

    await loadAll();

    return {
      saved: true,
      created: result.created.length,
      updated: result.updated.length,
      deleted: result.deleted.length,
      errors: result.errors.length,
    };
  }, [blocks, deletedPersistedIds, loadAll]);

  return {
    blocks,
    filteredBlocks,
    rooms,
    availableClasses,
    loading,
    selectedRoom,
    setSelectedRoom,
    addBlock,
    moveBlock,
    resizeBlock,
    removeBlock,
    updateBlockRoom,
    hasConflict,
    saveChanges,
  };
}
