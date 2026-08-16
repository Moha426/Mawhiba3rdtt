import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export function SignUpForm() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { register, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    const cleanEmail = email.trim() || `${displayName.replace(/\s+/g, "_")}@student.talented.app`;
    const cleanPass = password.trim() || "123456";
    await register(displayName, cleanEmail, cleanPass);
    setLocation("/");
    setTimeout(() => {
      if (window.location.pathname.includes("sign-up")) {
        window.location.href = "/";
      }
    }, 100);
  };

  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-bold text-white mb-2 text-center">إنشاء حساب طالب جديد</h2>
      <p className="text-white/60 text-sm mb-6 text-center">سجّل الآن لتظهر تلقائياً في قاعدة بيانات الطلاب والمشرفين</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-white/80 font-medium text-sm">اسم الطالب الرباعي أو المستعار</label>
          <Input 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/[0.12] transition-all rounded-xl"
            placeholder="مثال: أحمد عبد الله المحمد"
            disabled={isLoading}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-white/80 font-medium text-sm">البريد الإلكتروني</label>
          <Input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/[0.12] transition-all rounded-xl"
            placeholder="student@example.com"
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-white/80 font-medium text-sm">كلمة المرور</label>
          <Input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/[0.12] transition-all rounded-xl"
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !displayName.trim()}
          className="mt-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 transition-all font-bold shadow-lg shadow-purple-500/30 text-white h-11 rounded-xl"
        >
          {isLoading ? "جاري إنشاء وتأكيد الحساب..." : "إنشاء الحساب والتسجيل اللحظي"}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-sm text-white/60">
        لديك حساب بالفعل؟ {" "}
        <Link href="/sign-in" className="text-purple-300 font-bold hover:text-purple-200 underline underline-offset-4">
          تسجيل الدخول
        </Link>
      </div>
    </div>
  );
}
