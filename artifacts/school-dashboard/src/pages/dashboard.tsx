import { useGetDashboardStats, useListUpcomingAssignments } from "@workspace/api-client-react";
import { AssignmentCard } from "@/components/assignment-card";
import { TodayScheduleCard } from "@/components/today-schedule-card";
import { LoadingPage } from "@/components/loading-state";
import {
  AlertCircle, BookOpen, CheckCircle2, Clock, Trophy, Zap,
  CalendarCheck, ArrowLeft, Sun, Moon, Sunrise, Sunset, Hourglass
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useCompletions } from "@/hooks/use-completions";
import { useStudentProfile } from "@/lib/use-student-profile";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useMemo, useEffect } from "react";
import { parseISO, format, differenceInCalendarDays } from "date-fns";
import { ar } from "date-fns/locale";

function getGreeting(): { text: string; Icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 5)  return { text: "طابت ليلتك",  Icon: Moon    };
  if (h < 12) return { text: "صباح الخير",  Icon: Sunrise  };
  if (h < 17) return { text: "مساء النور",  Icon: Sun      };
  if (h < 21) return { text: "مساء الخير",  Icon: Sunset   };
  return        { text: "طابت ليلتك",  Icon: Moon    };
}

/* ── Spring counter ── */
function AnimatedCounter({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 18 });
  const display = useTransform(spring, (v) => Math.round(v).toString());
  useEffect(() => { mv.set(value); }, [mv, value]);
  return <motion.span>{display}</motion.span>;
}

/* ── Stagger variants ── */
const stagger = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 340, damping: 30 } },
};

/* ── Stat card ── */
interface StatCardProps {
  label: string;
  value: number | string;
  sub: string;
  icon: typeof BookOpen;
  color: string;
  gradient: string;
}

function StatCard({ label, value, sub, icon: Icon, color, gradient }: StatCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      style={{ willChange: "transform" }}
    >
      <div className="relative overflow-hidden rounded-2xl p-5 bg-card border border-border/50 shadow-sm hover:shadow-2xl transition-shadow duration-300">
        {/* Top gradient bar */}
        <div className="absolute top-0 right-0 left-0 h-[3px] rounded-t-2xl" style={{ background: gradient }} />
        {/* Blur blob */}
        <div
          className="absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-20 pointer-events-none"
          style={{ background: color }}
        />
        {/* Icon */}
        <div
          className="h-11 w-11 rounded-xl mb-4 flex items-center justify-center"
          style={{ background: `${color}1A` }}
        >
          <Icon className="h-5.5 w-5.5" style={{ color }} />
        </div>
        {/* Value */}
        <div className="text-[2.6rem] font-black leading-none mb-1.5 tabular-nums" style={{ color }}>
          {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
        </div>
        <p className="text-sm font-bold text-foreground/80 leading-tight mb-0.5">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: stats,    isLoading: statsLoading,    error: statsError } = useGetDashboardStats();
  const { data: upcoming, isLoading: upcomingLoading }                    = useListUpcomingAssignments({ limit: 6 });
  const { completedIds, toggle } = useCompletions();
  const { profile: studentUser } = useStudentProfile();

  /* ── All hooks must come before any conditional returns ── */
  const totalUpcoming = upcoming?.length || 0;
  const completedUpcoming = useMemo(
    () => upcoming?.filter(a => completedIds.includes(a.id)).length || 0,
    [upcoming, completedIds],
  );
  const progressPercent = totalUpcoming > 0 ? Math.round((completedUpcoming / totalUpcoming) * 100) : 0;

  const countdownItems = useMemo(() => {
    if (!upcoming) return [];
    const now = new Date();
    return upcoming
      .filter(a => !completedIds.includes(a.id))
      .map(a => {
        const due  = parseISO(a.dueDate);
        const days = differenceInCalendarDays(due, now);
        return { id: a.id, title: a.title, days, color: a.subjectColor || "hsl(var(--primary))" };
      })
      .filter(x => x.days >= 0 && x.days <= 14)
      .slice(0, 5);
  }, [upcoming, completedIds]);

  const today                                = format(new Date(), "EEEE، d MMMM", { locale: ar });
  const { text: greetText, Icon: GreetIcon } = getGreeting();

  /* ── Conditional returns after all hooks ── */
  if (statsLoading || upcomingLoading) return <LoadingPage />;

  if (statsError || !stats) {
    return (
      <Alert variant="destructive" className="my-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>حدث خطأ أثناء تحميل البيانات.</AlertDescription>
      </Alert>
    );
  }

  const urgentCount = Number(stats.byPriority.find(p => p.label === "عاجل")?.count) || 0;

  return (
    <motion.div className="space-y-5" initial="hidden" animate="show" variants={stagger}>

      {/* ── Hero banner ── */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-3xl">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklch, hsl(var(--primary)), black 48%) 0%, color-mix(in oklch, hsl(var(--primary)), black 18%) 45%, hsl(var(--primary)) 75%, color-mix(in oklch, hsl(var(--primary)), white 22%) 100%)",
          }}
        />

        {/* Static accent blobs */}
        <div className="absolute -top-10 -left-10 h-44 w-44 rounded-full bg-white/12 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 right-1/3 h-36 w-36 rounded-full bg-white/8 blur-3xl pointer-events-none" />

        {/* Content */}
        <div className="relative px-6 py-6 sm:py-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-white/60 text-xs font-semibold tracking-wide uppercase mb-1.5">{today}</p>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight flex items-center gap-2.5 flex-wrap mb-2">
                <GreetIcon className="h-7 w-7 text-white/90 shrink-0" />
                {studentUser ? `${greetText}، ${studentUser.displayName}` : greetText}
              </h1>
              <p className="text-white/70 text-sm">
                {stats.total === 0
                  ? "لا توجد مهام حالياً — استمتع بيومك!"
                  : `لديك ${stats.total} مهمة${urgentCount > 0 ? `، منها ${urgentCount} عاجلة` : ""}.`}
              </p>
            </div>

            {/* Progress ring (if logged in) */}
            {studentUser && totalUpcoming > 0 && (
              <div className="shrink-0 relative flex items-center justify-center">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
                  <motion.circle
                    cx="28" cy="28" r="22"
                    fill="none"
                    stroke="white"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 22 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 22 * (1 - progressPercent / 100) }}
                    transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
                  />
                </svg>
                <span className="absolute text-white text-xs font-black">{progressPercent}%</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Today schedule ── */}
      <motion.div variants={fadeUp}>
        <TodayScheduleCard />
      </motion.div>

      {/* ── Countdown strip ── */}
      <AnimatePresence>
        {countdownItems.length > 0 && (
          <motion.div variants={fadeUp} key="countdown">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                <Hourglass className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="font-bold text-sm">العداد التنازلي</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-hide">
              {countdownItems.map((item, i) => {
                const urgent = item.days === 0;
                const soon   = item.days <= 2;
                const accentColor = urgent ? "#e11d48" : soon ? "#d97706" : item.color;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 28 }}
                    whileHover={{ y: -4, scale: 1.05 }}
                    className="shrink-0 rounded-2xl px-4 py-3.5 flex flex-col items-center gap-1.5 min-w-[90px] border relative overflow-hidden cursor-default"
                    style={{
                      background: `linear-gradient(145deg, ${accentColor}18 0%, ${accentColor}08 100%)`,
                      borderColor: `${accentColor}40`,
                    }}
                  >
                    <p className="text-3xl font-black leading-none tabular-nums" style={{ color: accentColor }}>
                      {item.days}
                    </p>
                    <div className="h-px w-8 rounded-full" style={{ background: `${accentColor}60` }} />
                    <p className="text-[10px] text-muted-foreground font-bold">
                      {item.days === 0 ? "اليوم!" : item.days === 1 ? "غداً" : "يوم"}
                    </p>
                    <p
                      className="text-[10px] font-bold text-center leading-snug line-clamp-2 max-w-[74px]"
                      style={{ color: accentColor }}
                    >
                      {item.title}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stat cards ── */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" variants={stagger}>
        <StatCard
          label="إجمالي المهام"
          value={stats.total}
          sub={`${stats.recentlyAdded} أضيفت مؤخراً`}
          icon={BookOpen}
          color="hsl(var(--primary))"
          gradient="linear-gradient(90deg, hsl(var(--primary)), color-mix(in oklch, hsl(var(--primary)), white 28%))"
        />
        <StatCard
          label="مهام عاجلة"
          value={urgentCount}
          sub="تحتاج اهتماماً فورياً"
          icon={Zap}
          color="#e11d48"
          gradient="linear-gradient(90deg, #e11d48, #f97316)"
        />
        <StatCard
          label="قادمة الأسبوع"
          value={stats.upcoming}
          sub="تستحق التسليم قريباً"
          icon={Clock}
          color="#d97706"
          gradient="linear-gradient(90deg, #d97706, #eab308)"
        />
        <StatCard
          label="حالة الإنجاز"
          value={studentUser && totalUpcoming > 0 ? progressPercent : 100}
          sub="أنت على الطريق الصحيح"
          icon={CheckCircle2}
          color="#0d9488"
          gradient="linear-gradient(90deg, #0d9488, #06b6d4)"
        />
      </motion.div>

      {/* ── Progress bar (only if signed in) ── */}
      {studentUser && totalUpcoming > 0 && (
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-4"
        >
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold">أنجزت {completedUpcoming} من {totalUpcoming} مهمة</span>
              <span className="text-sm font-black text-primary">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, hsl(var(--primary)), color-mix(in oklch, hsl(var(--primary)), white 28%))" }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Upcoming assignments ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">أقرب مواعيد التسليم</h2>
          <Link href="/calendar">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/8 rounded-xl font-semibold"
            >
              عرض التقويم
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {upcoming && upcoming.length > 0 ? (
          <motion.div
            className="columns-1 md:columns-2 lg:columns-3 gap-3"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {upcoming.map(assignment => (
              <div key={assignment.id} className="break-inside-avoid mb-3">
                <AssignmentCard
                  assignment={assignment}
                  completedIds={completedIds}
                  onToggleComplete={toggle}
                />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed border-border/50 bg-muted/20 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
              <CalendarCheck className="h-8 w-8 text-primary/40" />
            </div>
            <p className="font-bold text-muted-foreground mb-1">لا توجد مهام قادمة قريباً</p>
            <p className="text-sm text-muted-foreground/60">لقد أنجزت جميع مهامك. أحسنت صنعاً!</p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
