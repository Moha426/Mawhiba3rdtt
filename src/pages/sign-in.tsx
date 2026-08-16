import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export function SignInForm() {
  const [username, setUsername] = useState("");
  const { login, isLoading } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    await login(username);
  };

  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-bold text-white mb-2 text-center">تسجيل الدخول</h2>
      <p className="text-white/60 text-sm mb-6 text-center">أدخل بياناتك للوصول إلى لوحة الطلاب</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-white/80 font-medium text-sm">اسم المستخدم</label>
          <Input 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/[0.12] transition-all"
            placeholder="ادخل اسمك..."
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-white/80 font-medium text-sm">كلمة المرور</label>
          <Input 
            type="password"
            className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/[0.12] transition-all"
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !username.trim()}
          className="mt-2 bg-purple-500 hover:bg-purple-400 transition-colors font-semibold shadow-lg shadow-purple-500/30 text-white"
        >
          {isLoading ? "جاري تسجيل الدخول..." : "متابعة"}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-sm text-white/50">
        ليس لديك حساب؟ {" "}
        <Link href="/sign-up" className="text-purple-300 font-semibold hover:text-purple-200">
          إنشاء حساب
        </Link>
      </div>
    </div>
  );
}
