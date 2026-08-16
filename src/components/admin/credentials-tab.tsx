import { useState, useEffect } from "react";
import { useGetAdminCredentials, useUpdateAdminCredentials } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/loading-state";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export function CredentialsTab() {
  const { data: creds, isLoading } = useGetAdminCredentials();
  const { toast } = useToast();
  const updateCreds = useUpdateAdminCredentials();

  const [form, setForm] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (creds?.username) {
      setForm((f) => ({ ...f, username: creds.username ?? "" }));
    }
  }, [creds?.username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      toast({ title: "خطأ", description: "كلمتا المرور الجديدتان غير متطابقتين", variant: "destructive" });
      return;
    }
    if (form.newPassword && form.newPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور الجديدة قصيرة جداً (6 أحرف على الأقل)", variant: "destructive" });
      return;
    }

    if (!form.currentPassword) {
      toast({ title: "خطأ", description: "يجب إدخال كلمة المرور الحالية", variant: "destructive" });
      return;
    }

    const data: { currentPassword: string; newUsername?: string; newPassword?: string } = {
      currentPassword: form.currentPassword,
    };
    if (form.username !== creds?.username) data.newUsername = form.username;
    if (form.newPassword) data.newPassword = form.newPassword;

    if (!data.newUsername && !data.newPassword) {
      toast({ title: "لا يوجد تغيير", description: "لم تقم بأي تعديل" });
      return;
    }

    updateCreds.mutate(
      { data },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
          setForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmPassword: "" }));
          toast({ title: "تم تحديث بيانات الإدارة بنجاح" });
        },
        onError: (err: any) => {
          toast({
            title: "خطأ",
            description: err?.response?.data?.error || "تحقق من كلمة المرور الحالية",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isLoading)
    return (
      <div className="py-16 flex justify-center">
        <LoadingSpinner />
      </div>
    );

  return (
    <motion.div
      className="max-w-md mx-auto space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">بيانات الإدارة</h2>
          <p className="text-sm text-muted-foreground">تعديل اسم المستخدم وكلمة المرور للمشرف</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="admin-username">اسم المستخدم (الذي يُدخَل في شاشة الطلاب)</Label>
          <Input
            id="admin-username"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="rounded-xl"
            dir="ltr"
            placeholder="مثال: مشرف"
          />
          <p className="text-xs text-muted-foreground">
            عند إدخال هذا الاسم في شاشة تسجيل دخول الطلاب، ستنتقل إلى لوحة الإدارة.
          </p>
        </div>

        <div className="border-t border-border/40 pt-4 space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">تغيير كلمة المرور (اختياري)</p>

          <div className="space-y-2">
            <Label htmlFor="current-password">كلمة المرور الحالية</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                className="rounded-xl pl-10"
                dir="ltr"
                autoComplete="current-password"
                placeholder="أدخل كلمة المرور الحالية"
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCurrent((v) => !v)}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">كلمة المرور الجديدة</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="rounded-xl pl-10"
                dir="ltr"
                autoComplete="new-password"
                placeholder="6 أحرف على الأقل"
              />
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNew((v) => !v)}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</Label>
            <Input
              id="confirm-password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              className="rounded-xl"
              dir="ltr"
              autoComplete="new-password"
              placeholder="أعد كتابة كلمة المرور"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full rounded-xl h-11 gap-2"
          disabled={updateCreds.isPending}
        >
          {updateCreds.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="h-4 w-4" />
          ) : null}
          {saved ? "تم الحفظ!" : "حفظ التغييرات"}
        </Button>
      </form>
    </motion.div>
  );
}
