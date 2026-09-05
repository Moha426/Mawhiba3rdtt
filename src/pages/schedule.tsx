import { useListSchedule, useGetScheduleConfig, useListEvents, useListSubjects, useGetSettings } from "@workspace/api-client-react";
import { LoadingPage } from "@/components/loading-state";
import { AlertCircle, Clock, Coffee, Radio, Palmtree, Star, Flag, Cake, Sun, CalendarDays, ChevronRight, ChevronLeft, Send, MapPin, User, MessageCircle, Phone, BookOpen, Printer, Monitor, Sparkles, Download, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Link } from "wouter";
import { SchedulePrintExportDialog } from "@/components/schedule-print-export-dialog";

const DAYS = [
  { id: 0, name: "الأحد", short: "أحد" },
  { id: 1, name: "الاثنين", short: "اثنين" },
  { id: 2, name: "الثلاثاء", short: "ثلاثاء" },
  { id: 3, name: "الأربعاء", short: "أربعاء" },
  { id: 4, name: "الخميس", short: "خميس" },
];

function displayTeacherName(name: string | null | undefined) {
  if (!name) return "";
  if (name.startsWith("أ.") || name.startsWith("أ ") || name.startsWith("د.") || name.startsWith("د ") || name.startsWith("Mr.")) return name;
  return `أ. ${name}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function calcPeriodTimes(
  startTime: string,
  periodsCount: number,
  periodDuration: number,
  breakAfterPeriod: number,
  breakDuration: number
): { start: string; end: string }[] {
  const times: { start: string; end: string }[] = [];
  let cursor = startTime;
  for (let i = 1; i <= periodsCount; i++) {
    const start = cursor;
    const end = addMinutes(cursor, periodDuration);
    times.push({ start, end });
    cursor = end;
    if (i === breakAfterPeriod) {
      cursor = addMinutes(cursor, breakDuration);
    }
  }
  return times;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function getCurrentPeriodInfo(
  now: Date,
  periodTimes: { start: string; end: string }[],
  breakAfterPeriod: number,
  breakDuration: number
): { type: "period"; index: number } | { type: "break" } | null {
  const jsDay = now.getDay();
  if (jsDay === 5 || jsDay === 6) return null;
  const schoolDay = jsDay === 0 ? 0 : jsDay;
  if (schoolDay > 4) return null;

  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < periodTimes.length; i++) {
    const [sh, sm] = periodTimes[i].start.split(":").map(Number);
    const [eh, em] = periodTimes[i].end.split(":").map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (nowMins >= startMins && nowMins < endMins) {
      return { type: "period", index: i };
    }
    if (i === breakAfterPeriod - 1) {
      const breakEnd = endMins + breakDuration;
      if (nowMins >= endMins && nowMins < breakEnd) {
        return { type: "break" };
      }
    }
  }
  return null;
}

const EVENT_TYPE_ICONS: Record<string, any> = {
  holiday: Palmtree,
  event: Star,
  exam_period: Flag,
  ceremony: Cake,
  other: Sun,
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  holiday: "إجازة رسمية",
  event: "مناسبة مدرسية",
  exam_period: "فترة اختبارات",
  ceremony: "حفل / تكريم",
  other: "أخرى",
};

function isEventActive(ev: { date: string; endDate?: string | null }, todayStr: string) {
  return ev.date <= todayStr && (ev.endDate ? ev.endDate >= todayStr : ev.date === todayStr);
}

function getTodayDayId(now: Date): number {
  const jsDay = now.getDay();
  if (jsDay === 5 || jsDay === 6) return 0;
  return jsDay;
}

export default function Schedule() {
  const { data: slots = [], isLoading: slotsLoading, error } = useListSchedule();
  const { data: subjects = [], isLoading: subjectsLoading } = useListSubjects();
  const { data: config, isLoading: configLoading } = useGetScheduleConfig();
  const { data: events = [] } = useListEvents({});
  const { data: settingsData } = useGetSettings();
  const now = useNow();
  const todayStr = now.toISOString().split("T")[0];

  const todayDayId = getTodayDayId(now);
  const [selectedDay, setSelectedDay] = useState<number>(todayDayId);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalTab, setPrintModalTab] = useState<"print" | "wallpaper">("print");

  if (slotsLoading || configLoading || subjectsLoading) return <LoadingPage />;

  if (error) {
    return (
      <Alert variant="destructive" className="my-8" dir="rtl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>خطأ</AlertTitle>
        <AlertDescription>حدث خطأ أثناء تحميل الجدول الدراسي.</AlertDescription>
      </Alert>
    );
  }

  const periodsCount = config?.periodsCount ?? 7;
  const breakAfterPeriod = config?.breakAfterPeriod ?? 3;
  const periodDuration = config?.periodDuration ?? 45;
  const breakDuration = config?.breakDuration ?? 20;
  const startTime = config?.startTime ?? "07:30";

  const maxUsedPeriod = slots.length > 0 ? Math.max(...slots.map((s) => s.periodNumber)) : periodsCount;
  const displayCount = Math.min(periodsCount, maxUsedPeriod);
  const PERIODS = Array.from({ length: displayCount }, (_, i) => i + 1);
  const hasBreak = displayCount >= breakAfterPeriod;
  const periodTimes = calcPeriodTimes(startTime, periodsCount, periodDuration, breakAfterPeriod, breakDuration);
  const currentInfo = getCurrentPeriodInfo(now, periodTimes, breakAfterPeriod, breakDuration);
  const activePeriodIndex = currentInfo?.type === "period" ? currentInfo.index : null;
  const isBreakNow = currentInfo?.type === "break";

  const gridCols = `110px ${PERIODS.map((p) => (p === breakAfterPeriod && hasBreak ? "minmax(115px, 1fr) 48px" : "minmax(115px, 1fr)")).join(" ")}`;
  const minW = 110 + displayCount * 118 + (hasBreak ? 48 : 0);

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.04 } },
  };
  const item = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } };

  const selectedDaySlots = slots.filter((s) => s.dayOfWeek === selectedDay);

  // Group teachers from subjects for the bottom directory section
  const teachersMap = new Map<string, { name: string; phone?: string; subjects: string[]; rooms: string[]; colors: string[] }>();
  subjects.forEach((sub) => {
    if (sub.teacherName) {
      const key = sub.teacherName.trim();
      const existing = teachersMap.get(key) || {
        name: key,
        phone: (sub as any).teacherPhone,
        subjects: [],
        rooms: [],
        colors: [],
      };
      if (!existing.subjects.includes(sub.name)) existing.subjects.push(sub.name);
      if (sub.color && !existing.colors.includes(sub.color)) existing.colors.push(sub.color);
      
      const subRooms: string[] = Array.isArray(sub.rooms) ? sub.rooms : (sub.room ? [sub.room] : []);
      subRooms.forEach(r => {
        if (!existing.rooms.includes(r)) existing.rooms.push(r);
      });

      if ((sub as any).teacherPhone && !existing.phone) {
        existing.phone = (sub as any).teacherPhone;
      }
      teachersMap.set(key, existing);
    }
  });
  const teachersList = Array.from(teachersMap.values());

  return (
    <motion.div
      className="space-y-6"
      dir="rtl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader icon={Clock} title="الجدول الدراسي" subtitle="استعرض الحصص الدراسية الأسبوعية والقاعات والمعلمين">
          <div className="flex flex-wrap gap-2 items-center">
            {activePeriodIndex !== null && (
              <Badge className="gap-1.5 py-1 px-3 rounded-full bg-primary text-primary-foreground animate-pulse text-xs">
                <Radio className="h-3 w-3" />
                الحصة {activePeriodIndex + 1} الآن
              </Badge>
            )}
            {isBreakNow && (
              <Badge className="gap-1.5 py-1 px-3 rounded-full bg-amber-500 text-white animate-pulse text-xs">
                <Coffee className="h-3 w-3" />
                وقت الاستراحة
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5 py-1 px-3 rounded-full text-xs">
              <Clock className="h-3 w-3" />
              {periodsCount} حصص يومياً
            </Badge>
          </div>
        </PageHeader>

        {/* Action Buttons for Print & Smart Wallpaper */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => {
              setPrintModalTab("print");
              setIsPrintModalOpen(true);
            }}
            className="rounded-2xl gap-2 font-bold h-10 px-4 text-xs bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة وتصدير A4</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setPrintModalTab("wallpaper");
              setIsPrintModalOpen(true);
            }}
            className="rounded-2xl gap-2 font-bold h-10 px-4 text-xs border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-all"
          >
            <Monitor className="h-4 w-4 text-indigo-500" />
            <span>خلفية شاشة 16:9 (SVG / 4K)</span>
          </Button>
        </div>
      </div>

      {slots.length === 0 && (
        <Alert className="bg-muted/50 border-dashed">
          <Clock className="h-4 w-4" />
          <AlertTitle>الجدول فارغ</AlertTitle>
          <AlertDescription>لا توجد حصص مسجلة حالياً. يرجى من الإدارة إضافة الحصص للجدول.</AlertDescription>
        </Alert>
      )}

      {/* ── Mobile: Day-tab view ── */}
      <div className="lg:hidden space-y-3">
        {/* Day selector tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {DAYS.map((day) => {
            const isToday = day.id === todayDayId;
            const isSelected = day.id === selectedDay;
            const daySlotCount = slots.filter((s) => s.dayOfWeek === day.id).length;
            return (
              <motion.button
                key={day.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedDay(day.id)}
                className={`relative shrink-0 flex flex-col items-center gap-0.5 px-3.5 py-2.5 rounded-2xl border transition-all text-sm font-semibold ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card border-border/50 text-muted-foreground hover:border-primary/30"
                }`}
              >
                {isToday && !isSelected && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
                <span>{day.short}</span>
                <span className={`text-[10px] font-normal ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                  {daySlotCount} حصص
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Day header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base">{DAYS.find((d) => d.id === selectedDay)?.name}</h3>
            {selectedDay === todayDayId && (
              <Badge className="text-[10px] py-0.5 px-2 rounded-full bg-primary/15 text-primary border-0">اليوم</Badge>
            )}
          </div>
          <div className="flex gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedDay((d) => (d === 0 ? 4 : d - 1))}
              className="h-7 w-7 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/50"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedDay((d) => (d === 4 ? 0 : d + 1))}
              className="h-7 w-7 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/50"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Periods for selected day */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-2.5"
          >
            {PERIODS.map((period, pIdx) => {
              const slot = selectedDaySlots.find((s) => s.periodNumber === period);
              const isActive = activePeriodIndex === pIdx && selectedDay === todayDayId;
              const isBreakRow = period === breakAfterPeriod && hasBreak;
              const teacher = (slot as any)?.teacherName;
              const room = (slot as any)?.room;

              return (
                <div key={period} className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pIdx * 0.04 }}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "border-border/50 bg-card"
                    }`}
                  >
                    {/* Period number */}
                    <div
                      className={`shrink-0 h-10 w-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold ${
                        isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/70 text-muted-foreground"
                      }`}
                    >
                      <span>{period}</span>
                      {isActive && <span className="text-[7px] font-normal opacity-90">الآن</span>}
                    </div>

                    {/* Time */}
                    <div className="flex flex-col shrink-0 min-w-[54px] pt-1">
                      <span className="text-[11px] font-mono font-semibold text-foreground/80" dir="ltr">{periodTimes[pIdx]?.start}</span>
                      <span className="text-[10px] text-muted-foreground/60" dir="ltr">{periodTimes[pIdx]?.end}</span>
                    </div>

                    {/* Subject Card */}
                    <div className="flex-1 min-w-0">
                      {slot ? (
                        <div
                          className="px-3.5 py-2.5 rounded-xl border text-sm font-semibold shadow-xs space-y-1.5"
                          style={{
                            backgroundColor: `${slot.subjectColor}12`,
                            borderColor: `${slot.subjectColor}35`,
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-foreground">{slot.subjectName}</span>
                            {room && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-card/90 text-primary border border-border/50 shadow-2xs">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {room}
                              </span>
                            )}
                          </div>

                          {teacher && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="font-medium">{displayTeacherName(teacher)}</span>
                            </div>
                          )}

                          {slot.notes && (
                            <p className="text-[11px] font-normal text-muted-foreground/80 pt-0.5 border-t border-border/20">{slot.notes}</p>
                          )}
                        </div>
                      ) : (
                        <div className="h-10 rounded-xl border border-dashed border-muted-foreground/20 flex items-center justify-center">
                          <span className="text-xs text-muted-foreground/40">حصة فراغ</span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Break after this period */}
                  {isBreakRow && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: pIdx * 0.04 + 0.05 }}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${
                        isBreakNow && selectedDay === todayDayId
                          ? "border-amber-400/40 bg-amber-50/90 dark:bg-amber-900/20 shadow-xs"
                          : "border-amber-200/40 dark:border-amber-800/30 bg-amber-50/40 dark:bg-amber-900/10"
                      }`}
                    >
                      <Coffee className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                        استراحة — {breakDuration} دقيقة
                      </span>
                      {isBreakNow && selectedDay === todayDayId && (
                        <Badge className="text-[10px] py-0 px-2 rounded-full bg-amber-500 text-white border-0 animate-pulse mr-auto">الآن</Badge>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Desktop: Full weekly grid ── */}
      <div className="hidden lg:block">
        <div className="relative">
          <div className="overflow-x-auto pb-4 -mx-1 px-1">
            <div
              className="border border-border/50 rounded-2xl overflow-hidden bg-card shadow-sm"
              style={{ minWidth: `${minW}px` }}
            >
              {/* Header Row */}
              <div
                className="grid border-b border-border/50 bg-muted/40"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="p-3 text-center text-xs font-bold text-muted-foreground border-l border-border/30 flex items-center justify-center">
                  اليوم
                </div>
                {PERIODS.flatMap((p, idx) => {
                  const isActive = activePeriodIndex === idx;
                  const cells = [
                    <div
                      key={p}
                      className={`border-l border-border/30 flex flex-col items-center justify-center p-2.5 transition-colors ${
                        isActive ? "bg-primary/10 border-l-primary/40" : ""
                      }`}
                    >
                      <span className={`text-xs font-extrabold ${isActive ? "text-primary" : "text-foreground"}`}>
                        الحصة {p}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground mt-0.5" dir="ltr">
                        <span>{periodTimes[idx]?.start}</span>
                        <span>-</span>
                        <span>{periodTimes[idx]?.end}</span>
                      </div>
                      {isActive && (
                        <span className="mt-1 text-[9px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold animate-pulse">
                          الآن
                        </span>
                      )}
                    </div>,
                  ];
                  if (p === breakAfterPeriod && hasBreak) {
                    cells.push(
                      <div key="break-hdr" className="border-l border-amber-200/60 dark:border-amber-800/40 flex flex-col items-center justify-center bg-amber-50/60 dark:bg-amber-900/15 p-1">
                        <Coffee className="h-4 w-4 text-amber-500 mb-0.5" />
                        <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold" style={{ writingMode: "vertical-rl" }}>
                          استراحة
                        </span>
                      </div>
                    );
                  }
                  return cells;
                })}
              </div>

              {/* Day Rows */}
              <motion.div variants={container} initial="hidden" animate="show">
                {DAYS.map((day, dayIdx) => (
                  <div
                    key={day.id}
                    className={`grid border-b border-border/30 last:border-0 ${
                      dayIdx % 2 === 0 ? "" : "bg-muted/10"
                    }`}
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    <div className="p-3 font-bold flex items-center justify-center border-l border-border/30 bg-muted/15 text-sm">
                      {day.name}
                    </div>
                    {PERIODS.flatMap((period, pIdx) => {
                      const slot = slots.find(
                        (s) => s.dayOfWeek === day.id && s.periodNumber === period
                      );
                      const isActive = activePeriodIndex === pIdx && day.id === todayDayId;
                      const teacher = (slot as any)?.teacherName;
                      const room = (slot as any)?.room;

                      const cells = [
                        <div
                          key={period}
                          className={`border-l flex items-center justify-center min-h-[92px] p-1.5 transition-colors ${
                            isActive ? "bg-primary/8 border-l-primary/40 ring-1 ring-inset ring-primary/20" : "border-border/25"
                          }`}
                        >
                          {slot ? (
                            <motion.div
                              variants={item}
                              className="w-full h-full rounded-xl p-2 flex flex-col items-center justify-center text-center text-xs font-semibold leading-tight shadow-2xs border transition-all gap-0.5 group hover:shadow-xs"
                              style={{
                                backgroundColor: `${slot.subjectColor}14`,
                                color: slot.subjectColor,
                                borderColor: `${slot.subjectColor}35`,
                              }}
                            >
                              <span className="font-extrabold leading-tight text-xs text-foreground">{slot.subjectName}</span>
                              
                              {/* Teacher Name */}
                              {teacher && (
                                <span className="text-[10px] font-medium text-foreground/80 flex items-center gap-0.5 mt-0.5">
                                  <User className="h-2.5 w-2.5 text-primary shrink-0" />
                                  {displayTeacherName(teacher)}
                                </span>
                              )}

                              {/* Room badge */}
                              {room && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-card/90 text-foreground/90 border border-border/40 flex items-center gap-0.5 mt-0.5">
                                  <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                                  {room}
                                </span>
                              )}

                              {slot.notes && !room && (
                                <span className="text-[9px] opacity-70 mt-0.5 font-normal truncate max-w-full">{slot.notes}</span>
                              )}
                            </motion.div>
                          ) : (
                            <div className="w-full h-full rounded-xl border border-dashed border-muted-foreground/15 flex items-center justify-center">
                              <span className="text-[10px] text-muted-foreground/40">—</span>
                            </div>
                          )}
                        </div>,
                      ];
                      if (period === breakAfterPeriod && hasBreak) {
                        cells.push(
                          <div key={`break-${day.id}`} className="border-l border-amber-200/40 dark:border-amber-800/30 flex items-center justify-center bg-amber-50/40 dark:bg-amber-900/10 min-h-[92px]">
                            <Coffee className="h-3.5 w-3.5 text-amber-500" />
                          </div>
                        );
                      }
                      return cells;
                    })}
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1 mt-2">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            بداية اليوم: <span dir="ltr" className="font-mono font-semibold text-foreground">{startTime}</span>
            {" · "}
            مدة الحصة: {periodDuration} دقيقة
            {" · "}
            مدة الاستراحة: {breakDuration} دقيقة
          </span>
        </div>
      </div>

      {/* ── Teachers & Rooms Directory Section ── */}
      {teachersList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">دليل معلمي المواد والقاعات</h3>
                <p className="text-xs text-muted-foreground">أسماء المعلمين، أرقام التواصل، والقاعات المرتبطة بالمواد</p>
              </div>
            </div>

            <Link href="/teacher">
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs font-bold">
                <span>صفحة المعلمين والأسئلة</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {teachersList.map((t, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">{displayTeacherName(t.name)}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.subjects.join("، ")}</p>
                    </div>
                    <div className="flex gap-1">
                      {t.colors.slice(0, 3).map((col, i) => (
                        <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col }} />
                      ))}
                    </div>
                  </div>

                  {t.rooms.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium bg-card p-2 rounded-xl border border-border/40">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>القاعات: <strong>{t.rooms.join(" · ")}</strong></span>
                    </div>
                  )}
                </div>

                {t.phone ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                    <a
                      href={`https://wa.me/${t.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      واتساب
                    </a>
                    <a
                      href={`tel:${t.phone}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-card border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground/60 italic pt-1">لا يتوفر رقم هاتف مسجل</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Occasions Section ── */}
      {events.length > 0 && (() => {
        const activeToday = events.filter(ev => isEventActive(ev, todayStr));
        const upcoming = events
          .filter(ev => ev.date > todayStr)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 5);

        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-bold text-sm">المناسبات</h3>
            </div>

            {activeToday.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">اليوم</p>
                {activeToday.map(ev => {
                  const Icon = EVENT_TYPE_ICONS[ev.type || "other"] ?? Sun;
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl border text-sm font-semibold"
                      style={{
                        backgroundColor: `${ev.color || "#6366f1"}15`,
                        borderColor: `${ev.color || "#6366f1"}35`,
                        color: ev.color || "#6366f1",
                      }}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{ev.title}</span>
                      <span className="text-[10px] font-normal opacity-70">
                        {EVENT_TYPE_LABELS[ev.type || "other"]}
                      </span>
                      {ev.endDate && ev.endDate !== ev.date && (
                        <Badge variant="outline" className="text-[10px] py-0 border-current/40 shrink-0">
                          حتى {ev.endDate}
                        </Badge>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">قادمة</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map(ev => {
                    const Icon = EVENT_TYPE_ICONS[ev.type || "other"] ?? Sun;
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-card text-xs"
                      >
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${ev.color || "#6366f1"}20`, color: ev.color || "#6366f1" }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{ev.title}</p>
                          <p className="text-muted-foreground text-[10px]">{ev.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Schedule Print & Smart Screen Wallpaper Dialog */}
      <SchedulePrintExportDialog
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        slots={slots}
        subjects={subjects}
        config={config}
        initialTab={printModalTab}
        defaultSchoolName={
          settingsData?.showSchoolName !== false && settingsData?.schoolName?.trim()
            ? settingsData.schoolName.trim()
            : "مدرسة الجش الثانوية"
        }
      />
    </motion.div>
  );
}
