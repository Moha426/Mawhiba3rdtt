import { useState, useEffect } from "react";
import { Bell, BellOff, BookOpen, Calendar, X, BellRing, Plus, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useListAssignments } from "@workspace/api-client-react";
import { parseISO, differenceInCalendarDays, format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useNotifications } from "@/hooks/use-notifications";
import { 
  getCustomReminders, 
  saveCustomReminder, 
  toggleReminderStatus, 
  deleteReminder,
  type CustomReminder 
} from "@/lib/cloud-sync";

function useNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"assignments" | "reminders">("assignments");
  const [reminders, setReminders] = useState<CustomReminder[]>([]);
  const [newReminderText, setNewReminderText] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("بعد 30 دقيقة");
  const [permState, setPermState] = useState<NotificationPermission | "unsupported">(() =>
    ("Notification" in window ? Notification.permission : "unsupported") as any
  );
  const { data: assignments = [] } = useListAssignments();

  useNotifications(assignments);

  useEffect(() => {
    setReminders(getCustomReminders());
  }, [open]);

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    const added = saveCustomReminder({
      title: newReminderText.trim(),
      category: "مذاكرة",
      scheduledTime: newReminderTime
    });
    setReminders(prev => [added, ...prev]);
    setNewReminderText("");

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏰ تم ضبط التذكير بنجاح", {
        body: `${newReminderText} (${newReminderTime})`,
        dir: "rtl",
        lang: "ar"
      });
    }
  };

  const handleToggleReminder = (id: string) => {
    const updated = toggleReminderStatus(id);
    setReminders(updated);
  };

  const handleDeleteReminder = (id: string) => {
    const updated = deleteReminder(id);
    setReminders(updated);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const safeParseDate = (dStr?: string) => {
    if (!dStr) return null;
    try {
      const d = parseISO(dStr);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const upcoming = assignments
    .filter((a) => {
      const due = safeParseDate(a.dueDate);
      if (!due) return false;
      const days = differenceInCalendarDays(due, today);
      return days >= 0 && days <= 3;
    })
    .sort((a, b) => {
      const da = safeParseDate(a.dueDate)?.getTime() ?? 0;
      const db = safeParseDate(b.dueDate)?.getTime() ?? 0;
      return da - db;
    });

  const count = upcoming.length + reminders.filter(r => !r.completed).length;

  const getBadgeStyle = (days: number) => {
    if (days === 0) return "bg-rose-500";
    if (days === 1) return "bg-amber-500";
    return "bg-yellow-500";
  };

  const getDayLabel = (days: number) => {
    if (days === 0) return "اليوم";
    if (days === 1) return "غداً";
    return `بعد ${days} أيام`;
  };

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setPermState(perm);
    if (perm === "granted") {
      new Notification("✅ تم تفعيل الإشعارات والتنبيهات", {
        body: "ستصلك إشعارات فورية عند اقتراب مواعيد تسليم المهام وجلسات المذاكرة",
        dir: "rtl",
        lang: "ar",
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
          title="مركز الإشعارات والتذكيرات"
        >
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -left-0.5 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm"
              >
                {count > 9 ? "9+" : count}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-88 sm:w-96 p-0 rounded-3xl shadow-2xl border-border/60 overflow-hidden bg-card"
        dir="rtl"
      >
        {/* Header with Switcher Tabs */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
            <button
              onClick={() => setTab("assignments")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                tab === "assignments"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المهام القريبة ({upcoming.length})
            </button>
            <button
              onClick={() => setTab("reminders")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                tab === "reminders"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              تذكيراتي ({reminders.filter(r => !r.completed).length})
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab 1: Assignments */}
        {tab === "assignments" && (
          <div className="max-h-[320px] overflow-y-auto">
            {upcoming.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
                <BookOpen className="h-8 w-8 opacity-30" />
                <p className="text-xs font-medium">لا توجد مهام مستحقة في الأيام القادمة</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {upcoming.map((a) => {
                  const due = safeParseDate(a.dueDate) || today;
                  const days = differenceInCalendarDays(due, today);
                  return (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div
                        className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${a.subjectColor}18`, color: a.subjectColor }}
                      >
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate text-foreground">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{a.subjectName}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {format(due, "d MMM", { locale: ar })}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full text-white ${getBadgeStyle(days)}`}
                          >
                            {getDayLabel(days)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Custom Study Reminders */}
        {tab === "reminders" && (
          <div className="p-3 space-y-3">
            {/* Quick add form */}
            <form onSubmit={handleAddReminder} className="flex gap-2">
              <Input
                value={newReminderText}
                onChange={(e) => setNewReminderText(e.target.value)}
                placeholder="أضف تذكير مذاكرة سريع..."
                className="h-9 rounded-xl text-xs flex-1"
              />
              <select
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                className="h-9 px-2 rounded-xl border border-input bg-background text-[11px] font-semibold"
              >
                <option value="بعد 30 دقيقة">بعد 30 د</option>
                <option value="بعد ساعة">بعد 1 ساعة</option>
                <option value="غداً صباحاً">غداً صباحاً</option>
              </select>
              <Button type="submit" size="sm" className="h-9 px-3 rounded-xl font-bold">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>

            <div className="max-h-[220px] overflow-y-auto space-y-1.5">
              {reminders.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  لا توجد تذكيرات مسجلة حالياً
                </div>
              ) : (
                reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      rem.completed
                        ? "bg-muted/20 border-border/30 opacity-60 line-through"
                        : "bg-muted/40 border-border/60"
                    }`}
                  >
                    <div
                      onClick={() => handleToggleReminder(rem.id)}
                      className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                    >
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 ${
                          rem.completed ? "text-emerald-500" : "text-muted-foreground/50"
                        }`}
                      />
                      <span className="text-xs font-semibold truncate text-foreground">
                        {rem.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground bg-card px-2 py-0.5 rounded-md border border-border/40">
                        {rem.scheduledTime}
                      </span>
                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="text-muted-foreground/40 hover:text-rose-500 p-1 rounded transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Permission Request Prompt */}
        {permState !== "unsupported" && permState !== "granted" && (
          <div className="px-4 py-2.5 border-t border-border/40 bg-amber-50 dark:bg-amber-950/20">
            <button
              onClick={handleRequestPermission}
              disabled={permState === "denied"}
              className="w-full flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {permState === "denied" ? (
                <>
                  <BellOff className="h-3.5 w-3.5 shrink-0" />
                  <span>الإشعارات محظورة — افتح إعدادات المتصفح للسماح</span>
                </>
              ) : (
                <>
                  <BellRing className="h-3.5 w-3.5 shrink-0" />
                  <span>اضغط لتفعيل إشعارات المتصفح الفورية</span>
                </>
              )}
            </button>
          </div>
        )}

        {permState === "granted" && (
          <div className="px-4 py-2 border-t border-border/40 bg-muted/10">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              <BellRing className="h-3 w-3" />
              <span>الإشعارات مفعّلة على هذا الجهاز</span>
            </div>
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
          <Link href="/assignments" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full text-xs h-8 rounded-xl text-primary hover:bg-primary/5 font-bold">
              عرض جدول وجميع المهام
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

