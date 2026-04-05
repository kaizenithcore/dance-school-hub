import { useState, useCallback, useEffect, useRef } from "react";
import { batchSaveSchedules, getSchedules } from "@/lib/api/schedules";
import { getRooms, Room } from "@/lib/api/rooms";
import { getClasses } from "@/lib/api/classes";
import { getTeachers } from "@/lib/api/teachers";

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
  isLocked?: boolean;
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
  weeklyFrequency: number;
  scheduledCount: number;
  remainingToSchedule: number;
  roomId?: string;
  roomName?: string;
}

export interface SchedulePreset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  blocks: Array<{
    classId: string;
    day: string;
    startHour: number;
    duration: number;
    roomId: string;
    isLocked?: boolean;
  }>;
}

const SCHEDULE_PRESETS_STORAGE_KEY = "schedule-editor-presets-v1";
const SCHEDULE_SELECTED_ROOM_STORAGE_KEY = "schedule-editor-selected-room-v1";

function readPresetsFromStorage(): SchedulePreset[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SCHEDULE_PRESETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((preset): preset is SchedulePreset => {
      return Boolean(
        preset
        && typeof preset.id === "string"
        && typeof preset.name === "string"
        && Array.isArray(preset.blocks)
      );
    });
  } catch {
    return [];
  }
}

function writePresetsToStorage(presets: SchedulePreset[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SCHEDULE_PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

function readSelectedRoomFromStorage(): string {
  if (typeof window === "undefined") {
    return "all";
  }

  return window.localStorage.getItem(SCHEDULE_SELECTED_ROOM_STORAGE_KEY) || "all";
}

function writeSelectedRoomToStorage(roomId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SCHEDULE_SELECTED_ROOM_STORAGE_KEY, roomId || "all");
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
  return [block.classId, block.roomId, block.day, block.startHour, block.duration, block.isLocked ? "1" : "0"].join("|");
}

export function useScheduleEditor() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [classCatalog, setClassCatalog] = useState<AvailableScheduleClass[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>(() => readSelectedRoomFromStorage());
  const [loading, setLoading] = useState(true);
  const [deletedPersistedIds, setDeletedPersistedIds] = useState<string[]>([]);
  const [presets, setPresets] = useState<SchedulePreset[]>([]);

  const originalByIdRef = useRef<Record<string, string>>({});
  const effectiveFromByIdRef = useRef<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsData, classesData, schedules, teachersData] = await Promise.all([
        getRooms(),
        getClasses(),
        getSchedules(),
        getTeachers(),
      ]);

      const roomById = new Map(roomsData.map((room) => [room.id, room]));
      const classById = new Map(classesData.map((klass) => [klass.id, klass]));
      const teacherById = new Map(teachersData.map((teacher) => [teacher.id, teacher]));
      const activeRooms = roomsData.filter((room) => {
        const roomMaybeSnake = room as Room & { is_active?: boolean };
        return Boolean(roomMaybeSnake.isActive ?? roomMaybeSnake.is_active);
      });

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
          teacher: (klass?.teacherId ? teacherById.get(klass.teacherId)?.name : undefined) || "Sin profesor",
          day: DAY_BY_WEEKDAY[schedule.weekday] || "Lunes",
          startHour,
          duration: durationHours,
          roomId: schedule.room_id,
          room: schedule.roomName || room?.name || "Sin aula",
          color: COLORS[index % COLORS.length],
          isPersisted: true,
          isLocked: Boolean(schedule.is_locked),
        };
      });

      const mappedClasses: AvailableScheduleClass[] = classesData
        .filter((klass) => klass.status !== "inactive")
        .map((klass) => ({
          id: klass.id,
          name: klass.name,
          teacher: (klass.teacherId ? teacherById.get(klass.teacherId)?.name : undefined) || "Sin profesor",
          capacity: klass.capacity,
          spotsLeft: klass.capacity,
          duration: 1.5,
          weeklyFrequency: Math.max(klass.weeklyFrequency || 1, 1),
          scheduledCount: 0,
          remainingToSchedule: Math.max(klass.weeklyFrequency || 1, 1),
          roomId: klass.roomId || activeRooms[0]?.id,
          roomName: (klass.roomId ? roomById.get(klass.roomId)?.name : activeRooms[0]?.name) || "Sin aula",
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
      setRooms(activeRooms);
      setClassCatalog(mappedClasses);
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

  useEffect(() => {
    if (!selectedRoom) {
      setSelectedRoom("all");
      return;
    }

    const isAll = selectedRoom === "all";
    const roomExists = rooms.some((room) => room.id === selectedRoom);

    if (!isAll && !roomExists) {
      setSelectedRoom("all");
      return;
    }

    writeSelectedRoomToStorage(selectedRoom);
  }, [rooms, selectedRoom]);

  useEffect(() => {
    setPresets(readPresetsFromStorage());
  }, []);

  const filteredBlocks = selectedRoom === "all"
    ? blocks
    : blocks.filter((b) => b.roomId === selectedRoom);

  const availableClasses = classCatalog.map((klass) => {
    const scheduledCount = blocks.filter((block) => block.classId === klass.id).length;
    const weeklyFrequency = Math.max(klass.weeklyFrequency || 1, 1);
    const remainingToSchedule = Math.max(weeklyFrequency - scheduledCount, 0);

    return {
      ...klass,
      weeklyFrequency,
      scheduledCount,
      remainingToSchedule,
    };
  });

  const addBlock = useCallback((block: Omit<ScheduleBlock, "id" | "color">) => {
    setBlocks((prev) => {
      const target = Math.max(classCatalog.find((klass) => klass.id === block.classId)?.weeklyFrequency || 1, 1);
      const current = prev.filter((item) => item.classId === block.classId).length;

      if (current >= target) {
        return prev;
      }

      return [...prev, { ...block, id: `tmp-${Date.now()}`, color: nextColor(), isPersisted: false }];
    });
  }, [classCatalog]);

  const moveBlock = useCallback((blockId: string, day: string, startHour: number) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? (b.isLocked ? b : { ...b, day, startHour }) : b))
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
      if (found?.isLocked) {
        return prev;
      }
      if (found?.isPersisted) {
        setDeletedPersistedIds((ids) => Array.from(new Set([...ids, blockId])));
      }
      return prev.filter((b) => b.id !== blockId);
    });
  }, []);

  const toggleLock = useCallback((blockId: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, isLocked: !b.isLocked } : b))
    );
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
        isLocked: block.isLocked ?? false,
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
        isLocked: block.isLocked ?? false,
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

  const saveCurrentAsPreset = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return null;
    }

    const now = new Date().toISOString();
    const presetId = `preset-${Date.now()}`;
    const preset: SchedulePreset = {
      id: presetId,
      name: trimmedName,
      createdAt: now,
      updatedAt: now,
      blocks: blocks.map((block) => ({
        classId: block.classId,
        day: block.day,
        startHour: block.startHour,
        duration: block.duration,
        roomId: block.roomId,
        isLocked: block.isLocked ?? false,
      })),
    };

    const nextPresets = [preset, ...presets];
    setPresets(nextPresets);
    writePresetsToStorage(nextPresets);
    return preset;
  }, [blocks, presets]);

  const applyPreset = useCallback((presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) {
      return false;
    }

    const classById = new Map(classCatalog.map((klass) => [klass.id, klass]));
    const roomById = new Map(rooms.map((room) => [room.id, room]));

    const nextBlocks: ScheduleBlock[] = preset.blocks
      .map((item) => {
        const classInfo = classById.get(item.classId);
        const room = roomById.get(item.roomId);

        if (!classInfo) {
          return null;
        }

        return {
          id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          classId: item.classId,
          name: classInfo.name,
          teacher: classInfo.teacher,
          day: item.day,
          startHour: item.startHour,
          duration: item.duration,
          roomId: item.roomId,
          room: room?.name || classInfo.roomName || "Sin aula",
          color: nextColor(),
          isPersisted: false,
          isLocked: item.isLocked ?? false,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null) as ScheduleBlock[];

    const persistedIds = blocks.filter((block) => block.isPersisted).map((block) => block.id);
    setDeletedPersistedIds((prev) => Array.from(new Set([...prev, ...persistedIds])));
    setBlocks(nextBlocks);
    return true;
  }, [blocks, classCatalog, presets, rooms]);

  const deletePreset = useCallback((presetId: string) => {
    const nextPresets = presets.filter((preset) => preset.id !== presetId);
    setPresets(nextPresets);
    writePresetsToStorage(nextPresets);
  }, [presets]);

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
    toggleLock,
    hasConflict,
    saveChanges,
    presets,
    saveCurrentAsPreset,
    applyPreset,
    deletePreset,
  };
}
