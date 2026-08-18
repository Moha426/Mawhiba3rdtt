import { useState, useEffect, useMemo, useCallback } from "react";
import { useListSubjects, useGetSettings } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, ExternalLink, School, Users, MessageCircle, BookOpen, Info,
  Camera, Twitter, Youtube, Send, Music2, Ghost, Link2, HelpCircle,
  Lightbulb, CheckCircle2, Clock, ThumbsUp, Plus, AlertCircle,
  MessageSquare, Sparkles, Image as ImageIcon, RotateCcw, ChevronDown, Check
} from "lucide-react";
import { LoadingPage } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useStudentProfile } from "@/lib/use-student-profile";
import { useAuth } from "@/lib/auth";
import {
  fetchQuestionsApi,
  submitQuestionApi,
  fetchSuggestionsApi,
  submitSuggestionApi,
  likeSuggestionApi,
  type StudentQuestion,
  type StudentSuggestion
} from "@/lib/feedback";

type SocialLink = { platform: string; label: string; url: string };
type SiteSettings = { schoolName: string | null; teacherPhone: string | null; socialLinks: SocialLink[] };
type LucideIcon = typeof MessageCircle;

const PLATFORM_META: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  whatsapp:  { icon: MessageCircle, label: "واتساب",    color: "#25d366" },
  instagram: { icon: Camera,        label: "انستقرام",  color: "#e1306c" },
  twitter:   { icon: Twitter,       label: "تويتر",    color: "#1da1f2" },
  youtube:   { icon: Youtube,       label: "يوتيوب",   color: "#ff0000" },
  telegram:  { icon: Send,          label: "تيليقرام", color: "#0088cc" },
  tiktok:    { icon: Music2,        label: "تيك توك",  color: "#333333" },
  snapchat:  { icon: Ghost,         label: "سناب شات", color: "#f5a623" },
  other:     { icon: Link2,         label: "رابط",     color: "#6366f1" },
};

export default function TeacherPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useStudentProfile();
  const { data: settingsData } = useGetSettings();
  const { data: subjects = [], isLoading: isSubjectsLoading } = useListSubjects();

  const [activeTab, setActiveTab] = useState<"questions" | "suggestions" | "contact">("questions");

  // Questions State
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [qSubject, setQSubject] = useState("");
  const [qText, setQText] = useState("");
  const [qImageUrl, setQImageUrl] = useState("");
  const [isSubmittingQ, setIsSubmittingQ] = useState(false);

  // Suggestions State
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [sTitle, setSTitle] = useState("");
  const [sContent, setSContent] = useState("");
  const [sCategory, setSCategory] = useState<"أكاديمي" | "المنصة" | "الجدول" | "المكتبة" | "عام">("المنصة");
  const [isSubmittingS, setIsSubmittingS] = useState(false);
  const [likedSuggestions, setLikedSuggestions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("talented_liked_suggestions_v1");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const currentStudentId = useMemo(() => {
    return user?.uid || (profile?.id ? String(profile.id) : "guest_student");
  }, [user, profile]);

  const currentStudentName = useMemo(() => {
    return profile?.name || user?.email?.split("@")[0] || "طالب موهبة";
  }, [user, profile]);

  const loadQuestions = useCallback(async () => {
    setIsQuestionsLoading(true);
    try {
      const data = await fetchQuestionsApi();
      setQuestions(data);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsQuestionsLoading(false);
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    setIsSuggestionsLoading(true);
    try {
      const data = await fetchSuggestionsApi();
      setSuggestions(data);
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
    loadSuggestions();

    const handleQChange = () => { loadQuestions(); };
    const handleSChange = () => { loadSuggestions(); };

    window.addEventListener("questions_data_change", handleQChange);
    window.addEventListener("suggestions_data_change", handleSChange);

    return () => {
      window.removeEventListener("questions_data_change", handleQChange);
      window.removeEventListener("suggestions_data_change", handleSChange);
    };
  }, [loadQuestions, loadSuggestions]);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim()) {
      toast({ title: "تنبيه", description: "يرجى كتابة نص السؤال", variant: "destructive" });
      return;
    }

    setIsSubmittingQ(true);
    try {
      await submitQuestionApi({
        studentId: currentStudentId,
        studentName: currentStudentName,
        subject: qSubject || (subjects[0]?.name ?? "عام"),
        questionText: qText.trim(),
        imageUrl: qImageUrl.trim() || undefined,
      });

      toast({
        title: "تم إرسال السؤال للمعلم بنجاح! 📨",
        description: "سيتلقى المعلم سؤالك وسيرد عليك هنا قريباً.",
      });

      setQText("");
      setQImageUrl("");
      setIsAskOpen(false);
      await loadQuestions();
    } catch (err: any) {
      toast({
        title: "فشل الإرسال",
        description: err.message || "حدث خطأ أثناء إرسال السؤال",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingQ(false);
    }
  };

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sTitle.trim() || !sContent.trim()) {
      toast({ title: "تنبيه", description: "يرجى تعبئة عنوان وتفاصيل المقترح", variant: "destructive" });
      return;
    }

    setIsSubmittingS(true);
    try {
      await submitSuggestionApi({
        studentId: currentStudentId,
        studentName: currentStudentName,
        title: sTitle.trim(),
        content: sContent.trim(),
        category: sCategory,
      });

      toast({
        title: "تم إرسال مقترحك للمعلم بنجاح! 💡",
        description: "شكراً لك على مساهمتك في تطوير المنصة والمدرسة.",
      });

      setSTitle("");
      setSContent("");
      setIsSuggestOpen(false);
      await loadSuggestions();
    } catch (err: any) {
      toast({
        title: "فشل الإرسال",
        description: err.message || "حدث خطأ أثناء إرسال المقترح",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingS(false);
    }
  };

  const handleLikeSuggestion = async (sug: StudentSuggestion) => {
    const isLiked = likedSuggestions.includes(sug.id);
    const newLikes = isLiked ? Math.max(0, (sug.likes || 1) - 1) : (sug.likes || 0) + 1;

    try {
      await likeSuggestionApi(sug.id, newLikes);
      const nextLiked = isLiked
        ? likedSuggestions.filter((id) => id !== sug.id)
        : [...likedSuggestions, sug.id];

      setLikedSuggestions(nextLiked);
      try {
        localStorage.setItem("talented_liked_suggestions_v1", JSON.stringify(nextLiked));
      } catch (err) {
        console.warn("Storage error:", err);
      }

      setSuggestions((prev) =>
        prev.map((s) => (s.id === sug.id ? { ...s, likes: newLikes } : s))
      );
    } catch (err) {
      console.warn("Failed to update like:", err);
    }
  };

  const showSchool = settingsData?.showSchoolName !== false;
  const rawSchoolName = typeof settingsData?.schoolName === "string" ? settingsData.schoolName.trim() : null;
  const resolvedSchoolName = showSchool && rawSchoolName ? rawSchoolName : null;

  const settings: SiteSettings = {
    schoolName: resolvedSchoolName,
    teacherPhone: settingsData?.teacherPhone ?? null,
    socialLinks: settingsData?.socialLinks ?? [],
  };

  const subjectsWithTeacher = subjects.filter((s) => s.teacherName || s.teacherPhone);
  const socialLinks = (settings?.socialLinks ?? []).filter((l) => l.url);

  if (isSubjectsLoading) return <LoadingPage />;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader
        icon={Users}
        title="المعلمون والاقتراحات والأسئلة"
        subtitle="تواصل مع معلميك، أرسل أسئلتك المستعصية، وشارك مقترحاتك لتطوير المنصة"
      />

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 flex-wrap">
          <TabsList className="h-11 rounded-2xl bg-muted/60 p-1">
            <TabsTrigger
              value="questions"
              className="rounded-xl px-4 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>أسئلة الطلاب للمعلم</span>
              {questions.length > 0 && (
                <span className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {questions.length}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="suggestions"
              className="rounded-xl px-4 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span>صندوق الاقتراحات</span>
              {suggestions.length > 0 && (
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {suggestions.length}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="contact"
              className="rounded-xl px-4 text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Phone className="h-4 w-4 text-emerald-500" />
              <span>دليل المعلمين والتواصل</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "questions" && (
              <Button
                onClick={() => setIsAskOpen(true)}
                className="h-10 rounded-2xl px-4 font-bold text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>إرسال سؤال للمعلم</span>
              </Button>
            )}

            {activeTab === "suggestions" && (
              <Button
                onClick={() => setIsSuggestOpen(true)}
                className="h-10 rounded-2xl px-4 font-bold text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>تقديم مقترح جديد</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── TAB 1: QUESTIONS TO TEACHER ── */}
        <TabsContent value="questions" className="space-y-4 mt-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-purple-500/5 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">هل واجهت سؤالاً مستعصياً في الواجب أو التجميعات؟</h3>
                <p className="text-xs text-muted-foreground">أرسل سؤالك مباشرة لمعلم المادة ليصلك الشرح والحل النموذجي بالتفصيل.</p>
              </div>
            </div>

            <Button
              onClick={() => setIsAskOpen(true)}
              className="rounded-2xl h-10 px-5 font-extrabold bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm shrink-0"
            >
              <Send className="h-4 w-4" />
              <span>اسأل المعلم الآن</span>
            </Button>
          </div>

          {/* List of Questions */}
          {questions.length === 0 ? (
            <div className="rounded-3xl border border-border/60 bg-card p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-foreground text-base">لا توجد أسئلة مرسلة حتى الآن</h3>
              <p className="text-xs text-muted-foreground mt-1">
                كن أول من يشارك سؤاله مع المعلمين عبر الضغط على زر "إرسال سؤال للمعلم"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((item) => {
                const isAnswered = item.status === "answered" && item.teacherReply;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs font-bold border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10">
                          {item.subject || "مادة دراسية"}
                        </Badge>
                        <span className="text-xs font-semibold text-muted-foreground">
                          بواسطة: <strong className="text-foreground">{item.studentName}</strong>
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          · {new Date(item.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {isAnswered ? (
                        <Badge className="bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          تمت إجابة المعلم
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-bold flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30">
                          <Clock className="h-3.5 w-3.5" />
                          قيد مراجعة المعلم
                        </Badge>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-sm font-medium text-foreground leading-relaxed">
                      {item.questionText}
                    </div>

                    {item.imageUrl && (
                      <div className="rounded-2xl overflow-hidden border border-border/50 max-w-sm">
                        <img src={item.imageUrl} alt="مرفق السؤال" className="w-full h-auto object-cover" />
                      </div>
                    )}

                    {/* Teacher Reply Section */}
                    {isAnswered ? (
                      <div className="mt-3 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-emerald-600" />
                            رد المعلم ({item.repliedBy || "المعلم"}):
                          </span>
                          {item.repliedAt && (
                            <span className="text-[10px] text-emerald-600/80">
                              {new Date(item.repliedAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 font-medium leading-relaxed">
                          {item.teacherReply}
                        </p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span>تم إشعار المعلم بالسؤال وسيقوم بالرد قريباً وتوضيح الحل هنا.</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: SUGGESTIONS BOX ── */}
        <TabsContent value="suggestions" className="space-y-4 mt-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Lightbulb className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">صندوق المقترحات والأفكار التطويرية</h3>
                <p className="text-xs text-muted-foreground">شاركنا اقتراحاتك لتحسين الجداول، المحتوى التعليمي، أو المنصة.</p>
              </div>
            </div>

            <Button
              onClick={() => setIsSuggestOpen(true)}
              className="rounded-2xl h-10 px-5 font-extrabold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>تقديم مقترح</span>
            </Button>
          </div>

          {/* List of Suggestions */}
          {suggestions.length === 0 ? (
            <div className="rounded-3xl border border-border/60 bg-card p-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Lightbulb className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-foreground text-base">لا توجد مقترحات مسجلة حتى الآن</h3>
              <p className="text-xs text-muted-foreground mt-1">شاركنا بأول مقترح وفكرة تود رؤيتها في المنصة والمدرسة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((item) => {
                const isLiked = likedSuggestions.includes(item.id);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs font-bold border-amber-500/30 text-amber-600 bg-amber-500/10">
                          {item.category || "عام"}
                        </Badge>

                        {item.status === "implemented" ? (
                          <Badge className="bg-emerald-600 text-white text-[11px] font-bold">
                            تم التطبيق بنجاح 🚀
                          </Badge>
                        ) : item.status === "approved" ? (
                          <Badge className="bg-purple-600 text-white text-[11px] font-bold">
                            مقبول وقيد التنفيذ ✨
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px] font-bold">
                            قيد الدراسة 🔍
                          </Badge>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-foreground leading-snug">
                        {item.title}
                      </h4>

                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>

                      {item.adminResponse && (
                        <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-xs space-y-1">
                          <span className="font-bold text-primary block">رد إدارة المنصة والمعلم:</span>
                          <p className="text-foreground">{item.adminResponse}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground text-[11px]">
                        بواسطة: <strong className="text-foreground">{item.studentName}</strong>
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikeSuggestion(item)}
                        className={`h-8 px-3 rounded-xl gap-1.5 font-bold transition-all ${
                          isLiked
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shadow-sm"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <ThumbsUp className={`h-3.5 w-3.5 ${isLiked ? "fill-current text-amber-600" : ""}`} />
                        <span>{item.likes || 0} تأييد</span>
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: CONTACT & TEACHERS DIRECTORY ── */}
        <TabsContent value="contact" className="space-y-5 mt-5">
          {/* School info card */}
          {(settings?.schoolName || settings?.teacherPhone) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm p-5"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <School className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {settings?.schoolName && (
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">المدرسة والجهة التعليمية</p>
                      <p className="font-bold text-base text-foreground">{settings.schoolName}</p>
                    </div>
                  )}
                  {settings?.teacherPhone && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <a
                        href={`https://wa.me/${settings.teacherPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-sm"
                      >
                        <MessageCircle className="h-4 w-4" />
                        واتساب المعلم المباشر
                      </a>
                      <a
                        href={`tel:${settings.teacherPhone}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-muted text-muted-foreground border border-border/50 text-xs font-semibold hover:bg-muted/80 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        {settings.teacherPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Social links */}
              {socialLinks.length > 0 && (
                <div className="pt-4 border-t border-border/30 mt-4">
                  <p className="text-xs text-muted-foreground font-medium mb-2.5">روابط التواصل الاجتماعي الرسمية</p>
                  <div className="flex flex-wrap gap-2">
                    {socialLinks.map((link, i) => {
                      const meta = PLATFORM_META[link.platform] ?? PLATFORM_META.other;
                      return (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold transition-colors hover:opacity-80 shadow-sm"
                          style={{
                            backgroundColor: `${meta.color}12`,
                            borderColor: `${meta.color}30`,
                            color: meta.color,
                          }}
                        >
                          <meta.icon className="h-4 w-4" />
                          <span>{link.label || meta.label}</span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Per-subject teacher cards */}
          {subjectsWithTeacher.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">معلمو المواد الدراسية</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {subjectsWithTeacher.map((subject, i) => (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 rounded-3xl border border-border/50 bg-card hover:shadow-md transition-all"
                  >
                    <div
                      className="h-11 w-11 rounded-2xl shrink-0 flex items-center justify-center font-bold text-base"
                      style={{
                        backgroundColor: `${subject.color}20`,
                        color: subject.color,
                        border: `1.5px solid ${subject.color}40`,
                      }}
                    >
                      {subject.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-foreground truncate">{subject.name}</p>
                        <Badge
                          className="text-[10px] py-0 px-2 h-4 border-0 rounded-full shrink-0"
                          style={{ backgroundColor: `${subject.color}18`, color: subject.color }}
                        >
                          مادة
                        </Badge>
                      </div>
                      {subject.teacherName && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {subject.teacherName}
                        </p>
                      )}
                      {subject.teacherPhone && (
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          <a
                            href={`https://wa.me/${subject.teacherPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle className="h-3 w-3" />
                            واتساب
                          </a>
                          <a
                            href={`tel:${subject.teacherPhone}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted text-muted-foreground border border-border/50 text-[11px] font-semibold hover:bg-muted/80 transition-colors"
                          >
                            <Phone className="h-3 w-3" />
                            {subject.teacherPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Ask Teacher Dialog ── */}
      <Dialog open={isAskOpen} onOpenChange={setIsAskOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-600" />
              <span>إرسال سؤال للمعلم</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              حدد المادة الدراسية واكتب سؤالك بالتفصيل ليقوم المعلم بمراجعته وشرحه لك.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateQuestion} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold mb-1.5 block">المادة الدراسية *</Label>
              <Select value={qSubject} onValueChange={setQSubject}>
                <SelectTrigger className="rounded-2xl h-11 text-xs">
                  <SelectValue placeholder="اختر المادة الدراسية..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.name} className="text-xs">
                      {s.name} {s.teacherName ? `(المعلم: ${s.teacherName})` : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value="قدرات وتحصيلي" className="text-xs">
                    قسم القدرات والتحصيلي
                  </SelectItem>
                  <SelectItem value="استفسار عام" className="text-xs">
                    استفسار عام
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">نص السؤال أو المسألة *</Label>
              <Textarea
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="اكتب السؤال بوضوح، وحدد النقطة التي واجهت فيها صعوبة..."
                className="rounded-2xl resize-none h-24 text-xs leading-relaxed"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">رابط صورة السؤال (اختياري)</Label>
              <Input
                value={qImageUrl}
                onChange={(e) => setQImageUrl(e.target.value)}
                placeholder="https://example.com/question-image.jpg"
                className="rounded-2xl h-10 text-xs"
              />
            </div>

            <DialogFooter className="flex gap-2 pt-2 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setIsAskOpen(false)} className="rounded-xl">
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmittingQ || !qText.trim()} className="rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white gap-2">
                <Send className="h-4 w-4" />
                <span>إرسال السؤال للمعلم</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Submit Suggestion Dialog ── */}
      <Dialog open={isSuggestOpen} onOpenChange={setIsSuggestOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <span>تقديم مقترح جديد</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              شارك فكرتك لتحسين تجربة التعلم بالمنصة وتطوير خدمات المدرسة.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSuggestion} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold mb-1.5 block">تصنيف المقترح *</Label>
              <Select value={sCategory} onValueChange={(v: any) => setSCategory(v)}>
                <SelectTrigger className="rounded-2xl h-11 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="المنصة" className="text-xs">تطوير المنصة والموقع</SelectItem>
                  <SelectItem value="أكاديمي" className="text-xs">شروحات ومحتوى أكاديمي</SelectItem>
                  <SelectItem value="الجدول" className="text-xs">الجدول الدراسي والمواعيد</SelectItem>
                  <SelectItem value="المكتبة" className="text-xs">المكتبة والتجميعات</SelectItem>
                  <SelectItem value="عام" className="text-xs">اقتراح عام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">عنوان المقترح *</Label>
              <Input
                value={sTitle}
                onChange={(e) => setSTitle(e.target.value)}
                placeholder="مثال: إضافة قسم لاختبارات التحصيلي التجريبية الأسبوعية"
                className="rounded-2xl h-11 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-bold mb-1.5 block">تفاصيل الفكرة وكيف تخدم الطلاب *</Label>
              <Textarea
                value={sContent}
                onChange={(e) => setSContent(e.target.value)}
                placeholder="اشرح مقترحك بالتفصيل وما هي الفائدة المتوقعة..."
                className="rounded-2xl resize-none h-24 text-xs leading-relaxed"
                required
              />
            </div>

            <DialogFooter className="flex gap-2 pt-2 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => setIsSuggestOpen(false)} className="rounded-xl">
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmittingS || !sTitle.trim() || !sContent.trim()} className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white gap-2">
                <Send className="h-4 w-4" />
                <span>نشر المقترح</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
