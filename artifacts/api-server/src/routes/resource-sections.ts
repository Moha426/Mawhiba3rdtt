import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, resourceSectionsTable } from "@workspace/db";

const router: IRouter = Router();

function fmt(r: typeof resourceSectionsTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/resource-sections", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(resourceSectionsTable)
    .orderBy(asc(resourceSectionsTable.sortOrder));
  res.json(rows.map(fmt));
});

router.post("/resource-sections", async (req, res): Promise<void> => {
  const { name, sortOrder } = req.body as { name?: string; sortOrder?: number };
  if (!name?.trim()) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const [row] = await db
    .insert(resourceSectionsTable)
    .values({ name: name.trim(), sortOrder: sortOrder ?? 0 })
    .returning();
  res.status(201).json(fmt(row));
});

router.patch("/resource-sections/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { name, sortOrder } = req.body as { name?: string; sortOrder?: number };
  const update: Partial<typeof resourceSectionsTable.$inferInsert> = {};
  if (name !== undefined) update.name = name;
  if (sortOrder !== undefined) update.sortOrder = sortOrder;

  const [row] = await db
    .update(resourceSectionsTable)
    .set(update)
    .where(eq(resourceSectionsTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(fmt(row));
});

router.delete("/resource-sections/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(resourceSectionsTable).where(eq(resourceSectionsTable.id, id));
  res.sendStatus(204);
});

export default router;
