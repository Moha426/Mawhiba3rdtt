import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";
import {
  ListEventsQueryParams,
  CreateEventBody,
  UpdateEventParams,
  UpdateEventBody,
  DeleteEventParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatRow(r: typeof eventsTable.$inferSelect) {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    endDate: r.endDate ?? null,
    color: r.color,
    type: r.type,
    description: r.description ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/events", async (req, res): Promise<void> => {
  const params = ListEventsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }

  const rows = await db
    .select()
    .from(eventsTable)
    .orderBy(asc(eventsTable.date));

  const month = params.data.month ?? null;
  const filtered = month
    ? rows.filter((r) => r.date.startsWith(month))
    : rows;

  res.json(filtered.map(formatRow));
});

router.post("/events", async (req, res): Promise<void> => {
  const body = CreateEventBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .insert(eventsTable)
    .values({
      title: body.data.title,
      date: body.data.date,
      endDate: body.data.endDate ?? null,
      color: body.data.color ?? "#ef4444",
      type: body.data.type ?? "event",
      description: body.data.description ?? null,
    })
    .returning();

  res.status(201).json(formatRow(row));
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  const body = UpdateEventBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [row] = await db
    .update(eventsTable)
    .set({
      title: body.data.title,
      date: body.data.date,
      endDate: body.data.endDate ?? null,
      color: body.data.color ?? "#ef4444",
      type: body.data.type ?? "event",
      description: body.data.description ?? null,
    })
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(formatRow(row));
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(eventsTable).where(eq(eventsTable.id, params.data.id));
  res.json({ success: true });
});

export default router;
