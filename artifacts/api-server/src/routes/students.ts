import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, studentsTable } from "@workspace/db";
import { AdminUpdateStudentBody, AdminUpdateStudentParams } from "@workspace/api-zod";

const router: IRouter = Router();

function generateCode(length = 6): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function formatStudent(s: typeof studentsTable.$inferSelect) {
  return {
    id: s.id,
    username: s.username,
    displayName: s.displayName,
    role: s.role,
    profilePicture: s.profilePicture ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/students", async (_req, res): Promise<void> => {
  const students = await db
    .select()
    .from(studentsTable)
    .orderBy(studentsTable.createdAt);

  res.json(students.map(formatStudent));
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AdminUpdateStudentParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AdminUpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<typeof studentsTable.$inferInsert> = {};

  if (parsed.data.displayName) updateData.displayName = parsed.data.displayName;
  if (parsed.data.newUsername) updateData.username = parsed.data.newUsername;
  if (parsed.data.newPassword) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    updateData.recoveryCode = null;
    updateData.recoveryCodeExpiry = null;
  }

  const [updated] = await db
    .update(studentsTable)
    .set(updateData)
    .where(eq(studentsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json(formatStudent(updated));
});

router.post("/students/:id/recovery-code", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const code = generateCode(6);
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const [updated] = await db
    .update(studentsTable)
    .set({ recoveryCode: code, recoveryCodeExpiry: expiry })
    .where(eq(studentsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  res.json({ code, expiresAt: expiry.toISOString() });
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  await db.delete(studentsTable).where(eq(studentsTable.id, id));
  res.sendStatus(204);
});

export default router;
