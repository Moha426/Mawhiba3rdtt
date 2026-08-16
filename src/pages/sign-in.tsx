import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export function SignInForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    const isEmail = identifier.includes("@");
    await login(
      isEmail ? identifier.split("@")[0] : identifier,
      isEmail ? identifier : undefined,
      password || "123456"
    );
    setLocation("/");
    setTimeout(() => {
      if (window.location.pathname.includes("sign-in")) {
        window.location.href = "/";
      }
    }, 100);
  };

  return (
    <div className="p-8 w-full">
      <h2 className="text-2xl font-bold text-white mb-2 text-center">تسجيل الدخول للطالب</h2>
      <p className="text-white/60 text-sm mb-6 text-center">أدخل بريدك أو اسمك للوصول إلى لوحة المذاكرة</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-white/80 font-medium text-sm">اسم المستخدم أو البريد الإلكتروني</label>
          <Input 
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="bg-white/[0.08] border-white/20 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/[0.12] transition-all rounded-xl"
            placeholder="مثال: student@gmail.com أو أحمد"
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
          disabled={isLoading || !identifier.trim()}
          className="mt-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 transition-all font-bold shadow-lg shadow-purple-500/30 text-white h-11 rounded-xl"
        >
          {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول والتسجيل اللحظي"}
        </Button>
      </form>
      
      <div className="mt-6 text-center text-sm text-white/60">
        ليس لديك حساب؟ {" "}
        <Link href="/sign-up" className="text-purple-300 font-bold hover:text-purple-200 underline underline-offset-4">
          إنشاء حساب طالب جديد
        </Link>
      </div>
    </div>
  );
}
