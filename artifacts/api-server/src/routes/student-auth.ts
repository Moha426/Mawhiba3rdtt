import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, studentsTable } from "@workspace/db";
import { UpdateStudentMeBody } from "@workspace/api-zod";
import { getStudentFromRequest } from "../middlewares/clerkAuth";

const router: IRouter = Router();

function formatUser(s: typeof studentsTable.$inferSelect) {
  return {
    id: s.id,
    username: s.username,
    displayName: s.displayName,
    role: s.role,
    profilePicture: s.profilePicture ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

function generateCode(length = 6): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

/**
 * Clerk JIT provisioning — called after the student signs in via Clerk.
 * Finds or creates a student record linked to the Clerk userId.
 */
router.post("/student-auth/clerk-provision", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let student = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.clerkUserId, clerkUserId))
    .then((r) => r[0]);

  if (!student) {
    const { displayName } = req.body as { displayName?: string };
    const safeName = displayName?.trim() || "طالب";

    const baseUsername = `user_${Date.now()}`;

    const [created] = await db
      .insert(studentsTable)
      .values({
        clerkUserId,
        username: baseUsername,
        displayName: safeName,
        passwordHash: "",
        role: "student",
      })
      .returning();

    student = created;
  }

  res.json(formatUser(student));
});

router.get("/student-auth/me", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const student = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId))
    .then((r) => r[0]);

  if (!student) { res.status(404).json({ error: "Student not found" }); return; }
  res.json(formatUser(student));
});

router.patch("/student-auth/me", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = UpdateStudentMeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const student = await db.select().from(studentsTable).where(eq(studentsTable.id, studentId)).then((r) => r[0]);
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const updateData: Partial<typeof studentsTable.$inferInsert> = {};
  if (parsed.data.displayName) updateData.displayName = parsed.data.displayName;
  if (parsed.data.profilePicture !== undefined) updateData.profilePicture = parsed.data.profilePicture;

  if (parsed.data.newPassword && student.passwordHash) {
    if (!parsed.data.currentPassword) { res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" }); return; }
    const valid = await bcrypt.compare(parsed.data.currentPassword, student.passwordHash);
    if (!valid) { res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" }); return; }
    updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  }

  const [updated] = await db.update(studentsTable).set(updateData).where(eq(studentsTable.id, studentId)).returning();
  res.json(formatUser(updated));
});

router.post("/student-auth/init-recovery", async (req, res): Promise<void> => {
  const { username } = req.body as { username?: string };
  if (!username) { res.status(400).json({ error: "username required" }); return; }

  const student = await db.select().from(studentsTable).where(eq(studentsTable.username, username.toLowerCase())).then((r) => r[0]);
  if (!student) { res.status(404).json({ error: "اسم المستخدم غير موجود" }); return; }

  const code = generateCode(6);
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.update(studentsTable).set({ recoveryCode: code, recoveryCodeExpiry: expiry }).where(eq(studentsTable.id, student.id));
  res.json({ message: `رمز الاسترداد لحساب "${student.displayName}" هو: ${code} (صالح لـ 24 ساعة)` });
});

export default router;
