import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  parseISO,
  isToday,
} from "date-fns";
import { ar } from "date-fns/locale";
import { Assignment, Event } from "@workspace/api-client-react";

interface MiniMonthCalendarProps {
  assignments: Assignment[];
  events?: Event[];
  month: Date;
  onDayClick?: (date: string) => void;
  selectedDate?: string | null;
}

const WEEKDAYS = ["أح", "إث", "ثل", "أر", "خم", "جم", "سب"];

export function MiniMonthCalendar({
  assignments,
  events = [],
  month,
  onDayClick,
  selectedDate,
}: MiniMonthCalendarProps) {
  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    for (const a of assignments) {
      const key = a.dueDate.split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [assignments]);

  // Build set of event dates (including multi-day ranges)
  const eventDateMap = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const ev of events) {
      const start = ev.date;
      const end = ev.endDate ?? ev.date;
      let cur = start;
      while (cur <= end) {
        if (!map[cur]) map[cur] = [];
        map[cur].push(ev);
        const d = new Date(cur);
        d.setDate(d.getDate() + 1);
        cur = format(d, "yyyy-MM-dd");
      }
    }
    return map;
  }, [events]);

  const firstDayOffset = getDay(days[0]);

  const getDotColor = (dayAssignments: Assignment[]) => {
    if (dayAssignments.some((a) => a.priority === "urgent")) return "bg-rose-500";
    if (dayAssignments.some((a) => a.priority === "medium")) return "bg-amber-500";
    return "bg-primary";
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 bg-muted/30">
        <h3 className="text-sm font-bold text-center">
          {format(month, "MMMM yyyy", { locale: ar })}
        </h3>
      </div>
      <div className="p-3">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAssignments = assignmentsByDate[key] ?? [];
            const dayEvents = eventDateMap[key] ?? [];
            const hasAssignments = dayAssignments.length > 0;
            const hasEvents = dayEvents.length > 0;
            const today = isToday(day);
            const isSelected = selectedDate === key;
            const isHoliday = dayEvents.some((e) => e.type === "holiday");

            return (
              <button
                key={key}
                onClick={() => onDayClick?.(key)}
                className={`relative flex flex-col items-center justify-center py-1 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground scale-110"
                    : today
                    ? "bg-primary/15 text-primary font-bold"
                    : isHoliday
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : hasAssignments
                    ? "hover:bg-muted/60"
                    : "hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <span>{format(day, "d")}</span>
                <div className="flex gap-0.5 mt-0.5 h-1.5">
                  {hasAssignments && (
                    <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : getDotColor(dayAssignments)}`} />
                  )}
                  {hasEvents && !isSelected && (
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: dayEvents[0].color }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
