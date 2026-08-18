import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { registerOrUpdateStudent } from "@/lib/students-manager";
import { User, Sparkles, ArrowLeft, CheckCircle2 } from "lucide-react";

export function SignInForm() {
  const [studentName, setStudentName] = useState("");
  const { login, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = studentName.trim();
    if (!cleanName) return;

    try {
      localStorage.setItem("student_name_saved", "true");
      localStorage.setItem("guest_student_name", cleanName);

      await login(cleanName);

      toast({
        title: `أهلاً بك يا ${cleanName}! 🌟`,
        description: "تم تسجيل اسمك بنجاح للبدء في استخدام كافة خدمات المنصة.",
      });

      setLocation("/");
      window.dispatchEvent(new Event("student-profile-updated"));
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "حدث خطأ أثناء حفظ الاسم",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-md mx-auto">
      <div className="flex items-center justify-center mb-4">
        <div className="h-12 w-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
          <User className="h-6 w-6" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-white mb-2 text-center flex items-center justify-center gap-2">
        <span>دخول الطالب بالاسم</span>
        <Sparkles className="h-5 w-5 text-amber-400" />
      </h2>
      <p className="text-white/70 text-xs mb-6 text-center leading-relaxed">
        أدخل اسمك الكريِم للبدء مباشرة في المشاركة بالاستطلاعات والمذاكرة بدون تعقيدات
      </p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-white/90 font-bold text-xs">اسم الطالب / الطالبة *</label>
          <Input 
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/50 focus:bg-white/15 transition-all rounded-2xl h-12 text-sm font-semibold"
            placeholder="مثال: عبد الله أحمد / سارة علي..."
            disabled={isLoading}
            autoFocus
            required
          />
          <p className="text-[11px] text-white/60 flex items-center gap-1 pt-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
            <span>سيظهر هذا الاسم في نتائج الاستطلاعات والأنشطة.</span>
          </p>
        </div>

        <Button 
          type="submit" 
          disabled={isLoading || !studentName.trim()}
          className="mt-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 transition-all font-black shadow-lg shadow-purple-500/30 text-white h-12 rounded-2xl text-sm gap-2"
        >
          <span>{isLoading ? "جاري الدخول..." : "دخول المنصة الآن"}</span>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
