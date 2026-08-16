import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, completionsTable } from "@workspace/db";
import { getStudentFromRequest } from "../middlewares/clerkAuth";

const router: IRouter = Router();

router.get("/completions", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const completions = await db
    .select({ assignmentId: completionsTable.assignmentId })
    .from(completionsTable)
    .where(eq(completionsTable.studentId, studentId));

  res.json(completions.map((c) => c.assignmentId));
});

router.post("/completions/:assignmentId", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rawId = Array.isArray(req.params.assignmentId) ? req.params.assignmentId[0] : req.params.assignmentId;
  const assignmentId = parseInt(rawId, 10);
  if (isNaN(assignmentId)) { res.status(400).json({ error: "Invalid assignment ID" }); return; }

  await db.insert(completionsTable).values({ studentId, assignmentId }).onConflictDoNothing();
  res.sendStatus(201);
});

router.delete("/completions/:assignmentId", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rawId = Array.isArray(req.params.assignmentId) ? req.params.assignmentId[0] : req.params.assignmentId;
  const assignmentId = parseInt(rawId, 10);
  if (isNaN(assignmentId)) { res.status(400).json({ error: "Invalid assignment ID" }); return; }

  await db.delete(completionsTable).where(
    and(eq(completionsTable.studentId, studentId), eq(completionsTable.assignmentId, assignmentId)),
  );
  res.sendStatus(204);
});

export default router;
