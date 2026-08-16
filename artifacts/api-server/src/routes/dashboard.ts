import { Router, type IRouter } from "express";
import { gte, sql, count } from "drizzle-orm";
import { db, assignmentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [totalResult] = await db.select({ count: count() }).from(assignmentsTable);
  const total = totalResult?.count ?? 0;

  const byTypeResult = await db
    .select({ type: assignmentsTable.type, count: count() })
    .from(assignmentsTable)
    .groupBy(assignmentsTable.type);

  const byPriorityResult = await db
    .select({ priority: assignmentsTable.priority, count: count() })
    .from(assignmentsTable)
    .groupBy(assignmentsTable.priority);

  const [upcomingResult] = await db
    .select({ count: count() })
    .from(assignmentsTable)
    .where(
      sql`${assignmentsTable.dueDate} >= ${today} AND ${assignmentsTable.dueDate} <= ${sevenDaysLater}`,
    );

  const [recentResult] = await db
    .select({ count: count() })
    .from(assignmentsTable)
    .where(sql`${assignmentsTable.createdAt} >= ${sevenDaysAgo}`);

  const typeLabels: Record<string, string> = {
    homework: "واجب منزلي",
    exam: "اختبار",
    project: "مشروع / بحث",
    class_activity: "مهام أدائية",
    resource: "ملفات إثرائية",
    reading: "قراءة",
    other: "أخرى",
  };

  const priorityLabels: Record<string, string> = {
    urgent: "عاجل",
    high: "مهم",
    medium: "متوسط",
    normal: "عادي",
    low: "منخفض",
  };

  res.json({
    total,
    byType: byTypeResult.map((r) => ({
      label: typeLabels[r.type] ?? r.type,
      count: r.count,
    })),
    byPriority: byPriorityResult.map((r) => ({
      label: priorityLabels[r.priority] ?? r.priority,
      count: r.count,
    })),
    upcoming: upcomingResult?.count ?? 0,
    recentlyAdded: recentResult?.count ?? 0,
  });
});

export default router;
