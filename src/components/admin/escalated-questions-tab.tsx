import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Bot,
  UserCheck,
  Send,
  CheckCircle2,
  Clock,
  Trash2,
  Sparkles,
  MessageSquare,
  Search,
  Filter,
  User,
  GraduationCap,
  Calendar,
  AlertCircle,
  ImageIcon,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export interface EscalatedQuestion {
  id: number;
  studentName: string;
  studentGrade?: string;
  subject: string;
  question: string;
  imageUrl?: string;
  aiAnswer?: string;
  studentFeedback?: string;
  status: "pending" | "answered" | "resolved";
  teacherReply?: string;
  teacherName?: string;
  assignedTeacherId?: string;
  createdAt: string;
  updatedAt?: string;
}

const SEED_QUESTIONS: EscalatedQuestion[] = [
  {
    id: 1,
    studentName: "عبدالله الشمري",
    studentGrade: "ثالث ثانوي - موهبة",
    subject: "القدرات (كمي)",
    question: "انطلقت سيارة بسرعة 80 كم/س وبعد ساعتين انطلقت أخرى بسرعة 100 كم/س، متى تلتقي السيارتان ولماذا لا نضرب فارق السرعة مباشرة؟",
    aiAnswer: "زمن اللحاق = (سرعة الجسم الأول × فارق الزمن) ÷ (فارق السرعتين) = (80 × 2) ÷ 20 = 8 ساعات.",
    studentFeedback: "لم أفهم لماذا 8 ساعات من بداية الأولى وليست 6 ساعات من الثانية، وكيف أتأكد من نقطة الالتقاء؟",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    studentName: "سارة القحطاني",
    studentGrade: "ثالث ثانوي - موهبة",
    subject: "التحصيلي (فيزياء)",
    question: "كيف نميز بين العزم الزاوي والقوة المركزية في حركة الأقمار الصناعية عند اختلاف نصف القطر؟",
    aiAnswer: "العزم الزاوي L = mvr ويكون محفوظاً عندما تكون محصلة العزوم الخارجية صفراً.",
    studentFeedback: "الشرح مختصر جداً، أحتاج مسألة تطبيقية من أسئلة قياس للأعوام السابقة توضح تطبيق القانون.",
    status: "answered",
    teacherReply: "أهلاً سارة، رائع جداً! العزم الزاوي يظل ثابتاً لأن قوة الجاذبية موجهة نحو المركز (الذراع r موازٍ للقوة وبالتالي العزم الخارجي صفر). إذا اقترب القمر وقل نصف القطر r، تزداد سرعته المدارية v تلقائياً للحفاظ على L ثابت. سنقوم بحل مثال رقمي في جلسة المراجعة القادمة.",
    teacherName: "أ. محمد الغامدي (معلم الفيزياء)",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

import { usePersistentState } from "@/lib/api-client-react";

export function EscalatedQuestionsTab() {
  const { toast } = useToast();
  const [questions, setQuestions] = usePersistentState<EscalatedQuestion[]>("escalated_questions", SEED_QUESTIONS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Reply state
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [teacherNameInput, setTeacherNameInput] = useState("المعلم المشرف");

  useEffect(() => {
    // Optionally fetch from API to merge if backend DB exists
    fetch("/api/escalated-questions")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(prev => {
            const map = new Map<number, EscalatedQuestion>();
            prev.forEach(q => map.set(q.id, q));
            data.forEach((q: EscalatedQuestion) => map.set(q.id, q));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSendReply = async (id: number) => {
    if (!replyText.trim()) {
      toast({ title: "تنبيه", description: "يرجى كتابة نص رد المعلم وتوضيح المسألة", variant: "destructive" });
      return;
    }

    const reply = replyText.trim();
    const teacherName = teacherNameInput.trim() || "المعلم المشرف";
    const now = new Date().toISOString();

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status: "answered",
              teacherReply: reply,
              teacherName: teacherName,
              updatedAt: now,
            }
          : q
      )
    );

    try {
      await fetch(`/api/escalated-questions/${id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "answered",
          teacherReply: reply,
          teacherName: teacherName,
        }),
      });
    } catch {}

    setReplyingId(null);
    setReplyText("");
    toast({ title: "تم إرسال رد المعلم بنجاح", description: "سيتمكن الطالب من رؤية توضيحك فوراً في حسابه" });
  };

  const handleDelete = async (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    try {
      await fetch(`/api/escalated-questions/${id}`, { method: "DELETE" });
    } catch {}
    toast({ title: "تم الحذف بنجاح" });
  };

  const handleToggleStatus = async (id: number, currentStatus: EscalatedQuestion["status"]) => {
    const nextStatus: EscalatedQuestion["status"] =
      currentStatus === "pending" ? "answered" : currentStatus === "answered" ? "resolved" : "pending";

    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: nextStatus } : q))
    );

    try {
      await fetch(`/api/escalated-questions/${id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {}
    toast({ title: "تم تغيير الحالة بنجاح" });
  };

  const pendingCount = questions.filter((q) => q.status === "pending").length;
  const answeredCount = questions.filter((q) => q.status === "answered").length;
  const resolvedCount = questions.filter((q) => q.status === "resolved").length;

  const subjects = ["all", ...Array.from(new Set(questions.map((q) => q.subject)))];

  const filteredQuestions = questions.filter((q) => {
    if (!q) return false;
    const matchesSearch =
      (q.question || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.studentFeedback && (q.studentFeedback || "").toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    const matchesSubject = subjectFilter === "all" || q.subject === subjectFilter;
    return matchesSearch && matchesStatus && matchesSubject;
  });

  return (
    <div className="space-y-6">
      {/* ─── Header & Metrics ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-lg shadow-sm">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-500">{pendingCount}</div>
            <div className="text-xs font-bold text-muted-foreground">بانتظار توضيح المعلم</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold text-lg shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-500">{answeredCount}</div>
            <div className="text-xs font-bold text-muted-foreground">تم رد المعلمين</div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-2xl border border-primary/30 bg-primary/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg shadow-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-primary">{questions.length}</div>
            <div className="text-xs font-bold text-muted-foreground">إجمالي الأسئلة المستعصية</div>
          </div>
        </div>
      </div>

      {/* ─── Filters & Search ─── */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card/60 p-4 rounded-2xl border border-border/60">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في نصوص الأسئلة أو اسم الطالب..."
            className="pr-9 rounded-xl h-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl bg-background border border-input px-3 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="all">كل الحالات</option>
            <option value="pending">بانتظار المعلم</option>
            <option value="answered">تم الرد</option>
            <option value="resolved">مكتملة ومغلقة</option>
          </select>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="h-10 rounded-xl bg-background border border-input px-3 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
          >
            <option value="all">كل المواد والمسارات</option>
            {subjects.filter(s => s !== "all").map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Questions List ─── */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredQuestions.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={`rounded-3xl border p-5 sm:p-6 transition-all ${
                q.status === "pending"
                  ? "border-amber-500/40 bg-amber-500/[0.03] shadow-md ring-1 ring-amber-500/20"
                  : "border-border/70 bg-card shadow-sm"
              }`}
            >
              {/* Question Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-foreground">{q.studentName}</span>
                      <Badge variant="outline" className="text-[10px] bg-muted/60">{q.studentGrade || "ثالث موهبة"}</Badge>
                      <Badge className="text-[10px] bg-primary/15 text-primary border-primary/20">{q.subject}</Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(q.createdAt).toLocaleDateString("ar-SA", { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    onClick={() => handleToggleStatus(q.id, q.status)}
                    className={`cursor-pointer text-xs font-bold px-3 py-1 rounded-xl transition-all ${
                      q.status === "pending"
                        ? "bg-amber-500 text-amber-950 hover:bg-amber-600"
                        : q.status === "answered"
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {q.status === "pending" ? "بانتظار المعلم" : q.status === "answered" ? "تم الرد" : "مكتمل"}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(q.id)}
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Question Body */}
              <div className="py-4 space-y-3">
                <div className="bg-background/80 p-4 rounded-2xl border border-border/60">
                  <span className="text-[11px] font-bold text-primary block mb-1 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5" />
                    مسألة الطالب:
                  </span>
                  <p className="text-sm font-semibold text-foreground leading-relaxed">
                    {q.question}
                  </p>
                  {q.imageUrl && (
                    <div className="mt-3">
                      <div className="relative inline-block group">
                        <img
                          src={q.imageUrl}
                          alt="مرفق مسألة الطالب"
                          className="max-h-48 rounded-xl border border-border object-contain bg-muted cursor-pointer hover:opacity-95"
                          onClick={() => setPreviewImage(q.imageUrl || null)}
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewImage(q.imageUrl || null)}
                          className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Eye className="h-3 w-3" />
                          تكبير الصورة
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Student Feedback note */}
                {q.studentFeedback && (
                  <div className="bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                    <span className="font-bold flex items-center gap-1.5 mb-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                      ملاحظة الطالب ولماذا لم يستفد:
                    </span>
                    <p className="text-xs">{q.studentFeedback}</p>
                  </div>
                )}

                {/* Teacher Reply Section */}
                {q.teacherReply ? (
                  <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/30 text-xs mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                        رد وتوضيح المعلم ({q.teacherName || "المعلم المشرف"}):
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingId(q.id);
                          setReplyText(q.teacherReply || "");
                          setTeacherNameInput(q.teacherName || "المعلم المشرف");
                        }}
                        className="h-7 text-[11px] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                      >
                        تعديل الرد
                      </Button>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {q.teacherReply}
                    </p>
                  </div>
                ) : (
                  replyingId !== q.id && (
                    <div className="pt-2">
                      <Button
                        onClick={() => {
                          setReplyingId(q.id);
                          setReplyText("");
                        }}
                        className="rounded-xl font-bold text-xs gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                      >
                        <UserCheck className="h-4 w-4" />
                        <span>كتابة رد المعلم والتوضيح النموذجي</span>
                      </Button>
                    </div>
                  )
                )}

                {/* Inline Reply Form */}
                {replyingId === q.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 rounded-2xl bg-muted/60 border border-border/80 space-y-3 mt-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-primary" />
                        كتابة الشرح والتوضيح للطالب
                      </span>
                      <Input
                        value={teacherNameInput}
                        onChange={(e) => setTeacherNameInput(e.target.value)}
                        placeholder="اسم المعلم / المادة"
                        className="h-8 w-48 text-xs rounded-xl bg-background"
                      />
                    </div>

                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتب التوضيح النموذجي، تبسيط الخطوة الصعبة، وقانون المسألة ليظهر فوراً للطالب..."
                      rows={3}
                      className="rounded-xl bg-background resize-none text-xs"
                    />

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReplyingId(null)}
                        className="rounded-xl text-xs"
                      >
                        إلغاء
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSendReply(q.id)}
                        className="rounded-xl text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>إرسال الرد للطالب</span>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-card rounded-2xl overflow-hidden p-2">
            <img
              src={previewImage}
              alt="معاينة الصورة"
              className="max-h-[85vh] w-auto mx-auto rounded-xl object-contain"
              referrerPolicy="no-referrer"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-background/80 backdrop-blur rounded-xl text-xs"
            >
              إغلاق
            </Button>
          </div>
        </div>
      )}

      {filteredQuestions.length === 0 && (
        <div className="text-center py-16 bg-card/40 rounded-3xl border border-dashed border-border/80">
          <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-foreground">لا توجد أسئلة مستعصية معلقة</h3>
          <p className="text-xs text-muted-foreground mt-1">جميع استفسارات الطلاب تمت الإجابة عليها وتوضيحها بنجاح</p>
        </div>
      )}
    </div>
  );
}
