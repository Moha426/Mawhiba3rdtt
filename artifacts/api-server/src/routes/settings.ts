import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, siteSettingsTable } from "@workspace/db";

const router: IRouter = Router();

async function getOrCreate() {
  const rows = await db.select().from(siteSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(siteSettingsTable).values({}).returning();
  return created;
}

function fmt(s: typeof siteSettingsTable.$inferSelect) {
  return {
    id: s.id,
    schoolName: s.schoolName ?? null,
    teacherPhone: s.teacherPhone ?? null,
    socialLinks: s.socialLinks ?? [],
    updatedAt: s.updatedAt?.toISOString() ?? null,
  };
}

router.get("/settings", async (_req, res): Promise<void> => {
  res.json(fmt(await getOrCreate()));
});

router.put("/settings", async (req, res): Promise<void> => {
  const { schoolName, teacherPhone, socialLinks } = req.body as {
    schoolName?: string | null;
    teacherPhone?: string | null;
    socialLinks?: { platform: string; label: string; url: string }[];
  };
  const existing = await getOrCreate();
  const [updated] = await db
    .update(siteSettingsTable)
    .set({
      schoolName: schoolName ?? null,
      teacherPhone: teacherPhone ?? null,
      socialLinks: socialLinks ?? [],
      updatedAt: new Date(),
    })
    .where(eq(siteSettingsTable.id, existing.id))
    .returning();
  res.json(fmt(updated));
});

export default router;
