import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, adminCredentialsTable } from "@workspace/db";
import { VerifyAdminBody, UpdateAdminCredentialsBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrInitAdminCredentials() {
  let creds = await db
    .select()
    .from(adminCredentialsTable)
    .where(eq(adminCredentialsTable.id, 1))
    .then((r) => r[0]);

  if (!creds) {
    const defaultPassword = process.env.ADMIN_PASSWORD || "admin123";
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    const [created] = await db
      .insert(adminCredentialsTable)
      .values({ username: "مشرف", passwordHash })
      .returning();
    creds = created;
  }

  return creds;
}

router.post("/auth/verify", async (req, res): Promise<void> => {
  const parsed = VerifyAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const creds = await getOrInitAdminCredentials();

  const usernameMatch = parsed.data.username
    ? parsed.data.username === creds.username
    : true;

  const passwordMatch = await bcrypt.compare(parsed.data.password, creds.passwordHash);

  if (usernameMatch && passwordMatch) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

router.get("/auth/credentials", async (_req, res): Promise<void> => {
  const creds = await getOrInitAdminCredentials();
  res.json({ username: creds.username });
});

router.put("/auth/credentials", async (req, res): Promise<void> => {
  const parsed = UpdateAdminCredentialsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const creds = await getOrInitAdminCredentials();

  const valid = await bcrypt.compare(parsed.data.currentPassword, creds.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
    return;
  }

  const updateData: Partial<{ username: string; passwordHash: string; updatedAt: Date }> = {
    updatedAt: new Date(),
  };

  if (parsed.data.newUsername) updateData.username = parsed.data.newUsername;
  if (parsed.data.newPassword) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  }

  const [updated] = await db
    .update(adminCredentialsTable)
    .set(updateData)
    .where(eq(adminCredentialsTable.id, 1))
    .returning();

  res.json({ username: updated.username });
});

export default router;
