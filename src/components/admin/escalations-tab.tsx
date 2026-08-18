import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Send, 
  User, 
  BookOpen, 
  Bot, 
  MessageSquare,
  Search,
  ShieldCheck,
  BrainCircuit,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePersistentState } from "@/lib/api-client-react";

export interface EscalatedQItem {
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
  createdAt?: string;
  updatedAt?: string;
}

export function EscalationsTab() {
  const { toast } = useToast();
  const [questions, setQuestions] = usePersistentState<EscalatedQItem[]>("escalated_questions", []);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "resolved">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Replying state
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [supervisorName, setSupervisorName] = useState("أ. مشرف المادة والموهبة");
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/escalated-questions");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setQuestions(data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch escalations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleApproveAndTrainAI = async (item: EscalatedQItem) => {
    if (!replyText.trim()) {
      toast({
        title: "يرجى كتابة الشرح والتصحيح المعتمد",
        description: "اكتب الإجابة الصحيحة التي ستصل للطالب وسيتم تدريب الـ AI عليها.",
        variant: "destructive"
      });
      return;
    }

    setSubmittingId(item.id);
    try {
      const res = await fetch(`/api/escalated-questions/${item.id}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          teacherReply: replyText.trim(),
          teacherName: supervisorName.trim() || "مشرف القدرات والتحصيلي",
        })
      });

      if (res.ok) {
        toast({
          title: "تم اعتماد التصحيح وتدريب المعلم الذكي! 🚀",
          description: "وصل التصحيح للطالب في قسم ردود المعلمين، وتم حفظ القوانين والتصحيحات المعتمدة في ذاكرة الـ AI بنجاح.",
        });

        // Update local state
        setQuestions(prev => prev.map(q => q.id === item.id ? {
          ...q,
          status: "resolved",
          teacherReply: replyText.trim(),
          teacherName: supervisorName.trim() || "مشرف القدرات والتحصيلي"
        } : q));

        setActiveReplyId(null);
        setReplyText("");
      } else {
        toast({ title: "حدث خطأ أثناء حفظ التصحيح", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "تعذر الاتصال بالسيرفر", variant: "destructive" });
    } finally {
      setSubmittingId(null);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesStatus = filterStatus === "all" ? true : q.status === filterStatus;
    const matchesSearch = searchQuery.trim() === "" || 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.studentFeedback || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = questions.filter(q => q.status === "pending").length;
  const resolvedCount = questions.filter(q => q.status === "resolved").length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-lg font-extrabold text-foreground">
              تصحيح اعتراضات الطلاب وتدريب الـ AI
            </h2>
            {pendingCount > 0 && (
              <Badge className="bg-rose-500 text-white font-bold animate-pulse">
                {pendingCount} اعتراض معلق
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            عند إجابة المشرف على اعتراض الطالب، يتم إرسال التصحيح المباشر للطالب وتخزين القاعدة المعتمدة في ذاكرة المعلم الذكي (AI) ليتعلم منها في كافة الإجابات المستقبلية!
          </p>
        </div>

        <Button
          onClick={fetchQuestions}
          variant="outline"
          size="sm"
          className="rounded-2xl gap-2 text-xs bg-card hover:bg-muted"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث الاعتراضات</span>
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          <Button
            size="sm"
            variant={filterStatus === "pending" ? "default" : "outline"}
            onClick={() => setFilterStatus("pending")}
            className="rounded-xl text-xs gap-1.5 font-bold"
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>اعتراضات معلقة ({pendingCount})</span>
          </Button>

          <Button
            size="sm"
            variant={filterStatus === "resolved" ? "default" : "outline"}
            onClick={() => setFilterStatus("resolved")}
            className="rounded-xl text-xs gap-1.5 font-bold"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>تم تصحيحها وتدريب الـ AI ({resolvedCount})</span>
          </Button>

          <Button
            size="sm"
            variant={filterStatus === "all" ? "default" : "outline"}
            onClick={() => setFilterStatus("all")}
            className="rounded-xl text-xs gap-1.5"
          >
            <span>الكل ({questions.length})</span>
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute right-3 top-2.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالمسألة أو اسم الطالب..."
            className="rounded-xl pr-9 text-xs h-9"
          />
        </div>
      </div>

      {/* Questions & Objections List */}
      {filteredQuestions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <BrainCircuit className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm font-bold">لا توجد اعتراضات تطابق خيارات البحث حالياً</p>
          <p className="text-xs">سيظهر هنا كل سؤال أو اعتراض يرفعه الطلاب للتحقق والتصحيح.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredQuestions.map((item) => {
              const isReplying = activeReplyId === item.id;
              const isResolved = item.status === "resolved";

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-5 rounded-3xl border transition-all bg-card shadow-sm space-y-4 ${
                    isResolved 
                      ? "border-emerald-500/30 bg-emerald-500/5" 
                      : "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60"
                  }`}
                >
                  {/* Top Bar info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span>{item.studentName}</span>
                          <span className="text-[10px] text-muted-foreground">({item.studentGrade || "ثالث ثانوي - موهبة"})</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">المادة: {item.subject}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isResolved ? (
                        <Badge className="bg-emerald-500 text-white text-[11px] font-bold gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>تم التصحيح وتدريب الـ AI</span>
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-white text-[11px] font-bold gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>اعتراض قيد المراجعة</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Question & Image */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground">نص المسألة أو السؤال المعترض عليه:</p>
                    <div className="p-3 rounded-2xl bg-muted/50 border border-border/50 text-xs font-medium text-foreground leading-relaxed">
                      {item.question}
                    </div>

                    {item.imageUrl && (
                      <div className="pt-1">
                        <img
                          src={item.imageUrl}
                          alt="Student attached question"
                          referrerPolicy="no-referrer"
                          className="max-h-40 rounded-xl border border-border object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Previous AI Answer & Student Feedback */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
                      <p className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Bot className="h-3.5 w-3.5" />
                        <span>إجابة الـ AI السابقة (محل الاعتراض):</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.aiAnswer || "لم يتوفر جواب سابق"}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1">
                      <p className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>سبب اعتراض وملاحظة الطالب:</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.studentFeedback || "طلب توضيح وتصحيح من المشرف"}
                      </p>
                    </div>
                  </div>

                  {/* Official Supervisor Reply (If already resolved) */}
                  {isResolved && item.teacherReply && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1.5">
                      <p className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-emerald-600" />
                        <span>تصحيح الشرح المعتمد من المشرف ({item.teacherName || "المشرف المعتمد"}):</span>
                      </p>
                      <p className="text-foreground leading-relaxed whitespace-pre-line font-medium">
                        {item.teacherReply}
                      </p>
                      <div className="pt-2 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>تم دمج هذا التصحيح في ذاكرة القواعد المعتمدة للمعلم الذكي (Gemini Tutor)</span>
                      </div>
                    </div>
                  )}

                  {/* Action / Supervisor Input Area */}
                  {!isResolved && (
                    <div className="pt-2">
                      {!isReplying ? (
                        <Button
                          onClick={() => {
                            setActiveReplyId(item.id);
                            setReplyText(item.teacherReply || "");
                          }}
                          className="rounded-xl font-bold text-xs gap-2 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 text-white shadow-md"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>إضافة الجواب الصحيح وتدريب الـ AI</span>
                        </Button>
                      ) : (
                        <div className="space-y-3 p-4 rounded-2xl border border-primary/30 bg-card shadow-inner animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-amber-500" />
                              <span>تصحيح المشرف والجواب النموذجي المعتمد للـ AI والطالب:</span>
                            </label>

                            <Input
                              value={supervisorName}
                              onChange={(e) => setSupervisorName(e.target.value)}
                              placeholder="اسم المشرف"
                              className="h-8 w-48 text-xs rounded-xl"
                            />
                          </div>

                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="اكتب التوضيح والتصحيح القانوني والدقيق للمسألة هنا... (سيتم إرسال الجواب للطالب وحفظه في ذاكرة تدريب الـ AI)"
                            rows={4}
                            className="rounded-xl text-xs resize-none"
                          />

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveReplyId(null)}
                              className="rounded-xl text-xs"
                            >
                              إلغاء
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleApproveAndTrainAI(item)}
                              disabled={submittingId === item.id || !replyText.trim()}
                              className="rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                            >
                              {submittingId === item.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              <span>اعتماد التعديل وتدريب المعلم الذكي (AI) 🚀</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
