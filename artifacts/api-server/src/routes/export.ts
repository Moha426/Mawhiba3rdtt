import { Router, type IRouter } from "express";
import { db, studentsTable, subjectsTable, assignmentsTable, quizzesTable, quizQuestionsTable, quizOptionsTable, scheduleTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/admin/export", async (_req, res): Promise<void> => {
  const [students, subjects, assignments, quizzes, schedule] = await Promise.all([
    db.select().from(studentsTable).orderBy(studentsTable.displayName),
    db.select().from(subjectsTable).orderBy(subjectsTable.name),
    db.select().from(assignmentsTable).orderBy(assignmentsTable.createdAt),
    db.select().from(quizzesTable).orderBy(quizzesTable.createdAt),
    db.select().from(scheduleTable).orderBy(scheduleTable.dayOfWeek, scheduleTable.periodNumber),
  ]);

  const quizIds = quizzes.map((q) => q.id);
  let quizzesWithQuestions: typeof quizzes[0][] = [];

  if (quizIds.length > 0) {
    const questions = await db.select().from(quizQuestionsTable);
    const options = await db.select().from(quizOptionsTable);

    quizzesWithQuestions = quizzes.map((q) => ({
      ...q,
      questions: questions
        .filter((qst) => qst.quizId === q.id)
        .map((qst) => ({
          ...qst,
          options: options.filter((o) => o.questionId === qst.id),
        })),
    })) as typeof quizzes[0][];
  } else {
    quizzesWithQuestions = quizzes;
  }

  res.json({
    exportedAt: new Date().toISOString(),
    students: students.map((s) => ({
      id: s.id,
      username: s.username,
      displayName: s.displayName,
      role: s.role,
      createdAt: s.createdAt.toISOString(),
    })),
    subjects: subjects.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      teacherName: s.teacherName ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
    assignments,
    quizzes: quizzesWithQuestions,
    schedule,
  });
});

export default router;
