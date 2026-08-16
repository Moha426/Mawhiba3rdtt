import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListAssignments,
  useListSubjects,
  Assignment,
} from "@workspace/api-client-react";
import { AssignmentCard } from "@/components/assignment-card";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-state";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Search,
  X,
  ArrowUpDown,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertTriangle,
  Filter,
  Send,
} from "lucide-react";
import { useCompletions } from "@/hooks/use-completions";
import { useAuth } from "@/lib/auth";
import { parseISO, isPast, isToday } from "date-fns";

type SortKey = "auto" | "due-asc" | "due-desc" | "priority" | "newest";

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 0, high: 1, medium: 2, normal: 3, low: 4 };

// Lower score = higher in the list
// Type urgency: exam (0) > project (1) > homework (2) > class_activity (3) > reading (4) > other (5)
const TYPE_URGENCY: Record<string, number> = {
  exam: 0, project: 1, homework: 2, class_activity: 3, reading: 4, other: 5,
};

function safeGetTime(dateStr?: string | null): number {
  if (!dateStr) return 0;
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
}

function autoScore(a: Assignment): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueTime = safeGetTime(a.dueDate);
  if (!dueTime) return 999999;
  const due = new Date(dueTime);
  due.setHours(0, 0, 0, 0);
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const typeW = TYPE_URGENCY[a.type] ?? 5;
  const priorityW = PRIORITY_WEIGHT[a.priority] ?? 3;

  if (daysUntilDue < 0) {
    return -1000 + daysUntilDue * 10 + typeW + priorityW;
  }
  return daysUntilDue * 100 + typeW * 10 + priorityW;
}

function sortAssignments(list: Assignment[], key: SortKey): Assignment[] {
  const copy = [...list];
  switch (key) {
    case "auto":
      return copy.sort((a, b) => autoScore(a) - autoScore(b));
    case "due-asc":
      return copy.sort((a, b) => safeGetTime(a.dueDate) - safeGetTime(b.dueDate));
    case "due-desc":
      return copy.sort((a, b) => safeGetTime(b.dueDate) - safeGetTime(a.dueDate));
    case "priority":
      return copy.sort((a, b) => (PRIORITY_WEIGHT[a.priority] ?? 9) - (PRIORITY_WEIGHT[b.priority] ?? 9));
    case "newest":
      return copy.sort((a, b) => safeGetTime(b.assignedDate) - safeGetTime(a.assignedDate));
    default:
      return copy;
  }
}

const SORT_LABELS: Record<SortKey, string> = {
  "auto": "تلقائي ✦",
  "due-asc": "أقرب تسليماً",
  "due-desc": "أبعد تسليماً",
  "priority": "الأهمية",
  "newest": "الأحدث",
};

const TYPE_OPTIONS = [
  { value: "__all__", label: "كل الأنواع" },
  ...Object.entries(ASSIGNMENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })),
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

export default function Assignments() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>("__all__");
  const [sortKey, setSortKey] = useState<SortKey>("auto");
  const [hideCompleted, setHideCompleted] = useState(false);

  const { completedIds, toggle } = useCompletions();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams: Record<string, any> = {};
  if (selectedSubject != null) queryParams.subjectId = selectedSubject;
  if (selectedType !== "__all__") queryParams.type = selectedType;
  if (debouncedSearch) queryParams.search = debouncedSearch;

  const { data: assignments, isLoading } = useListAssignments(queryParams, {
    query: { enabled: true, queryKey: ["assignments", queryParams] },
  });
  const { data: subjects } = useListSubjects();

  const stats = useMemo(() => {
    if (!assignments) return { total: 0, overdue: 0 };
    const overdue = assignments.filter(a => {
      if (completedIds.includes(a.id)) return false;
      const d = parseISO(a.dueDate);
      return isPast(d) && !isToday(d);
    }).length;
    return { total: assignments.length, overdue };
  }, [assignments, completedIds]);

  const displayed = useMemo(() => {
    if (!assignments) return [];
    const list = hideCompleted
      ? assignments.filter(a => !completedIds.includes(a.id))
      : assignments;
    return sortAssignments(list, sortKey);
  }, [assignments, hideCompleted, completedIds, sortKey]);

  const hasFilters = selectedSubject != null || selectedType !== "__all__" || search;

  const clearFilters = () => {
    setSelectedSubject(null);
    setSelectedType("__all__");
    setSearch("");
    setDebouncedSearch("");
  };

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader icon={BookOpen} title="جميع المهام" subtitle="استعرض كافة الواجبات والمشاريع والاختبارات والملفات" />
      </div>

      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="ابحث عن مهمة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-11 pr-10 pl-10 rounded-2xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          dir="rtl"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Subject chips ── */}
      {subjects && subjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          <button
            onClick={() => setSelectedSubject(null)}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              selectedSubject === null
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            الكل
          </button>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSubject(selectedSubject === s.id ? null : s.id)}
              className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all"
              style={
                selectedSubject === s.id
                  ? { backgroundColor: s.color, color: "#fff", borderColor: s.color }
                  : { backgroundColor: `${s.color}12`, color: s.color, borderColor: `${s.color}30` }
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Type + Sort row ── */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1 overflow-x-auto pb-0.5 scrollbar-hide">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedType(opt.value)}
              className={`shrink-0 px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
                selectedType === opt.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <Select value={sortKey} onValueChange={v => setSortKey(v as SortKey)}>
          <SelectTrigger className="h-8 w-auto gap-1.5 text-xs rounded-xl border-border/60 shrink-0 px-3">
            <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl" align="end">
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{displayed.length}</span> نتيجة
          {stats.overdue > 0 && (
            <span className="flex items-center gap-1 text-rose-500 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              {stats.overdue} متأخرة
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1 text-muted-foreground rounded-xl">
              <X className="h-3 w-3" />
              مسح الفلاتر
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHideCompleted(v => !v)}
            className="h-7 text-xs gap-1.5 rounded-xl border-border/60"
          >
            {hideCompleted ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {hideCompleted ? "عرض الكل" : "إخفاء المنجزة"}
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <LoadingPage />
      ) : (
        <AnimatePresence mode="wait">
          {displayed.length > 0 ? (
            <motion.div
              key="list"
              className="columns-1 md:columns-2 lg:columns-3 gap-3"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              {displayed.map(a => (
                <div key={a.id} className="break-inside-avoid mb-3">
                  <AssignmentCard
                    assignment={a}
                    completedIds={completedIds}
                    onToggleComplete={toggle}
                  />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border/50 bg-muted/20 text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                <Filter className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">لا توجد نتائج</p>
              <p className="text-sm text-muted-foreground/60 mt-0.5">
                {hasFilters ? "جرب تغيير معايير البحث" : "لم تُضف أي مهام بعد"}
              </p>
              {hasFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4 text-xs rounded-xl">
                  مسح الفلاتر
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
