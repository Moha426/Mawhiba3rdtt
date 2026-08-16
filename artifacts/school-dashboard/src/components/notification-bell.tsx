import { useState } from "react";
import { Bell, BellOff, BookOpen, Calendar, X, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useListAssignments } from "@workspace/api-client-react";
import { parseISO, differenceInCalendarDays, format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useNotifications } from "@/hooks/use-notifications";

function useNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [permState, setPermState] = useState<NotificationPermission | "unsupported">(() =>
    ("Notification" in window ? Notification.permission : "unsupported") as any
  );
  const { data: assignments = [] } = useListAssignments();

  useNotifications(assignments);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = assignments
    .filter((a) => {
      const due = parseISO(a.dueDate);
      const days = differenceInCalendarDays(due, today);
      return days >= 0 && days <= 3;
    })
    .sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

  const count = upcoming.length;

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
      new Notification("✅ تم تفعيل الإشعارات", {
        body: "ستصلك إشعارات عند اقتراب مواعيد تسليم المهام",
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
          title="الإشعارات"
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
        className="w-80 p-0 rounded-2xl shadow-xl border-border/50 overflow-hidden"
        dir="rtl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">مهام قريبة التسليم</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-lg"
            onClick={() => setOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="max-h-[320px] overflow-y-auto">
          {upcoming.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-muted-foreground">
              <BookOpen className="h-8 w-8 opacity-30" />
              <p className="text-sm">لا توجد مهام في الأيام القادمة</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {upcoming.map((a) => {
                const due = parseISO(a.dueDate);
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
                      <p className="text-sm font-semibold truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.subjectName}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">
                          {format(due, "d MMM", { locale: ar })}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${getBadgeStyle(days)}`}
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

        {permState !== "unsupported" && permState !== "granted" && (
          <div className="px-4 py-3 border-t border-border/40 bg-amber-50 dark:bg-amber-950/20">
            <button
              onClick={handleRequestPermission}
              disabled={permState === "denied"}
              className="w-full flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {permState === "denied" ? (
                <>
                  <BellOff className="h-3.5 w-3.5 shrink-0" />
                  <span>الإشعارات محظورة — افتح إعدادات المتصفح لتفعيلها</span>
                </>
              ) : (
                <>
                  <BellRing className="h-3.5 w-3.5 shrink-0" />
                  <span>اضغط لتفعيل إشعارات المتصفح</span>
                </>
              )}
            </button>
          </div>
        )}

        {permState === "granted" && (
          <div className="px-4 py-2 border-t border-border/40 bg-muted/10">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <BellRing className="h-3 w-3" />
              <span>الإشعارات مفعّلة</span>
            </div>
          </div>
        )}

        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
          <Link href="/assignments" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full text-xs h-8 rounded-xl text-primary hover:bg-primary/5">
              عرض جميع المهام
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
