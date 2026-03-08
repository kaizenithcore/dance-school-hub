import { supabaseAdmin } from "@/lib/db/supabaseAdmin";
import { featureEntitlementsService } from "@/lib/services/featureEntitlementsService";

interface ClassCloneRow {
  id: string;
  name: string;
  discipline: string;
  category: string | null;
  teacher_id: string | null;
  room_id: string | null;
  capacity: number;
  price_cents: number;
  description: string | null;
  status: string;
}

interface ClassScheduleCloneRow {
  id: string;
  class_id: string;
  room_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  recurrence: Record<string, unknown> | null;
  is_active: boolean;
}

interface CloneJobRow {
  id: string;
  source_period: string;
  target_period: string;
  status: "queued" | "processing" | "completed" | "failed";
  summary_json: Record<string, unknown>;
  options_json: Record<string, unknown>;
  created_at: string;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function isValidPeriod(period: string) {
  return /^\d{4}-\d{2}$/.test(period);
}

function periodStart(period: string) {
  if (!isValidPeriod(period)) {
    throw new Error("Invalid period format, expected YYYY-MM");
  }
  return `${period}-01`;
}

function periodNextStart(period: string) {
  const [yearRaw, monthRaw] = period.split("-");
  const year = Number.parseInt(yearRaw || "0", 10);
  const month = Number.parseInt(monthRaw || "0", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Invalid period format, expected YYYY-MM");
  }

  const date = new Date(Date.UTC(year, month, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

async function listClassIdsForPeriod(tenantId: string, period: string) {
  const start = periodStart(period);
  const end = periodNextStart(period);

  const { data: schedules, error: schedulesError } = await supabaseAdmin
    .from("class_schedules")
    .select("class_id")
    .eq("tenant_id", tenantId)
    .gte("effective_from", start)
    .lt("effective_from", end);

  if (schedulesError) {
    throw new Error(`Failed to load schedules for period: ${schedulesError.message}`);
  }

  return Array.from(new Set((schedules || []).map((row) => row.class_id as string)));
}

export const courseCloneService = {
  async isCourseCloneEnabled(tenantId: string) {
    const { data } = await supabaseAdmin
      .from("school_settings")
      .select("payment_config")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const resolved = featureEntitlementsService.resolveFromPaymentConfig(asObject(data?.payment_config));
    return resolved.features.courseClone;
  },

  async listCloneJobs(tenantId: string, limit = 20) {
    const { data, error } = await supabaseAdmin
      .from("clone_jobs")
      .select("id, source_period, target_period, status, summary_json, options_json, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to load clone jobs: ${error.message}`);
    }

    return ((data || []) as CloneJobRow[]).map((row) => ({
      id: row.id,
      sourcePeriod: row.source_period,
      targetPeriod: row.target_period,
      status: row.status,
      summary: row.summary_json || {},
      options: row.options_json || {},
      createdAt: row.created_at,
    }));
  },

  async dryRun(tenantId: string, sourcePeriod: string, targetPeriod: string) {
    if (!isValidPeriod(sourcePeriod) || !isValidPeriod(targetPeriod)) {
      throw new Error("sourcePeriod and targetPeriod must follow YYYY-MM");
    }

    const classIds = await listClassIdsForPeriod(tenantId, sourcePeriod);
    if (classIds.length === 0) {
      return {
        sourcePeriod,
        targetPeriod,
        sourceClassCount: 0,
        sourceScheduleCount: 0,
        sampleClassNames: [],
      };
    }

    const { data: classes, error: classesError } = await supabaseAdmin
      .from("classes")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .in("id", classIds)
      .order("name", { ascending: true });

    if (classesError) {
      throw new Error(`Failed to load source classes: ${classesError.message}`);
    }

    const sourceStart = periodStart(sourcePeriod);
    const sourceEnd = periodNextStart(sourcePeriod);

    const { data: schedules, error: schedulesError } = await supabaseAdmin
      .from("class_schedules")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("class_id", classIds)
      .gte("effective_from", sourceStart)
      .lt("effective_from", sourceEnd);

    if (schedulesError) {
      throw new Error(`Failed to load source schedules: ${schedulesError.message}`);
    }

    return {
      sourcePeriod,
      targetPeriod,
      sourceClassCount: classIds.length,
      sourceScheduleCount: (schedules || []).length,
      sampleClassNames: (classes || []).slice(0, 6).map((item) => item.name as string),
    };
  },

  async applyClone(input: {
    tenantId: string;
    actorUserId: string;
    sourcePeriod: string;
    targetPeriod: string;
  }) {
    if (!isValidPeriod(input.sourcePeriod) || !isValidPeriod(input.targetPeriod)) {
      throw new Error("sourcePeriod and targetPeriod must follow YYYY-MM");
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from("clone_jobs")
      .insert({
        tenant_id: input.tenantId,
        source_period: input.sourcePeriod,
        target_period: input.targetPeriod,
        status: "processing",
        created_by: input.actorUserId,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create clone job: ${jobError?.message || "Unknown error"}`);
    }

    try {
      const classIds = await listClassIdsForPeriod(input.tenantId, input.sourcePeriod);
      if (classIds.length === 0) {
        const summary = {
          sourceClassCount: 0,
          clonedClassCount: 0,
          clonedScheduleCount: 0,
        };

        await supabaseAdmin
          .from("clone_jobs")
          .update({ status: "completed", summary_json: summary })
          .eq("tenant_id", input.tenantId)
          .eq("id", job.id);

        return {
          jobId: job.id as string,
          summary,
        };
      }

      const { data: sourceClasses, error: sourceClassesError } = await supabaseAdmin
        .from("classes")
        .select("id, name, discipline, category, teacher_id, room_id, capacity, price_cents, description, status")
        .eq("tenant_id", input.tenantId)
        .in("id", classIds);

      if (sourceClassesError) {
        throw new Error(`Failed to load source classes: ${sourceClassesError.message}`);
      }

      const sourceStart = periodStart(input.sourcePeriod);
      const sourceEnd = periodNextStart(input.sourcePeriod);

      const { data: sourceSchedules, error: sourceSchedulesError } = await supabaseAdmin
        .from("class_schedules")
        .select("id, class_id, room_id, weekday, start_time, end_time, recurrence, is_active")
        .eq("tenant_id", input.tenantId)
        .in("class_id", classIds)
        .gte("effective_from", sourceStart)
        .lt("effective_from", sourceEnd);

      if (sourceSchedulesError) {
        throw new Error(`Failed to load source schedules: ${sourceSchedulesError.message}`);
      }

      const { data: existingClasses, error: existingClassesError } = await supabaseAdmin
        .from("classes")
        .select("name")
        .eq("tenant_id", input.tenantId);

      if (existingClassesError) {
        throw new Error(`Failed to load existing class names: ${existingClassesError.message}`);
      }

      const existingNames = new Set((existingClasses || []).map((item) => item.name as string));
      const classMap = new Map<string, string>();
      const createdClassNames: string[] = [];

      for (const source of (sourceClasses || []) as ClassCloneRow[]) {
        let candidateName = `${source.name} (${input.targetPeriod})`;
        let copyCounter = 1;
        while (existingNames.has(candidateName)) {
          copyCounter += 1;
          candidateName = `${source.name} (${input.targetPeriod}) copia ${copyCounter}`;
        }

        const { data: createdClass, error: createClassError } = await supabaseAdmin
          .from("classes")
          .insert({
            tenant_id: input.tenantId,
            name: candidateName,
            discipline: source.discipline,
            category: source.category,
            teacher_id: source.teacher_id,
            room_id: source.room_id,
            capacity: source.capacity,
            price_cents: source.price_cents,
            description: source.description,
            status: source.status,
            created_by: input.actorUserId,
          })
          .select("id")
          .single();

        if (createClassError || !createdClass) {
          throw new Error(`Failed to clone class ${source.name}: ${createClassError?.message || "Unknown error"}`);
        }

        existingNames.add(candidateName);
        classMap.set(source.id, createdClass.id as string);
        createdClassNames.push(candidateName);
      }

      const targetEffectiveFrom = periodStart(input.targetPeriod);
      const scheduleRows = ((sourceSchedules || []) as ClassScheduleCloneRow[])
        .map((sourceSchedule) => {
          const nextClassId = classMap.get(sourceSchedule.class_id);
          if (!nextClassId) {
            return null;
          }

          return {
            tenant_id: input.tenantId,
            class_id: nextClassId,
            room_id: sourceSchedule.room_id,
            weekday: sourceSchedule.weekday,
            start_time: sourceSchedule.start_time,
            end_time: sourceSchedule.end_time,
            recurrence: sourceSchedule.recurrence || { type: "weekly" },
            effective_from: targetEffectiveFrom,
            effective_to: null,
            is_active: sourceSchedule.is_active,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (scheduleRows.length > 0) {
        const { error: createSchedulesError } = await supabaseAdmin.from("class_schedules").insert(scheduleRows);
        if (createSchedulesError) {
          throw new Error(`Failed to clone schedules: ${createSchedulesError.message}`);
        }
      }

      const summary = {
        sourceClassCount: classIds.length,
        clonedClassCount: classMap.size,
        clonedScheduleCount: scheduleRows.length,
        classNames: createdClassNames,
      };

      await supabaseAdmin
        .from("clone_jobs")
        .update({ status: "completed", summary_json: summary })
        .eq("tenant_id", input.tenantId)
        .eq("id", job.id);

      await supabaseAdmin.from("audit_log").insert({
        tenant_id: input.tenantId,
        actor_user_id: input.actorUserId,
        action: "course_clone_completed",
        entity_type: "clone_job",
        entity_id: job.id as string,
        metadata: {
          sourcePeriod: input.sourcePeriod,
          targetPeriod: input.targetPeriod,
          ...summary,
        },
      });

      return {
        jobId: job.id as string,
        summary,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown clone error";

      await supabaseAdmin
        .from("clone_jobs")
        .update({ status: "failed", summary_json: { error: message } })
        .eq("tenant_id", input.tenantId)
        .eq("id", job.id);

      throw new Error(message);
    }
  },
};
