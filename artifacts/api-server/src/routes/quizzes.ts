import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import {
  db,
  subjectsTable,
  quizzesTable,
  quizQuestionsTable,
  quizOptionsTable,
  quizAttemptsTable,
} from "@workspace/db";
import {
  CreateQuizBody,
  ListQuizzesQueryParams,
  GetQuizParams,
  UpdateQuizParams,
  DeleteQuizParams,
  SubmitQuizAttemptParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getQuizWithQuestions(quizId: number) {
  const quiz = await db
    .select()
    .from(quizzesTable)
    .innerJoin(subjectsTable, eq(quizzesTable.subjectId, subjectsTable.id))
    .where(eq(quizzesTable.id, quizId))
    .then((r) => r[0]);

  if (!quiz) return null;

  const questions = await db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.quizId, quizId))
    .orderBy(asc(quizQuestionsTable.sortOrder));

  const allOptions = questions.length
    ? await db
        .select()
        .from(quizOptionsTable)
        .orderBy(asc(quizOptionsTable.sortOrder))
    : [];

  return {
    id: quiz.quizzes.id,
    title: quiz.quizzes.title,
    subjectId: quiz.quizzes.subjectId,
    subjectName: quiz.subjects.name,
    subjectColor: quiz.subjects.color,
    description: quiz.quizzes.description ?? null,
    timeLimit: quiz.quizzes.timeLimit ?? null,
    startDate: quiz.quizzes.startDate ?? null,
    createdAt: quiz.quizzes.createdAt.toISOString(),
    questions: questions.map((q) => ({
      id: q.id,
      text: q.text,
      questionType: q.questionType ?? "single_choice",
      sortOrder: q.sortOrder,
      options: allOptions
        .filter((o) => o.questionId === q.id)
        .map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
          sortOrder: o.sortOrder,
        })),
    })),
  };
}

router.get("/quizzes", async (req, res): Promise<void> => {
  const params = ListQuizzesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(quizzesTable)
    .innerJoin(subjectsTable, eq(quizzesTable.subjectId, subjectsTable.id))
    .orderBy(asc(quizzesTable.createdAt));

  const filtered = params.data.subjectId
    ? rows.filter((r) => r.quizzes.subjectId === params.data.subjectId)
    : rows;

  const questionCounts = await Promise.all(
    filtered.map(async (r) => {
      const qs = await db
        .select()
        .from(quizQuestionsTable)
        .where(eq(quizQuestionsTable.quizId, r.quizzes.id));
      return { id: r.quizzes.id, count: qs.length };
    }),
  );

  const countMap = new Map(questionCounts.map((q) => [q.id, q.count]));

  res.json(
    filtered.map((r) => ({
      id: r.quizzes.id,
      title: r.quizzes.title,
      subjectId: r.quizzes.subjectId,
      subjectName: r.subjects.name,
      subjectColor: r.subjects.color,
      description: r.quizzes.description ?? null,
      timeLimit: r.quizzes.timeLimit ?? null,
      startDate: r.quizzes.startDate ?? null,
      questionCount: countMap.get(r.quizzes.id) ?? 0,
      createdAt: r.quizzes.createdAt.toISOString(),
    })),
  );
});

router.get("/quizzes/:id", async (req, res): Promise<void> => {
  const params = GetQuizParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const quiz = await getQuizWithQuestions(params.data.id);
  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }
  res.json(quiz);
});

router.post("/quizzes", async (req, res): Promise<void> => {
  const body = CreateQuizBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { title, subjectId, description, timeLimit, startDate, questions } = body.data;
  const questionList = questions ?? [];

  const [quiz] = await db
    .insert(quizzesTable)
    .values({ title, subjectId, description, timeLimit, startDate: startDate ?? null })
    .returning();

  for (let qi = 0; qi < questionList.length; qi++) {
    const q = questionList[qi];
    const questionType = q.questionType ?? "single_choice";
    const [question] = await db
      .insert(quizQuestionsTable)
      .values({ quizId: quiz.id, text: q.text, questionType, sortOrder: qi })
      .returning();

    const opts = q.options ?? [];
    for (let oi = 0; oi < opts.length; oi++) {
      const opt = opts[oi];
      await db.insert(quizOptionsTable).values({
        questionId: question.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
        sortOrder: oi,
      });
    }
  }

  const result = await getQuizWithQuestions(quiz.id);
  res.status(201).json(result);
});

router.patch("/quizzes/:id", async (req, res): Promise<void> => {
  const params = UpdateQuizParams.safeParse(req.params);
  const body = CreateQuizBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { title, subjectId, description, timeLimit, startDate, questions } = body.data;

  await db
    .update(quizzesTable)
    .set({ title, subjectId, description, timeLimit, startDate: startDate ?? null })
    .where(eq(quizzesTable.id, params.data.id));

  const existingQs = await db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.quizId, params.data.id));

  for (const q of existingQs) {
    await db.delete(quizOptionsTable).where(eq(quizOptionsTable.questionId, q.id));
  }
  await db
    .delete(quizQuestionsTable)
    .where(eq(quizQuestionsTable.quizId, params.data.id));

  const patchQuestionList = questions ?? [];
  for (let qi = 0; qi < patchQuestionList.length; qi++) {
    const q = patchQuestionList[qi];
    const questionType = q.questionType ?? "single_choice";
    const [question] = await db
      .insert(quizQuestionsTable)
      .values({ quizId: params.data.id, text: q.text, questionType, sortOrder: qi })
      .returning();

    const opts = q.options ?? [];
    for (let oi = 0; oi < opts.length; oi++) {
      const opt = opts[oi];
      await db.insert(quizOptionsTable).values({
        questionId: question.id,
        text: opt.text,
        isCorrect: opt.isCorrect,
        sortOrder: oi,
      });
    }
  }

  const result = await getQuizWithQuestions(params.data.id);
  res.json(result);
});

router.delete("/quizzes/:id", async (req, res): Promise<void> => {
  const params = DeleteQuizParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const qs = await db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.quizId, params.data.id));
  for (const q of qs) {
    await db.delete(quizOptionsTable).where(eq(quizOptionsTable.questionId, q.id));
  }
  await db.delete(quizQuestionsTable).where(eq(quizQuestionsTable.quizId, params.data.id));
  await db.delete(quizAttemptsTable).where(eq(quizAttemptsTable.quizId, params.data.id));
  await db.delete(quizzesTable).where(eq(quizzesTable.id, params.data.id));

  res.json({ success: true });
});

router.post("/quizzes/:id/attempt", async (req, res): Promise<void> => {
  const params = SubmitQuizAttemptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid quiz id" });
    return;
  }

  const rawAnswers = req.body?.answers;
  if (rawAnswers == null || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) {
    res.status(400).json({ error: "answers must be an object" });
    return;
  }

  const questions = await db
    .select()
    .from(quizQuestionsTable)
    .where(eq(quizQuestionsTable.quizId, params.data.id))
    .orderBy(asc(quizQuestionsTable.sortOrder));

  const allOptions = await db.select().from(quizOptionsTable);
  const answers = rawAnswers as Record<string, number | string>;

  const breakdown = questions.map((q) => {
    const qOptions = allOptions.filter((o) => o.questionId === q.id);
    const correctOpt = qOptions.find((o) => o.isCorrect);
    const isEssay = q.questionType === "essay" || q.questionType === "fill_blank";

    if (isEssay) {
      return {
        questionId: q.id,
        questionText: q.text,
        questionType: q.questionType,
        selectedOptionId: null,
        correctOptionId: null,
        isCorrect: null,
        essayAnswer: answers[q.id] ?? null,
      };
    }

    const selectedOptId = typeof answers[q.id] === "number" ? (answers[q.id] as number) : null;
    const isCorrect = correctOpt ? selectedOptId === correctOpt.id : false;

    return {
      questionId: q.id,
      questionText: q.text,
      questionType: q.questionType ?? "single_choice",
      selectedOptionId: selectedOptId,
      correctOptionId: correctOpt?.id ?? 0,
      isCorrect,
      essayAnswer: null,
    };
  });

  const gradedItems = breakdown.filter((b) => b.isCorrect !== null);
  const score = gradedItems.filter((b) => b.isCorrect).length;
  const total = gradedItems.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  await db.insert(quizAttemptsTable).values({
    quizId: params.data.id,
    score,
    totalQuestions: total,
    answers: answers as unknown as Record<string, number[]>,
  });

  res.json({ score, total, percentage, passed: percentage >= 60, breakdown });
});

export default router;
