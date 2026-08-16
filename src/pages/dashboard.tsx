import { useGetDashboardStats, useListUpcomingAssignments } from "@workspace/api-client-react";
import { AssignmentCard } from "@/components/assignment-card";
import { TodayScheduleCard } from "@/components/today-schedule-card";
import { LoadingPage } from "@/components/loading-state";
import {
  AlertCircle, BookOpen, CheckCircle2, Clock, Trophy, Zap,
  CalendarCheck, ArrowLeft, Sun, Moon, Sunrise, Sunset, Hourglass,
  Globe, Award, Youtube, ExternalLink, Sparkles, Lightbulb,
  Bot, FolderDown, BrainCircuit, FileSpreadsheet, GraduationCap, Languages,
  MessageSquare, Smartphone
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useCompletions } from "@/hooks/use-completions";
import { useStudentProfile } from "@/lib/use-student-profile";
import { AppLogo } from "@/components/app-logo";
import { getStoredPlatforms } from "@/lib/cloud-sync";
import { DEFAULT_PLATFORMS } from "./platforms";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useMemo, useEffect, useState } from "react";
import { parseISO, format, differenceInCalendarDays } from "date-fns";
import { ar } from "date-fns/locale";
import { formatHijriDate } from "@/lib/utils";

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
      whileHover={{ y: -4, scale: 1.02 }}
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
  
  const [viewerUrl, setViewerUrl] = useState<{ id: string; name: string; url: string; color: string; iconBg: string; icon?: any } | null>(null);

  // Dynamic platforms synchronized with Cloud / Local storage
  const [dashboardPlatforms, setDashboardPlatforms] = useState<any[]>(() => getStoredPlatforms(DEFAULT_PLATFORMS));

  useEffect(() => {
    const syncPlatforms = async () => {
      try {
        const res = await fetch("/api/platforms");
        if (res.ok) {
          const cloudList = await res.json();
          if (Array.isArray(cloudList) && cloudList.length > 0) {
            setDashboardPlatforms(getStoredPlatforms(cloudList));
            return;
          }
        }
      } catch (err) {
        console.warn("Using local cached platforms:", err);
      }
      setDashboardPlatforms(getStoredPlatforms(DEFAULT_PLATFORMS));
    };

    syncPlatforms();

    const handlePlatformsChanged = () => {
      setDashboardPlatforms(getStoredPlatforms(DEFAULT_PLATFORMS));
    };

    window.addEventListener("app_platform_updated", handlePlatformsChanged);
    window.addEventListener("storage", handlePlatformsChanged);
    return () => {
      window.removeEventListener("app_platform_updated", handlePlatformsChanged);
      window.removeEventListener("storage", handlePlatformsChanged);
    };
  }, []);

  const countdownItems = useMemo(() => {
    if (!upcoming) return [];
    const now = new Date();
    return upcoming
      .filter(a => !completedIds.includes(a.id))
      .map(a => {
        let days = 999;
        if (a.dueDate) {
          try {
            const due = parseISO(a.dueDate);
            if (!isNaN(due.getTime())) {
              days = differenceInCalendarDays(due, now);
            }
          } catch {}
        }
        return { id: a.id, title: a.title, days, color: a.subjectColor || "hsl(var(--primary))" };
      })
      .filter(x => x.days >= 0 && x.days <= 14)
      .slice(0, 5);
  }, [upcoming, completedIds]);

  const today                                = format(new Date(), "EEEE، d MMMM", { locale: ar });
  const hijriToday                           = formatHijriDate(new Date());
  const displayDate                          = hijriToday ? `${today} • ${hijriToday}` : today;
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
    <motion.div className="space-y-4" initial="hidden" animate="show" variants={stagger}>

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
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white/70 text-xs font-bold tracking-wide px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                  {displayDate}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight flex items-center gap-2.5 flex-wrap mb-2">
                <GreetIcon className="h-7 w-7 text-white/90 shrink-0" />
                {studentUser ? `${greetText}، ${studentUser.displayName}` : greetText}
              </h1>
              <p className="text-white/80 text-sm font-medium">
                {stats.total === 0
                  ? "لا توجد مهام حالياً — استمتع بيومك!"
                  : `لديك ${stats.total} مهمة${urgentCount > 0 ? `، منها ${urgentCount} عاجلة` : ""}.`}
              </p>
            </div>

            {/* Progress ring */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              {studentUser && totalUpcoming > 0 && (
                <div className="shrink-0 relative flex items-center justify-center">
                  <svg className="h-14 w-14 sm:h-16 sm:w-16 -rotate-90" viewBox="0 0 56 56">
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
        </div>
      </motion.div>

      {/* ── Today schedule ── */}
      <motion.div variants={fadeUp}>
        <TodayScheduleCard />
      </motion.div>

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

      {/* ── Spotlight Channels, AI Tutor, Flashcards & Library Cards ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Channels Portal Card */}
        <Link href="/channels">
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-3xl p-5 border border-purple-500/20 bg-card hover:border-purple-500/60 hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="h-10 w-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                  ديسكورد وتليجرام ⭐
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-foreground group-hover:text-purple-500 transition-colors flex items-center gap-1.5">
                <span>بوابة القنوات والمجتمعات</span>
                <ArrowLeft className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                انضم لخوادم ديسكورد الصوتية وقنوات تليجرام القدرات مع إمكانية التنسيق والتسمية.
              </p>
            </div>
          </motion.div>
        </Link>

        {/* AI Tutor Card */}
        <Link href="/ai-tutor">
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-3xl p-5 border border-emerald-500/20 bg-card hover:border-emerald-500/60 hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                  ذكي + تصعيد للمعلم 👨‍🏫
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-foreground group-hover:text-emerald-500 transition-colors flex items-center gap-1.5">
                <span>المعلم الذكي وحل المسائل</span>
                <ArrowLeft className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                شرح القوانين وتوليد كويزات، مع إمكانية إرسال السؤال للمعلم إذا لم تستفد من الشرح.
              </p>
            </div>
          </motion.div>
        </Link>

        {/* Flashcards Card */}
        <Link href="/flashcards">
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-3xl p-5 border border-indigo-500/20 bg-card hover:border-indigo-500/60 hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                  <Languages className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
                  STEP & IELTS 🇬🇧
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-foreground group-hover:text-indigo-500 transition-colors flex items-center gap-1.5">
                <span>بطاقات الإنجليزية Flashcards</span>
                <ArrowLeft className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                استذكر الكلمات والعبارات الأكثر تكراراً بالنطق الصوتي التفاعلي وأمثلة توضيحية.
              </p>
            </div>
          </motion.div>
        </Link>

        {/* Library Card */}
        <Link href="/library">
          <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-3xl p-5 border border-blue-500/20 bg-card hover:border-blue-500/60 hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                  <FolderDown className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                  تجميعات 1446 📁
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-foreground group-hover:text-blue-500 transition-colors flex items-center gap-1.5">
                <span>مكتبة التجميعات والملخصات</span>
                <ArrowLeft className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                حقيبة شاملة لملخصات القدرات والتحصيلي، شيتات القوانين، والمزامنة السحابية.
              </p>
            </div>
          </motion.div>
        </Link>
      </motion.div>


      {/* ── Upcoming assignments & Countdown ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hourglass className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="font-bold text-base">أقرب مواعيد التسليم والمهام</h2>
          </div>
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

        {/* Countdown strip */}
        {countdownItems.length > 0 && (
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {countdownItems.map((item, i) => {
              const urgent = item.days === 0;
              const soon   = item.days <= 2;
              const accentColor = urgent ? "#e11d48" : soon ? "#d97706" : item.color;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 28 }}
                  whileHover={{ y: -2, scale: 1.03 }}
                  className="shrink-0 rounded-2xl px-3.5 py-3 flex flex-col items-center gap-1 min-w-[86px] border relative overflow-hidden cursor-default bg-card shadow-xs"
                  style={{
                    background: `linear-gradient(145deg, ${accentColor}14 0%, ${accentColor}05 100%)`,
                    borderColor: `${accentColor}35`,
                  }}
                >
                  <p className="text-2xl font-black leading-none tabular-nums" style={{ color: accentColor }}>
                    {item.days}
                  </p>
                  <div className="h-px w-6 rounded-full" style={{ background: `${accentColor}50` }} />
                  <p className="text-[10px] text-muted-foreground font-bold">
                    {item.days === 0 ? "اليوم!" : item.days === 1 ? "غداً" : "يوم"}
                  </p>
                  <p
                    className="text-[10px] font-bold text-center leading-snug line-clamp-2 max-w-[70px]"
                    style={{ color: accentColor }}
                  >
                    {item.title}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}

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

      {/* ── Quick Platforms & Resources Strip ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="font-bold text-base">منصات ومواقع المذاكرة</h2>
          </div>
          <Link href="/platforms">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/8 rounded-xl font-semibold"
            >
              عرض كل المنصات ({dashboardPlatforms.length})
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dashboardPlatforms.slice(0, 8).map((item) => {
            const itemColor = item.color || "#059669";
            const itemIcon = item.url?.includes("youtube") ? Youtube : item.category?.includes("تحصيلي") ? GraduationCap : Award;
            const Icon = itemIcon;
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setViewerUrl({ id: item.id, name: item.name, url: item.url, color: itemColor, iconBg: item.iconBg || `${itemColor}15`, icon: Icon })}
                className="group block w-full text-right"
              >
                <div className="h-full rounded-2xl border border-border/50 bg-card p-3.5 hover:border-primary/40 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div
                      className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: item.iconBg || `${itemColor}15`, color: itemColor }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {item.badge && (
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                        style={{ background: itemColor }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-xs text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                      <span className="line-clamp-1">{item.name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-1" />
                    </h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                      {item.desc || "منصة ومورد تعليمي وتدريبي"}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ── In-App Viewer Modal ── */}
      {viewerUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full h-full max-w-7xl bg-card rounded-2xl md:rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Viewer Header */}
            <div className="flex items-center justify-between p-3 sm:px-5 sm:py-3 border-b border-border/50 bg-card/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                  style={{ background: viewerUrl.iconBg }}
                >
                  {viewerUrl.icon ? (
                    <viewerUrl.icon className="h-5 w-5" style={{ color: viewerUrl.color }} />
                  ) : (
                    <ExternalLink className="h-5 w-5" style={{ color: viewerUrl.color }} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground">{viewerUrl.name}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-xs" dir="ltr">
                      {viewerUrl.url}
                    </p>
                    <a
                      href={viewerUrl.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] sm:text-xs text-primary hover:underline font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      فتح في نافذة جديدة
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewerUrl(null)}
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground flex items-center justify-center transition-colors"
                  title="إغلاق"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Warning Message if blocked */}
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                ملاحظة: بعض المنصات تمنع الفتح داخل المواقع الأخرى لأسباب أمنية. إذا ظهرت لك شاشة بيضاء أو رسالة رفض الاتصال، يرجى الضغط على زر <strong>"فتح في نافذة جديدة"</strong> بالأعلى.
              </p>
            </div>

            {/* Iframe */}
            <div className="flex-1 w-full bg-white relative">
              <iframe
                src={(() => {
                  const url = viewerUrl.url;
                  // Handle YouTube specifically to use embed URL
                  if (url.includes("youtube.com/watch?v=")) {
                    const videoId = url.split("v=")[1].split("&")[0];
                    return `https://www.youtube.com/embed/${videoId}`;
                  }
                  if (url.includes("youtu.be/")) {
                    const videoId = url.split("youtu.be/")[1].split("?")[0];
                    return `https://www.youtube.com/embed/${videoId}`;
                  }
                  // For other sites, load directly. If they block iframes, the user MUST use the external link.
                  // Proxies break complex React apps and trigger Cloudflare WAF blocks.
                  return url;
                })()}
                className="absolute inset-0 w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                loading="lazy"
                title={viewerUrl.name}
              />
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
