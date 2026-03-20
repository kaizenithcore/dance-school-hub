import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
  BatchScheduleOperation,
  ListSchedulesQuery,
} from "@/lib/validators/scheduleSchemas";

export interface ClassSchedule {
  id: string;
  tenant_id: string;
  class_id: string;
  room_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  recurrence: Record<string, unknown>;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleConflict {
  type: "room" | "teacher";
  conflictingScheduleId: string;
  conflictingClassName: string;
  conflictDescription: string;
}

interface ScheduleQueryResult {
  id: string;
  room_id: string;
  start_time: string;
  end_time: string;
  classes: { name: string; teacher_id: string | null } | null;
}

/**
 * Check for scheduling conflicts
 * - Same room at same time
 * - Same teacher at same time
 */
async function checkConflicts(
  tenantId: string,
  weekday: number,
  startTime: string,
  endTime: string,
  roomId: string,
  classId: string,
  excludeScheduleId?: string
): Promise<ScheduleConflict[]> {
  console.log("[CHECK CONFLICTS] Starting for class:", classId, "in tenant:", tenantId);
  
  const conflicts: ScheduleConflict[] = [];
  const today = new Date().toISOString().split("T")[0];

  // Get the class to find teacher_id
  console.log("[CHECK CONFLICTS] Fetching class data...");
  const { data: classData, error: classError } = await supabaseAdmin
    .from("classes")
    .select("teacher_id, name")
    .eq("id", classId)
    .single();

  console.log("[CHECK CONFLICTS] Class fetch result:", {
    found: !!classData,
    error: classError?.message,
    classId,
    tenantId,
  });

  if (classError || !classData) {
    const errorMsg = `Clase ${classId} no encontrada (Error: ${classError?.message || "No data"})`;
    console.error("[CHECK CONFLICTS]", errorMsg);
    throw new Error(errorMsg);
  }

  let schedulesQuery = supabaseAdmin
    .from("class_schedules")
    .select("id, class_id, room_id, start_time, end_time, classes:class_id(name, teacher_id)")
    .eq("tenant_id", tenantId)
    .eq("weekday", weekday)
    .eq("is_active", true)
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`);

  if (excludeScheduleId) {
    schedulesQuery = schedulesQuery.neq("id", excludeScheduleId);
  }

  const { data: existingSchedules, error: existingSchedulesError } = await schedulesQuery;

  if (existingSchedulesError) {
    throw new Error(`Error checking conflicts: ${existingSchedulesError.message}`);
  }

  const schedulesArray: ScheduleQueryResult[] = Array.isArray(existingSchedules)
    ? (existingSchedules as unknown as ScheduleQueryResult[])
    : [];

  // Check for time conflicts
  for (const schedule of schedulesArray) {
    const existingStart = schedule.start_time;
    const existingEnd = schedule.end_time;

    // Check if times overlap
    const timesOverlap =
      startTime < existingEnd && endTime > existingStart;

    if (!timesOverlap) continue;

    // Check room conflict
    if (schedule.room_id === roomId) {
      conflicts.push({
        type: "room",
        conflictingScheduleId: schedule.id,
        conflictingClassName: schedule.classes?.name || "Desconocida",
        conflictDescription: `Aula ocupada: ${existingStart}-${existingEnd}`,
      });
    }

    // Check teacher conflict
    const existingTeacherId = schedule.classes?.teacher_id;
    if (existingTeacherId && existingTeacherId === classData.teacher_id) {
      conflicts.push({
        type: "teacher",
        conflictingScheduleId: schedule.id,
        conflictingClassName: schedule.classes?.name || "Desconocida",
        conflictDescription: `Profesor ocupado: ${existingStart}-${existingEnd}`,
      });
    }
  }

  return conflicts;
}

export const scheduleService = {
  /**
   * List schedules for a class or room
   */
  async listSchedules(
    tenantId: string,
    query: ListSchedulesQuery
  ): Promise<(ClassSchedule & { className: string; roomName: string })[]> {
    let schedulesQuery = supabaseAdmin
      .from("class_schedules")
      .select(
        `
        *,
        classes:class_id(name),
        rooms:room_id(name)
      `
      )
      .eq("tenant_id", tenantId);

    if (query.classId) {
      schedulesQuery = schedulesQuery.eq("class_id", query.classId);
    }

    if (query.roomId) {
      schedulesQuery = schedulesQuery.eq("room_id", query.roomId);
    }

    if (query.weekday) {
      schedulesQuery = schedulesQuery.eq("weekday", query.weekday);
    }

    if (query.fromDate) {
      schedulesQuery = schedulesQuery.lte("effective_from", query.fromDate);
    }

    if (query.toDate) {
      schedulesQuery = schedulesQuery.gte("effective_to", query.toDate);
    }

    const { data, error } = await schedulesQuery.order("weekday").order("start_time");

    if (error) throw new Error(`Error listing schedules: ${error.message}`);

    return (data || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (schedule: any) => ({
        ...schedule,
        className: (schedule.classes as unknown as { name: string } | null)?.name || "",
        roomName: (schedule.rooms as unknown as { name: string } | null)?.name || "",
      })
    ) as unknown as (ClassSchedule & { className: string; roomName: string })[];
  },

  /**
   * Get a single schedule
   */
  async getSchedule(
    tenantId: string,
    scheduleId: string
  ): Promise<ClassSchedule & { className: string; roomName: string }> {
    const { data, error } = await supabaseAdmin
      .from("class_schedules")
      .select(
        `
        *,
        classes:class_id(name),
        rooms:room_id(name)
      `
      )
      .eq("tenant_id", tenantId)
      .eq("id", scheduleId)
      .single();

    if (error) throw new Error(`Horario no encontrado`);
    if (!data) throw new Error(`Horario no encontrado`);

    return {
      ...data,
      className: data.classes?.name || "",
      roomName: data.rooms?.name || "",
    };
  },

  /**
   * Create a single schedule with conflict checking
   */
  async createSchedule(
    tenantId: string,
    input: CreateScheduleInput
  ): Promise<ClassSchedule> {
    // Check for conflicts
    const conflicts = await checkConflicts(
      tenantId,
      input.weekday,
      input.startTime,
      input.endTime,
      input.roomId,
      input.classId
    );

    if (conflicts.length > 0) {
      throw new Error(
        `Conflicto de horario: ${conflicts.map((c) => c.conflictDescription).join("; ")}`
      );
    }

    const { data, error } = await supabaseAdmin
      .from("class_schedules")
      .insert([
        {
          tenant_id: tenantId,
          class_id: input.classId,
          room_id: input.roomId,
          weekday: input.weekday,
          start_time: input.startTime,
          end_time: input.endTime,
          effective_from: input.effectiveFrom,
          effective_to: input.effectiveTo || null,
          is_active: input.isActive ?? true,
          is_locked: input.isLocked ?? false,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Error creating schedule: ${error.message}`);
    if (!data) throw new Error(`Error creating schedule`);

    return data;
  },

  /**
   * Update a schedule with conflict checking
   */
  async updateSchedule(
    tenantId: string,
    scheduleId: string,
    input: UpdateScheduleInput
  ): Promise<ClassSchedule> {
    // Get current schedule to get complete data
    const current = await this.getSchedule(tenantId, scheduleId);

    // If updating time-sensitive fields, check conflicts
    if (
      input.weekday ||
      input.startTime ||
      input.endTime ||
      input.roomId ||
      input.classId
    ) {
      const conflicts = await checkConflicts(
        tenantId,
        input.weekday ?? current.weekday,
        input.startTime ?? current.start_time,
        input.endTime ?? current.end_time,
        input.roomId ?? current.room_id,
        input.classId ?? current.class_id,
        scheduleId
      );

      if (conflicts.length > 0) {
        throw new Error(
          `Conflicto de horario: ${conflicts.map((c) => c.conflictDescription).join("; ")}`
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (input.classId) updateData.class_id = input.classId;
    if (input.roomId) updateData.room_id = input.roomId;
    if (input.weekday) updateData.weekday = input.weekday;
    if (input.startTime) updateData.start_time = input.startTime;
    if (input.endTime) updateData.end_time = input.endTime;
    if (input.effectiveFrom) updateData.effective_from = input.effectiveFrom;
    if (input.effectiveTo !== undefined) updateData.effective_to = input.effectiveTo;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.isLocked !== undefined) updateData.is_locked = input.isLocked;

    const { data, error } = await supabaseAdmin
      .from("class_schedules")
      .update(updateData)
      .eq("id", scheduleId)
      .eq("tenant_id", tenantId)
      .select()
      .single();

    if (error) throw new Error(`Error updating schedule: ${error.message}`);
    if (!data) throw new Error(`Error updating schedule`);

    return data;
  },

  /**
   * Delete a schedule
   */
  async deleteSchedule(tenantId: string, scheduleId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("class_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("tenant_id", tenantId);

    if (error) throw new Error(`Error deleting schedule: ${error.message}`);
  },

  /**
   * Batch save operation - create, update, delete multiple schedules
   * Validates all operations before executing any
   */
  async saveScheduleBatch(
    tenantId: string,
    operations: BatchScheduleOperation
  ): Promise<{
    created: ClassSchedule[];
    updated: ClassSchedule[];
    deleted: string[];
    errors: { operation: string; error: string }[];
  }> {
    console.log("[SCHEDULE SERVICE] Starting batch save with:", {
      creates: operations.creates.length,
      updates: operations.updates.length,
      deletes: operations.deletes.length,
      tenantId,
    });

    const result = {
      created: [] as ClassSchedule[],
      updated: [] as ClassSchedule[],
      deleted: [] as string[],
      errors: [] as { operation: string; error: string }[],
    };

    // Process creates
    for (const create of operations.creates) {
      try {
        console.log("[SCHEDULE SERVICE] Creating schedule for class:", create.classId);
        const schedule = await this.createSchedule(tenantId, create);
        result.created.push(schedule);
        console.log("[SCHEDULE SERVICE] Schedule created successfully");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Error desconocido";
        console.error("[SCHEDULE SERVICE] Error creating schedule:", errorMsg);
        result.errors.push({
          operation: `create_${create.classId}`,
          error: errorMsg,
        });
      }
    }

    // Process updates
    for (const update of operations.updates) {
      try {
        const { id, ...updateData } = update;
        const schedule = await this.updateSchedule(tenantId, id, updateData);
        result.updated.push(schedule);
      } catch (error) {
        result.errors.push({
          operation: `update_${update.id}`,
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    // Process deletes
    for (const deleteId of operations.deletes) {
      try {
        await this.deleteSchedule(tenantId, deleteId);
        result.deleted.push(deleteId);
      } catch (error) {
        result.errors.push({
          operation: `delete_${deleteId}`,
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    }

    return result;
  },

  /**
   * Get public schedule for a tenant (for calendar display)
   * Only includes active, public schedules
   */
  async getPublicSchedule(
    tenantId: string,
    fromDate?: string,
    toDate?: string
  ): Promise<
    (ClassSchedule & {
      className: string;
      discipline: string;
      roomName: string;
      capacity: number;
      studentCount: number;
      branchName: string;
      branchSlug: string;
      branchAddress?: string;
    })[]
  > {
    const { data: currentOrgLink } = await supabaseAdmin
      .from("organization_tenants")
      .select("organization_id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    let branchRows: Array<{
      tenant_id: string;
      tenants: { name: string; slug: string; is_active?: boolean } | Array<{ name: string; slug: string; is_active?: boolean }> | null;
    }> = [];

    if (currentOrgLink?.organization_id) {
      const { data: linkedRows } = await supabaseAdmin
        .from("organization_tenants")
        .select("tenant_id, tenants(name, slug, is_active)")
        .eq("organization_id", currentOrgLink.organization_id)
        .order("display_order", { ascending: true });

      branchRows = (linkedRows as typeof branchRows) || [];
    }

    if (branchRows.length === 0) {
      const { data: singleTenantRow } = await supabaseAdmin
        .from("tenants")
        .select("id, name, slug, is_active")
        .eq("id", tenantId)
        .maybeSingle();

      if (singleTenantRow?.id && singleTenantRow.name && singleTenantRow.slug) {
        branchRows = [
          {
            tenant_id: singleTenantRow.id,
            tenants: {
              name: singleTenantRow.name,
              slug: singleTenantRow.slug,
              is_active: singleTenantRow.is_active,
            },
          },
        ];
      }
    }

    const activeBranchRows = branchRows.filter((row) => {
      const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
      return tenant?.is_active !== false;
    });

    const scopedTenantIds = Array.from(new Set(activeBranchRows.map((row) => row.tenant_id)));

    if (scopedTenantIds.length === 0) {
      return [];
    }

    const branchInfoByTenant = new Map(
      activeBranchRows.map((row) => {
        const tenant = Array.isArray(row.tenants) ? row.tenants[0] : row.tenants;
        return [
          row.tenant_id,
          {
            name: tenant?.name || "Sede",
            slug: tenant?.slug || "",
          },
        ];
      })
    );

    const { data: branchSettingsRows } = await supabaseAdmin
      .from("school_settings")
      .select("tenant_id, enrollment_config")
      .in("tenant_id", scopedTenantIds);

    const branchAddressByTenant = new Map<string, string | undefined>();
    for (const row of branchSettingsRows || []) {
      const enrollmentConfig = row.enrollment_config as Record<string, unknown> | null;
      const profileSource =
        enrollmentConfig?.public_profile && typeof enrollmentConfig.public_profile === "object"
          ? (enrollmentConfig.public_profile as Record<string, unknown>)
          : enrollmentConfig?.publicProfile && typeof enrollmentConfig.publicProfile === "object"
            ? (enrollmentConfig.publicProfile as Record<string, unknown>)
            : {};
      branchAddressByTenant.set(row.tenant_id, typeof profileSource.address === "string" ? profileSource.address : undefined);
    }

    let query = supabaseAdmin
      .from("class_schedules")
      .select(
        `
        *,
        classes:class_id(name, discipline, capacity),
        rooms:room_id(name),
        enrollments:enrollments(count)
      `
      )
      .in("tenant_id", scopedTenantIds)
      .eq("is_active", true)
      .filter("effective_from", "<=", fromDate || new Date().toISOString().split("T")[0]);

    if (toDate) {
      query = query.filter("effective_to", ">=", toDate);
    }

    const { data, error } = await query.order("weekday").order("start_time");

    if (error) throw new Error(`Error fetching public schedule: ${error.message}`);

    return (data || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (schedule: any) => ({
        ...schedule,
        className: (schedule.classes as unknown as { name: string } | null)?.name || "",
        discipline: (schedule.classes as unknown as { discipline: string } | null)?.discipline || "",
        roomName: (schedule.rooms as unknown as { name: string } | null)?.name || "",
        capacity: (schedule.classes as unknown as { capacity: number } | null)?.capacity || 0,
        studentCount: (schedule.enrollments as unknown as Array<{ count: number }> | null)?.[0]?.count || 0,
        branchName: branchInfoByTenant.get(schedule.tenant_id)?.name || "Sede",
        branchSlug: branchInfoByTenant.get(schedule.tenant_id)?.slug || "",
        branchAddress: branchAddressByTenant.get(schedule.tenant_id),
      })
    ) as unknown as (ClassSchedule & {
      className: string;
      roomName: string;
      discipline: string;
      capacity: number;
      studentCount: number;
      branchName: string;
      branchSlug: string;
      branchAddress?: string;
    })[];
  },
};
