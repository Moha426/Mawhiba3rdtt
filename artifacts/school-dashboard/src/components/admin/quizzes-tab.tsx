import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListQuizzes,
  useCreateQuiz,
  useUpdateQuiz,
  useDeleteQuiz,
  useListSubjects,
  getListQuizzesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Edit,
  HelpCircle,
  CheckCircle,
  XCircle,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  PenLine,
  AlignJustify,
  ToggleLeft,
  ListChecks,
  Check,
  X,
  AlertTriangle,
  FileText,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { BulkQuizImport, type ParsedQuestion } from "./bulk-quiz-import";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";

type QuestionType = "single_choice" | "true_false" | "essay" | "fill_blank";

const QUESTION_TYPES: { value: QuestionType; label: string; icon: typeof PenLine; description: string }[] = [
  { value: "single_choice", label: "اختيار من متعدد", icon: ListChecks, description: "إجابة واحدة صحيحة" },
  { value: "true_false", label: "صح أو خطأ", icon: ToggleLeft, description: "خياران فقط" },
  { value: "essay", label: "سؤال مقالي", icon: PenLine, description: "إجابة نصية مفتوحة" },
  { value: "fill_blank", label: "أكمل الفراغ", icon: AlignJustify, description: "نص قصير" },
];

type QuestionDraft = {
  text: string;
  questionType: QuestionType;
  options: { text: string; isCorrect: boolean }[];
};

type QuizFormData = {
  title: string;
  subjectId: number | null;
  description: string;
  timeLimit: string;
  startDate: string;
  questions: QuestionDraft[];
};

const TRUE_FALSE_OPTIONS = [
  { text: "صح", isCorrect: true },
  { text: "خطأ", isCorrect: false },
];

const emptyQuestion = (type: QuestionType = "single_choice"): QuestionDraft => {
  if (type === "true_false") {
    return { text: "", questionType: "true_false", options: [...TRUE_FALSE_OPTIONS] };
  }
  if (type === "essay" || type === "fill_blank") {
    return { text: "", questionType: type, options: [] };
  }
  return {
    text: "",
    questionType: "single_choice",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  };
};

const emptyForm = (): QuizFormData => ({
  title: "",
  subjectId: null,
  description: "",
  timeLimit: "",
  startDate: "",
  questions: [emptyQuestion()],
});


export function QuizzesTab() {
  const { data: quizzes, isLoading } = useListQuizzes();
  const { data: subjects } = useListSubjects();
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const deleteQuiz = useDeleteQuiz();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<QuizFormData>(emptyForm());
  const [expandedQ, setExpandedQ] = useState<number | null>(0);
  const [inputMode, setInputMode] = useState<"manual" | "bulk">("manual");

  const handleBulkImport = (parsed: ParsedQuestion[], mode: "replace" | "append") => {
    const newQuestions: QuestionDraft[] = parsed.map((q) => ({
      text: q.text,
      questionType: q.questionType,
      options: q.options,
    }));
    setForm((f) => ({
      ...f,
      questions: mode === "replace" ? (newQuestions.length > 0 ? newQuestions : [emptyQuestion()]) : [...f.questions, ...newQuestions],
    }));
    setInputMode("manual");
    setExpandedQ(0);
    toast({ title: `تم استيراد ${parsed.length} سؤال بنجاح` });
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setExpandedQ(0);
    setInputMode("manual");
    setOpen(true);
  };

  const openEdit = (quiz: any) => {
    setEditId(quiz.id);
    setForm({
      title: quiz.title,
      subjectId: quiz.subjectId,
      description: quiz.description ?? "",
      timeLimit: quiz.timeLimit ? String(quiz.timeLimit) : "",
      startDate: quiz.startDate ?? "",
      questions: (quiz.questions ?? []).map((q: any) => ({
        text: q.text,
        questionType: (q.questionType as QuestionType) ?? "single_choice",
        options: q.options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })),
      })),
    });
    setExpandedQ(0);
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الاختبار؟")) return;
    deleteQuiz.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey() });
        toast({ title: "تم الحذف بنجاح" });
      },
    });
  };

  const addQuestion = (type: QuestionType = "single_choice") => {
    const newQ = emptyQuestion(type);
    setForm((f) => ({ ...f, questions: [...f.questions, newQ] }));
    setExpandedQ(form.questions.length);
  };

  const removeQuestion = (qi: number) => {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== qi) }));
    setExpandedQ(null);
  };

  const updateQuestion = (qi: number, text: string) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === qi ? { ...q, text } : q)),
    }));
  };

  const changeQuestionType = (qi: number, newType: QuestionType) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => {
        if (i !== qi) return q;
        const newQ = emptyQuestion(newType);
        return { ...newQ, text: q.text };
      }),
    }));
  };

  const updateOption = (qi: number, oi: number, text: string) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, text } : o)) }
          : q,
      ),
    }));
  };

  const setCorrectOption = (qi: number, oi: number) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })) }
          : q,
      ),
    }));
  };

  const setTrueFalseCorrect = (qi: number, isTrue: boolean) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qi
          ? {
              ...q,
              options: [
                { text: "صح", isCorrect: isTrue },
                { text: "خطأ", isCorrect: !isTrue },
              ],
            }
          : q,
      ),
    }));
  };

  const addOption = (qi: number) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qi
          ? { ...q, options: [...q.options, { text: "", isCorrect: false }] }
          : q,
      ),
    }));
  };

  const removeOption = (qi: number, oi: number) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.filter((_, j) => j !== oi) }
          : q,
      ),
    }));
  };

  const handleSubmit = () => {
    if (!form.title || !form.subjectId || form.questions.length === 0) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    for (const q of form.questions) {
      if (!q.text) {
        toast({ title: "يرجى كتابة نص لكل سؤال", variant: "destructive" });
        return;
      }
      if (q.questionType === "single_choice") {
        if (q.options.length < 2 || !q.options.some((o) => o.isCorrect && o.text)) {
          toast({ title: "أسئلة الاختيار تحتاج خيارين على الأقل وإجابة صحيحة", variant: "destructive" });
          return;
        }
      }
      if (q.questionType === "true_false") {
        if (!q.options.some((o) => o.isCorrect)) {
          toast({ title: "حدد الإجابة الصحيحة لأسئلة صح/خطأ", variant: "destructive" });
          return;
        }
      }
    }

    const data = {
      title: form.title,
      subjectId: form.subjectId!,
      description: form.description || undefined,
      timeLimit: form.timeLimit ? parseInt(form.timeLimit) : undefined,
      startDate: form.startDate || undefined,
      questions: form.questions.map((q) => ({
        text: q.text,
        questionType: q.questionType,
        options: q.questionType === "essay" || q.questionType === "fill_blank"
          ? []
          : q.options.filter((o) => o.text || q.questionType === "true_false"),
      })),
    };

    const cb = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey() });
        setOpen(false);
        toast({ title: editId ? "تم التحديث بنجاح" : "تم إنشاء الاختبار بنجاح" });
      },
    };

    if (editId) {
      updateQuiz.mutate({ id: editId, data }, cb);
    } else {
      createQuiz.mutate({ data }, cb);
    }
  };

  if (isLoading)
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">الاختبارات التفاعلية</h2>
        <Button onClick={openNew} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          اختبار جديد
        </Button>
      </div>

      {/* Quiz list */}
      {quizzes?.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-muted/30 rounded-2xl border border-dashed flex flex-col items-center gap-3">
          <HelpCircle className="h-10 w-10 opacity-30" />
          <p>لا توجد اختبارات حتى الآن. أنشئ أول اختبار!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes?.map((quiz) => (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-4 border-r-4"
              style={{ borderRightColor: quiz.subjectColor }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: quiz.subjectColor + "20", color: quiz.subjectColor }}
                    >
                      {quiz.subjectName}
                    </span>
                    {quiz.timeLimit && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {quiz.timeLimit} دقيقة
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold mb-1 truncate">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{quiz.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>{quiz.questionCount} سؤال</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(quiz)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(quiz.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "تعديل الاختبار" : "إنشاء اختبار جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">عنوان الاختبار *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="مثال: اختبار المشتقات"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المادة *</label>
                <Select
                  value={form.subjectId ? String(form.subjectId) : ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, subjectId: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">الوصف</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="وصف مختصر للاختبار"
                  className="resize-none h-20"
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">وقت الاختبار (دقائق)</label>
                  <Input
                    type="number"
                    value={form.timeLimit}
                    onChange={(e) => setForm((f) => ({ ...f, timeLimit: e.target.value }))}
                    placeholder="اتركه فارغاً لبدون حد زمني"
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ البدء</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">اتركه فارغاً إذا متاح الآن</p>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">الأسئلة ({form.questions.length})</label>
                <div className="flex items-center gap-2">
                  {/* Mode toggle */}
                  <div className="flex rounded-xl border border-border/60 overflow-hidden text-xs h-8">
                    <button
                      type="button"
                      onClick={() => setInputMode("manual")}
                      className={`px-3 flex items-center gap-1.5 transition-colors ${
                        inputMode === "manual"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Plus className="h-3 w-3" />
                      سؤال سؤال
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("bulk")}
                      className={`px-3 flex items-center gap-1.5 border-r border-border/60 transition-colors ${
                        inputMode === "bulk"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <FileText className="h-3 w-3" />
                      استيراد نصي
                    </button>
                  </div>
                  {inputMode === "manual" && <AddQuestionMenu onAdd={addQuestion} />}
                </div>
              </div>

              {inputMode === "bulk" ? (
                <BulkQuizImport onImport={handleBulkImport} />
              ) : (
                <div className="space-y-2">
                  {form.questions.map((q, qi) => (
                    <QuestionEditor
                      key={qi}
                      question={q}
                      index={qi}
                      isExpanded={expandedQ === qi}
                      onToggle={() => setExpandedQ(expandedQ === qi ? null : qi)}
                      onRemove={form.questions.length > 1 ? () => removeQuestion(qi) : undefined}
                      onMoveUp={qi > 0 ? () => setForm(prev => {
                        const qs = [...prev.questions];
                        [qs[qi - 1], qs[qi]] = [qs[qi], qs[qi - 1]];
                        return { ...prev, questions: qs };
                      }) : undefined}
                      onMoveDown={qi < form.questions.length - 1 ? () => setForm(prev => {
                        const qs = [...prev.questions];
                        [qs[qi], qs[qi + 1]] = [qs[qi + 1], qs[qi]];
                        return { ...prev, questions: qs };
                      }) : undefined}
                      onTextChange={(text) => updateQuestion(qi, text)}
                      onTypeChange={(type) => changeQuestionType(qi, type)}
                      onOptionChange={(oi, text) => updateOption(qi, oi, text)}
                      onCorrectChange={(oi) => setCorrectOption(qi, oi)}
                      onTrueFalseCorrect={(isTrue) => setTrueFalseCorrect(qi, isTrue)}
                      onAddOption={() => addOption(qi)}
                      onRemoveOption={(oi) => removeOption(qi, oi)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createQuiz.isPending || updateQuiz.isPending}
              className="rounded-xl gap-2"
            >
              <BookOpen className="h-4 w-4" />
              {createQuiz.isPending || updateQuiz.isPending ? "جاري الحفظ..." : "حفظ الاختبار"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Add Question Menu ─── */
function AddQuestionMenu({ onAdd }: { onAdd: (type: QuestionType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-1.5 rounded-lg text-xs h-8"
      >
        <Plus className="h-3.5 w-3.5" />
        سؤال جديد
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 z-50 w-52 glass-strong rounded-2xl shadow-xl overflow-hidden border border-border/50"
          >
            {QUESTION_TYPES.map(({ value, label, icon: Icon, description }) => (
              <button
                key={value}
                onClick={() => { onAdd(value); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary/8 transition-colors text-right"
              >
                <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold">{label}</div>
                  <div className="text-[10px] text-muted-foreground">{description}</div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Question Editor ─── */
function QuestionEditor({
  question,
  index,
  isExpanded,
  onToggle,
  onRemove,
  onMoveUp,
  onMoveDown,
  onTextChange,
  onTypeChange,
  onOptionChange,
  onCorrectChange,
  onTrueFalseCorrect,
  onAddOption,
  onRemoveOption,
}: {
  question: QuestionDraft;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onTextChange: (text: string) => void;
  onTypeChange: (type: QuestionType) => void;
  onOptionChange: (oi: number, text: string) => void;
  onCorrectChange: (oi: number) => void;
  onTrueFalseCorrect: (isTrue: boolean) => void;
  onAddOption: () => void;
  onRemoveOption: (oi: number) => void;
}) {
  const typeInfo = QUESTION_TYPES.find((t) => t.value === question.questionType);
  const isValid =
    question.text &&
    ((question.questionType === "single_choice" &&
      question.options.length >= 2 &&
      question.options.some((o) => o.isCorrect && o.text)) ||
      (question.questionType === "true_false" && question.options.some((o) => o.isCorrect)) ||
      question.questionType === "essay" ||
      question.questionType === "fill_blank");

  const optionLetters = ["أ", "ب", "ج", "د", "ه", "و"];

  return (
    <div className="border border-border/60 rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
          isExpanded ? "bg-primary/8" : "hover:bg-muted/40"
        }`}
        onClick={onToggle}
      >
        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-black shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${!question.text ? "text-muted-foreground italic" : "font-medium"}`}>
            {question.text || "سؤال بدون نص..."}
          </p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            {typeInfo?.icon && <typeInfo.icon className="h-2.5 w-2.5 inline shrink-0" />}
            {typeInfo?.label}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isValid && <CheckCircle className="h-4 w-4 text-green-500" />}
          {onMoveUp && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="تحريك لأعلى"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="تحريك لأسفل"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          )}
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-2 space-y-4 border-t border-border/60">
              {/* Question type selector */}
              <div className="grid grid-cols-2 gap-2">
                {QUESTION_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => onTypeChange(value)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-right text-xs font-medium transition-all ${
                      question.questionType === value
                        ? "bg-primary/15 text-primary border-2 border-primary/30"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/70 border border-transparent"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Question text */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">نص السؤال *</label>
                <Textarea
                  value={question.text}
                  onChange={(e) => onTextChange(e.target.value)}
                  placeholder="اكتب السؤال هنا..."
                  className="resize-none h-20 text-sm"
                />
              </div>

              {/* Options based on type */}
              {question.questionType === "single_choice" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">
                      الخيارات (اضغط على الحرف لتحديد الصحيح)
                    </label>
                    {question.options.length < 6 && (
                      <button
                        onClick={onAddOption}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        إضافة خيار
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {question.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <button
                          onClick={() => onCorrectChange(oi)}
                          className={`shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-sm font-black transition-all ${
                            opt.isCorrect
                              ? "bg-green-500 text-white shadow-sm"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          {optionLetters[oi] ?? String.fromCharCode(0x0041 + oi)}
                        </button>
                        <Input
                          value={opt.text}
                          onChange={(e) => onOptionChange(oi, e.target.value)}
                          placeholder={`الخيار ${optionLetters[oi] ?? String.fromCharCode(0x0041 + oi)}`}
                          className={`flex-1 text-sm h-9 ${opt.isCorrect ? "border-green-500/40 bg-green-500/5" : ""}`}
                        />
                        {question.options.length > 2 && (
                          <button
                            onClick={() => onRemoveOption(oi)}
                            className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {question.questionType === "true_false" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">الإجابة الصحيحة</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { isTrue: true, label: "صح", Icon: Check, color: "#10b981" },
                      { isTrue: false, label: "خطأ", Icon: X, color: "#ef4444" },
                    ].map(({ isTrue, label, Icon, color }) => {
                      const isSelected = question.options.find((o) => o.text === (isTrue ? "صح" : "خطأ"))?.isCorrect ?? false;
                      return (
                        <button
                          key={String(isTrue)}
                          onClick={() => onTrueFalseCorrect(isTrue)}
                          className="p-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5"
                          style={
                            isSelected
                              ? { backgroundColor: color + "20", border: `2px solid ${color}`, color }
                              : { backgroundColor: "var(--muted)", border: "2px solid transparent", color: "var(--muted-foreground)" }
                          }
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.5} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(question.questionType === "essay" || question.questionType === "fill_blank") && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {question.questionType === "essay" ? "الأسئلة المقالية" : "أسئلة الفراغ"} لا تُصحَّح تلقائياً — تظهر للطالب في النتيجة كـ"تحتاج مراجعة"
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
