import { useState, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetStudentMe, useUpdateStudentMe, useListAssignments, useGetMyPoints } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Camera, Check, AlertCircle, User, KeyRound, LogOut, BarChart3, Trophy, Target, Star, Plus, Trash2, Pin } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCompletions } from "@/hooks/use-completions";
import { isPast, parseISO, isToday } from "date-fns";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading, refetch } = useGetStudentMe();
  const { data: assignments = [] } = useListAssignments();
  const { completedIds } = useCompletions();
  const { isSignedIn } = useAuth();
  const { data: pointsData } = useGetMyPoints({ query: { enabled: !!isSignedIn, queryKey: ["points", "me"] } });

  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [personalCards, setPersonalCards] = useState<Array<{ id: string; title: string; desc: string; color?: string }>>(() => {
    try {
      const stored = localStorage.getItem("student_personal_dashboard_cards");
      return stored ? JSON.parse(stored) : [
        { id: "1", title: "🎯 هدفي في القدرات والتحصيلي", desc: "الحصول على درجة 98+ بإذن الله والتدرب اليومي على التجميعات في المنصة.", color: "border-indigo-500 bg-indigo-500/5" },
        { id: "2", title: "💡 قانون مساحة الدائرة مهم", desc: "مساحة الدائرة = ط × نق²", color: "border-emerald-500 bg-emerald-500/5" }
      ];
    } catch {
      return [];
    }
  });

  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDesc, setNewCardDesc] = useState("");
  const [newCardColor, setNewCardColor] = useState("border-indigo-500 bg-indigo-500/5");

  const handleAddCard = () => {
    if (!newCardTitle.trim() || !newCardDesc.trim()) return;
    const newCard = {
      id: Date.now().toString(),
      title: newCardTitle.trim(),
      desc: newCardDesc.trim(),
      color: newCardColor
    };
    const updated = [newCard, ...personalCards];
    setPersonalCards(updated);
    localStorage.setItem("student_personal_dashboard_cards", JSON.stringify(updated));
    setNewCardTitle("");
    setNewCardDesc("");
  };

  const handleDeleteCard = (id: string) => {
    const updated = personalCards.filter(c => c.id !== id);
    setPersonalCards(updated);
    localStorage.setItem("student_personal_dashboard_cards", JSON.stringify(updated));
  };

  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => completedIds.includes(a.id)).length;
    const overdue = assignments.filter((a) => {
      if (!a.dueDate || completedIds.includes(a.id)) return false;
      try {
        const d = parseISO(a.dueDate);
        return !isNaN(d.getTime()) && isPast(d) && !isToday(d);
      } catch {
        return false;
      }
    }).length;
    const upcoming = assignments.filter((a) => {
      if (!a.dueDate || completedIds.includes(a.id)) return false;
      try {
        const d = parseISO(a.dueDate);
        if (isNaN(d.getTime())) return false;
        const diff = (d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000;
        return diff >= 0 && diff <= 7;
      } catch {
        return false;
      }
    }).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const bySubject: Record<string, { name: string; color: string; total: number; done: number }> = {};
    assignments.forEach((a) => {
      if (!bySubject[a.subjectId]) {
        bySubject[a.subjectId] = { name: a.subjectName, color: a.subjectColor || "#6366f1", total: 0, done: 0 };
      }
      bySubject[a.subjectId].total++;
      if (completedIds.includes(a.id)) bySubject[a.subjectId].done++;
    });

    return { total, completed, overdue, upcoming, rate, bySubject };
  }, [assignments, completedIds]);

  const updateMe = useUpdateStudentMe({
    mutation: {
      onSuccess: (data) => {
        void data;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSuccessMsg("تم تحديث البيانات بنجاح");
        setErrorMsg(null);
        refetch();
        setTimeout(() => setSuccessMsg(null), 3000);
      },
      onError: (err: any) => {
        setErrorMsg(err?.response?.data?.error || "حدث خطأ أثناء التحديث");
        setSuccessMsg(null);
      }
    }
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("حجم الصورة يجب أن يكون أقل من 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatar(result);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    setErrorMsg(null);
    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setErrorMsg("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword && !currentPassword) {
      setErrorMsg("يرجى إدخال كلمة المرور الحالية لتغيير كلمة المرور");
      return;
    }

    const payload: {
      displayName?: string;
      profilePicture?: string;
      currentPassword?: string;
      newPassword?: string;
    } = {};

    const effectiveName = displayName.trim() || me?.displayName || "";
    if (effectiveName && effectiveName !== me?.displayName) payload.displayName = effectiveName;
    if (avatar !== null) payload.profilePicture = avatar;
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    if (Object.keys(payload).length === 0) {
      setErrorMsg("لا توجد تغييرات لحفظها");
      return;
    }

    updateMe.mutate({ data: payload });
  };

  const { logout } = useAuth();
  const handleLogout = async () => {
    await logout({ redirectUrl: "/" });
  };

  const currentAvatar = avatar ?? me?.profilePicture;
  const initials = (me?.displayName || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">يجب تسجيل الدخول أولاً</p>
        <Button onClick={() => setLocation("/sign-in")}>تسجيل الدخول</Button>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-lg mx-auto py-6 space-y-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold">الملف الشخصي</h1>

      {/* Avatar + name */}
      <div className="glass-strong rounded-2xl p-6 flex flex-col items-center gap-4">
        <div className="relative">
          <div
            className="h-24 w-24 rounded-full border-4 border-primary/20 bg-primary/10 flex items-center justify-center overflow-hidden cursor-pointer shadow-lg hover:opacity-90 transition-opacity"
            onClick={() => fileRef.current?.click()}
          >
            {currentAvatar ? (
              <img src={currentAvatar} alt="الصورة الشخصية" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{initials}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -left-1 bg-primary text-primary-foreground h-8 w-8 rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg">{me.displayName}</p>
          <p className="text-sm text-muted-foreground">@{me.username}</p>
        </div>
        {avatar && (
          <button type="button" onClick={() => setAvatar(null)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
            إلغاء تغيير الصورة
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">إحصائياتي</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "إجمالي المهام", value: stats.total, color: "text-foreground" },
            { label: "مكتملة", value: stats.completed, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "هذا الأسبوع", value: stats.upcoming, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="bg-muted/40 rounded-xl p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Completion rate bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              نسبة الإنجاز
            </span>
            <span className="font-bold text-primary">{stats.rate}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-primary to-primary/70"
              initial={{ width: 0 }}
              animate={{ width: `${stats.rate}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
          {stats.rate >= 80 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              أداء ممتاز! استمر على هذا المستوى.
            </p>
          )}
          {stats.overdue > 0 && (
            <p className="text-xs text-rose-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {stats.overdue} مهمة تجاوزت موعد التسليم.
            </p>
          )}
        </div>

        {/* Points & rank */}
        {pointsData && (
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-semibold text-muted-foreground">النقاط والمستوى</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gradient-to-l from-amber-50 dark:from-amber-950/20 to-transparent rounded-xl p-3 border border-amber-100 dark:border-amber-900/40">
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{pointsData.total}</p>
                <p className="text-[10px] text-muted-foreground">إجمالي النقاط</p>
              </div>
              <div className="flex-1 bg-muted/40 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{pointsData.rank}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{pointsData.completions} مهمة مكتملة</p>
              </div>
            </div>
          </div>
        )}

        {/* By subject */}
        {Object.keys(stats.bySubject).length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground">حسب المادة</p>
            {Object.values(stats.bySubject).map((subj) => {
              const pct = subj.total > 0 ? Math.round((subj.done / subj.total) * 100) : 0;
              return (
                <div key={subj.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium" style={{ color: subj.color }}>{subj.name}</span>
                    <span className="text-muted-foreground">{subj.done}/{subj.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: subj.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Personal custom cards builder */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <h2 className="font-bold text-sm">مساحتي الشخصية والبطاقات المفضلة 🎯</h2>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">تخصيص كامل</span>
        </div>

        <p className="text-xs text-muted-foreground">
          أضف بطاقات مخصصة لمتابعة أهدافك، قوانينك الرياضية المفضلة، أو كبسولات المذاكرة الخاصة بك.
        </p>

        {/* List of cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {personalCards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative border-r-4 p-4 rounded-xl border border-border/60 ${card.color || "border-indigo-500 bg-indigo-500/5"} flex flex-col justify-between group shadow-sm`}
            >
              <button
                onClick={() => handleDeleteCard(card.id)}
                className="absolute top-2.5 left-2.5 h-6 w-6 rounded-lg bg-background/80 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="حذف البطاقة"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <div>
                <h3 className="font-bold text-xs text-foreground mb-1 pr-1 flex items-center gap-1">
                  <Pin className="h-3 w-3 text-muted-foreground rotate-45 shrink-0" />
                  {card.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{card.desc}</p>
              </div>
            </motion.div>
          ))}

          {personalCards.length === 0 && (
            <div className="col-span-full text-center py-6 text-muted-foreground text-xs">
              لا توجد بطاقات مخصصة بعد. أنشئ بطاقتك الأولى بالأسفل! 👇
            </div>
          )}
        </div>

        {/* Add Card Form */}
        <div className="border-t border-border/40 pt-4 space-y-3">
          <p className="text-xs font-bold text-foreground">إضافة بطاقة جديدة:</p>
          <div className="space-y-2">
            <Input
              placeholder="عنوان البطاقة (مثال: قانون النسبة)"
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              className="rounded-xl h-9 text-xs"
            />
            <textarea
              placeholder="وصف البطاقة أو المحتوى العلمي..."
              value={newCardDesc}
              onChange={(e) => setNewCardDesc(e.target.value)}
              className="w-full min-h-[70px] bg-background border border-input rounded-xl p-2.5 text-xs outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 placeholder:text-muted-foreground/60"
              dir="rtl"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">اللون:</span>
              {[
                { class: "border-indigo-500 bg-indigo-500/5", label: "نيلي" },
                { class: "border-emerald-500 bg-emerald-500/5", label: "زمردي" },
                { class: "border-fuchsia-500 bg-fuchsia-500/5", label: "فوشيا" },
                { class: "border-amber-500 bg-amber-500/5", label: "كهرماني" },
              ].map((colorObj) => (
                <button
                  key={colorObj.class}
                  type="button"
                  onClick={() => setNewCardColor(colorObj.class)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    newCardColor === colorObj.class
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {colorObj.label}
                </button>
              ))}
            </div>

            <Button
              type="button"
              onClick={handleAddCard}
              disabled={!newCardTitle.trim() || !newCardDesc.trim()}
              className="h-8 rounded-lg text-xs gap-1 px-3"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة مساحتي</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Alert className="border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl py-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="mr-2 text-emerald-700 dark:text-emerald-400 text-sm">{successMsg}</AlertDescription>
          </Alert>
        </motion.div>
      )}
      {errorMsg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Alert variant="destructive" className="rounded-xl py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mr-2 text-sm">{errorMsg}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Edit info */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">المعلومات الشخصية</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">الاسم الكامل</Label>
          <Input id="displayName" placeholder={me.displayName} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>اسم المستخدم</Label>
          <Input value={me.username} disabled className="rounded-xl opacity-60" dir="ltr" />
          <p className="text-[11px] text-muted-foreground">لا يمكن تغيير اسم المستخدم. تواصل مع الإدارة إذا احتجت تعديله.</p>
        </div>
      </div>

      {/* Change password */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">تغيير كلمة المرور</h2>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
          <Input id="currentPassword" type="password" dir="ltr" className="text-left rounded-xl" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
          <Input id="newPassword" type="password" dir="ltr" className="text-left rounded-xl" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" placeholder="6 أحرف على الأقل" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
          <Input id="confirmPassword" type="password" dir="ltr" className="text-left rounded-xl" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        </div>
      </div>

      <Button className="w-full h-11 rounded-xl" onClick={handleSave} disabled={updateMe.isPending}>
        {updateMe.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
        حفظ التغييرات
      </Button>

      <Button variant="outline" className="w-full h-10 rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive/40" onClick={handleLogout}>
        <LogOut className="h-4 w-4 ml-2" />
        تسجيل الخروج
      </Button>
    </motion.div>
  );
}
