import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, subjectsTable } from "@workspace/db";
import {
  CreateSubjectBody,
  UpdateSubjectBody,
  UpdateSubjectParams,
  DeleteSubjectParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatSubject(s: typeof subjectsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    color: s.color,
    teacherName: s.teacherName ?? null,
    teacherPhone: (s as any).teacherPhone ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db
    .select()
    .from(subjectsTable)
    .orderBy(subjectsTable.name);

  res.json(subjects.map(formatSubject));
});

router.post("/subjects", async (req, res): Promise<void> => {
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db
    .insert(subjectsTable)
    .values({
      name: parsed.data.name,
      color: parsed.data.color ?? "#6366f1",
      teacherName: parsed.data.teacherName ?? null,
      ...((parsed.data as any).teacherPhone !== undefined
        ? { teacherPhone: (parsed.data as any).teacherPhone ?? null }
        : {}),
    } as any)
    .returning();

  res.status(201).json(formatSubject(subject));
});

router.patch("/subjects/:id", async (req, res): Promise<void> => {
  const params = UpdateSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db
    .update(subjectsTable)
    .set({
      name: parsed.data.name,
      ...(parsed.data.color ? { color: parsed.data.color } : {}),
      teacherName: parsed.data.teacherName ?? null,
      ...((parsed.data as any).teacherPhone !== undefined
        ? { teacherPhone: (parsed.data as any).teacherPhone ?? null }
        : {}),
    } as any)
    .where(eq(subjectsTable.id, params.data.id))
    .returning();

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.json(formatSubject(subject));
});

router.delete("/subjects/:id", async (req, res): Promise<void> => {
  const params = DeleteSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [subject] = await db
    .delete(subjectsTable)
    .where(eq(subjectsTable.id, params.data.id))
    .returning();

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
