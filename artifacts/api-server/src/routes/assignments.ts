import { Router, type IRouter } from "express";
import { eq, and, ilike, gte, desc, asc } from "drizzle-orm";
import { db, assignmentsTable, subjectsTable, eventsTable } from "@workspace/db";
import {
  CreateAssignmentBody,
  UpdateAssignmentBody,
  UpdateAssignmentParams,
  DeleteAssignmentParams,
  ListAssignmentsQueryParams,
  ListUpcomingAssignmentsQueryParams,
  ReorderAssignmentsBody,
} from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

function formatAssignment(
  a: typeof assignmentsTable.$inferSelect,
  subject: typeof subjectsTable.$inferSelect,
  event?: typeof eventsTable.$inferSelect | null
) {
  return {
    id: a.id,
    title: a.title,
    subjectId: a.subjectId,
    subjectName: subject.name,
    subjectColor: subject.color,
    type: a.type,
    description: a.description ?? null,
    priority: a.priority,
    assignedDate: a.assignedDate,
    dueDate: a.dueDate,
    attachmentLinks: a.attachmentLinks ?? [],
    checklistItems: a.checklistItems ?? [],
    examType: a.examType ?? null,
    pageNumber: a.pageNumber ?? null,
    sectionId: (a as any).sectionId ?? null,
    sortOrder: (a as any).sortOrder ?? null,
    eventId: (a as any).eventId ?? null,
    eventTitle: event?.title ?? null,
    eventColor: event?.color ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt ? a.updatedAt.toISOString() : null,
  };
}

router.get("/assignments/upcoming", async (req, res): Promise<void> => {
  const params = ListUpcomingAssignmentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const limit = params.data.limit ?? 10;
  const today = new Date().toISOString().split("T")[0];

  const rows = await db
    .select()
    .from(assignmentsTable)
    .innerJoin(subjectsTable, eq(assignmentsTable.subjectId, subjectsTable.id))
    .leftJoin(eventsTable, eq((assignmentsTable as any).eventId, eventsTable.id))
    .where(gte(assignmentsTable.dueDate, today))
    .orderBy(asc(assignmentsTable.dueDate))
    .limit(limit);

  res.json(rows.map((r) => formatAssignment(r.assignments, r.subjects, r.events)));
});

router.get("/assignments", async (req, res): Promise<void> => {
  const params = ListAssignmentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];

  if (params.data.subjectId != null) {
    conditions.push(eq(assignmentsTable.subjectId, params.data.subjectId));
  }
  if (params.data.type != null) {
    conditions.push(eq(assignmentsTable.type, params.data.type));
  }
  if (params.data.priority != null) {
    conditions.push(eq(assignmentsTable.priority, params.data.priority));
  }
  if (params.data.search != null && params.data.search.trim() !== "") {
    conditions.push(ilike(assignmentsTable.title, `%${params.data.search}%`));
  }

  const rows = await db
    .select()
    .from(assignmentsTable)
    .innerJoin(subjectsTable, eq(assignmentsTable.subjectId, subjectsTable.id))
    .leftJoin(eventsTable, eq((assignmentsTable as any).eventId, eventsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(assignmentsTable.createdAt));

  res.json(rows.map((r) => formatAssignment(r.assignments, r.subjects, r.events)));
});

router.post("/assignments", async (req, res): Promise<void> => {
  const parsed = CreateAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const subject = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, parsed.data.subjectId))
    .then((r) => r[0]);

  if (!subject) {
    res.status(400).json({ error: "Subject not found" });
    return;
  }

  const eventId = (parsed.data as any).eventId ?? null;
  let event = null;
  if (eventId) {
    event = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).then((r) => r[0] ?? null);
  }

  const [assignment] = await db
    .insert(assignmentsTable)
    .values({
      title: parsed.data.title,
      subjectId: parsed.data.subjectId,
      type: parsed.data.type,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      assignedDate: parsed.data.assignedDate,
      dueDate: parsed.data.dueDate,
      attachmentLinks: parsed.data.attachmentLinks ?? [],
      checklistItems: (parsed.data as any).checklistItems ?? [],
      examType: parsed.data.examType ?? null,
      pageNumber: parsed.data.pageNumber ?? null,
      ...((parsed.data as any).sectionId !== undefined
        ? { sectionId: (parsed.data as any).sectionId ?? null }
        : {}),
      ...(eventId !== undefined ? { eventId: eventId ?? null } : {}),
    } as any)
    .returning();

  res.status(201).json(formatAssignment(assignment, subject, event));
});

router.get("/assignments/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid assignment id" });
    return;
  }

  const rows = await db
    .select()
    .from(assignmentsTable)
    .innerJoin(subjectsTable, eq(assignmentsTable.subjectId, subjectsTable.id))
    .leftJoin(eventsTable, eq((assignmentsTable as any).eventId, eventsTable.id))
    .where(eq(assignmentsTable.id, id));

  if (!rows[0]) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.json(formatAssignment(rows[0].assignments, rows[0].subjects, rows[0].events));
});

router.patch("/assignments/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateAssignmentParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, any> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.subjectId !== undefined) updateData.subjectId = parsed.data.subjectId;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
  if (parsed.data.assignedDate !== undefined) updateData.assignedDate = parsed.data.assignedDate;
  if (parsed.data.dueDate !== undefined) updateData.dueDate = parsed.data.dueDate;
  if (parsed.data.attachmentLinks !== undefined) updateData.attachmentLinks = parsed.data.attachmentLinks;
  if ((parsed.data as any).checklistItems !== undefined) updateData.checklistItems = (parsed.data as any).checklistItems;
  if (parsed.data.examType !== undefined) updateData.examType = parsed.data.examType;
  if (parsed.data.pageNumber !== undefined) updateData.pageNumber = parsed.data.pageNumber;
  if ((parsed.data as any).eventId !== undefined) (updateData as any).eventId = (parsed.data as any).eventId ?? null;

  const [updated] = await db
    .update(assignmentsTable)
    .set(updateData as any)
    .where(eq(assignmentsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  const subject = await db
    .select()
    .from(subjectsTable)
    .where(eq(subjectsTable.id, updated.subjectId))
    .then((r) => r[0]);

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const eventId = (updated as any).eventId;
  let event = null;
  if (eventId) {
    event = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).then((r) => r[0] ?? null);
  }

  res.json(formatAssignment(updated, subject, event));
});

router.patch("/assignments/reorder", async (req, res): Promise<void> => {
  const body = ReorderAssignmentsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  for (const item of body.data.items) {
    await db
      .update(assignmentsTable)
      .set({
        sortOrder: item.sortOrder,
        ...(item.sectionId !== undefined ? { sectionId: item.sectionId ?? null } : {}),
      } as any)
      .where(eq(assignmentsTable.id, item.id));
  }

  res.json({ success: true });
});

router.delete("/assignments/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteAssignmentParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(assignmentsTable)
    .where(eq(assignmentsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Assignment not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
