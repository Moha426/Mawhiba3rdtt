import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, scheduleTable, subjectsTable } from "@workspace/db";
import {
  CreateScheduleSlotBody,
  UpdateScheduleSlotBody,
  UpdateScheduleSlotParams,
  DeleteScheduleSlotParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function formatSlot(slot: typeof scheduleTable.$inferSelect) {
  const subject = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, slot.subjectId))
    .then((r) => r[0]);

  return {
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    periodNumber: slot.periodNumber,
    subjectId: slot.subjectId,
    subjectName: subject?.name ?? "غير معروف",
    subjectColor: subject?.color ?? "#6366f1",
    notes: slot.notes ?? null,
    createdAt: slot.createdAt.toISOString(),
  };
}

router.get("/schedule", async (_req, res): Promise<void> => {
  const slots = await db
    .select()
    .from(scheduleTable)
    .innerJoin(subjectsTable, eq(scheduleTable.subjectId, subjectsTable.id))
    .orderBy(scheduleTable.dayOfWeek, scheduleTable.periodNumber);

  res.json(
    slots.map((r) => ({
      id: r.schedule_slots.id,
      dayOfWeek: r.schedule_slots.dayOfWeek,
      periodNumber: r.schedule_slots.periodNumber,
      subjectId: r.schedule_slots.subjectId,
      subjectName: r.subjects.name,
      subjectColor: r.subjects.color,
      notes: r.schedule_slots.notes ?? null,
      createdAt: r.schedule_slots.createdAt.toISOString(),
    })),
  );
});

router.post("/schedule", async (req, res): Promise<void> => {
  const parsed = CreateScheduleSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [slot] = await db
    .insert(scheduleTable)
    .values({
      dayOfWeek: parsed.data.dayOfWeek,
      periodNumber: parsed.data.periodNumber,
      subjectId: parsed.data.subjectId,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(await formatSlot(slot));
});

router.patch("/schedule/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateScheduleSlotParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateScheduleSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [slot] = await db
    .update(scheduleTable)
    .set({
      ...(parsed.data.subjectId !== undefined && { subjectId: parsed.data.subjectId }),
      notes: parsed.data.notes ?? null,
    })
    .where(eq(scheduleTable.id, params.data.id))
    .returning();

  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  res.json(await formatSlot(slot));
});

router.delete("/schedule/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteScheduleSlotParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [slot] = await db
    .delete(scheduleTable)
    .where(eq(scheduleTable.id, params.data.id))
    .returning();

  if (!slot) {
    res.status(404).json({ error: "Slot not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
