import { useMemo, useEffect, useState } from "react";
import { useListSchedule, useGetScheduleConfig } from "@workspace/api-client-react";
import { GraduationCap, Coffee, Sparkles, CheckCircle2, Clock, CalendarClock } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

function useLiveMins() {
  const [nowMinsLive, setNowMinsLive] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMinsLive(n.getHours() * 60 + n.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return nowMinsLive;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function timeToMins(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const JS_DAY_TO_SCHOOL: Record<number, number | null> = {
  0: 0, // Sunday
  1: 1, // Monday
  2: 2, // Tuesday
  3: 3, // Wednesday
  4: 4, // Thursday
  5: null, // Friday - weekend
  6: null, // Saturday - weekend
};

const JS_DAY_NAMES: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
};

function getNextSchoolDay(jsDay: number): { jsDay: number; daysAhead: number } {
  let ahead = 1;
  let next = (jsDay + 1) % 7;
  while (JS_DAY_TO_SCHOOL[next] === null) {
    ahead++;
    next = (next + 1) % 7;
  }
  return { jsDay: next, daysAhead: ahead };
}

const PERIOD_LABEL = ["ح١", "ح٢", "ح٣", "ح٤", "ح٥", "ح٦", "ح٧", "ح٨"];

export function TodayScheduleCard() {
  const { data: slots = [] } = useListSchedule();
  const { data: config } = useGetScheduleConfig();
  const nowMinsLive = useLiveMins();

  const now = new Date();
  const jsDay = now.getDay();
  const schoolDay = JS_DAY_TO_SCHOOL[jsDay];
  const nowMins = nowMinsLive;

  const periodsCount = config?.periodsCount ?? 7;
  const breakAfterPeriod = config?.breakAfterPeriod ?? 3;
  const periodDuration = config?.periodDuration ?? 45;
  const breakDuration = config?.breakDuration ?? 20;
  const startTime = config?.startTime ?? "07:00";

  const periodTimes = useMemo(() => {
    const times: { start: string; end: string }[] = [];
    let cursor = startTime;
    for (let i = 1; i <= periodsCount; i++) {
      const start = cursor;
      const end = addMinutes(cursor, periodDuration);
      times.push({ start, end });
      cursor = end;
      if (i === breakAfterPeriod) cursor = addMinutes(cursor, breakDuration);
    }
    return times;
  }, [startTime, periodsCount, periodDuration, breakAfterPeriod, breakDuration]);

  // After school day ends → show next school day's schedule
  const allDone =
    schoolDay !== null &&
    periodTimes.length > 0 &&
    nowMins >= timeToMins(periodTimes[periodTimes.length - 1].end);

  const { nextJsDay, nextSchoolDay, nextLabel } = useMemo(() => {
    if (!allDone && schoolDay !== null) return { nextJsDay: null, nextSchoolDay: null, nextLabel: "" };
    const baseJsDay = schoolDay !== null ? jsDay : jsDay; // always compute from current day
    const { jsDay: nJsDay } = getNextSchoolDay(allDone ? jsDay : jsDay);
    const nSchoolDay = JS_DAY_TO_SCHOOL[nJsDay] as number;
    const isGhadan = (() => {
      // "غداً" if daysAhead === 1 (tomorrow is a school day)
      const { daysAhead } = getNextSchoolDay(jsDay);
      return daysAhead === 1;
    })();
    return {
      nextJsDay: nJsDay,
      nextSchoolDay: nSchoolDay,
      nextLabel: isGhadan ? `غداً — ${JS_DAY_NAMES[nJsDay]}` : `يوم ${JS_DAY_NAMES[nJsDay]}`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, jsDay, schoolDay]);

  if (schoolDay === null) {
    // Weekend — show next school day
    const { jsDay: nJsDay, daysAhead } = getNextSchoolDay(jsDay);
    const nSchoolDay = JS_DAY_TO_SCHOOL[nJsDay] as number;
    const nextDaySlots = slots.filter((s) => s.dayOfWeek === nSchoolDay);
    const maxUsedPeriod = nextDaySlots.length > 0 ? Math.max(...nextDaySlots.map((s) => s.periodNumber)) : periodsCount;
    const displayCount = Math.min(periodsCount, maxUsedPeriod);
    const PERIODS = Array.from({ length: displayCount }, (_, i) => i + 1);
    const label = daysAhead === 1 ? `غداً — ${JS_DAY_NAMES[nJsDay]}` : `يوم ${JS_DAY_NAMES[nJsDay]}`;

    return (
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50/60 dark:bg-amber-900/15 border-b border-amber-200/50 dark:border-amber-800/40">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">نهاية الأسبوع</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-semibold">
              حصص {label}
            </span>
          </div>
          <Link href="/schedule">
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg px-2 text-primary hover:bg-primary/5">عرض كامل</Button>
          </Link>
        </div>
        <PeriodsGrid slots={nextDaySlots} PERIODS={PERIODS} periodTimes={periodTimes} breakAfterPeriod={breakAfterPeriod} activePeriodIdx={-1} nowMins={-1} allDone={false} />
      </div>
    );
  }

  const todaySlots = slots.filter((s) => s.dayOfWeek === schoolDay);

  const maxUsedPeriod = todaySlots.length > 0 ? Math.max(...todaySlots.map((s) => s.periodNumber)) : periodsCount;
  const displayCount = Math.min(periodsCount, maxUsedPeriod);
  const PERIODS = Array.from({ length: displayCount }, (_, i) => i + 1);

  const activePeriodIdx = periodTimes.findIndex(({ start, end }) => {
    const s = timeToMins(start);
    const e = timeToMins(end);
    return nowMins >= s && nowMins < e;
  });

  const isBreakNow = (() => {
    if (activePeriodIdx !== -1) return false;
    const breakStart = timeToMins(periodTimes[breakAfterPeriod - 1]?.end ?? "99:99");
    return nowMins >= breakStart && nowMins < breakStart + breakDuration;
  })();

  const notStarted = periodTimes.length > 0 && nowMins < timeToMins(periodTimes[0].start);

  // Slots to display: today's or (if done) next school day's
  const displaySlots = allDone && nextSchoolDay !== null
    ? slots.filter((s) => s.dayOfWeek === nextSchoolDay)
    : todaySlots;

  const displayPeriods = (() => {
    if (allDone && nextSchoolDay !== null) {
      const max = displaySlots.length > 0 ? Math.max(...displaySlots.map((s) => s.periodNumber)) : periodsCount;
      return Array.from({ length: Math.min(periodsCount, max) }, (_, i) => i + 1);
    }
    return PERIODS;
  })();

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <div className={`flex items-center justify-between px-4 py-3 border-b border-border/40 ${allDone ? "bg-indigo-50/50 dark:bg-indigo-900/15" : "bg-muted/30"}`}>
        <div className="flex items-center gap-2">
          {allDone ? (
            <CalendarClock className="h-4 w-4 text-indigo-500" />
          ) : (
            <GraduationCap className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-bold">
            {allDone ? `حصص ${nextLabel}` : "حصصك اليوم"}
          </span>
          {!allDone && isBreakNow && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
              <Coffee className="h-3 w-3" /> وقت الاستراحة
            </span>
          )}
          {!allDone && activePeriodIdx !== -1 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold animate-pulse">
              الحصة {activePeriodIdx + 1} الآن
            </span>
          )}
          {allDone && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> انتهى اليوم
            </span>
          )}
        </div>
        <Link href="/schedule">
          <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg px-2 text-primary hover:bg-primary/5">
            عرض كامل
          </Button>
        </Link>
      </div>

      <PeriodsGrid
        slots={displaySlots}
        PERIODS={displayPeriods}
        periodTimes={periodTimes}
        breakAfterPeriod={breakAfterPeriod}
        activePeriodIdx={allDone ? -1 : activePeriodIdx}
        nowMins={allDone ? -1 : nowMins}
        allDone={allDone}
      />

      {!allDone && (notStarted) && (
        <div className="px-4 py-2 text-[11px] text-muted-foreground border-t border-border/30 text-center">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {`تبدأ الدراسة الساعة ${periodTimes[0]?.start}`}
            {periodTimes[0] && (() => {
              const startMins = timeToMins(periodTimes[0].start);
              const diff = startMins - nowMins;
              if (diff > 0 && diff <= 120) return <span className="font-semibold text-primary/80"> — بعد {diff} دقيقة</span>;
              return null;
            })()}
          </span>
        </div>
      )}
      {!allDone && !notStarted && activePeriodIdx !== -1 && periodTimes[activePeriodIdx] && (() => {
        const endMins = timeToMins(periodTimes[activePeriodIdx].end);
        const remaining = endMins - nowMins;
        if (remaining <= 0) return null;
        return (
          <div className="px-4 py-2 text-[11px] border-t border-primary/15 text-center bg-primary/4">
            <span className="inline-flex items-center gap-1.5 text-primary font-semibold">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              تنتهي الحصة خلال {remaining} دقيقة
            </span>
          </div>
        );
      })()}
      {!allDone && !notStarted && activePeriodIdx === -1 && !isBreakNow && (() => {
        const nextPeriodIdx = periodTimes.findIndex(({ start }) => timeToMins(start) > nowMins);
        if (nextPeriodIdx === -1) return null;
        const diff = timeToMins(periodTimes[nextPeriodIdx].start) - nowMins;
        if (diff <= 0 || diff > 60) return null;
        return (
          <div className="px-4 py-2 text-[11px] border-t border-border/30 text-center">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              الحصة {nextPeriodIdx + 1} تبدأ بعد <span className="font-semibold text-foreground">{diff} دقيقة</span>
            </span>
          </div>
        );
      })()}

      {allDone && (
        <div className="px-4 py-2 text-[11px] border-t border-indigo-200/40 dark:border-indigo-800/30 text-center text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/10">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            انتهت حصص اليوم — هذه حصص {nextLabel}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Shared periods grid ── */
interface PeriodsGridProps {
  slots: { dayOfWeek: number; periodNumber: number; subjectName: string; subjectColor: string }[];
  PERIODS: number[];
  periodTimes: { start: string; end: string }[];
  breakAfterPeriod: number;
  activePeriodIdx: number;
  nowMins: number;
  allDone: boolean;
}

function PeriodsGrid({ slots, PERIODS, periodTimes, breakAfterPeriod, activePeriodIdx, nowMins, allDone }: PeriodsGridProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0 min-w-max">
        {PERIODS.map((period, idx) => {
          const slot = slots.find((s) => s.periodNumber === period);
          const isActive = activePeriodIdx === idx;
          const isPast = !allDone && periodTimes[idx] && nowMins >= timeToMins(periodTimes[idx].end);
          const isBreakAfter = period === breakAfterPeriod;

          return (
            <div key={period} className="flex">
              <div
                className={`relative flex flex-col items-center justify-between p-2.5 w-[88px] border-l last:border-0 border-border/20 transition-colors ${
                  isActive
                    ? "bg-primary/8"
                    : isPast
                    ? "opacity-45"
                    : ""
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-primary rounded-b" />
                )}
                <div className="flex flex-col items-center gap-1 w-full">
                  <span
                    className={`text-[10px] font-bold ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {PERIOD_LABEL[idx] ?? `ح${period}`}
                  </span>
                  <span className="text-[9px] text-muted-foreground/70 font-mono" dir="ltr">
                    {periodTimes[idx]?.start}
                  </span>
                </div>

                <div className="w-full mt-1.5">
                  {slot ? (
                    <div
                      className="rounded-lg px-1.5 py-1.5 text-center text-[10px] font-bold leading-tight border"
                      style={{
                        backgroundColor: `${slot.subjectColor}18`,
                        color: slot.subjectColor,
                        borderColor: `${slot.subjectColor}40`,
                      }}
                    >
                      {slot.subjectName}
                    </div>
                  ) : (
                    <div className="rounded-lg px-1.5 py-1.5 text-center text-[10px] text-muted-foreground/40 border border-dashed border-muted-foreground/20">
                      فارغة
                    </div>
                  )}
                </div>
              </div>

              {isBreakAfter && (
                <div className="flex flex-col items-center justify-center w-10 bg-amber-50/60 dark:bg-amber-900/15 border-l border-amber-200/50 dark:border-amber-800/40">
                  <Coffee className="h-3 w-3 text-amber-500 mb-0.5" />
                  <span className="text-[8px] text-amber-500 font-semibold" style={{ writingMode: "vertical-rl" }}>
                    استراحة
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
