import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb,
  ThumbsUp,
  MessageSquare,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  Check,
  Send,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export interface StudentSuggestion {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  content: string;
  category: string;
  status: "pending" | "approved" | "implemented" | "rejected";
  adminResponse?: string | null;
  likes: number;
  createdAt: string;
}

export function SuggestionsTab() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Reply / Edit state
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StudentSuggestion["status"]>("pending");

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error("Error loading suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, []);

  const handleUpdateStatusAndReply = async (id: string) => {
    if (!replyText.trim() && selectedStatus === "pending") {
      toast({
        title: "تنبيه",
        description: "يرجى كتابة رد الإدارة أو تغيير حالة المقترح",
        variant: "destructive"
      });
      return;
    }

    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          adminResponse: replyText.trim() || undefined
        })
      });

      if (res.ok) {
        toast({
          title: "تم تحديث المقترح بنجاح 💡",
          description: "تم تطبيق الحالة الجديدة والرد وإشعار الطالب"
        });
        setReplyingId(null);
        setReplyText("");
        loadSuggestions();
      } else {
        toast({
          title: "فشل التحديث",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "خطأ في الاتصال بالخادم",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast({
          title: "تم حذف المقترح بنجاح"
        });
        loadSuggestions();
      } else {
        toast({
          title: "فشل الحذف",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "خطأ في الاتصال",
        variant: "destructive"
      });
    }
  };

  const filtered = suggestions.filter(item => {
    const matchesSearch =
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.studentName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-3xl border border-border/60 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">صندوق المقترحات والأفكار</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            مراجعة وتقييم أفكار الطلاب ومقترحاتهم لتطوير المنصة والمدرسة
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border/40 shrink-0">
          <Lightbulb className="h-4 w-4 text-amber-500 animate-pulse" />
          <span>إجمالي المقترحات: {suggestions.length}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في المقترحات، الطلاب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 rounded-xl text-xs sm:text-sm bg-card"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">كل الحالات</option>
            <option value="pending">قيد الدراسة 🔍</option>
            <option value="approved">مقبول وقيد التنفيذ ✨</option>
            <option value="implemented">تم التطبيق بنجاح 🚀</option>
            <option value="rejected">مرفوض ❌</option>
          </select>
        </div>

        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-input bg-card text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">كل الفئات</option>
            <option value="أكاديمي">أكاديمي</option>
            <option value="المنصة">المنصة</option>
            <option value="الجدول">الجدول</option>
            <option value="المكتبة">المكتبة</option>
            <option value="عام">عام</option>
          </select>
        </div>
      </div>

      {/* Suggestions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground mt-2">جاري تحميل المقترحات...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-3xl border border-border/50">
          <Lightbulb className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <h3 className="font-bold text-foreground">لا توجد مقترحات تطابق خيارات التصفية</h3>
          <p className="text-xs text-muted-foreground mt-1">جرب تغيير الحالات أو كتابة كلمات بحث أخرى</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => {
              const isReplying = replyingId === item.id;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-card rounded-3xl border border-border/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs font-bold bg-amber-500/10 text-amber-600 border-amber-500/20">
                          {item.category || "عام"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-SA") : ""}
                        </span>
                      </div>

                      <div>
                        {item.status === "implemented" ? (
                          <Badge className="bg-emerald-600 text-white text-[11px] font-bold">
                            تم التطبيق بنجاح 🚀
                          </Badge>
                        ) : item.status === "approved" ? (
                          <Badge className="bg-purple-600 text-white text-[11px] font-bold">
                            مقبول وقيد التنفيذ ✨
                          </Badge>
                        ) : item.status === "rejected" ? (
                          <Badge className="bg-rose-600 text-white text-[11px] font-bold">
                            مرفوض ❌
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[11px] font-bold bg-muted text-muted-foreground">
                            قيد الدراسة 🔍
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-foreground text-base leading-snug">{item.title}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>

                    {/* Likes & Author */}
                    <div className="flex items-center justify-between pt-2 text-xs border-t border-border/40">
                      <span className="text-muted-foreground">
                        بواسطة: <strong className="text-foreground">{item.studentName || "طالب"}</strong>
                      </span>
                      <span className="flex items-center gap-1 font-bold text-amber-600 bg-amber-500/10 px-2.5 py-0.5 rounded-lg">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {item.likes || 0} إعجاب
                      </span>
                    </div>

                    {/* Admin response if exists and not currently editing */}
                    {item.adminResponse && !isReplying && (
                      <div className="p-3 sm:p-4 rounded-2xl bg-muted/40 border border-border/40 text-xs space-y-1 mt-2">
                        <span className="font-bold text-primary block">رد إدارة المنصة والمعلم:</span>
                        <p className="text-foreground">{item.adminResponse}</p>
                      </div>
                    )}

                    {/* Inline Reply / Status form */}
                    {isReplying && (
                      <div className="p-4 rounded-2xl bg-muted/50 border border-border/60 space-y-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-muted-foreground">تحديث حالة المقترح</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(["pending", "approved", "implemented", "rejected"] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setSelectedStatus(st)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all text-center ${
                                  selectedStatus === st
                                    ? "bg-primary border-primary text-white"
                                    : "bg-card border-border hover:bg-muted/30 text-foreground"
                                }`}
                              >
                                {st === "pending" ? "🔍 قيد الدراسة" : st === "approved" ? "✨ مقبول" : st === "implemented" ? "🚀 تم التطبيق" : "❌ مرفوض"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-muted-foreground">رد الإدارة المكتوب</label>
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="اكتب ردك التوضيحي للطالب..."
                            className="text-xs rounded-xl min-h-[60px] bg-card resize-none"
                          />
                        </div>

                        <div className="flex justify-end gap-1.5 pt-1">
                          <Button size="sm" variant="ghost" onClick={() => setReplyingId(null)} className="h-8 rounded-lg text-xs">
                            إلغاء
                          </Button>
                          <Button size="sm" onClick={() => handleUpdateStatusAndReply(item.id)} className="h-8 rounded-lg text-xs gap-1">
                            <Send className="h-3 w-3" />
                            حفظ الرد والحالة
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions (Reply, Delete) */}
                  {!isReplying && (
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/30">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingId(item.id);
                          setReplyText(item.adminResponse || "");
                          setSelectedStatus(item.status);
                        }}
                        className="h-8 rounded-xl text-xs gap-1 hover:bg-primary/5"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {item.adminResponse ? "تعديل الرد" : "الرد والدراسة"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
