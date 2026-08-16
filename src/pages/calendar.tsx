import { useMemo, useState, useRef, useEffect } from "react";
import { useListAssignments, useListEvents, useListQuizzes, Assignment, Event, QuizSummary } from "@workspace/api-client-react";
import { AssignmentCard } from "@/components/assignment-card";
import { MiniMonthCalendar } from "@/components/mini-month-calendar";
import { LoadingPage } from "@/components/loading-state";
import {
  format,
  parseISO,
  isPast,
  isToday,
  isTomorrow,
  addMonths,
  subMonths,
  startOfMonth,
  eachDayOfInterval,
  isBefore,
  isAfter,
} from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarDays, ChevronRight, ChevronLeft, Palmtree, Star, Flag, Cake, Sun, ClipboardCheck, Clock, Send, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCompletions } from "@/hooks/use-completions";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import { formatHijriDate } from "@/lib/utils";

const EVENT_TYPE_ICONS: Record<string, any> = {
  holiday: Palmtree,
  event: Star,
  exam_period: Flag,
  ceremony: Cake,
  other: Sun,
};

export default function CalendarPage() {
  const { data: assignments = [], isLoading: loadingA } = useListAssignments(
    {},
    { query: { enabled: true, queryKey: ["assignments-calendar"] } }
  );
  const { data: events = [], isLoading: loadingE } = useListEvents({});
  const { data: quizzes = [], isLoading: loadingQ } = useListQuizzes({});
  const { completedIds, toggle } = useCompletions();
  const { isSignedIn } = useAuth();

  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Expand multi-day events into per-day entries for the calendar dots
  const expandedEvents = useMemo(() => {
    const result: { date: string; event: Event }[] = [];
    for (const ev of events) {
      if (!ev.endDate || ev.endDate === ev.date) {
        result.push({ date: ev.date, event: ev });
      } else {
        try {
          const days = eachDayOfInterval({ start: parseISO(ev.date), end: parseISO(ev.endDate) });
          for (const d of days) {
            result.push({ date: format(d, "yyyy-MM-dd"), event: ev });
          }
        } catch {
          result.push({ date: ev.date, event: ev });
        }
      }
    }
    return result;
  }, [events]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const { date, event } of expandedEvents) {
      if (!map[date]) map[date] = [];
      if (!map[date].some((e) => e.id === event.id)) map[date].push(event);
    }
    return map;
  }, [expandedEvents]);

  // Quizzes with a startDate
  const quizzesByDate = useMemo(() => {
    const map: Record<string, QuizSummary[]> = {};
    for (const q of quizzes) {
      if (!q.startDate) continue;
      const date = q.startDate.split("T")[0];
      if (!map[date]) map[date] = [];
      map[date].push(q);
    }
    return map;
  }, [quizzes]);

  // Build unified date groups: assignments + events + quizzes on same timeline
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const a of assignments) if (a.dueDate) dateSet.add(a.dueDate.split("T")[0]);
    for (const { date } of expandedEvents) if (date) dateSet.add(date);
    for (const q of quizzes) if (q.startDate) dateSet.add(q.startDate.split("T")[0]);
    return [...dateSet].sort();
  }, [assignments, expandedEvents, quizzes]);

  const groups = useMemo(() => {
    const rawGroups = allDates.map((dateStr) => {
      const dateObj = parseISO(dateStr);
      const hijri = formatHijriDate(dateObj);
      let label = format(dateObj, "EEEE، d MMMM", { locale: ar });
      if (hijri) label += ` • ${hijri}`;
      if (isToday(dateObj)) label = `اليوم (${label})`;
      else if (isTomorrow(dateObj)) label = `غداً (${label})`;
      const past = isPast(dateObj) && !isToday(dateObj);
      const dayAssignments = assignments.filter((a) => a.dueDate && a.dueDate.split("T")[0] === dateStr);
      const dayEvents = eventsByDate[dateStr] ?? [];
      const dayQuizzes = quizzesByDate[dateStr] ?? [];
      return { date: dateStr, label, past, assignments: dayAssignments, events: dayEvents, quizzes: dayQuizzes };
    });

    // Consolidate consecutive days with same single event and no assignments/quizzes
    const consolidated: typeof rawGroups = [];
    for (let i = 0; i < rawGroups.length; i++) {
      const current = rawGroups[i];
      if (current.events.length === 1 && current.assignments.length === 0 && current.quizzes.length === 0) {
        const eventId = current.events[0].id;
        let j = i + 1;
        while (j < rawGroups.length) {
          const next = rawGroups[j];
          if (next.events.length === 1 && next.events[0].id === eventId && next.assignments.length === 0 && next.quizzes.length === 0) {
            j++;
          } else {
            break;
          }
        }
        if (j > i + 1) {
          // Merge
          const endDate = rawGroups[j - 1].date;
          consolidated.push({
            ...current,
            label: `فترة: ${current.label} ← ${rawGroups[j - 1].label.split(" • ")[0]}`,
            isPeriod: true,
            endDate: endDate
          });
          i = j - 1;
          continue;
        }
      }
      consolidated.push(current);
    }
    return consolidated;
  }, [allDates, assignments, eventsByDate, quizzesByDate]);

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setTimeout(() => {
      groupRefs.current[date]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  useEffect(() => {
    if (!selectedDate) return;
    const timer = setTimeout(() => setSelectedDate(null), 2000);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  const isLoading = loadingA || loadingE || loadingQ;
  if (isLoading) return <LoadingPage />;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader icon={CalendarDays} title="التقويم الزمني" subtitle="تتبع مهامك القادمة والإجازات والمناسبات" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Mini calendar + legend */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <MiniMonthCalendar
            assignments={assignments}
            events={events}
            month={month}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
          />
          {/* Legend */}
          <div className="flex flex-col gap-1.5 px-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" /><span>عاجل</span></div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" /><span>متوسط الأهمية</span></div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary shrink-0" /><span>عادي</span></div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" /><span>إجازة / مناسبة</span></div>
          </div>
          {/* Summary */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-1.5 text-xs">
            <p className="font-semibold text-foreground">الملخص</p>
            <div className="flex justify-between"><span className="text-muted-foreground">إجمالي المهام</span><span className="font-bold">{assignments.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">إجازات ومناسبات</span><span className="font-bold text-emerald-600">{events.length}</span></div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">فات موعدها</span>
              <span className="font-bold text-rose-500">
                {groups.filter((g) => g.past).reduce((s, g) => s + g.assignments.length, 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">هذا الأسبوع</span>
              <span className="font-bold text-primary">
                {assignments.filter((a) => {
                  const d = parseISO(a.dueDate);
                  const now = new Date();
                  const diff = (d.getTime() - now.setHours(0, 0, 0, 0)) / 86400000;
                  return diff >= 0 && diff <= 7;
                }).length}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative border-r-2 border-muted pr-6 mr-2 space-y-10 pb-12">
          {groups.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد مهام أو مناسبات حالياً.</p>
            </div>
          )}
          {groups.map((group) => (
            <div
              key={group.date}
              ref={(el) => { groupRefs.current[group.date] = el; }}
              className="relative scroll-mt-6"
            >
              <div
                className={`absolute -right-8 top-1 h-4 w-4 rounded-full border-4 border-background transition-all duration-300 ${
                  selectedDate === group.date
                    ? "bg-primary scale-125 ring-4 ring-primary/30"
                    : group.events.length > 0 && group.assignments.length === 0
                    ? "bg-emerald-500"
                    : group.past
                    ? "bg-muted-foreground/40"
                    : "bg-primary"
                }`}
              />
              <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 flex-wrap ${(group as any).past ? "text-muted-foreground" : "text-foreground"}`}>
                {(group as any).isPeriod ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Layers className="h-5 w-5" />
                    <span>{group.label}</span>
                  </div>
                ) : (
                  group.label
                )}
                {(group as any).past && <Badge variant="secondary" className="text-xs rounded-full">فات موعدها</Badge>}
                {group.assignments.length > 0 && (
                  <Badge variant="outline" className="text-xs rounded-full bg-card">
                    {group.assignments.length} {group.assignments.length === 1 ? "مهمة" : "مهام"}
                  </Badge>
                )}
                {group.events.length > 0 && (
                  <Badge variant="outline" className="text-xs rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                    {group.events.map((e) => e.title).join("، ")}
                  </Badge>
                )}
              </h2>

              {/* Event banners */}
              {group.events.map((ev) => {
                const Icon = EVENT_TYPE_ICONS[ev.type] ?? Sun;
                return (
                  <div
                    key={`ev-${ev.id}`}
                    className="mb-3 rounded-xl border p-3 flex items-center gap-3"
                    style={{ borderColor: ev.color + "60", backgroundColor: ev.color + "0e" }}
                  >
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: ev.color + "25" }}>
                      <Icon className="h-4 w-4" style={{ color: ev.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: ev.color }}>{ev.title}</p>
                      {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                    </div>
                  </div>
                );
              })}

              {/* Quiz banners */}
              {group.quizzes.map((qz) => (
                <div
                  key={`qz-${qz.id}`}
                  className="mb-3 rounded-xl border p-3 flex items-center gap-3"
                  style={{ borderColor: qz.subjectColor + "60", backgroundColor: qz.subjectColor + "0e" }}
                >
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: qz.subjectColor + "25" }}>
                    <ClipboardCheck className="h-4 w-4" style={{ color: qz.subjectColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: qz.subjectColor }}>{qz.title}</p>
                      <Badge className="text-[10px] rounded-full px-1.5 py-0 h-4 border-0" style={{ backgroundColor: qz.subjectColor + "25", color: qz.subjectColor }}>
                        اختبار
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{qz.subjectName} · {qz.questionCount} سؤال{qz.timeLimit ? ` · ${qz.timeLimit} دقيقة` : ""}</p>
                  </div>
                </div>
              ))}

              {/* Assignment cards */}
              {group.assignments.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {group.assignments.map((assignment) => (
                    <div key={assignment.id} className={group.past ? "opacity-60 grayscale-[0.4]" : ""}>
                      <AssignmentCard
                        assignment={assignment}
                        completedIds={isSignedIn ? completedIds : []}
                        onToggleComplete={isSignedIn ? toggle : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
