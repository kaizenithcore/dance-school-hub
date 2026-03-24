import { classService } from "@/lib/services/classService";
import { roomService } from "@/lib/services/roomService";
import { teacherService } from "@/lib/services/teacherService";

export interface EventHelpersPayload {
  teachers: Array<{ id: string; name: string }>;
  rooms: Array<{ id: string; name: string }>;
  classes: Array<{
    id: string;
    name: string;
    teacher_id: string | null;
    teacher_ids: string[];
    teacher_name: string | null;
    room_id: string | null;
    room_name: string | null;
  }>;
}

export const eventHelpersService = {
  async getHelpers(tenantId: string): Promise<EventHelpersPayload> {
    const [teachers, rooms, classes] = await Promise.all([
      teacherService.listTeachers(tenantId),
      roomService.listRooms(tenantId),
      classService.listClasses(tenantId),
    ]);

    return {
      teachers: teachers.map((teacher) => ({ id: teacher.id, name: teacher.name })),
      rooms: rooms.map((room) => ({ id: room.id, name: room.name })),
      classes: classes.map((classItem) => ({
        id: classItem.id,
        name: classItem.name,
        teacher_id: classItem.teacher_id,
        teacher_ids: Array.isArray(classItem.teachers) ? classItem.teachers.map((teacher) => teacher.id) : [],
        teacher_name: Array.isArray(classItem.teachers) && classItem.teachers.length > 0 ? classItem.teachers[0].name : null,
        room_id: classItem.room_id,
        room_name: rooms.find((room) => room.id === classItem.room_id)?.name ?? null,
      })),
    };
  },
};