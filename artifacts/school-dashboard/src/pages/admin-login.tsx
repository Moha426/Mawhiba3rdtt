import { useState } from "react";
import { useLocation } from "wouter";
import { useVerifyAdmin } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const verifyAdmin = useVerifyAdmin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("الرجاء إدخال كلمة المرور");
      return;
    }
    
    setError("");
    verifyAdmin.mutate({ data: { password } }, {
      onSuccess: (data) => {
        if (data.success) {
          localStorage.setItem("isAdmin", "true");
          setLocation("/admin/dashboard");
        } else {
          setError("كلمة المرور غير صحيحة");
        }
      },
      onError: () => {
        setError("حدث خطأ في الخادم. الرجاء المحاولة لاحقاً.");
      }
    });
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">دخول الإدارة</CardTitle>
          <CardDescription>هذه الصفحة مخصصة لمعلمي البرنامج لإدارة المحتوى</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-3">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription className="text-sm mr-2">{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">كلمة المرور</label>
              <Input
                id="password"
                type="password"
                placeholder="أدخل كلمة المرور"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-lg text-left"
                autoComplete="current-password"
                dir="ltr"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-bold" 
              disabled={verifyAdmin.isPending}
            >
              {verifyAdmin.isPending ? "جاري التحقق..." : "تسجيل الدخول"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
