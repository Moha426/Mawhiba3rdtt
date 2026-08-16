import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Send, 
  FileText, 
  Globe, 
  CreditCard, 
  HelpCircle, 
  CheckCircle2, 
  Upload,
  Link as LinkIcon,
  Tag,
  FolderPlus,
  Loader2,
  BookOpen,
  CalendarDays,
  GraduationCap,
  MessageSquare
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStudentProfile, getDynamicGuestName } from "@/lib/use-student-profile";
import { submitStudentSuggestion, type SuggestionType } from "@/lib/suggestions";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: SuggestionType;
  defaultCategory?: string;
  defaultTitle?: string;
}

export function StudentSuggestDialog({
  isOpen,
  onClose,
  defaultType = "file",
  defaultCategory = "تجميعات",
  defaultTitle = "",
}: Props) {
  const { profile } = useStudentProfile();
  const { toast } = useToast();

  const [type, setType] = useState<SuggestionType>(defaultType);
  const [title, setTitle] = useState(defaultTitle);
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [fileType, setFileType] = useState("pdf");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // File upload state for direct file suggestion
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);

  const studentName = profile?.displayName || profile?.fullName || profile?.name || getDynamicGuestName();
  const studentId = profile?.id ?? 1;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "الحد الأقصى للملف هو 15 ميجابايت",
        variant: "destructive"
      });
      return;
    }

    setFileName(file.name);
    setFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));

    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "يرجى كتابة عنوان للاقتراح", variant: "destructive" });
      return;
    }

    const contentUrl = fileDataUrl || url.trim();
    const isUrlOptional = type === "flashcard" || type === "assignment" || type === "schedule" || type === "calendar" || type === "general";
    if (!isUrlOptional && !contentUrl) {
      toast({ title: "يرجى إرفاق رابط أو رفع ملف", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let payloadData: any = {};

      if (type === "file") {
        payloadData = {
          title: title.trim(),
          category: category.trim() || "تجميعات",
          description: description.trim(),
          fileUrl: contentUrl,
          fileType: fileType || "pdf",
          size: fileSize || "غير محدد",
          tags: tags.split(/[,،]/).map(t => t.trim()).filter(Boolean),
          subject: category.trim() || "عام",
        };
      } else if (type === "platform") {
        payloadData = {
          name: title.trim(),
          url: contentUrl,
          category: category.trim() || "منصة تعليمية",
          desc: description.trim() || "منصة مقترحة للمذاكرة والتدريب",
          icon: "globe",
          badge: "اقتراح طالب",
        };
      } else if (type === "quiz") {
        payloadData = {
          title: title.trim(),
          externalUrl: contentUrl,
          category: category.trim() || "قدرات",
          description: description.trim(),
          tags: tags.split(/[,،]/).map(t => t.trim()).filter(Boolean),
        };
      } else if (type === "flashcard") {
        payloadData = {
          word: title.trim(),
          translation: description.trim() || title.trim(),
          meaning: description.trim(),
          category: category.trim() || "أكاديمي وSTEP",
        };
      } else if (type === "assignment") {
        payloadData = {
          title: title.trim(),
          subject: category.trim() || "عام",
          description: description.trim(),
          link: contentUrl || "",
        };
      } else if (type === "schedule") {
        payloadData = {
          title: title.trim(),
          details: description.trim(),
          category: category.trim() || "جدول الحصص",
        };
      } else if (type === "calendar") {
        payloadData = {
          title: title.trim(),
          eventType: category.trim() || "مناسبة / اختبار",
          description: description.trim(),
          link: contentUrl || "",
        };
      } else {
        payloadData = {
          title: title.trim(),
          description: description.trim(),
          category: category.trim() || "عام",
          link: contentUrl || "",
        };
      }

      await submitStudentSuggestion({
        type,
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        data: payloadData,
        studentId,
        studentName,
      });

      setSubmitted(true);
      toast({
        title: "تم إرسال اقتراحك بنجاح! 🚀",
        description: "سيتم مراجعة المحتوى من قبل المشرف ونشره لجميع زملائك الطلاب فوراً.",
      });

      setTimeout(() => {
        setSubmitted(false);
        setTitle("");
        setDescription("");
        setUrl("");
        setFileDataUrl(null);
        setFileName(null);
        onClose();
      }, 1600);
    } catch (err) {
      console.error(err);
      toast({
        title: "حدث خطأ أثناء الإرسال",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestionOptions: { id: SuggestionType; label: string; icon: any }[] = [
    { id: "file", label: "تجميعة/ملف", icon: FileText },
    { id: "platform", label: "منصة/موقع", icon: Globe },
    { id: "quiz", label: "اختبار", icon: HelpCircle },
    { id: "flashcard", label: "بطاقة لغة", icon: CreditCard },
    { id: "assignment", label: "واجب/مهمة", icon: BookOpen },
    { id: "schedule", label: "الجدول", icon: GraduationCap },
    { id: "calendar", label: "التقويم", icon: CalendarDays },
    { id: "general", label: "تصحيح/عام", icon: Sparkles },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border border-border/60 bg-card rounded-3xl" dir="rtl">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/40">
          <DialogHeader className="space-y-1.5 text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold w-fit mb-1 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>مساهمات واقتراحات وتصحيحات الطلاب</span>
            </div>
            <DialogTitle className="text-lg font-black text-foreground">
              اقترح إضافة أو تصحيح محتوى تعليمي 💡
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              شارك تجميعة، منصة، اختبار، أو اقترح تصحيحاً وملاحظة في أي قسم. ستصل رسالتك مباشرة للمشرف لاعتمادها!
            </DialogDescription>
          </DialogHeader>
        </div>

        {submitted ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="p-8 text-center space-y-3"
          >
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="text-lg font-bold text-foreground">شكراً لمساهمتك القيّمة!</h3>
            <p className="text-xs text-muted-foreground">تم تسليم الاقتراح للمشرف وسيتلقى إشعاراً لمراجعته ونشره.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Type selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">نوع الاقتراح / القسم:</label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border/40">
                {suggestionOptions.map((item) => {
                  const Icon = item.icon;
                  const active = type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setType(item.id)}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[10.5px] font-bold transition-all ${
                        active 
                          ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]" 
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {type === "file" ? "عنوان الملف أو التجميعة *" :
                 type === "platform" ? "اسم المنصة أو الموقع *" :
                 type === "quiz" ? "عنوان الاختبار *" :
                 type === "flashcard" ? "الكلمة أو المصطلح بالإنجليزية *" :
                 type === "assignment" ? "عنوان الواجب أو المهمة *" :
                 type === "schedule" ? "عنوان الحصة / المادة في الجدول *" :
                 type === "calendar" ? "عنوان المناسبة أو الفعالية *" : "عنوان الاقتراح أو التصحيح *"}
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === "file" ? "مثال: تجميعة أنماط الهندسة 1446هـ" :
                  type === "platform" ? "مثال: منصة قياس للتدريب التفاعلي" :
                  type === "quiz" ? "مثال: اختبار القدرات التجريبي الموحد" :
                  type === "flashcard" ? "مثال: Comprehension" :
                  type === "assignment" ? "مثال: واجب الفيزياء - القوانين الديناميكية" :
                  type === "calendar" ? "مثال: بداية الاختبارات النصفية" : "مثال: تصحيح رابط المنصة أو إضافة ملخص"
                }
                required
                className="h-10 rounded-xl text-sm"
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">التصنيف أو المادة:</label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="مثال: قدرات، تحصيلي، فيزياء، رياضيات، تسريبات..."
                className="h-10 rounded-xl text-sm"
              />
            </div>

            {/* URL or Direct File Upload */}
            {type !== "flashcard" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>الرابط أو رفع الملف المباشر (اختياري لبعض الأقسام)</span>
                  {fileName && (
                    <span className="text-[10px] text-primary font-normal">
                      تم اختيار: {fileName} ({fileSize})
                    </span>
                  )}
                </label>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="رابط Google Drive، Canva، أو الموقع..."
                      dir="ltr"
                      className="h-10 pr-9 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <label className="cursor-pointer h-10 px-3 rounded-xl bg-muted hover:bg-muted/80 border border-border/60 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors">
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    <span>رفع ملف</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.pptx,.docx"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {type === "flashcard" ? "المعنى أو الترجمة بالعربية *" : "وصف وتفاصيل الاقتراح:"}
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب نبذة توضح تفاصيل المحتوى أو التصحيح المطلوب لزملائك..."
                rows={3}
                className="rounded-xl text-xs resize-none"
              />
            </div>

            {/* Tags */}
            {type !== "flashcard" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">الوسوم (مفصولة بفاصلة):</label>
                <div className="relative">
                  <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="مثال: هام، قوانين، تجميعات 1446، لفظي"
                    className="h-10 pr-9 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl h-10 text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-xl h-10 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-md"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>إرسال الاقتراح للمشرف</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
