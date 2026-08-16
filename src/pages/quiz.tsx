import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetQuiz,
  useSubmitQuizAttempt,
  QuizQuestion,
  QuizAttemptResult,
} from "@workspace/api-client-react";
import { LoadingPage } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  RotateCcw,
  ArrowRight,
  BookOpen,
  HelpCircle,
  PlayCircle,
  CheckCheck,
  PenLine,
  AlignJustify,
  Check,
  X,
  AlertTriangle,
  Star,
  ExternalLink,
} from "lucide-react";

type QuestionType = "single_choice" | "true_false" | "essay" | "fill_blank";

function getQuestionTypeLabel(type: QuestionType) {
  switch (type) {
    case "true_false": return "صح أو خطأ";
    case "essay": return "سؤال مقالي";
    case "fill_blank": return "أكمل الفراغ";
    default: return "اختيار من متعدد";
  }
}

export default function QuizPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const quizId = parseInt(params.id ?? "0");

  const { data: quiz, isLoading } = useGetQuiz(quizId);
  const submitAttempt = useSubmitQuizAttempt();

  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (quiz?.timeLimit && started && !result) {
      setTimeLeft(quiz.timeLimit * 60);
    }
  }, [quiz?.timeLimit, started, result]);

  const handleSubmit = useCallback(() => {
    if (!quiz) return;
    const numericAnswers: Record<string, number> = {};
    Object.entries(answers).forEach(([k, v]) => {
      if (typeof v === "number") numericAnswers[k] = v;
    });
    submitAttempt.mutate(
      { id: quizId, data: { answers: numericAnswers as any } },
      { onSuccess: (data) => setResult(data) },
    );
  }, [quiz, quizId, answers, submitAttempt]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(t);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, result]);

  if (isLoading) return <LoadingPage />;
  if (!quiz) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <HelpCircle className="h-12 w-12 text-muted-foreground/40" />
      <p className="text-muted-foreground">الاختبار غير موجود</p>
      <Button variant="outline" onClick={() => setLocation("/quizzes")}>العودة للاختبارات</Button>
    </div>
  );

  const questions = (quiz.questions ?? []) as Array<QuizQuestion & { questionType?: QuestionType }>;
  const scoreableQuestions = questions.filter((q) => {
    const qt = ((q as any).questionType ?? "single_choice") as QuestionType;
    return qt !== "essay" && qt !== "fill_blank";
  });
  const scoreableTotal = scoreableQuestions.length;
  const answeredCount = scoreableQuestions.filter((q) => typeof answers[q.id] === "number").length;
  const accent = quiz.subjectColor ?? "#6366f1";

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  /* ── Results screen ── */
  if (result) {
    return (
      <ResultScreen
        result={result as any}
        quiz={quiz}
        questions={questions}
        answers={answers}
        onRetry={() => {
          setAnswers({});
          setResult(null);
          setStarted(false);
          setTimeLeft(null);
        }}
        onBack={() => setLocation("/quizzes")}
      />
    );
  }

  /* ── Welcome screen ── */
  if (!started) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          className="h-28 w-28 rounded-3xl flex items-center justify-center shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${accent}40, ${accent}18)`,
            border: `2px solid ${accent}50`,
            boxShadow: `0 12px 48px ${accent}30`,
          }}
        >
          <BookOpen className="h-14 w-14" style={{ color: accent }} />
        </motion.div>

        <div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs font-bold px-4 py-1.5 rounded-full mb-3 inline-block"
            style={{ backgroundColor: accent + "22", color: accent }}
          >
            {quiz.subjectName}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-3xl font-black mb-3"
          >
            {quiz.title}
          </motion.h1>
          {quiz.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground max-w-md"
            >
              {quiz.description}
            </motion.p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex gap-4 flex-wrap justify-center"
        >
          {[
            { value: questions.length, label: "سؤال" },
            ...(quiz.timeLimit ? [{ value: quiz.timeLimit, label: "دقيقة" }] : []),
            { value: "60%", label: "للنجاح" },
          ].map((item, i) => (
            <div
              key={i}
              className="glass rounded-2xl px-6 py-4 text-center shadow-lg"
              style={{ border: `1px solid ${accent}20` }}
            >
              <div className="text-2xl font-black" style={{ color: accent }}>
                {item.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 flex-wrap justify-center"
        >
          <Button variant="outline" onClick={() => setLocation("/quizzes")} className="rounded-xl">
            رجوع
          </Button>
          {(quiz as any).externalUrl ? (
            <a
              href={(quiz as any).externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-2.5 shadow-lg text-sm font-bold text-white transition-transform hover:scale-105"
              style={{ backgroundColor: accent, boxShadow: `0 4px 20px ${accent}40` }}
            >
              <ExternalLink className="h-5 w-5" />
              فتح الاختبار عبر الرابط الخارجي
            </a>
          ) : (
            <Button
              onClick={() => setStarted(true)}
              className="rounded-xl px-8 gap-2 shadow-lg"
              style={{ backgroundColor: accent, borderColor: accent, boxShadow: `0 4px 20px ${accent}40` }}
            >
              <PlayCircle className="h-5 w-5" />
              ابدأ الاختبار
            </Button>
          )}
        </motion.div>
      </motion.div>
    );
  }

  /* ── Quiz screen – All questions visible ── */
  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-30 -mx-4 px-4 py-3 flex items-center justify-between gap-3 bg-background/90 backdrop-blur-xl border-b border-border/40"
      >
        <button
          onClick={() => setLocation("/quizzes")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          <span className="hidden sm:inline">الاختبارات</span>
        </button>

        <div className="flex items-center gap-2 flex-1 justify-center">
          {/* Progress pill */}
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{ backgroundColor: accent + "15", color: accent }}
          >
            <CheckCheck className="h-4 w-4" />
            {answeredCount} / {questions.length}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {timeLeft !== null && (
            <motion.div
              animate={timeLeft < 60 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl ${
                timeLeft < 60
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted/60 text-muted-foreground"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: accent }}
          animate={{ width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* All questions */}
      <div className="space-y-5">
        {questions.map((q, qi) => {
          const qType: QuestionType = (q as any).questionType ?? "single_choice";
          const isAnswered = answers[q.id] !== undefined;

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: qi * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Question card */}
              <div
                className="glass-glow rounded-3xl overflow-hidden transition-all duration-300"
                style={{
                  border: `1.5px solid ${isAnswered ? accent + "40" : "rgba(0,0,0,0.07)"}`,
                  boxShadow: isAnswered ? `0 4px 24px ${accent}10` : undefined,
                }}
              >
                {/* Question header */}
                <div className="p-5 pb-3">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center text-sm font-black shrink-0 text-white"
                      style={{ backgroundColor: isAnswered ? accent : accent + "80" }}
                    >
                      {qi + 1}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: accent + "15", color: accent }}
                    >
                      {getQuestionTypeLabel(qType)}
                    </div>
                    {isAnswered && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: accent + "60", backgroundColor: accent + "15" }}
                      >
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                      </motion.div>
                    )}
                  </div>

                  <p className="text-lg font-bold leading-relaxed">{q.text}</p>
                </div>

                {/* Answer area */}
                <div className="px-5 pb-5">
                  {qType === "essay" ? (
                    <EssayInput
                      value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                      onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                      accent={accent}
                    />
                  ) : qType === "fill_blank" ? (
                    <FillBlankInput
                      value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                      onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                      accent={accent}
                    />
                  ) : qType === "true_false" ? (
                    <TrueFalseOptions
                      options={q.options ?? []}
                      selected={typeof answers[q.id] === "number" ? (answers[q.id] as number) : null}
                      onSelect={(optId) => setAnswers((prev) => ({ ...prev, [q.id]: optId }))}
                      accent={accent}
                    />
                  ) : (
                    <SingleChoiceOptions
                      options={q.options ?? []}
                      selected={typeof answers[q.id] === "number" ? (answers[q.id] as number) : null}
                      onSelect={(optId) => setAnswers((prev) => ({ ...prev, [q.id]: optId }))}
                      accent={accent}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Submit button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: questions.length * 0.04 + 0.1 }}
        className="pt-2"
      >
        {scoreableTotal > 0 && answeredCount < scoreableTotal && (
          <p className="text-center text-sm text-muted-foreground mb-3">
            تبقى {scoreableTotal - answeredCount} سؤال بدون إجابة
            {scoreableTotal < questions.length && (
              <span className="text-xs opacity-70 block mt-0.5">الأسئلة المقالية تُصحَّح يدوياً</span>
            )}
          </p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={submitAttempt.isPending}
          size="lg"
          className="w-full rounded-2xl gap-2 text-base font-bold h-14 shadow-xl"
          style={{
            backgroundColor: accent,
            borderColor: accent,
            boxShadow: `0 8px 32px ${accent}40`,
          }}
        >
          <Trophy className="h-5 w-5" />
          {submitAttempt.isPending ? "جاري التصحيح..." : "إنهاء الاختبار وتصحيح"}
        </Button>
      </motion.div>
    </div>
  );
}

/* ─── Single Choice Options ─── */
function SingleChoiceOptions({
  options,
  selected,
  onSelect,
  accent,
}: {
  options: { id: number; text: string }[];
  selected: number | null;
  onSelect: (id: number) => void;
  accent: string;
}) {
  const optionLetters = ["أ", "ب", "ج", "د", "ه", "و"];

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((option, oi) => {
        const isSelected = selected === option.id;
        return (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: oi * 0.05, duration: 0.2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(option.id)}
            className={`relative flex items-center gap-3 p-4 rounded-2xl text-right transition-all duration-200 ${
              isSelected ? "" : "glass hover:scale-[1.01]"
            }`}
            style={
              isSelected
                ? {
                    backgroundColor: accent + "18",
                    border: `2.5px solid ${accent}`,
                    boxShadow: `0 0 0 4px ${accent}15, 0 4px 20px ${accent}20`,
                  }
                : {
                    border: "1.5px solid rgba(0,0,0,0.08)",
                  }
            }
          >
            <div
              className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-200"
              style={
                isSelected
                  ? { backgroundColor: accent, color: "white", boxShadow: `0 4px 12px ${accent}40` }
                  : { backgroundColor: "rgba(0,0,0,0.06)", color: "var(--muted-foreground)" }
              }
            >
              {optionLetters[oi] ?? String.fromCharCode(0x0041 + oi)}
            </div>
            <span
              className={`text-sm leading-relaxed flex-1 ${isSelected ? "font-bold" : "font-medium"}`}
              style={isSelected ? { color: accent } : {}}
            >
              {option.text}
            </span>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: accent }} />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─── True / False Options ─── */
function TrueFalseOptions({
  options,
  selected,
  onSelect,
  accent,
}: {
  options: { id: number; text: string }[];
  selected: number | null;
  onSelect: (id: number) => void;
  accent: string;
}) {
  const colors = { true: "#10b981", false: "#ef4444" };

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const isTrue = option.text === "صح" || option.text === "True" || option.text === "صحيح";
        const color = isTrue ? colors.true : colors.false;
        const isSelected = selected === option.id;

        return (
          <motion.button
            key={option.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelect(option.id)}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl transition-all duration-200 font-bold"
            style={
              isSelected
                ? {
                    backgroundColor: color + "20",
                    border: `2.5px solid ${color}`,
                    boxShadow: `0 0 0 4px ${color}15, 0 4px 20px ${color}20`,
                    color,
                  }
                : {
                    border: "1.5px solid rgba(0,0,0,0.08)",
                    color: "var(--muted-foreground)",
                  }
            }
          >
            {isTrue
              ? <Check className="h-8 w-8" strokeWidth={3} />
              : <X className="h-8 w-8" strokeWidth={3} />}
            <span className="text-base">{option.text}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─── Essay Input ─── */
function EssayInput({
  value,
  onChange,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <PenLine className="h-3.5 w-3.5" />
        اكتب إجابتك كاملةً
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="اكتب إجابتك هنا..."
        dir="rtl"
        rows={4}
        className="w-full resize-none rounded-2xl p-4 text-sm bg-muted/30 focus:outline-none transition-all duration-200"
        style={{
          border: value ? `2px solid ${accent}50` : "1.5px solid rgba(0,0,0,0.08)",
          boxShadow: value ? `0 0 0 3px ${accent}10` : undefined,
        }}
      />
      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        هذا السؤال مقالي ولا يُحسب تلقائياً في الدرجة
      </p>
    </div>
  );
}

/* ─── Fill Blank Input ─── */
function FillBlankInput({
  value,
  onChange,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <AlignJustify className="h-3.5 w-3.5" />
        أكمل الفراغ
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="اكتب الإجابة..."
        dir="rtl"
        className="w-full rounded-2xl px-4 py-3 text-sm bg-muted/30 focus:outline-none transition-all duration-200"
        style={{
          border: value ? `2px solid ${accent}` : "1.5px solid rgba(0,0,0,0.08)",
          boxShadow: value ? `0 0 0 3px ${accent}15` : undefined,
        }}
      />
      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        هذا السؤال لا يُحسب تلقائياً في الدرجة
      </p>
    </div>
  );
}

/* ─── Results Screen ─── */
function ResultScreen({
  result,
  quiz,
  questions,
  answers,
  onRetry,
  onBack,
}: {
  result: any;
  quiz: any;
  questions: Array<QuizQuestion & { questionType?: QuestionType }>;
  answers: Record<number, number | string>;
  onRetry: () => void;
  onBack: () => void;
}) {
  const accent = quiz.subjectColor ?? "#6366f1";
  const pct = result.percentage;
  const passed = result.passed;

  return (
    <motion.div
      className="max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Score hero */}
      <div
        className="glass-glow rounded-3xl p-8 text-center relative overflow-hidden"
        style={{ border: `1.5px solid ${accent}40` }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 50% 50%, ${accent}, transparent 70%)` }}
        />
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", bounce: 0.4 }}
          className="relative"
        >
          <div className="relative h-36 w-36 mx-auto mb-5">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
              <motion.circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke={accent}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${pct} 100`}
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${pct} 100` }}
                transition={{ delay: 0.3, duration: 1.4, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-4xl font-black"
                style={{ color: accent }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {pct}%
              </motion.span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black flex items-center justify-center gap-2">
              {passed
                ? <><Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />أحسنت!</>
                : <><RotateCcw className="h-6 w-6" />حاول مرة أخرى</>}
            </h2>
            <p className="text-muted-foreground">
              أجبت صحيحاً على{" "}
              <strong className="text-foreground">{result.score} من {result.total}</strong>{" "}
              سؤال
            </p>
            <div className={`inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2 rounded-full mt-2 ${
              passed ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-destructive/15 text-destructive"
            }`}>
              {passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {passed ? "ناجح" : "لم تنجح"}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">مراجعة الإجابات</h3>
        {result.breakdown.map((item: any, i: number) => {
          const question = questions.find((q) => q.id === item.questionId);
          const qType: QuestionType = (question as any)?.questionType ?? "single_choice";
          const isEssayType = qType === "essay" || qType === "fill_blank";
          const selectedOption = question?.options?.find((o) => o.id === item.selectedOptionId);
          const correctOption = question?.options?.find((o) => o.id === item.correctOptionId);
          const isCorrect = item.isCorrect;

          return (
            <motion.div
              key={item.questionId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`glass rounded-2xl p-4 border-r-4 ${
                isEssayType
                  ? "border-r-amber-400"
                  : isCorrect
                  ? "border-r-green-500"
                  : "border-r-destructive"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 ${
                  isEssayType
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    : isCorrect
                    ? "bg-green-500/15 text-green-600 dark:text-green-400"
                    : "bg-destructive/15 text-destructive"
                }`}>
                  {isEssayType ? (
                    <PenLine className="h-3.5 w-3.5" />
                  ) : isCorrect ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-2">{item.questionText}</p>
                  {isEssayType ? (
                    <div>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">مقالي – يحتاج مراجعة يدوية</span>
                      {item.essayAnswer && (
                        <p className="text-sm mt-1 text-muted-foreground bg-muted/40 p-2 rounded-lg">
                          إجابتك: {item.essayAnswer}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {!isCorrect && selectedOption && (
                        <p className="text-sm text-destructive/80 mb-1">
                          إجابتك: <span className="line-through">{selectedOption.text}</span>
                        </p>
                      )}
                      {!isCorrect && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          الصحيحة: <strong>{correctOption?.text ?? "—"}</strong>
                        </p>
                      )}
                      {isCorrect && (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
                          {selectedOption?.text}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button variant="outline" onClick={onBack} className="flex-1 rounded-xl gap-2">
          <ArrowRight className="h-4 w-4" />
          الاختبارات
        </Button>
        <Button
          onClick={onRetry}
          className="flex-1 rounded-xl gap-2"
          style={{ backgroundColor: accent, borderColor: accent }}
        >
          <RotateCcw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    </motion.div>
  );
}
