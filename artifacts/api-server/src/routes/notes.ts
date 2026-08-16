import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";
import { getStudentFromRequest } from "../middlewares/clerkAuth";

const router: IRouter = Router();

router.get("/notes", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const entityType = String(req.query.entityType || "");
  const entityId = parseInt(String(req.query.entityId || ""), 10);
  if (!entityType || isNaN(entityId)) { res.status(400).json({ error: "entityType and entityId required" }); return; }

  const notes = await db.select().from(notesTable).where(
    and(eq(notesTable.studentId, studentId), eq(notesTable.entityType, entityType), eq(notesTable.entityId, entityId)),
  );

  res.json(notes.map((n) => ({
    id: n.id, studentId: n.studentId, entityType: n.entityType, entityId: n.entityId,
    content: n.content, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt?.toISOString() ?? null,
  })));
});

router.post("/notes", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { entityType, entityId, content } = req.body as { entityType?: string; entityId?: number; content?: string };
  if (!entityType || !entityId || !content?.trim()) { res.status(400).json({ error: "entityType, entityId, content required" }); return; }

  const [note] = await db.insert(notesTable).values({ studentId, entityType, entityId, content: content.trim() }).returning();
  res.status(201).json({
    id: note.id, studentId: note.studentId, entityType: note.entityType, entityId: note.entityId,
    content: note.content, createdAt: note.createdAt.toISOString(), updatedAt: null,
  });
});

router.put("/notes/:id", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

  const [updated] = await db.update(notesTable)
    .set({ content: content.trim(), updatedAt: new Date() })
    .where(and(eq(notesTable.id, id), eq(notesTable.studentId, studentId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    id: updated.id, studentId: updated.studentId, entityType: updated.entityType, entityId: updated.entityId,
    content: updated.content, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt?.toISOString() ?? null,
  });
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(notesTable).where(and(eq(notesTable.id, id), eq(notesTable.studentId, studentId)));
  res.sendStatus(204);
});

export default router;
