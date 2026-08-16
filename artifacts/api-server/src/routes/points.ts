import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, completionsTable } from "@workspace/db";
import { getStudentFromRequest } from "../middlewares/clerkAuth";

const router: IRouter = Router();

const RANKS = [
  { min: 0,   label: "مبتدئ",    badge: "🌱" },
  { min: 30,  label: "متعلم",    badge: "📚" },
  { min: 80,  label: "متفوق",    badge: "⭐" },
  { min: 150, label: "نجم",      badge: "🏆" },
  { min: 300, label: "أسطورة",   badge: "💎" },
];

function getRank(pts: number) {
  let rank = RANKS[0];
  for (const r of RANKS) { if (pts >= r.min) rank = r; }
  return `${rank.badge} ${rank.label}`;
}

router.get("/points/me", async (req, res): Promise<void> => {
  const studentId = await getStudentFromRequest(req);
  if (!studentId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [row] = await db.select({ cnt: count() }).from(completionsTable).where(eq(completionsTable.studentId, studentId));
  const completions = Number(row?.cnt ?? 0);
  const total = completions * 10;
  res.json({ total, completions, rank: getRank(total) });
});

export default router;
