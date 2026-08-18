import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { registerOrUpdateStudent } from "@/lib/students-manager";

export function StudentNamePromptModal() {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if student name is already saved
    const isSaved = localStorage.getItem("student_name_saved") === "true";
    const currentGuestName = localStorage.getItem("guest_student_name");
    
    // Listen for custom event to trigger edit name modal anytime
    const handleOpenModal = () => setIsOpen(true);
    window.addEventListener("open-student-name-modal", handleOpenModal);

    if (!isSaved || !currentGuestName) {
      // Auto open modal on first entry
      setIsOpen(true);
      if (currentGuestName) {
        setName(currentGuestName);
      } else if (user?.name && !user.name.startsWith("Guest")) {
        setName(user.name);
      }
    }

    return () => {
      window.removeEventListener("open-student-name-modal", handleOpenModal);
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast({
        title: "تنبيه",
        description: "يرجى كتابة اسمك للبدء",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save name locally & register student profile
      localStorage.setItem("student_name_saved", "true");
      localStorage.setItem("guest_student_name", cleanName);

      await login(cleanName);

      toast({
        title: `أهلاً بك يا ${cleanName}! 🌟`,
        description: "تم حفظ اسمك بنجاح. يمكنك الآن المشاركة في جميع الاستطلاعات والخدمات.",
      });

      setIsOpen(false);
      // Dispatch window event so components update immediately
      window.dispatchEvent(new Event("student-profile-updated"));
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء حفظ الاسم",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-md p-6 bg-card border border-border/80 rounded-3xl shadow-2xl space-y-5"
        >
          {/* Header Icon */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground flex items-center gap-1.5">
                <span>مرحباً بك في منصة ثالث موهبة</span>
                <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
              </h3>
              <p className="text-xs text-muted-foreground">أدخل اسمك الكريم للبدء مباشرة بدون تعقيدات</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground block">
                اسم الطالب / الطالبة *
              </label>
              <div className="relative">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: عبد الله أحمد / سارة علي..."
                  className="rounded-2xl h-12 text-sm font-semibold pr-4 pl-10 border-primary/30 focus-visible:ring-primary"
                  autoFocus
                  required
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                <span>سيظهر هذا الاسم في مشاركاتك في الاستطلاعات والأنشطة الدراسية.</span>
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full h-12 rounded-2xl font-black text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all gap-2 shadow-md"
            >
              <span>{isSubmitting ? "جاري الحفظ..." : "دخول المنصة وتأكيد الاسم"}</span>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
