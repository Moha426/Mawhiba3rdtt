import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Vote,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  Users,
  Send,
  HelpCircle,
  BarChart3,
  Flame,
  MessageSquare,
  Undo2,
  Star,
  Rocket,
  Award,
  Check,
  X,
  AlertCircle,
  ThumbsUp,
  Share2,
  Pin,
  Layers,
  PlusCircle,
  Edit3,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useStudentProfile } from "@/lib/use-student-profile";
import {
  usePolls,
  votePollApi,
  withdrawPollVoteApi,
  updatePollVoteByIdApi,
  deletePollVoteByIdApi,
  updatePollApi,
  type PollWithStats
} from "@/lib/polls";

interface PollsSectionProps {
  className?: string;
  limit?: number;
  showAllLink?: boolean;
}

export function PollsSection({ className = "", limit, showAllLink = false }: PollsSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useStudentProfile();
  const { polls, isLoading, refreshPolls, currentUserId } = usePolls();

  const [filter, setFilter] = useState<"all" | "active" | "voted">("active");
  const [textResponses, setTextResponses] = useState<Record<number, string>>({});
  const [hoverRating, setHoverRating] = useState<Record<number, number>>({});
  const [submittingPollId, setSubmittingPollId] = useState<number | null>(null);
  const [editingVoteId, setEditingVoteId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const [globalHidePeers, setGlobalHidePeers] = useState(() => {
    return localStorage.getItem("global_hide_peer_responses") === "true";
  });

  const handleToggleGlobalHidePeers = () => {
    const next = !globalHidePeers;
    setGlobalHidePeers(next);
    localStorage.setItem("global_hide_peer_responses", String(next));
    toast({
      title: next ? "تم إخفاء رسائل الطلاب 🙈" : "تم إظهار رسائل الطلاب 👁️",
      description: next
        ? "لن يرى الطلاب إجابات زملائهم الآخرين في الاستطلاعات (خاصة بالمشرف)"
        : "يمكن للطلاب الآن الاطلاع على مشاركات زملائهم",
    });
  };

  const handleToggleHidePeersForPoll = async (poll: PollWithStats) => {
    try {
      const next = !poll.hidePeerResponses;
      await updatePollApi(poll.id, { hidePeerResponses: next });
      toast({
        title: next ? "تم إخفاء إجابات هذا الاستطلاع 🙈" : "تم إظهار إجابات هذا الاستطلاع للجميع 👁️",
        description: next ? "سيرى المشرف فقط استجابات الطلاب لهذا السؤال" : "أصبحت الإجابات مرئية لجميع الطلاب",
      });
      await refreshPolls();
    } catch (err: any) {
      toast({ title: "فشل التعديل", description: err.message, variant: "destructive" });
    }
  };

  const currentUserName = useMemo(() => {
    return profile?.name || user?.email?.split("@")[0] || "طالب موهبة";
  }, [user, profile]);

  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      if (filter === "active") return poll.status === "active" && !poll.isExpired;
      if (filter === "voted") return poll.hasVoted;
      return true;
    });
  }, [polls, filter]);

  const displayedPolls = limit ? filteredPolls.slice(0, limit) : filteredPolls;

  const handleVoteChoice = async (poll: PollWithStats, optionIndex: number) => {
    if (poll.status !== "active" || poll.isExpired) {
      toast({ title: "تنبيه", description: "هذا الاستفتاء مغلق حالياً", variant: "destructive" });
      return;
    }

    setSubmittingPollId(poll.id);
    try {
      await votePollApi(poll.id, currentUserId, currentUserName, optionIndex);
      if (poll.type === "quiz") {
        const isCorrect = poll.correctOptionIndex === optionIndex;
        if (isCorrect) {
          toast({
            title: "إجابة صحيحة! 🎉 مبروك",
            description: "أحسنت الاختيار! تم تسجيل إجابتك النموذجية بنجاح.",
          });
        } else {
          toast({
            title: "إجابة غير دقيقة 📚",
            description: "راجع الشرح التوضيحي أدناه لمعرفة خطوات الحل الصحيحة.",
          });
        }
      } else {
        toast({
          title: "تم تسجيل صوتك بنجاح! 🗳️",
          description: `صوتت لـ: "${poll.parsedOptions[optionIndex]}"`,
        });
      }
      await refreshPolls();
    } catch (err: any) {
      toast({
        title: "فشل التصويت",
        description: err.message || "حدث خطأ أثناء إرسال صوتك",
        variant: "destructive",
      });
    } finally {
      setSubmittingPollId(null);
    }
  };

  const handleVoteRating = async (poll: PollWithStats, rating: number) => {
    if (poll.status !== "active" || poll.isExpired) {
      toast({ title: "تنبيه", description: "هذا الاستفتاء مغلق حالياً", variant: "destructive" });
      return;
    }

    setSubmittingPollId(poll.id);
    try {
      await votePollApi(poll.id, currentUserId, currentUserName, rating - 1, null, rating);
      toast({
        title: "تم تسجيل تقييمك ⭐",
        description: `شكراً لك! قيّمت بـ ${rating} من 5 نجوم.`,
      });
      await refreshPolls();
    } catch (err: any) {
      toast({
        title: "فشل التقييم",
        description: err.message || "تعذر تسجيل التقييم",
        variant: "destructive",
      });
    } finally {
      setSubmittingPollId(null);
    }
  };

  const handleVoteText = async (poll: PollWithStats) => {
    const answer = textResponses[poll.id]?.trim();
    if (!answer) {
      toast({ title: "تنبيه", description: "يرجى كتابة إجابتك أو مقترحك أولاً", variant: "destructive" });
      return;
    }

    setSubmittingPollId(poll.id);
    try {
      const isMultiple = poll.allowMultiple || (poll.userVotes && poll.userVotes.length > 0);
      await votePollApi(poll.id, currentUserId, currentUserName, null, answer, null, isMultiple);
      setTextResponses((prev) => ({ ...prev, [poll.id]: "" }));
      toast({
        title: "تم إرسال مشاركتك بنجاح! 🌟",
        description: "شكراً لمشاركتنا فكرتك القيمة والمفيدة.",
      });
      await refreshPolls();
    } catch (err: any) {
      toast({
        title: "فشل الإرسال",
        description: err.message || "حدث خطأ أثناء إرسال إجابتك",
        variant: "destructive",
      });
    } finally {
      setSubmittingPollId(null);
    }
  };

  const handleEditVoteText = async (voteId: number, pollId: number) => {
    if (!editingText.trim()) return;
    setSubmittingPollId(pollId);
    try {
      await updatePollVoteByIdApi(voteId, editingText.trim());
      setEditingVoteId(null);
      setEditingText("");
      toast({
        title: "تم تحديث استجابتك ✅",
        description: "تم حفظ التعديل بنجاح.",
      });
      await refreshPolls();
    } catch (err: any) {
      toast({
        title: "فشل التعديل",
        description: err.message || "تعذر حفظ التعديل",
        variant: "destructive",
      });
    } finally {
      setSubmittingPollId(null);
    }
  };

  const handleDeleteVoteText = async (voteId: number, pollId: number) => {
    setSubmittingPollId(pollId);
    try {
      await deletePollVoteByIdApi(voteId);
      toast({
        title: "تم حذف الاستجابة 🗑️",
        description: "تم حذف مشاركتك السابقة بنجاح.",
      });
      await refreshPolls();
    } catch (err: any) {
      toast({
        title: "فشل الحذف",
        description: err.message || "تعذر حذف المشاركة",
        variant: "destructive",
      });
    } finally {
      setSubmittingPollId(null);
    }
  };

  const handleWithdraw = async (poll: PollWithStats) => {
    setSubmittingPollId(poll.id);
    try {
      await withdrawPollVoteApi(poll.id, currentUserId);
      toast({
        title: "تم سحب التصويت 🔁",
        description: "يمكنك الآن اختيار خيار آخر بحرية.",
      });
      await refreshPolls();
    } catch (err: any) {
      toast({
        title: "فشل سحب التصويت",
        description: err.message || "لا يمكن سحب التصويت",
        variant: "destructive",
      });
    } finally {
      setSubmittingPollId(null);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-xs">
            <Vote className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
              <span>استطلاعات وتحديات الطلاب</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-xs text-muted-foreground">شارك برأيك، صوّت على القرارات، وتحدَّ زملاءك في الأسئلة اليومية</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Filters */}
          <div className="flex items-center rounded-xl bg-muted/50 p-0.5 border border-border/50">
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === "active" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              النشطة ({polls.filter((p) => p.status === "active" && !p.isExpired).length})
            </button>
            <button
              onClick={() => setFilter("voted")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === "voted" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              مشاركاتي ({polls.filter((p) => p.hasVoted).length})
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refreshPolls()}
            disabled={isLoading}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Admin Supervisor Control Bar */}
      {isAdmin && (
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-purple-950 dark:text-purple-200">
            <Shield className="h-4 w-4 text-purple-600 shrink-0" />
            <div>
              <span className="font-extrabold block">خيار المشرف: إظهار أو إخفاء رسائل الطلاب لجميع الاستطلاعات</span>
              <span className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                {globalHidePeers
                  ? "الحالة الحالية: رسائل الطلاب مخفية عن بعضهم وتظهر لك كمشرف فقط 🙈"
                  : "الحالة الحالية: رسائل الطلاب مرئية لجميع الطلاب 👁️"}
              </span>
            </div>
          </div>
          <Button
            variant={globalHidePeers ? "default" : "outline"}
            size="sm"
            onClick={handleToggleGlobalHidePeers}
            className={`rounded-xl text-xs font-bold gap-1.5 h-8 shrink-0 ${
              globalHidePeers ? "bg-purple-600 text-white hover:bg-purple-700" : "border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300"
            }`}
          >
            {globalHidePeers ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span>{globalHidePeers ? "إظهار للجميع" : "إخفاء عن الطلاب"}</span>
          </Button>
        </div>
      )}

      {/* Poll Cards List */}
      {displayedPolls.length === 0 ? (
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center space-y-2">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Vote className="h-5 w-5" />
          </div>
          <p className="font-bold text-foreground text-sm">لا توجد استطلاعات نشطة حالياً</p>
          <p className="text-xs text-muted-foreground">سيتم إشعارك فور طرح تصويت جديد من قِبل المعلمين والإدارة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedPolls.map((poll) => {
            const isClosed = poll.status === "closed" || poll.isExpired;
            const hasVoted = poll.hasVoted;
            const isBusy = submittingPollId === poll.id;

            return (
              <motion.div
                key={poll.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-3xl p-5 flex flex-col justify-between gap-4 transition-all ${
                  poll.isPinned
                    ? "border-2 border-primary/40 bg-gradient-to-b from-primary/[0.04] via-card to-card shadow-sm ring-1 ring-primary/20"
                    : "border border-border/70 bg-card shadow-xs hover:border-border"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Meta Tags */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {poll.isPinned && (
                        <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 text-[10px] font-black px-2 py-0.5 gap-1 shadow-xs">
                          <Pin className="h-3 w-3 fill-amber-500 text-amber-600 dark:text-amber-400 rotate-45" />
                          <span>مثبت 📌</span>
                        </Badge>
                      )}

                      {poll.allowMultiple && (
                        <Badge className="bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/40 text-[10px] font-bold px-2 py-0.5 gap-1">
                          <Layers className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                          <span>استجابات متعددة 🔄</span>
                        </Badge>
                      )}

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          poll.type === "quiz"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                            : poll.type === "action"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                            : poll.type === "rating"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : poll.type === "emoji"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : poll.type === "text"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {poll.type === "quiz" && "🎯 تحدي واختبار"}
                        {poll.type === "action" && "🚀 قرار تنفيذي"}
                        {poll.type === "rating" && "⭐ تقييم نجوم"}
                        {poll.type === "emoji" && "🔥 تفاعل سريع"}
                        {poll.type === "text" && "✍️ استجابة نصية"}
                        {poll.type === "choice" && "📊 تصويت"}
                      </Badge>

                      {poll.category && (
                        <span className="text-[11px] text-muted-foreground font-semibold">
                          · {poll.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isClosed ? (
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          منتهي 🔒
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          متاح للتصويت 🟢
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground font-bold">
                        {poll.totalVotes} مشاركة
                      </span>
                    </div>
                  </div>

                  {/* Question Title */}
                  <h4 className="text-sm sm:text-base font-bold text-foreground leading-snug">
                    {poll.question}
                  </h4>

                  {/* Action Description Banner */}
                  {poll.type === "action" && (
                    <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1">
                          <Rocket className="h-3.5 w-3.5 text-blue-600" />
                          القرار المقترح لتنفيذه:
                        </span>
                        {poll.actionStatus === "executed" ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                            تم الاعتماد رسمياً ✅
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-400">
                            قيد جمع الأصوات ⏳
                          </Badge>
                        )}
                      </div>
                      <p className="text-blue-950 dark:text-blue-100 font-medium text-[11px] leading-relaxed">
                        {poll.actionTitle}
                      </p>
                      {poll.actionStatus === "executed" && (
                        <div className="mt-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">
                          🎉 تم تطبيق هذا القرار واعتماده رسمياً في المنصة والمدرسة!
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TYPE: RATING (1-5 Stars) ── */}
                  {poll.type === "rating" && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isSelected = (poll.userVotedRating || 0) >= star;
                          const isHovered = (hoverRating[poll.id] || 0) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              disabled={isClosed || isBusy}
                              onMouseEnter={() => setHoverRating((prev) => ({ ...prev, [poll.id]: star }))}
                              onMouseLeave={() => setHoverRating((prev) => ({ ...prev, [poll.id]: 0 }))}
                              onClick={() => handleVoteRating(poll, star)}
                              className="p-1 transition-transform hover:scale-125 focus:outline-none"
                            >
                              <Star
                                className={`h-7 w-7 transition-colors ${
                                  isHovered || isSelected
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-muted-foreground/40"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground px-2 pt-1 border-t border-border/30">
                        <span>متوسط التقييم العام: <strong className="text-foreground">{poll.averageRating || 5.0} / 5</strong></span>
                        {poll.userVotedRating ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">تقييمك: ⭐ {poll.userVotedRating}/5</span>
                        ) : (
                          <span>اضغط على النجوم للتصويت</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── TYPE: EMOJI REACTIONS ── */}
                  {poll.type === "emoji" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {poll.parsedOptions.map((opt, i) => {
                        const isVoted = poll.userVotedOptions.includes(i);
                        const count = poll.optionCounts[i] || 0;
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={isClosed || isBusy}
                            onClick={() => handleVoteChoice(poll, i)}
                            className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                              isVoted
                                ? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs scale-[1.02]"
                                : "bg-muted/20 border-border/60 hover:bg-muted/60 text-foreground"
                            }`}
                          >
                            <span className="text-sm">{opt}</span>
                            <span className="text-[10px] text-muted-foreground font-semibold">
                              {count} تفاعل
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* ── TYPE: CHOICE & ACTION & QUIZ ── */}
                  {(poll.type === "choice" || poll.type === "action" || poll.type === "quiz") && (
                    <div className="space-y-2">
                      {poll.allowMultiple && poll.type === "choice" && (
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-800 dark:text-indigo-300 font-bold flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>يمكنك اختيار وتحديد أكثر من إجابة معاً (تصويت متعدد)</span>
                        </div>
                      )}

                      {poll.parsedOptions.map((option, index) => {
                        const isSelected = poll.userVotedOptions.includes(index);
                        const pct = poll.optionPercentages[index] || 0;
                        const count = poll.optionCounts[index] || 0;
                        const isQuiz = poll.type === "quiz";
                        const isCorrectAnswer = isQuiz && poll.correctOptionIndex === index;

                        return (
                          <motion.button
                            key={index}
                            type="button"
                            disabled={isClosed || isBusy}
                            onClick={() => handleVoteChoice(poll, index)}
                            whileHover={!isClosed ? { scale: 1.01 } : {}}
                            whileTap={!isClosed ? { scale: 0.99 } : {}}
                            className={`w-full text-right p-3 rounded-2xl border transition-all relative overflow-hidden text-xs flex flex-col gap-1.5 ${
                              isSelected
                                ? isQuiz && isCorrectAnswer
                                  ? "border-emerald-500 bg-emerald-500/10 shadow-xs"
                                  : isQuiz && !isCorrectAnswer
                                  ? "border-rose-500 bg-rose-500/10 shadow-xs"
                                  : "border-primary bg-primary/10 shadow-xs"
                                : hasVoted && isQuiz && isCorrectAnswer
                                ? "border-emerald-500/70 bg-emerald-500/5"
                                : "border-border/60 hover:border-primary/50 bg-muted/20 hover:bg-muted/40"
                            }`}
                          >
                            {/* Option Header */}
                            <div className="flex items-center justify-between gap-2 z-10">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? isQuiz && isCorrectAnswer
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : isQuiz && !isCorrectAnswer
                                        ? "bg-rose-600 text-white border-rose-600"
                                        : "bg-primary text-primary-foreground border-primary"
                                      : "border-border bg-background"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <span className={`font-bold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                                  {option}
                                </span>
                              </div>

                              {(hasVoted || isClosed) && (
                                <span className="font-extrabold text-xs text-foreground">
                                  {pct}% <span className="text-[10px] text-muted-foreground font-normal">({count})</span>
                                </span>
                              )}
                            </div>

                            {/* Percentage Bar */}
                            {(hasVoted || isClosed) && (
                              <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden z-10">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isQuiz && isCorrectAnswer
                                      ? "bg-emerald-500"
                                      : isSelected
                                      ? "bg-primary"
                                      : "bg-muted-foreground/30"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* Quiz Explanation Reveal */}
                  {poll.type === "quiz" && hasVoted && poll.quizExplanation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs space-y-1"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-purple-900 dark:text-purple-200">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        <span>الشرح والحل النموذجي:</span>
                      </div>
                      <p className="text-purple-950 dark:text-purple-100 text-[11px] leading-relaxed">
                        {poll.quizExplanation}
                      </p>
                    </motion.div>
                  )}

                  {/* ── TYPE: TEXT RESPONSES / SUGGESTIONS ── */}
                  {poll.type === "text" && (
                    <div className="space-y-3">
                      {/* My Submissions list with Edit & Delete controls */}
                      {poll.userVotes && poll.userVotes.filter((v) => Boolean(v.textAnswer)).length > 0 && (
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-200 text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>إجاباتك ومشاركاتك المسجلة ({poll.userVotes.filter((v) => Boolean(v.textAnswer)).length}):</span>
                            </span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                              يمكنك تعديل أي مشاركة أو إرسال غيرها ✍️
                            </span>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {poll.userVotes
                              .filter((v) => Boolean(v.textAnswer))
                              .map((v, rIdx) => {
                                const isEditing = editingVoteId === v.id;
                                return (
                                  <div
                                    key={v.id || rIdx}
                                    className="bg-card rounded-xl p-2.5 text-xs text-foreground border border-emerald-500/30 space-y-2 shadow-2xs"
                                  >
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <Input
                                          value={editingText}
                                          onChange={(e) => setEditingText(e.target.value)}
                                          className="text-xs h-9 rounded-xl"
                                          disabled={isBusy}
                                          autoFocus
                                        />
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                              setEditingVoteId(null);
                                              setEditingText("");
                                            }}
                                            className="h-7 text-[11px] rounded-lg px-2"
                                            disabled={isBusy}
                                          >
                                            إلغاء
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={() => handleEditVoteText(v.id, poll.id)}
                                            className="h-7 text-[11px] rounded-lg px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                            disabled={isBusy || !editingText.trim()}
                                          >
                                            حفظ التعديل
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-foreground leading-relaxed">
                                          "{v.textAnswer}"
                                        </span>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            title="تعديل هذه المشاركة"
                                            onClick={() => {
                                              setEditingVoteId(v.id);
                                              setEditingText(v.textAnswer || "");
                                            }}
                                            disabled={isBusy || isClosed}
                                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
                                          >
                                            <Edit3 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            title="حذف هذه المشاركة"
                                            onClick={() => handleDeleteVoteText(v.id, poll.id)}
                                            disabled={isBusy || isClosed}
                                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Input Field: Always enabled for active text polls */}
                      {!isClosed && (
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <Input
                              value={textResponses[poll.id] || ""}
                              onChange={(e) =>
                                setTextResponses((prev) => ({ ...prev, [poll.id]: e.target.value }))
                              }
                              placeholder={
                                (poll.userVotes?.filter((v) => Boolean(v.textAnswer)).length || 0) > 0
                                  ? "أضف فكرة أو استجابة أخرى..."
                                  : "اكتب فكرتك أو إجابتك هنا..."
                              }
                              className="rounded-2xl h-10 text-xs flex-1"
                              disabled={isBusy}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  if (textResponses[poll.id]?.trim()) {
                                    handleVoteText(poll);
                                  }
                                }
                              }}
                            />
                            <Button
                              onClick={() => handleVoteText(poll)}
                              disabled={isBusy || !textResponses[poll.id]?.trim()}
                              className="rounded-2xl h-10 px-4 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>
                                {(poll.userVotes?.filter((v) => Boolean(v.textAnswer)).length || 0) > 0
                                  ? "إرسال أخرى"
                                  : "إرسال"}
                              </span>
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                            <span>💡 يمكنك إرسال استجابات متعددة، وتعديل أو حذف أي مشاركة سابقة لك بسهولة.</span>
                          </p>
                        </div>
                      )}

                      {/* Display Recent Peer Answers from OTHER users */}
                      {(() => {
                        const peerVotes = poll.votes.filter((v) => Boolean(v.textAnswer) && v.userId !== currentUserId);
                        const isHiddenByAdmin = Boolean(poll.hidePeerResponses || globalHidePeers);
                        const canSeePeerResponses = !isHiddenByAdmin || isAdmin;

                        if (peerVotes.length === 0) return null;

                        if (!canSeePeerResponses) {
                          return (
                            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-900 dark:text-purple-200 flex items-center gap-2">
                              <Lock className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <span>قام المشرف بإخفاء مشاركات الطلاب الآخرين للحفاظ على الخصوصية (تظهر استجابتك فقط).</span>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            <div className="flex items-center justify-between">
                              <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                                <span>مشاركات الطلاب الآخرين ({peerVotes.length}):</span>
                                {isHiddenByAdmin && isAdmin && (
                                  <Badge variant="outline" className="text-[9px] text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0">
                                    مخفية عن الطلاب (للمشرف فقط)
                                  </Badge>
                                )}
                              </div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleHidePeersForPoll(poll)}
                                  className="h-6 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-lg px-2 gap-1"
                                >
                                  {poll.hidePeerResponses ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                  <span>{poll.hidePeerResponses ? "إظهار للجميع" : "إخفاء عن الطلاب"}</span>
                                </Button>
                              )}
                            </div>

                            {peerVotes.slice(0, 10).map((v, idx) => (
                              <div
                                key={v.id || idx}
                                className="p-2 rounded-xl bg-muted/30 border border-border/40 text-[11px] flex items-start justify-between gap-2"
                              >
                                <span className="text-foreground font-medium">"{v.textAnswer}"</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">{v.userName}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium">
                    {poll.expiresAt ? (
                      <>
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>
                          ينتهي: {new Date(poll.expiresAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}{" "}
                          {new Date(poll.expiresAt).toLocaleTimeString("ar-SA", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">♾️ مفتوح دائماً (بدون انتهاء صلاحية)</span>
                      </>
                    )}
                  </div>

                  {hasVoted && !poll.preventWithdraw && !isClosed && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleWithdraw(poll)}
                      className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Undo2 className="h-3 w-3" />
                      <span>تغيير الصوت</span>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
