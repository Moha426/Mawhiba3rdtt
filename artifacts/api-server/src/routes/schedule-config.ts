import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, scheduleConfigTable } from "@workspace/db";
import { UpdateScheduleConfigBody } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_CONFIG = {
  periodsCount: 7,
  breakAfterPeriod: 3,
  periodDuration: 45,
  breakDuration: 20,
  startTime: "07:30",
};

async function getOrInitConfig() {
  let config = await db
    .select()
    .from(scheduleConfigTable)
    .where(eq(scheduleConfigTable.id, 1))
    .then((r) => r[0]);

  if (!config) {
    const [created] = await db
      .insert(scheduleConfigTable)
      .values({ ...DEFAULT_CONFIG })
      .returning();
    config = created;
  }

  return config;
}

function formatConfig(c: typeof scheduleConfigTable.$inferSelect) {
  return {
    periodsCount: c.periodsCount,
    breakAfterPeriod: c.breakAfterPeriod,
    periodDuration: c.periodDuration,
    breakDuration: c.breakDuration,
    startTime: c.startTime,
  };
}

router.get("/schedule-config", async (_req, res): Promise<void> => {
  const config = await getOrInitConfig();
  res.json(formatConfig(config));
});

router.patch("/schedule-config", async (req, res): Promise<void> => {
  const parsed = UpdateScheduleConfigBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await getOrInitConfig();

  const [updated] = await db
    .update(scheduleConfigTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(scheduleConfigTable.id, 1))
    .returning();

  res.json(formatConfig(updated));
});

export default router;
