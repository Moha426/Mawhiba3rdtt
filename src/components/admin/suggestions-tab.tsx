import { useState, useEffect } from "react";
import { 
  CheckCircle2, XCircle, Clock, AlertCircle, Trash2, Send, 
  ExternalLink, FileText, Globe, Languages, Trophy, User, Sparkles, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  StudentSuggestion, 
  subscribeToSuggestions, 
  approveStudentSuggestion, 
  rejectStudentSuggestion, 
  deleteStudentSuggestion 
} from "@/lib/suggestions";

export function SuggestionsTab() {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<StudentSuggestion[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedSuggestion, setSelectedSuggestion] = useState<StudentSuggestion | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToSuggestions((list) => {
      setSuggestions(list);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (suggestion: StudentSuggestion) => {
    setProcessingId(suggestion.id);
    try {
      await approveStudentSuggestion(suggestion, "المشرف");
      toast({
        title: "تمت الموافقة والنشر بنجاح! 🚀✅",
        description: `تم نشر اقتراح "${suggestion.title}" فوراً في قسم ${getTypeLabel(suggestion.type)} لجميع الطلاب.`,
      });
    } catch {
      toast({ title: "حدث خطأ أثناء الموافقة", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedSuggestion) return;
    setProcessingId(selectedSuggestion.id);
    try {
      await rejectStudentSuggestion(selectedSuggestion.id, rejectFeedback);
      toast({
        title: "تم رفض الاقتراح",
        description: "تم تحديث حالة الاقتراح وإشعار الطالب بالملاحظات.",
      });
      setIsRejectOpen(false);
      setSelectedSuggestion(null);
      setRejectFeedback("");
    } catch {
      toast({ title: "حدث خطأ أثناء الرفض", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStudentSuggestion(id);
      toast({ title: "تم حذف الاقتراح" });
    } catch {
      toast({ title: "تعذر الحذف", variant: "destructive" });
    }
  };

  const filtered = suggestions.filter((s) => {
    if (filterType !== "all" && s.type !== filterType) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "file":
        return <FileText className="h-4 w-4 text-amber-500" />;
      case "platform":
        return <Globe className="h-4 w-4 text-blue-500" />;
      case "flashcard":
        return <Languages className="h-4 w-4 text-purple-500" />;
      case "quiz":
        return <Trophy className="h-4 w-4 text-emerald-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-indigo-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "file":
        return "ملف دراسي / تجميعات";
      case "platform":
        return "منصة تعليمية";
      case "flashcard":
        return "بطاقة مفردات إنجليزية";
      case "quiz":
        return "اختبار تدريبي";
      default:
        return "مورد عام";
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/50 shadow-xs">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <span>اقتراحات الطلاب للمنصة</span>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="animate-pulse text-xs px-2 py-0.5">
                {pendingCount} في الانتظار
              </Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            مراجعة المواد والبطاقات والمنصات التي اقترحها الطلاب؛ الموافقة عليها تنشرها تلقائياً لكافة المستخدمين.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-xl border border-input bg-background text-xs font-bold"
          >
            <option value="all">كل الحالات ({suggestions.length})</option>
            <option value="pending">قيد الانتظار ({pendingCount})</option>
            <option value="approved">تمت الموافقة والنشر</option>
            <option value="rejected">مرفوضة</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-3 rounded-xl border border-input bg-background text-xs font-bold"
          >
            <option value="all">كافة الأقسام</option>
            <option value="flashcard">بطاقات إنجليزية</option>
            <option value="file">ملفات ومذكرات</option>
            <option value="platform">منصات تعليمية</option>
            <option value="quiz">اختبارات</option>
          </select>
        </div>
      </div>

      {/* Suggestion List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border/60 bg-muted/20 space-y-2">
          <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-bold text-foreground">لا توجد اقتراحات مطابقة حالياً</p>
          <p className="text-xs text-muted-foreground">عندما يقترح أحد الطلاب إضافة مادة أو بطاقة ستظهر هنا للمراجعة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 bg-card ${
                item.status === "pending"
                  ? "border-amber-500/40 shadow-xs"
                  : item.status === "approved"
                  ? "border-emerald-500/30 opacity-90"
                  : "border-rose-500/30 opacity-75"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-muted/60">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {getTypeLabel(item.type)} • {item.category || "عام"}
                      </span>
                      <h3 className="text-sm font-black text-foreground line-clamp-1">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <div>
                    {item.status === "pending" && (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px]">
                        قيد المراجعة ⏳
                      </Badge>
                    )}
                    {item.status === "approved" && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px]">
                        تم النشر لجميع الطلاب ✅
                      </Badge>
                    )}
                    {item.status === "rejected" && (
                      <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px]">
                        مرفوض ❌
                      </Badge>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl">
                    {item.description}
                  </p>
                )}

                {/* Additional Data Details */}
                {item.data && Object.keys(item.data).length > 0 && (
                  <div className="text-[11px] p-2.5 rounded-xl bg-muted/40 font-mono space-y-1 overflow-x-auto text-muted-foreground" dir="ltr">
                    {item.data.word && <div><strong>Word:</strong> {item.data.word} ({item.data.meaningAr})</div>}
                    {item.data.url && (
                      <div className="flex items-center gap-1">
                        <strong>URL:</strong>
                        <a href={item.data.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          {item.data.url} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {item.data.exampleEn && <div><strong>Example:</strong> {item.data.exampleEn}</div>}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>مقدم الاقتراح: <strong>{item.studentName}</strong></span>
                  </span>
                  <span>{new Date(item.createdAt).toLocaleDateString("ar-SA")}</span>
                </div>

                {item.adminFeedback && (
                  <div className="text-[11px] p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <strong>ملاحظة المشرف:</strong> {item.adminFeedback}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(item.id)}
                  className="h-8 px-2 text-rose-500 hover:bg-rose-500/10 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>

                {item.status === "pending" ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingId === item.id}
                      onClick={() => {
                        setSelectedSuggestion(item);
                        setIsRejectOpen(true);
                      }}
                      className="h-8 text-xs font-bold border-rose-500/30 text-rose-600 hover:bg-rose-500/10 rounded-xl"
                    >
                      <XCircle className="h-3.5 w-3.5 ml-1" />
                      رفض
                    </Button>
                    <Button
                      size="sm"
                      disabled={processingId === item.id}
                      onClick={() => handleApprove(item)}
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1 shadow-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      موافقة ونشر للجميع 🚀
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(item)}
                    className="h-8 text-xs font-bold text-muted-foreground rounded-xl"
                  >
                    إعادة نشر للجميع
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              <span>رفض اقتراح الطالب</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              يمكنك كتابة سبب أو ملاحظة توجيهية للطالب (اختياري):
            </p>
            <Textarea
              placeholder="مثال: شكراً لك، المحتوى مكرر بالفعل أو الرابط لا يعمل..."
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              className="rounded-xl text-xs min-h-[90px]"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsRejectOpen(false)} className="rounded-xl text-xs">
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={processingId !== null}
                className="rounded-xl text-xs font-bold"
              >
                تأكيد الرفض
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
