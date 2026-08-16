import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Trash2, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Users, 
  PieChart,
  Calendar,
  Send,
  MoreVertical,
  Settings2,
  RefreshCw,
  Image as ImageIcon,
  MessageSquare,
  Eye,
  EyeOff,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Poll, 
  fetchAllPolls, 
  createPoll, 
  deletePoll, 
  updatePollStatus,
  fetchPollVotes,
  syncPollVotes,
  PollVote
} from "@/lib/polls";

export function PollsTab() {
  const { toast } = useToast();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // New Poll Form
  const [newQuestion, setNewQuestion] = useState("");
  const [pollType, setPollType] = useState<"choice" | "text">("choice");
  const [imageUrl, setImageUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [newOptions, setNewOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [preventWithdraw, setPreventWithdraw] = useState(false);
  
  // Stats per poll
  const [pollStats, setPollStats] = useState<Record<number, PollVote[]>>({});

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    setLoading(true);
    const data = await fetchAllPolls();
    setPolls(data);
    setLoading(false);
    
    // Fetch votes for each poll for stats
    const stats: Record<number, PollVote[]> = {};
    for (const poll of data) {
      const votes = await fetchPollVotes(poll.id);
      stats[poll.id] = votes;
    }
    setPollStats(stats);
  };

  const handleAddOption = () => {
    setNewOptions([...newOptions, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (newOptions.length <= 2) return;
    setNewOptions(newOptions.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  const handleCreatePoll = async () => {
    if (!newQuestion.trim()) {
      toast({ title: "تنبيه", description: "يرجى كتابة السؤال", variant: "destructive" });
      return;
    }

    if (pollType === "choice" && newOptions.some(opt => !opt.trim())) {
      toast({ title: "تنبيه", description: "يرجى كتابة جميع الخيارات", variant: "destructive" });
      return;
    }

    const pollData: Partial<Poll> = {
      question: newQuestion.trim(),
      type: pollType,
      imageUrl: imageUrl.trim() || undefined,
      isPublic: isPublic,
      preventWithdraw: preventWithdraw,
      allowMultiple: allowMultiple,
      status: "active" as const,
    };

    if (pollType === "choice") {
      pollData.options = newOptions.filter(opt => opt.trim());
    } else {
      pollData.options = [];
    }

    const poll = await createPoll(pollData);

    if (poll) {
      toast({ title: "تم إنشاء التصويت بنجاح" });
      setPolls([poll, ...polls]);
      setIsAdding(false);
      setNewQuestion("");
      setNewOptions(["", ""]);
      setPollType("choice");
      setImageUrl("");
      setIsPublic(true);
      setAllowMultiple(false);
      setPreventWithdraw(false);
    } else {
      toast({ title: "فشل إنشاء التصويت", variant: "destructive" });
    }
  };

  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const handleDeletePoll = async (id: number) => {
    console.log("Deleting poll:", id);
    setIsDeleting(id);
    try {
      const ok = await deletePoll(id);
      console.log("Delete result:", ok);
      if (ok) {
        setPolls(polls.filter(p => p.id !== id));
        toast({ title: "تم الحذف بنجاح" });
      } else {
        toast({ title: "فشل حذف التصويت", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Deletion error:", err);
      toast({ title: "حدث خطأ أثناء الحذف", description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleToggleStatus = async (poll: Poll) => {
    const nextStatus = poll.status === "active" ? "closed" : "active";
    const ok = await updatePollStatus(poll.id, nextStatus);
    if (ok) {
      setPolls(polls.map(p => p.id === poll.id ? { ...p, status: nextStatus } : p));
      toast({ title: `تم ${nextStatus === "active" ? "تفعيل" : "إغلاق"} التصويت` });
    }
  };

  const handleSyncPoll = async (id: number) => {
    const ok = await syncPollVotes(id);
    if (ok) {
      toast({ title: "تم مزامنة الأصوات بنجاح" });
      loadPolls();
    } else {
      toast({ title: "فشل مزامنة الأصوات", variant: "destructive" });
    }
  };

  const getResultsForPoll = (poll: Poll) => {
    const votes = pollStats[poll.id] || [];
    if (poll.type === "text") {
      return votes.map(v => v.textAnswer).filter(Boolean);
    }
    const options = Array.isArray(poll.options) ? poll.options : JSON.parse(poll.options as string);
    const results = options.map((opt: string, index: number) => {
      const count = votes.filter(v => v.optionIndex === index).length;
      const percentage = votes.length > 0 ? Math.round((count / votes.length) * 100) : 0;
      return { text: opt, count, percentage };
    });
    return results;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-border/60 shadow-sm">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" />
            <span>نظام التصويت واستطلاعات الرأي</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            أنشئ تصويتات تفاعلية، أسئلة مفتوحة، أو استطلاعات بالصور لطلابك.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="icon"
            onClick={loadPolls}
            disabled={loading}
            className="rounded-xl h-11 w-11"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={() => setIsAdding(!isAdding)}
            className="rounded-2xl font-bold gap-2 px-6 shadow-md"
          >
            {isAdding ? <XCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{isAdding ? "إلغاء الإضافة" : "إنشاء تصويت جديد"}</span>
          </Button>
        </div>
      </div>

      {/* New Poll Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold block pr-1">نوع التصويت</label>
                  <div className="flex p-1 bg-background rounded-2xl border border-border/50">
                    <Button 
                      variant={pollType === "choice" ? "default" : "ghost"}
                      onClick={() => setPollType("choice")}
                      className="flex-1 rounded-xl h-10 text-xs font-bold gap-2"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      خيارات متعددة
                    </Button>
                    <Button 
                      variant={pollType === "text" ? "default" : "ghost"}
                      onClick={() => setPollType("text")}
                      className="flex-1 rounded-xl h-10 text-xs font-bold gap-2"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      إجابة نصية
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold block pr-1">رابط صورة (اختياري)</label>
                  <div className="relative">
                    <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/image.png"
                      className="rounded-2xl h-12 bg-background font-bold text-sm pr-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold block pr-1">سؤال التصويت</label>
                <Input 
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="مثال: ما هو انطباعك عن درس اليوم؟"
                  className="rounded-2xl h-12 bg-background font-bold text-sm"
                />
              </div>

              {pollType === "choice" && (
                <div className="space-y-3 p-4 bg-background/50 rounded-2xl border border-border/40">
                  <label className="text-sm font-bold block pr-1">خيارات التصويت</label>
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted font-bold text-xs">
                        {idx + 1}
                      </div>
                      <Input 
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`خيار رقم ${idx + 1}...`}
                        className="rounded-xl h-11 bg-background"
                      />
                      {newOptions.length > 2 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveOption(idx)}
                          className="h-11 w-11 p-0 rounded-xl text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddOption}
                    className="rounded-xl font-bold text-xs w-full h-10 border-dashed"
                  >
                    <Plus className="h-3.5 w-3.5 ml-1" />
                    إضافة خيار آخر
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 px-1">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="allowMultiple" 
                    checked={allowMultiple} 
                    onChange={(e) => setAllowMultiple(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="allowMultiple" className="text-xs font-bold text-muted-foreground cursor-pointer">
                    {pollType === "choice" ? "السماح باختيار أكثر من خيار" : "السماح بإرسال أكثر من إجابة نصية"}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isPublic" 
                    checked={isPublic} 
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="isPublic" className="text-xs font-bold text-muted-foreground cursor-pointer">
                    إظهار النتائج للجميع
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="preventWithdraw" 
                    checked={preventWithdraw} 
                    onChange={(e) => setPreventWithdraw(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="preventWithdraw" className="text-xs font-bold text-muted-foreground cursor-pointer">
                    منع تغيير أو سحب التصويت
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button 
                  onClick={handleCreatePoll}
                  className="rounded-2xl font-bold px-8 h-12 bg-primary shadow-lg shadow-primary/20"
                >
                  <Send className="h-4 w-4 ml-2" />
                  نشر التصويت الآن
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Polls List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {polls.map((poll) => {
          const resOrText = getResultsForPoll(poll);
          return (
            <motion.div
              key={poll.id}
              layout
              className="group p-5 rounded-3xl bg-card border border-border/70 shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 flex items-center justify-center rounded-xl ${poll.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                    {poll.type === "text" ? <MessageSquare className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight line-clamp-2">{poll.question}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant={poll.status === 'active' ? 'default' : 'secondary'} className="text-[10px] px-1.5 h-4 font-bold">
                        {poll.status === 'active' ? 'نشط' : 'مغلق'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-bold">
                        {poll.type === 'text' ? 'إجابة نصية' : 'خيارات'}
                      </Badge>
                      {poll.isPublic ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-bold text-emerald-600 border-emerald-600/30">
                          <Eye className="h-3 w-3 ml-1" /> عام
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 font-bold text-amber-600 border-amber-600/30">
                          <EyeOff className="h-3 w-3 ml-1" /> خاص
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleSyncPoll(poll.id)}
                    title="مزامنة الأصوات"
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-emerald-600"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleToggleStatus(poll)}
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-primary"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDeletePoll(poll.id)}
                    disabled={isDeleting === poll.id}
                    className="h-8 px-3 rounded-xl font-bold text-xs gap-1 shadow-sm hover:scale-105 transition-all"
                  >
                    {isDeleting === poll.id ? (
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {poll.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden aspect-video relative group/img">
                  <img src={poll.imageUrl} alt="Poll" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              )}

              <div className="space-y-2.5 mt-auto">
                {poll.type === "choice" ? (
                  (resOrText as any[]).map((res, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="truncate max-w-[70%]">{res.text}</span>
                        <span className={res.percentage > 0 ? "text-primary" : "text-muted-foreground"}>
                          {res.percentage}% ({res.count})
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${res.percentage}%` }}
                          className={`h-full rounded-full ${i === 0 ? 'bg-primary' : 'bg-primary/50'}`}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-muted-foreground">الإجابات المكتوبة ({pollStats[poll.id]?.length || 0})</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-muted">
                      {(resOrText as string[]).slice(0, 3).map((txt, i) => (
                        <div key={i} className="p-2 bg-muted/40 rounded-lg text-[10px] font-bold border border-border/30">
                          {txt}
                        </div>
                      ))}
                      {(resOrText as string[]).length > 3 && (
                        <p className="text-[9px] text-center text-muted-foreground py-1">+{ (resOrText as string[]).length - 3 } إجابة أخرى</p>
                      )}
                      {(resOrText as string[]).length === 0 && (
                        <p className="text-[10px] text-center text-muted-foreground py-4 italic">لا توجد إجابات بعد</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 font-bold">
                  <Users className="h-3 w-3" />
                  {pollStats[poll.id]?.length || 0} مشارك
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="h-3 w-3" />
                  {new Date(poll.createdAt).toLocaleDateString("ar-SA")}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {!loading && polls.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border border-dashed border-border/60">
          <PieChart className="h-12 w-12 text-muted/40 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-foreground">لا توجد تصويتات حالياً</h3>
          <p className="text-xs text-muted-foreground mt-1">ابدأ بإنشاء أول تصويت للتفاعل مع طلابك الآن.</p>
        </div>
      )}
    </div>
  );
}
