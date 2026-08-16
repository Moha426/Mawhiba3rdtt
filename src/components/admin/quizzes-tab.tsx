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
import { Badge } from "@/components/ui/badge";
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
  ExternalLink,
  Link2,
  Globe,
  Sparkles,
} from "lucide-react";
import { BulkQuizImport, type ParsedQuestion } from "./bulk-quiz-import";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";

type QuestionType = "single_choice" | "true_false" | "essay" | "fill_blank";
type QuizMode = "interactive" | "link";

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
  quizType: QuizMode;
  externalUrl: string;
  estimatedQuestions: string;
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
  quizType: "interactive",
  externalUrl: "",
  estimatedQuestions: "",
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
    const isLink = Boolean(quiz.externalUrl || quiz.quizType === "link");
    setForm({
      title: quiz.title || "",
      subjectId: quiz.subjectId || null,
      description: quiz.description ?? "",
      timeLimit: quiz.timeLimit ? String(quiz.timeLimit) : "",
      startDate: quiz.startDate ?? "",
      quizType: isLink ? "link" : "interactive",
      externalUrl: quiz.externalUrl ?? "",
      estimatedQuestions: quiz.questionCount ? String(quiz.questionCount) : "",
      questions: (quiz.questions && quiz.questions.length > 0)
        ? quiz.questions.map((q: any) => ({
            text: q.text || q.question || "",
            questionType: (q.questionType as QuestionType) ?? "single_choice",
            options: (q.options ?? []).map((o: any) =>
              typeof o === "string"
                ? { text: o, isCorrect: false }
                : { text: o.text || "", isCorrect: Boolean(o.isCorrect) }
            ),
          }))
        : [emptyQuestion()],
    });
    setExpandedQ(0);
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteQuiz.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey() });
        toast({ title: "تم حذف الاختبار بنجاح 🗑️" });
      },
      onError: (err: any) => {
        toast({ title: "فشل الحذف", description: err?.message ?? "خطأ غير معروف", variant: "destructive" });
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
    if (!form.title.trim() || !form.subjectId) {
      toast({ title: "يرجى تحديد عنوان الاختبار واختيار المادة", variant: "destructive" });
      return;
    }

    const selectedSubj = subjects?.find((s) => s.id === form.subjectId);

    if (form.quizType === "link") {
      if (!form.externalUrl.trim()) {
        toast({ title: "يرجى إدخال رابط الاختبار الخارجي", variant: "destructive" });
        return;
      }

      let cleanUrl = form.externalUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = "https://" + cleanUrl;
      }

      const estimatedQ = form.estimatedQuestions ? parseInt(form.estimatedQuestions) || 1 : 1;

      const data = {
        title: form.title.trim(),
        subjectId: form.subjectId,
        subjectName: selectedSubj?.name || "عام",
        subjectColor: selectedSubj?.color || "#3b82f6",
        description: form.description.trim() || undefined,
        timeLimit: form.timeLimit ? parseInt(form.timeLimit) : undefined,
        startDate: form.startDate || undefined,
        quizType: "link",
        externalUrl: cleanUrl,
        questionCount: estimatedQ,
        questions: [],
      };

      const cb = {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey() });
          setOpen(false);
          toast({ title: editId ? "تم تحديث رابط الاختبار بنجاح" : "تمت إضافة رابط الاختبار بنجاح 🔗" });
        },
      };

      if (editId) {
        updateQuiz.mutate({ id: editId, data }, cb);
      } else {
        createQuiz.mutate({ data }, cb);
      }
      return;
    }

    // Interactive quiz validation
    if (form.questions.length === 0) {
      toast({ title: "يرجى إضافة سؤال واحد على الأقل", variant: "destructive" });
      return;
    }

    for (const q of form.questions) {
      if (!q.text.trim()) {
        toast({ title: "يرجى كتابة نص لكل سؤال", variant: "destructive" });
        return;
      }
      if (q.questionType === "single_choice") {
        if (q.options.length < 2 || !q.options.some((o) => o.isCorrect && o.text.trim())) {
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
      title: form.title.trim(),
      subjectId: form.subjectId,
      subjectName: selectedSubj?.name || "عام",
      subjectColor: selectedSubj?.color || "#3b82f6",
      description: form.description.trim() || undefined,
      timeLimit: form.timeLimit ? parseInt(form.timeLimit) : undefined,
      startDate: form.startDate || undefined,
      quizType: "interactive",
      externalUrl: undefined,
      questionCount: form.questions.length,
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
        toast({ title: editId ? "تم التحديث بنجاح" : "تم إنشاء الاختبار بنجاح 📝" });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">الاختبارات والنماذج</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            إدارة الاختبارات التفاعلية وروابط النماذج الخارجية (Google Forms, Quizizz, إلخ)
          </p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <Plus className="h-4 w-4" />
          إضافة اختبار / نموذج جديد
        </Button>
      </div>

      {/* Quiz list */}
      {quizzes?.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-muted/30 rounded-2xl border border-dashed flex flex-col items-center gap-3">
          <HelpCircle className="h-10 w-10 opacity-30" />
          <p>لا توجد اختبارات حتى الآن. أضف أول اختبار أو رابط نموذج!</p>
          <Button onClick={openNew} variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            إنشاء اختبار
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes?.map((quiz) => {
            const isLink = Boolean(quiz.externalUrl || quiz.quizType === "link");
            return (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 border-r-4 relative overflow-hidden group"
                style={{ borderRightColor: quiz.subjectColor || "#3b82f6" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-lg"
                        style={{
                          backgroundColor: (quiz.subjectColor || "#3b82f6") + "20",
                          color: quiz.subjectColor || "#3b82f6",
                        }}
                      >
                        {quiz.subjectName || "عام"}
                      </span>

                      {isLink ? (
                        <Badge variant="outline" className="text-[11px] gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          <Link2 className="h-3 w-3" />
                          رابط خارجي
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">
                          <ListChecks className="h-3 w-3" />
                          تفاعلي
                        </Badge>
                      )}

                      {quiz.timeLimit && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {quiz.timeLimit} دقيقة
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-base mb-1 truncate">{quiz.title}</h3>

                    {quiz.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{quiz.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-3.5 w-3.5" />
                        {isLink ? (quiz.questionCount ? `${quiz.questionCount} سؤال (تقديري)` : "نموذج اختبار") : `${quiz.questionCount || quiz.questions?.length || 0} سؤال`}
                      </span>

                      {isLink && quiz.externalUrl && (
                        <a
                          href={quiz.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 text-xs font-medium truncate max-w-[200px]"
                          title={quiz.externalUrl}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          {quiz.externalUrl.replace(/^https?:\/\//i, "")}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLink && quiz.externalUrl && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                        title="فتح الرابط في نافذة جديدة"
                        asChild
                      >
                        <a href={quiz.externalUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(quiz)} title="تعديل">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(quiz.id)}
                      title="حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {editId ? "تعديل الاختبار / النموذج" : "إضافة اختبار أو نموذج جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Mode selection: Interactive vs External Link */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">طريقة الاختبار</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-2xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, quizType: "interactive" }))}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    form.quizType === "interactive"
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListChecks className="h-4 w-4 text-indigo-500" />
                  <span>اختبار تفاعلي (أسئلة)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, quizType: "link" }))}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    form.quizType === "link"
                      ? "bg-card text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Link2 className="h-4 w-4 text-amber-500" />
                  <span>رابط اختبار خارجي 🔗</span>
                </button>
              </div>
            </div>

            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">عنوان الاختبار أو النموذج *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={form.quizType === "link" ? "مثال: نموذج اختبار القدرات - Google Forms" : "مثال: اختبار الرياضيات الشامل"}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المادة أو القسم *</label>
                <Select
                  value={form.subjectId ? String(form.subjectId) : ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, subjectId: parseInt(v) }))}
                >
                  <SelectTrigger className="rounded-xl">
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

            <div className="space-y-2">
              <label className="text-sm font-medium">تفاصيل الاختبار أو النموذج (اختياري)</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="اكتب وصفاً أو تفاصيل إضافية عن محتوى الاختبار..."
                className="rounded-xl min-h-[80px]"
              />
            </div>

            {/* External URL section if Link Mode is chosen */}
            {form.quizType === "link" ? (
              <div className="space-y-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                      <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      رابط الاختبار الخارجي (URL) *
                    </label>
                    {form.externalUrl && (
                      <a
                        href={form.externalUrl.startsWith("http") ? form.externalUrl : `https://${form.externalUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        تجربة الرابط
                      </a>
                    )}
                  </div>
                  <Input
                    value={form.externalUrl}
                    onChange={(e) => setForm((f) => ({ ...f, externalUrl: e.target.value }))}
                    placeholder="https://docs.google.com/forms/d/e/... أو Quizizz أو غيرها"
                    dir="ltr"
                    className="rounded-xl text-left font-mono text-xs bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    يدعم جميع الروابط: نماذج Google Forms، نماذج Microsoft Forms، منصة Quizizz، Kahoot، قياس، موهبة، أو أي موقع اختبارات آخر.
                  </p>
                </div>

                {/* Quick Presets / Suggestions */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">أمثلة سريعة للمنصات:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "Google Forms 📋", domain: "forms.google.com" },
                      { name: "Microsoft Forms 📊", domain: "forms.office.com" },
                      { name: "Quizizz ⚡", domain: "quizizz.com/join" },
                      { name: "منصة قياس 🌐", domain: "qiyas.sa" },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (!form.externalUrl) {
                            setForm((f) => ({ ...f, externalUrl: `https://${p.domain}` }));
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60 transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-amber-500/20">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">عدد الأسئلة التقريبي (اختياري)</label>
                    <Input
                      type="number"
                      value={form.estimatedQuestions}
                      onChange={(e) => setForm((f) => ({ ...f, estimatedQuestions: e.target.value }))}
                      placeholder="مثال: 15"
                      min="1"
                      className="rounded-xl bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المدة الموصى بها بالدقائق (اختياري)</label>
                    <Input
                      type="number"
                      value={form.timeLimit}
                      onChange={(e) => setForm((f) => ({ ...f, timeLimit: e.target.value }))}
                      placeholder="مثال: 20"
                      min="1"
                      className="rounded-xl bg-background"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Description & Times */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">الوصف أو التعليمات</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="وصف مختصر للاختبار، التوجيهات أو الملاحظات للطلاب"
                  className="resize-none h-24 rounded-xl"
                />
              </div>

              <div className="space-y-3">
                {form.quizType === "interactive" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">وقت الاختبار التفاعلي (دقائق)</label>
                    <Input
                      type="number"
                      value={form.timeLimit}
                      onChange={(e) => setForm((f) => ({ ...f, timeLimit: e.target.value }))}
                      placeholder="اتركه فارغاً لبدون حد زمني"
                      min="1"
                      className="rounded-xl"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">تاريخ الإتاحة / البدء</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">اتركه فارغاً إذا كان متاحاً في أي وقت</p>
                </div>
              </div>
            </div>

            {/* Questions section (only for interactive mode) */}
            {form.quizType === "interactive" && (
              <div className="space-y-3 pt-2 border-t border-border/60">
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
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createQuiz.isPending || updateQuiz.isPending}
              className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {form.quizType === "link" ? <Link2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
              {createQuiz.isPending || updateQuiz.isPending ? "جاري الحفظ..." : form.quizType === "link" ? "حفظ رابط الاختبار" : "حفظ الاختبار التفاعلي"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddQuestionMenu({ onAdd }: { onAdd: (t: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5 rounded-xl h-8 text-xs font-semibold"
      >
        <Plus className="h-3.5 w-3.5" />
        إضافة سؤال
        <ChevronDown className="h-3 w-3 opacity-60" />
      </Button>
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 bg-popover border border-border/80 rounded-xl shadow-xl p-1 w-52 text-right space-y-0.5"
          onClick={() => setOpen(false)}
        >
          {QUESTION_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onAdd(t.value)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg hover:bg-accent hover:text-accent-foreground text-right transition-colors"
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground">{t.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
  onTextChange: (t: string) => void;
  onTypeChange: (t: QuestionType) => void;
  onOptionChange: (oi: number, t: string) => void;
  onCorrectChange: (oi: number) => void;
  onTrueFalseCorrect: (isTrue: boolean) => void;
  onAddOption: () => void;
  onRemoveOption: (oi: number) => void;
}) {
  const currentTypeMeta = QUESTION_TYPES.find((t) => t.value === question.questionType) ?? QUESTION_TYPES[0];
  const TypeIcon = currentTypeMeta.icon;

  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden transition-all shadow-xs">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 cursor-pointer select-none hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground shrink-0">{currentTypeMeta.label}</span>
        <span className="text-xs font-semibold truncate flex-1 text-foreground">
          {question.text || <span className="text-muted-foreground/60 italic">سؤال جديد...</span>}
        </span>

        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              title="نقل لأعلى"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              title="نقل لأسفل"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="h-6 w-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
              title="حذف السؤال"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button type="button" onClick={onToggle} className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground">
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 border-t border-border/50">
          {/* Question type selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground shrink-0">نوع السؤال:</label>
            <div className="flex flex-wrap gap-1">
              {QUESTION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onTypeChange(t.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    question.questionType === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question text */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">نص السؤال *</label>
            <Input
              value={question.text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="اكتب السؤال هنا..."
              className="rounded-lg text-sm"
            />
          </div>

          {/* Question options by type */}
          {question.questionType === "single_choice" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                الخيارات (انقر على الدائرة لتحديد الإجابة الصحيحة) *
              </label>
              <div className="space-y-1.5">
                {question.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onCorrectChange(oi)}
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        opt.isCorrect
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted-foreground/40 hover:border-emerald-500"
                      }`}
                      title={opt.isCorrect ? "الإجابة الصحيحة" : "تحديد كإجابة صحيحة"}
                    >
                      {opt.isCorrect && <Check className="h-3 w-3" />}
                    </button>
                    <Input
                      value={opt.text}
                      onChange={(e) => onOptionChange(oi, e.target.value)}
                      placeholder={`الخيار ${oi + 1}`}
                      className="rounded-lg text-xs h-8 flex-1"
                    />
                    {question.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onRemoveOption(oi)}
                        className="h-7 w-7 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {question.options.length < 6 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onAddOption}
                  className="text-xs gap-1 h-7 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Plus className="h-3 w-3" />
                  إضافة خيار
                </Button>
              )}
            </div>
          )}

          {question.questionType === "true_false" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">الإجابة الصحيحة *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "صح", value: true },
                  { label: "خطأ", value: false },
                ].map((item) => {
                  const isSelected = question.options.find((o) => o.text === item.label)?.isCorrect ?? false;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onTrueFalseCorrect(item.value)}
                      className={`py-2.5 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        isSelected
                          ? item.value
                            ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400"
                          : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      {isSelected ? <CheckCircle className="h-4 w-4" /> : <div className="h-4 w-4" />}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {question.questionType === "essay" && (
            <div className="p-3 bg-muted/40 rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <PenLine className="h-3.5 w-3.5 text-primary" />
                سؤال مقالي مفتوح
              </div>
              <p>سيقوم الطالب بكتابة إجابة نصية حرة، ولن يتم احتساب درجة آلية لهذا السؤال في التقييم التلقائي.</p>
            </div>
          )}

          {question.questionType === "fill_blank" && (
            <div className="p-3 bg-muted/40 rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <AlignJustify className="h-3.5 w-3.5 text-primary" />
                سؤال إكمال الفراغ
              </div>
              <p>اكتب في نص السؤال الفراغ باستخدام "..."، سيقوم الطالب بكتابة الكلمة أو العبارة المناسبة.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
