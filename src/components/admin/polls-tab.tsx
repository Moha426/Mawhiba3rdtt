import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  RotateCcw,
  Users,
  BarChart3,
  Eye,
  AlertCircle,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Download,
  Calendar,
  Layers,
  Filter,
  Check,
  X,
  Star,
  Zap,
  HelpCircle,
  Flame,
  FileText,
  Rocket,
  ShieldCheck,
  Award,
  Pin,
  PinOff,
  Timer,
  Infinity as InfinityIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  usePolls,
  createPollApi,
  updatePollApi,
  deletePollApi,
  executePollActionApi,
  SAMPLE_POLL_TEMPLATES,
  type PollWithStats,
  type Poll,
  type PollType
} from "@/lib/polls";

const EMOJI_OPTIONS = ["🔥 ممتاز ومتحمس", "🧠 يحتاج تركيز عميق", "⚡ سهل وسريع", "💡 فكرة إبداعية", "👏 جهود تشكرون عليها"];

export function PollsTab() {
  const { toast } = useToast();
  const { polls, isLoading, refreshPolls } = usePolls();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pinned" | "active" | "closed" | "quiz" | "action">("all");

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<PollWithStats | null>(null);
  const [viewingPollStats, setViewingPollStats] = useState<PollWithStats | null>(null);
  const [pollToDelete, setPollToDelete] = useState<PollWithStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form States
  const [formQuestion, setFormQuestion] = useState("");
  const [formType, setFormType] = useState<PollType>("choice");
  const [formCategory, setFormCategory] = useState("تنظيمي وجداول");
  const [formOptions, setFormOptions] = useState<string[]>(["", ""]);
  const [formAllowMultiple, setFormAllowMultiple] = useState(false);
  const [formPreventWithdraw, setFormPreventWithdraw] = useState(false);
  const [formIsPinned, setFormIsPinned] = useState(false);
  
  // Expiry Duration Mode: 'never' (infinite) | '1h' | '24h' | '3d' | '7d' | '14d' | '30d' | 'custom_days' | 'custom_hours' | 'custom_datetime'
  const [formExpiryMode, setFormExpiryMode] = useState<string>("14d");
  const [formCustomDays, setFormCustomDays] = useState("7");
  const [formCustomHours, setFormCustomHours] = useState("12");
  const [formCustomDateTime, setFormCustomDateTime] = useState("");

  // Specialized Quiz Fields
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formQuizExplanation, setFormQuizExplanation] = useState("");

  // Specialized Action Fields
  const [formActionTitle, setFormActionTitle] = useState("");
  const [formActionDesc, setFormActionDesc] = useState("");

  const filteredPolls = useMemo(() => {
    return polls.filter((p) => {
      if (filterStatus === "pinned" && !p.isPinned) return false;
      if (filterStatus === "active" && (p.status !== "active" || p.isExpired)) return false;
      if (filterStatus === "closed" && (p.status === "active" && !p.isExpired)) return false;
      if (filterStatus === "quiz" && p.type !== "quiz") return false;
      if (filterStatus === "action" && p.type !== "action") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.question.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q));
      }
      return true;
    });
  }, [polls, filterStatus, searchQuery]);

  const openCreateDialog = () => {
    setEditingPoll(null);
    setFormQuestion("");
    setFormType("choice");
    setFormCategory("تنظيمي وجداول");
    setFormOptions(["الخيار الأول", "الخيار الثاني", "الخيار الثالث"]);
    setFormAllowMultiple(false);
    setFormPreventWithdraw(false);
    setFormIsPinned(false);
    setFormExpiryMode("14d");
    setFormCustomDays("7");
    setFormCustomHours("12");
    setFormCustomDateTime("");
    setFormCorrectIndex(0);
    setFormQuizExplanation("");
    setFormActionTitle("");
    setFormActionDesc("");
    setIsCreateOpen(true);
  };

  const loadTemplateIntoForm = (template: Poll) => {
    setEditingPoll(null);
    setFormQuestion(template.question);
    setFormType(template.type || "choice");
    setFormCategory(template.category || "تنظيمي وجداول");
    setFormOptions(Array.isArray(template.options) ? [...template.options] : []);
    setFormAllowMultiple(Boolean(template.allowMultiple));
    setFormPreventWithdraw(Boolean(template.preventWithdraw));
    setFormIsPinned(Boolean(template.isPinned));
    setFormExpiryMode("never");
    setFormCustomDays("7");
    setFormCustomHours("12");
    setFormCustomDateTime("");
    setFormCorrectIndex(template.correctOptionIndex ?? 0);
    setFormQuizExplanation(template.quizExplanation || "");
    setFormActionTitle(template.actionTitle || "");
    setFormActionDesc(template.actionDescription || "");
    setIsCreateOpen(true);
  };

  const openEditDialog = (poll: PollWithStats) => {
    setEditingPoll(poll);
    setFormQuestion(poll.question);
    setFormType(poll.type || "choice");
    setFormCategory(poll.category || "عام");
    setFormOptions(poll.parsedOptions.length > 0 ? [...poll.parsedOptions] : ["", ""]);
    setFormAllowMultiple(Boolean(poll.allowMultiple));
    setFormPreventWithdraw(Boolean(poll.preventWithdraw));
    setFormIsPinned(Boolean(poll.isPinned));
    
    if (!poll.expiresAt) {
      setFormExpiryMode("never");
      setFormCustomDateTime("");
    } else {
      try {
        const d = new Date(poll.expiresAt);
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
        setFormCustomDateTime(localISOTime);
        setFormExpiryMode("custom_datetime");
      } catch {
        setFormExpiryMode("never");
      }
    }

    setFormCorrectIndex(poll.correctOptionIndex ?? 0);
    setFormQuizExplanation(poll.quizExplanation || "");
    setFormActionTitle(poll.actionTitle || "");
    setFormActionDesc(poll.actionDescription || "");
    setIsCreateOpen(true);
  };

  const handleTypeChange = (type: PollType) => {
    setFormType(type);
    if (type === "emoji") {
      setFormOptions([...EMOJI_OPTIONS]);
    } else if (type === "rating") {
      setFormOptions(["⭐ 1 نجمة", "⭐⭐ نجمتان", "⭐⭐⭐ 3 نجوم", "⭐⭐⭐⭐ 4 نجوم", "⭐⭐⭐⭐⭐ 5 نجوم"]);
    } else if (type === "action") {
      setFormOptions(["أؤيد بشدة هذا القرار", "لا أؤيد، أفضل بديلاً آخر"]);
    } else if (type === "choice" || type === "quiz") {
      if (formOptions.length < 2) {
        setFormOptions(["الخيار الأول", "الخيار الثاني"]);
      }
    }
  };

  const handleAddOptionField = () => {
    setFormOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOptionField = (index: number) => {
    if (formOptions.length <= 2) {
      toast({ title: "تنبيه", description: "يجب توفر خيارين على الأقل", variant: "destructive" });
      return;
    }
    setFormOptions((prev) => prev.filter((_, i) => i !== index));
    if (formCorrectIndex >= index) {
      setFormCorrectIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    setFormOptions((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleTogglePin = async (poll: PollWithStats, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const nextPinned = !poll.isPinned;
      await updatePollApi(poll.id, { isPinned: nextPinned });
      toast({
        title: nextPinned ? "تم تثبيت الاستفتاء في الأعلى 📌" : "تم إلغاء التثبيت 📍",
        description: nextPinned ? `تم تثبيت "${poll.question}" ليظهر في أول القائمة دائماً` : `تم فك تثبيت الاستفتاء من أعلى القائمة`,
      });
      await refreshPolls();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "تعذر تعديل التثبيت", variant: "destructive" });
    }
  };

  const handleSavePoll = async () => {
    if (!formQuestion.trim()) {
      toast({ title: "بيانات غير مكتملة", description: "يرجى كتابة نص سؤال الاستفتاء", variant: "destructive" });
      return;
    }

    let cleanOptions: string[] = [];
    if (formType !== "text") {
      cleanOptions = formOptions.map((o) => o.trim()).filter(Boolean);
      if (cleanOptions.length < 2 && formType !== "rating") {
        toast({ title: "خيارات غير كافية", description: "يرجى إدخال خيارين صالحين على الأقل", variant: "destructive" });
        return;
      }
    }

    // Calculate expiry timestamp
    let calculatedExpiresAt: string | null = null;
    if (formExpiryMode === "never") {
      calculatedExpiresAt = null;
    } else if (formExpiryMode === "1h") {
      calculatedExpiresAt = new Date(Date.now() + 1 * 3600 * 1000).toISOString();
    } else if (formExpiryMode === "24h") {
      calculatedExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    } else if (formExpiryMode === "3d") {
      calculatedExpiresAt = new Date(Date.now() + 3 * 86400 * 1000).toISOString();
    } else if (formExpiryMode === "7d") {
      calculatedExpiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    } else if (formExpiryMode === "14d") {
      calculatedExpiresAt = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
    } else if (formExpiryMode === "30d") {
      calculatedExpiresAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    } else if (formExpiryMode === "custom_days") {
      const daysNum = Math.max(1, parseInt(formCustomDays, 10) || 1);
      calculatedExpiresAt = new Date(Date.now() + daysNum * 86400 * 1000).toISOString();
    } else if (formExpiryMode === "custom_hours") {
      const hoursNum = Math.max(1, parseInt(formCustomHours, 10) || 1);
      calculatedExpiresAt = new Date(Date.now() + hoursNum * 3600 * 1000).toISOString();
    } else if (formExpiryMode === "custom_datetime") {
      if (formCustomDateTime) {
        calculatedExpiresAt = new Date(formCustomDateTime).toISOString();
      } else {
        calculatedExpiresAt = null;
      }
    }

    const payload: Partial<Poll> = {
      question: formQuestion.trim(),
      type: formType,
      category: formCategory,
      options: cleanOptions,
      allowMultiple: formAllowMultiple,
      preventWithdraw: formPreventWithdraw,
      isPinned: formIsPinned,
      expiresAt: calculatedExpiresAt,
      correctOptionIndex: formType === "quiz" ? formCorrectIndex : null,
      quizExplanation: formType === "quiz" ? formQuizExplanation.trim() : null,
      actionTitle: formType === "action" ? formActionTitle.trim() : null,
      actionDescription: formType === "action" ? formActionDesc.trim() : null,
    };

    try {
      if (editingPoll) {
        await updatePollApi(editingPoll.id, payload);
        toast({ title: "تم تحديث الاستفتاء ✏️", description: "تم حفظ التعديلات بنجاح" });
      } else {
        await createPollApi({
          ...payload,
          status: "active",
          isPublic: true,
          totalVotes: 0,
        });
        toast({ title: "تم إنشاء الاستفتاء 🎉", description: "أصبح الاستفتاء متاحاً الآن لجميع الطلاب" });
      }

      setIsCreateOpen(false);
      await refreshPolls();
    } catch (err: any) {
      toast({ title: "حدث خطأ", description: err.message || "تعذر حفظ الاستفتاء", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (poll: PollWithStats) => {
    const nextStatus = poll.status === "active" ? "closed" : "active";
    try {
      await updatePollApi(poll.id, { status: nextStatus });
      toast({
        title: nextStatus === "active" ? "تم فتح الاستفتاء 🟢" : "تم إغلاق الاستفتاء 🔴",
        description: nextStatus === "active" ? "يمكن للطلاب الآن التصويت" : "تم إيقاف استقبال الأصوات الجديدة",
      });
      await refreshPolls();
    } catch (err: any) {
      toast({ title: "فشل التعديل", description: err.message, variant: "destructive" });
    }
  };

  const handleExecuteAction = async (poll: PollWithStats) => {
    try {
      await executePollActionApi(poll.id, "إدارة المدرسة والمعلم");
      toast({
        title: "تم اعتماد وتنفيذ القرار رسمياً 🚀",
        description: `تم تثبيت: "${poll.actionTitle || poll.question}" وإشعار الطلاب به في المنصة.`,
      });
      await refreshPolls();
    } catch (err: any) {
      toast({ title: "فشل التنفيذ", description: err.message, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!pollToDelete) return;
    setIsDeleting(true);
    try {
      await deletePollApi(pollToDelete.id);
      toast({ title: "تم حذف الاستفتاء بنجاح 🗑️", description: "تم مسح الاستفتاء وجميع أصواته" });
      setPollToDelete(null);
      await refreshPolls();
    } catch (err: any) {
      toast({ title: "فشل الحذف", description: err.message || "حدث خطأ أثناء الحذف", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border/70 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shadow-sm">
            <Vote className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">إدارة استطلاعات الرأي والتصويت الذكي</h2>
            <p className="text-xs text-muted-foreground">أنشئ استفتاءات، أسئلة تحدي وتنافس، قرارات تنفيذية، واستطلاعات جودة تفاعلية</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refreshPolls()}
            disabled={isLoading}
            className="rounded-2xl h-11 px-4 gap-2 text-xs font-bold border-border/70"
          >
            <RotateCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            onClick={openCreateDialog}
            className="rounded-2xl h-11 px-5 font-extrabold bg-primary text-primary-foreground gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>إنشاء استفتاء جديد</span>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-4 rounded-3xl border border-border/70">
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
            className="rounded-xl text-xs font-bold h-9"
          >
            الكل ({polls.length})
          </Button>
          <Button
            variant={filterStatus === "pinned" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("pinned")}
            className="rounded-xl text-xs font-bold h-9 text-amber-600 dark:text-amber-400 gap-1"
          >
            <Pin className="h-3 w-3 fill-amber-500" />
            <span>المثبتة 📌 ({polls.filter((p) => p.isPinned).length})</span>
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("active")}
            className="rounded-xl text-xs font-bold h-9 text-emerald-600 dark:text-emerald-400"
          >
            النشطة 🟢 ({polls.filter((p) => p.status === "active" && !p.isExpired).length})
          </Button>
          <Button
            variant={filterStatus === "action" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("action")}
            className="rounded-xl text-xs font-bold h-9 text-blue-600 dark:text-blue-400"
          >
            قرارات تنفيذية 🚀 ({polls.filter((p) => p.type === "action").length})
          </Button>
          <Button
            variant={filterStatus === "quiz" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("quiz")}
            className="rounded-xl text-xs font-bold h-9 text-purple-600 dark:text-purple-400"
          >
            تحدي واختبار 🎯 ({polls.filter((p) => p.type === "quiz").length})
          </Button>
          <Button
            variant={filterStatus === "closed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("closed")}
            className="rounded-xl text-xs font-bold h-9 text-muted-foreground"
          >
            المغلقة 🔒 ({polls.filter((p) => p.status === "closed" || p.isExpired).length})
          </Button>
        </div>

        <div className="w-full md:w-72">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الاستطلاعات..."
            className="h-9 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Polls Cards Grid */}
      {filteredPolls.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border/70 p-10 text-center space-y-4 max-w-2xl mx-auto">
          <div className="h-14 w-14 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center border border-purple-500/20">
            <Vote className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-foreground text-base">لا توجد استطلاعات رأي أو تصويتات حالياً</p>
            <p className="text-xs text-muted-foreground">يمكنك إنشاء استطلاع جديد كلياً، أو استخدام أحد القوالب الجاهزة أدناه للتجربة</p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
            <Button
              onClick={openCreateDialog}
              className="rounded-2xl h-10 px-5 font-bold bg-primary text-primary-foreground text-xs gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>إنشاء استفتاء جديد</span>
            </Button>
          </div>

          {/* Optional Sample Template Buttons */}
          <div className="pt-4 border-t border-border/50">
            <p className="text-[11px] font-bold text-muted-foreground mb-2.5">💡 أو اختر قالباً مقترحاً للتعبئة السريعة:</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {SAMPLE_POLL_TEMPLATES.map((tmpl) => (
                <Button
                  key={tmpl.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadTemplateIntoForm(tmpl)}
                  className="rounded-xl text-[11px] font-medium h-8 border-border/70 hover:border-primary/50"
                >
                  <Sparkles className="h-3 w-3 text-amber-500 ml-1" />
                  <span>{tmpl.type === "quiz" ? "🎯 تحدي قدرات" : tmpl.type === "action" ? "🚀 قرار تنفيذي" : tmpl.type === "rating" ? "⭐ استطلاع تقييم" : "📊 اختيار متعدد"}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPolls.map((poll) => {
            const isActive = poll.status === "active" && !poll.isExpired;
            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all ${
                  poll.isPinned
                    ? "border-2 border-primary/50 bg-gradient-to-b from-primary/[0.04] via-card to-card ring-1 ring-primary/20"
                    : "border border-border/70"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {poll.isPinned && (
                        <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px] font-black px-2 py-0.5 gap-1 shadow-xs">
                          <Pin className="h-3 w-3 fill-amber-500 text-amber-600 dark:text-amber-400 rotate-45" />
                          <span>مثبت في الأعلى 📌</span>
                        </Badge>
                      )}

                      {poll.allowMultiple && (
                        <Badge variant="outline" className="bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/40 text-[10px] font-bold px-2 py-0.5 gap-1">
                          <Layers className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          <span>استجابات متعددة 🔄</span>
                        </Badge>
                      )}

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          poll.type === "quiz"
                            ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                            : poll.type === "action"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                            : poll.type === "rating"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            : poll.type === "emoji"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                            : poll.type === "text"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {poll.type === "quiz" && "🎯 تحدي واختبار"}
                        {poll.type === "action" && "🚀 قرار تنفيذي"}
                        {poll.type === "rating" && "⭐ تقييم نجوم"}
                        {poll.type === "emoji" && "🔥 تفاعل تعبيري"}
                        {poll.type === "text" && "✍️ استجابة نصية"}
                        {poll.type === "choice" && "📊 خيارات متعددة"}
                      </Badge>

                      {poll.category && (
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          · {poll.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isActive ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          نشط 🟢
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          مغلق 🔒
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {poll.totalVotes} مشاركة
                      </Badge>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-foreground leading-snug">
                    {poll.question}
                  </h3>

                  {/* Expiry / Timing Info */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    {poll.expiresAt ? (
                      <>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>ينتهي: {new Date(poll.expiresAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      </>
                    ) : (
                      <>
                        <InfinityIcon className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">مستمر دائماً (بدون انتهاء صلاحية)</span>
                      </>
                    )}
                  </div>

                  {/* Action Description if action poll */}
                  {poll.type === "action" && (
                    <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 dark:text-blue-200">القرار المقترح:</span>
                        {poll.actionStatus === "executed" ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                            تم التنفيذ رسمياً ✅
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-400">
                            قيد التصويت ⏳
                          </Badge>
                        )}
                      </div>
                      <p className="text-blue-950 dark:text-blue-300 text-[11px]">{poll.actionTitle}</p>
                    </div>
                  )}

                  {/* Options Mini Preview */}
                  {poll.type !== "text" && poll.parsedOptions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {poll.parsedOptions.slice(0, 3).map((opt, i) => {
                        const pct = poll.optionPercentages[i] || 0;
                        const isCorrect = poll.type === "quiz" && poll.correctOptionIndex === i;
                        return (
                          <div key={i} className="text-xs space-y-0.5">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span className={`truncate max-w-[200px] ${isCorrect ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}`}>
                                {isCorrect && "✓ "} {opt}
                              </span>
                              <span className="font-bold">{pct}% ({poll.optionCounts[i] || 0})</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCorrect ? "bg-emerald-500" : "bg-primary/80"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {poll.parsedOptions.length > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center pt-0.5">
                          + {poll.parsedOptions.length - 3} خيارات أخرى
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingPollStats(poll)}
                      className="h-8 rounded-xl text-xs gap-1.5 font-bold"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>النتائج ({poll.votes.length})</span>
                    </Button>

                    {poll.type === "action" && poll.actionStatus !== "executed" && (
                      <Button
                        size="sm"
                        onClick={() => handleExecuteAction(poll)}
                        className="h-8 rounded-xl text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        <span>تنفيذ القرار</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Quick Pin Toggle Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleTogglePin(poll, e)}
                      title={poll.isPinned ? "إلغاء التثبيت" : "تثبيت الاستفتاء في الأعلى 📌"}
                      className={`h-8 w-8 rounded-xl transition-colors ${
                        poll.isPinned
                          ? "text-amber-600 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Pin className={`h-4 w-4 ${poll.isPinned ? "fill-amber-500 rotate-45" : ""}`} />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleStatus(poll)}
                      title={isActive ? "إغلاق الاستفتاء" : "فتح الاستفتاء"}
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      {isActive ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(poll)}
                      title="تعديل الاستفتاء"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>

                    {/* Dedicated Delete Trigger -> Opens in-app Confirmation Dialog without window.confirm */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPollToDelete(poll)}
                      title="حذف الاستفتاء"
                      className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
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

      {/* ── CREATE / EDIT POLL DIALOG ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Vote className="h-5 w-5 text-primary" />
              <span>{editingPoll ? "تعديل الاستفتاء" : "إنشاء استفتاء وتصويت جديد"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              اختر نوع الاستفتاء، اكتب السؤال، وحدد الخيارات والإعدادات المتقدمة
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Poll Archetype Selection */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">نوع وفكرة الاستطلاع *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { type: "choice", label: "خيارات متعددة", icon: BarChart3 },
                  { type: "action", label: "قرار تنفيذي 🚀", icon: Rocket },
                  { type: "quiz", label: "تحدي واختبار 🎯", icon: HelpCircle },
                  { type: "text", label: "استجابات واقتراحات", icon: FileText },
                  { type: "rating", label: "تقييم بالنجوم ⭐", icon: Star },
                  { type: "emoji", label: "تفاعل تعبيري 🔥", icon: Flame },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSel = formType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleTypeChange(item.type as PollType)}
                      className={`flex items-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all text-right ${
                        isSel
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">التصنيف</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="rounded-2xl h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="تنظيمي وجداول" className="text-xs">تنظيمي وجداول دراسية</SelectItem>
                  <SelectItem value="أكاديمي وشروحات" className="text-xs">أكاديمي وشروحات ومواد</SelectItem>
                  <SelectItem value="قرارات وفعاليات" className="text-xs">قرارات وفعاليات مدرسية</SelectItem>
                  <SelectItem value="تحدي وتنافس" className="text-xs">تحدي وتنافس ومسابقات</SelectItem>
                  <SelectItem value="اقتراحات الطلاب" className="text-xs">صندوق أفكار واقتراحات</SelectItem>
                  <SelectItem value="استطلاع جودة" className="text-xs">استطلاع رأي وتقييم جودة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Question Text */}
            <div>
              <Label className="text-xs font-bold mb-1.5 block">نص السؤال أو موضوع الاستفتاء *</Label>
              <Textarea
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="مثال: ما هو الوقت الأنسب لجدولة مراجعة اختبار STEP؟"
                className="rounded-2xl resize-none h-20 text-xs leading-relaxed"
                required
              />
            </div>

            {/* Action Trigger Specific Fields */}
            {formType === "action" && (
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 text-xs font-bold">
                  <Rocket className="h-4 w-4 text-blue-600" />
                  <span>تفاصيل القرار المراد تنفيذه فور اكتمال التصويت:</span>
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground block mb-1">عنوان الإجراء التنفيذي</Label>
                  <Input
                    value={formActionTitle}
                    onChange={(e) => setFormActionTitle(e.target.value)}
                    placeholder="مثال: اعتماد حصص تقوية مجانية يوم السبت في الجدول"
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground block mb-1">وصف الإجراء والنتيجة</Label>
                  <Input
                    value={formActionDesc}
                    onChange={(e) => setFormActionDesc(e.target.value)}
                    placeholder="سيتم إرسال تنبيه للطلاب وإضافة الموعد في التقويم فور اعتماد القرار."
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Quiz / Challenge Specific Fields */}
            {formType === "quiz" && (
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 text-xs font-bold">
                  <Award className="h-4 w-4 text-purple-600" />
                  <span>إعدادات التحدي والاختبار (تحديد الإجابة الصحيحة):</span>
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground block mb-1">اختر الخيار الصحيح *</Label>
                  <Select
                    value={String(formCorrectIndex)}
                    onValueChange={(val) => setFormCorrectIndex(parseInt(val, 10))}
                  >
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {formOptions.map((opt, i) => (
                        <SelectItem key={i} value={String(i)} className="text-xs">
                          الخيار {i + 1}: {opt || `(خيار ${i + 1})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground block mb-1">الشرح والحل النموذجي (يظهر للطالب بعد التصويت)</Label>
                  <Textarea
                    value={formQuizExplanation}
                    onChange={(e) => setFormQuizExplanation(e.target.value)}
                    placeholder="اكتب خطوات الحل أو سبب صحة هذا الخيار لتظهر للطالب بعد إجابته..."
                    className="rounded-xl resize-none h-16 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            {formType !== "text" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">خيارات التصويت *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddOptionField}
                    className="h-7 text-[11px] font-bold text-primary gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>إضافة خيار</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {formOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-6 text-center shrink-0">
                        {index + 1}.
                      </span>
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`نص الخيار ${index + 1}...`}
                        className="rounded-xl h-10 text-xs flex-1"
                      />
                      {formOptions.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOptionField(index)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings & Expiry */}
            <div className="space-y-4 pt-3 border-t border-border/50">
              {/* Pin Switch */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-200">
                    <Pin className="h-3.5 w-3.5 fill-amber-500 text-amber-600 dark:text-amber-400 rotate-45" />
                    <span>تثبيت الاستفتاء في أعلى القائمة 📌</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    يظهر كأول عنصر ومميزاً بعلامة ذهبية لجميع الطلاب والزوار
                  </p>
                </div>
                <Switch checked={formIsPinned} onCheckedChange={setFormIsPinned} />
              </div>

              {/* Expiry Duration Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5 text-primary" />
                    <span>مدة وصلاحية الاستفتاء</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {formExpiryMode === "never" ? "♾️ مفتوح دائماً" : "ينتهي تلقائياً"}
                  </span>
                </div>

                <Select value={formExpiryMode} onValueChange={setFormExpiryMode}>
                  <SelectTrigger className="rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="never" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ♾️ مفتوح دائماً (بدون انتهاء صلاحية / لانهائي)
                    </SelectItem>
                    <SelectItem value="1h" className="text-xs">⚡ ساعة واحدة (1 ساعة - سريع)</SelectItem>
                    <SelectItem value="24h" className="text-xs">🕒 24 ساعة (يوم كامل)</SelectItem>
                    <SelectItem value="3d" className="text-xs">📅 3 أيام</SelectItem>
                    <SelectItem value="7d" className="text-xs">📆 أسبوع كامل (7 أيام)</SelectItem>
                    <SelectItem value="14d" className="text-xs">🗓️ أسبوعان (14 يوماً - الافتراضي)</SelectItem>
                    <SelectItem value="30d" className="text-xs">🌙 شهر كامل (30 يوماً)</SelectItem>
                    <SelectItem value="custom_days" className="text-xs font-semibold text-primary">⚙️ مدة مخصصة بعدد الأيام...</SelectItem>
                    <SelectItem value="custom_hours" className="text-xs font-semibold text-primary">⏱️ مدة مخصصة بعدد الساعات...</SelectItem>
                    <SelectItem value="custom_datetime" className="text-xs font-semibold text-primary">🗓️ تاريخ ووقت محدد بالتفصيل...</SelectItem>
                  </SelectContent>
                </Select>

                {/* Conditional Custom Inputs */}
                {formExpiryMode === "custom_days" && (
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-1.5">
                    <Label className="text-xs font-bold">حدد عدد الأيام:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={formCustomDays}
                        onChange={(e) => setFormCustomDays(e.target.value)}
                        placeholder="مثال: 5، 10، 45..."
                        className="rounded-xl h-9 text-xs"
                      />
                      <span className="text-xs font-bold text-muted-foreground shrink-0">يوم</span>
                    </div>
                  </div>
                )}

                {formExpiryMode === "custom_hours" && (
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-1.5">
                    <Label className="text-xs font-bold">حدد عدد الساعات:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="720"
                        value={formCustomHours}
                        onChange={(e) => setFormCustomHours(e.target.value)}
                        placeholder="مثال: 2، 6، 48..."
                        className="rounded-xl h-9 text-xs"
                      />
                      <span className="text-xs font-bold text-muted-foreground shrink-0">ساعة</span>
                    </div>
                  </div>
                )}

                {formExpiryMode === "custom_datetime" && (
                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-1.5">
                    <Label className="text-xs font-bold">تاريخ ووقت الإغلاق المحدد:</Label>
                    <Input
                      type="datetime-local"
                      value={formCustomDateTime}
                      onChange={(e) => setFormCustomDateTime(e.target.value)}
                      className="rounded-xl h-9 text-xs font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Other Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold cursor-pointer block" htmlFor="allow-multi">
                      {formType === "choice"
                        ? "السماح باختيارات متعددة"
                        : formType === "text"
                        ? "السماح بعدة استجابات ومقترحات"
                        : "السماح باستجابات متعددة"}
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      {formType === "choice"
                        ? "يمكن للطالب تحديد أكثر من خيار"
                        : formType === "text"
                        ? "يمكن للطالب إرسال أكثر من فكرة أو إجابة"
                        : "يمكّن المستخدم من إرسال أكثر من مشاركة"}
                    </p>
                  </div>
                  <Switch id="allow-multi" checked={formAllowMultiple} onCheckedChange={setFormAllowMultiple} />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold cursor-pointer block" htmlFor="prevent-with">
                      منع تعديل أو سحب الصوت
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      لا يمكن للمصوت إلغاء صوته بعد الاعتماد
                    </p>
                  </div>
                  <Switch id="prevent-with" checked={formPreventWithdraw} onCheckedChange={setFormPreventWithdraw} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-3 border-t border-border/50">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button type="button" onClick={handleSavePoll} className="rounded-xl font-bold bg-primary text-primary-foreground">
              {editingPoll ? "حفظ التعديلات" : "نشر الاستفتاء الآن"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── IN-APP DELETE CONFIRMATION DIALOG (Fixes iframe blocked confirm) ── */}
      <Dialog open={Boolean(pollToDelete)} onOpenChange={(open) => !open && setPollToDelete(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <span>تأكيد حذف الاستفتاء</span>
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed pt-1 text-foreground font-medium">
              هل أنت متأكد من رغبتك في حذف هذا الاستفتاء نهائياً؟
              <br />
              <strong className="block mt-2 p-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
                "{pollToDelete?.question}"
              </strong>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setPollToDelete(null)}
              className="rounded-xl flex-1"
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="rounded-xl font-bold flex-1 gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              <span>{isDeleting ? "جارٍ الحذف..." : "نعم، احذف الآن"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── VIEW RESULTS & VOTES MODAL ── */}
      <Dialog open={Boolean(viewingPollStats)} onOpenChange={(open) => !open && setViewingPollStats(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span>نتائج وتفاصيل المشاركات</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-foreground font-medium pt-1">
              {viewingPollStats?.question}
            </DialogDescription>
          </DialogHeader>

          {viewingPollStats && (
            <div className="space-y-4 py-2">
              {/* Option Breakdown */}
              {viewingPollStats.type !== "text" && (
                <div className="space-y-2 p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <h4 className="text-xs font-bold text-foreground mb-2">توزيع الأصوات ونسب الاختيار:</h4>
                  {viewingPollStats.parsedOptions.map((opt, i) => {
                    const count = viewingPollStats.optionCounts[i] || 0;
                    const pct = viewingPollStats.optionPercentages[i] || 0;
                    const isCorrect = viewingPollStats.type === "quiz" && viewingPollStats.correctOptionIndex === i;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className={isCorrect ? "text-emerald-600 font-bold" : ""}>
                            {isCorrect && "✓ "} {opt}
                          </span>
                          <span>{pct}% ({count} صوت)</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isCorrect ? "bg-emerald-500" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* List of Registered Voters or Answers */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground">
                  سجل المشاركين ({viewingPollStats.votes.length}):
                </h4>
                {viewingPollStats.votes.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">لم يشارك أي طالب حتى الآن</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {viewingPollStats.votes.map((vote, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-foreground">{vote.userName || "طالب"}</span>
                          {vote.textAnswer && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">
                              "{vote.textAnswer}"
                            </p>
                          )}
                        </div>
                        <div className="text-left shrink-0">
                          {vote.optionIndex !== null && vote.optionIndex !== undefined && (
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {viewingPollStats.parsedOptions[vote.optionIndex] || `خيار ${vote.optionIndex + 1}`}
                            </Badge>
                          )}
                          {vote.ratingValue && (
                            <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                              ⭐ {vote.ratingValue}/5
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {new Date(vote.createdAt).toLocaleDateString("ar-SA")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border/50">
            <Button onClick={() => setViewingPollStats(null)} className="rounded-xl text-xs font-bold">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
