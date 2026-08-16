import { Router, type IRouter } from "express";
import { lt, desc, eq } from "drizzle-orm";
import { db, chatMessagesTable, studentsTable } from "@workspace/db";
import { getStudentFromRequest } from "../middlewares/clerkAuth";

const router: IRouter = Router();

async function getStudentWithName(req: import("express").Request): Promise<{ id: number; name: string } | null> {
  const id = await getStudentFromRequest(req);
  if (!id) return null;
  const [s] = await db.select({ id: studentsTable.id, displayName: studentsTable.displayName })
    .from(studentsTable).where(eq(studentsTable.id, id));
  if (!s) return null;
  return { id: s.id, name: s.displayName };
}

router.get("/chat", async (req, res): Promise<void> => {
  const student = await getStudentWithName(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const beforeId = req.query.before ? parseInt(String(req.query.before), 10) : undefined;
  const rows = await db.select().from(chatMessagesTable)
    .where(beforeId ? lt(chatMessagesTable.id, beforeId) : undefined)
    .orderBy(desc(chatMessagesTable.id)).limit(60);

  res.json(rows.reverse().map((m) => ({
    id: m.id, studentId: m.studentId, studentName: m.studentName,
    content: m.content, createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/chat", async (req, res): Promise<void> => {
  const student = await getStudentWithName(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { content } = req.body as { content?: string };
  const trimmed = content?.trim();
  if (!trimmed || trimmed.length > 500) { res.status(400).json({ error: "content required (max 500 chars)" }); return; }

  const [msg] = await db.insert(chatMessagesTable)
    .values({ studentId: student.id, studentName: student.name, content: trimmed })
    .returning();

  res.status(201).json({
    id: msg.id, studentId: msg.studentId, studentName: msg.studentName,
    content: msg.content, createdAt: msg.createdAt.toISOString(),
  });
});

export default router;
