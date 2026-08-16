import { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO, differenceInCalendarDays, isPast, isToday } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Calendar, Clock, Link as LinkIcon, Check, Flame, AlertTriangle,
  Download, ChevronDown, Folder, ListChecks, CalendarDays, ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Assignment } from "@workspace/api-client-react";
import { ASSIGNMENT_TYPE_LABELS, ASSIGNMENT_PRIORITY_LABELS, PRIORITY_COLORS, TYPE_COLORS } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { NotesPanel } from "@/components/notes-panel";
import { formatHijriDate } from "@/lib/utils";

/* ─── Checklist state (localStorage) ─── */
function useChecklistState(key: string, total: number) {
  const [checked, setChecked] = useState<boolean[]>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const arr = JSON.parse(stored) as boolean[];
        if (arr.length === total) return arr;
      }
    } catch {}
    return new Array(total).fill(false);
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(checked)); } catch {}
  }, [key, checked]);

  const toggle = useCallback((idx: number) => {
    setChecked(prev => prev.map((v, i) => i === idx ? !v : v));
  }, []);

  return { checked, toggle };
}

interface AssignmentCardProps {
  assignment: Assignment;
  completedIds?: number[];
  onToggleComplete?: (id: number, currentCompleted: boolean) => void;
}

interface AttachmentInfo {
  url: string;
  label: string;
  category?: string;
  isFile: boolean;
}

function parseAttachment(raw: any): AttachmentInfo {
  if (!raw) {
    return { url: "#", label: "مرفق", isFile: false };
  }

  if (typeof raw === "object") {
    const url = raw.url || "#";
    const isFile = typeof url === "string" && url.startsWith("/api/storage");
    const label = raw.label || (typeof url === "string" && url !== "#" ? decodeURIComponent(url.split("/").pop() || "ملف") : "مرفق");
    return {
      url,
      label,
      category: raw.category,
      isFile,
    };
  }

  const rawStr = String(raw);
  if (rawStr.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawStr) as { url?: string; label?: string; category?: string };
      const url = parsed.url || "#";
      const isFile = typeof url === "string" && url.startsWith("/api/storage");
      const defaultLabel = isFile
        ? decodeURIComponent((url.split("/").pop() || "ملف"))
        : (() => {
            try {
              return url !== "#" ? new URL(url).hostname.replace(/^www\./, "") : "رابط";
            } catch {
              return "رابط";
            }
          })();
      return {
        url,
        label: parsed.label || defaultLabel,
        category: parsed.category,
        isFile,
      };
    } catch {
      return { url: rawStr, label: "رابط", isFile: false };
    }
  }

  if (rawStr.startsWith("/api/storage")) {
    return {
      url: rawStr,
      label: decodeURIComponent((rawStr.split("/").pop() || "ملف")),
      isFile: true,
    };
  }

  try {
    const u = new URL(rawStr);
    return { url: rawStr, label: u.hostname.replace(/^www\./, ""), isFile: false };
  } catch {
    return { url: rawStr, label: "رابط", isFile: false };
  }
}

function getDueBadge(dueDate: Date, isCompleted: boolean) {
  if (isCompleted) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(dueDate, today);
  if (isPast(dueDate) && !isToday(dueDate)) {
    return { label: "فات الموعد", className: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700", icon: AlertTriangle };
  }
  if (days === 0) {
    return { label: "اليوم!", className: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400 border-rose-200 dark:border-rose-800", icon: Flame };
  }
  if (days === 1) {
    return { label: "غداً", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-amber-800", icon: Clock };
  }
  if (days <= 3) {
    return { label: `بعد ${days} أيام`, className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800", icon: Clock };
  }
  if (days <= 7) {
    return { label: `بعد ${days} أيام`, className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800", icon: Clock };
  }
  return null;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "كتاب مقرر":  { bg: "bg-blue-50 dark:bg-blue-950/30",   text: "text-blue-700 dark:text-blue-300",   border: "border-blue-200/60 dark:border-blue-800/40" },
  "ورقة عمل":   { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200/60 dark:border-purple-800/40" },
  "شرح وملخص":  { bg: "bg-green-50 dark:bg-green-950/30",  text: "text-green-700 dark:text-green-300",  border: "border-green-200/60 dark:border-green-800/40" },
  "اختبار سابق":{ bg: "bg-red-50 dark:bg-red-950/30",     text: "text-red-700 dark:text-red-300",     border: "border-red-200/60 dark:border-red-800/40" },
  "حل نموذجي":  { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200/60 dark:border-emerald-800/40" },
  "مقاطع مرئية":{ bg: "bg-pink-50 dark:bg-pink-950/30",   text: "text-pink-700 dark:text-pink-300",   border: "border-pink-200/60 dark:border-pink-800/40" },
  "روابط مفيدة":{ bg: "bg-cyan-50 dark:bg-cyan-950/30",   text: "text-cyan-700 dark:text-cyan-300",   border: "border-cyan-200/60 dark:border-cyan-800/40" },
};

const DEFAULT_CATEGORY_STYLE = {
  bg: "bg-muted/50",
  text: "text-muted-foreground",
  border: "border-border/50",
};

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? DEFAULT_CATEGORY_STYLE;
}

/* ─── Attachment section — now with checkboxes ─── */
function AttachmentSection({
  category,
  items,
  attChecked,
  onToggleAtt,
  globalOffset,
}: {
  category: string;
  items: AttachmentInfo[];
  attChecked: boolean[];
  onToggleAtt: (globalIdx: number) => void;
  globalOffset: number;
}) {
  const [open, setOpen] = useState(true);
  const style = getCategoryStyle(category);
  const doneInSection = items.filter((_, i) => attChecked[globalOffset + i]).length;

  return (
    <div className={`rounded-xl border overflow-hidden ${style.border}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full flex items-center justify-between px-3 py-2 transition-colors ${style.bg} hover:brightness-95 dark:hover:brightness-110`}
      >
        <div className="flex items-center gap-2">
          <Folder className={`h-3.5 w-3.5 ${style.text}`} />
          <span className={`text-xs font-bold ${style.text}`}>{category}</span>
          <span className="text-[10px] bg-background/60 dark:bg-background/20 px-1.5 py-0.5 rounded-full font-semibold text-muted-foreground">
            {doneInSection}/{items.length}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${style.text} ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Files with checkboxes */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-2.5 space-y-1.5">
              {items.map((att, idx) => {
                const globalIdx = globalOffset + idx;
                const isDone = attChecked[globalIdx];
                const Icon = att.isFile ? Download : LinkIcon;
                return (
                  <div key={idx} className="flex items-center gap-2 group">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleAtt(globalIdx)}
                      className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                        isDone
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-muted-foreground/40 hover:border-primary/60"
                      }`}
                      title={isDone ? "إلغاء التأشير" : "تأشير كـ راجعته"}
                    >
                      {isDone && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                    </button>
                    {/* File link */}
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex-1 flex items-center gap-1.5 text-xs transition-all duration-150 px-2.5 py-1.5 rounded-xl border hover:shadow-sm min-w-0 ${
                        isDone
                          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/40 dark:border-emerald-800/30 text-muted-foreground"
                          : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border/40 hover:border-border"
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors ${isDone ? "text-emerald-500" : "text-primary/60 group-hover:text-primary"}`} />
                      <span className={`truncate font-medium ${isDone ? "line-through" : ""}`}>{att.label}</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Checklist section (text tasks only) ─── */
function ChecklistSection({ items, checked, onToggle, isCompleted }: {
  items: string[];
  checked: boolean[];
  onToggle: (idx: number) => void;
  isCompleted: boolean;
}) {
  return (
    <div className={`space-y-1.5 pt-0.5 ${isCompleted ? "opacity-60" : ""}`}>
      {items.map((item, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onToggle(idx)}
          className="w-full flex items-center gap-2.5 text-right group"
        >
          <div
            className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
              checked[idx]
                ? "bg-emerald-500 border-emerald-500"
                : "border-muted-foreground/40 group-hover:border-primary/60"
            }`}
          >
            {checked[idx] && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
          </div>
          <span className={`text-xs leading-snug transition-all ${checked[idx] ? "line-through text-muted-foreground" : "text-foreground group-hover:text-primary"}`}>
            {item}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ─── Combined progress bar ─── */
function ProgressBar({ done, total, isCompleted }: { done: number; total: number; isCompleted: boolean }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`space-y-1.5 ${isCompleted ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" />
          التقدم
        </span>
        <span className="text-xs font-bold text-primary">{done}/{total}</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function AssignmentCard({ assignment, completedIds = [], onToggleComplete }: AssignmentCardProps) {
  if (!assignment) return null;
  const isUrgent = assignment.priority === "urgent" || assignment.priority === "HIGH";
  const dueDateObj = assignment.dueDate ? parseISO(assignment.dueDate) : new Date();
  const validDate = isNaN(dueDateObj.getTime()) ? new Date() : dueDateObj;
  const gregDate = format(validDate, "EEEE، d MMMM yyyy", { locale: ar });
  const hijriStr = formatHijriDate(validDate);
  const formattedDate = hijriStr ? `${gregDate} • ${hijriStr}` : gregDate;

  const { isSignedIn } = useAuth();
  const isCompleted = completedIds.includes(assignment.id);
  const dueBadge = getDueBadge(validDate, isCompleted);

  const checklistItems: string[] = (assignment as any).checklistItems || (assignment as any).checklist || [];
  const rawAtts = assignment.attachmentLinks || (assignment as any).attachments || [];
  const attachments: AttachmentInfo[] = (Array.isArray(rawAtts) ? rawAtts : []).map((a) => parseAttachment(a));

  /* Group attachments by category */
  const grouped: Record<string, AttachmentInfo[]> = {};
  const categoryOrder: string[] = [];
  attachments.forEach((att) => {
    const key = att.category || "مرفقات عامة";
    if (!grouped[key]) { grouped[key] = []; categoryOrder.push(key); }
    grouped[key].push(att);
  });

  /* Compute global offsets for flat attachment index */
  const categoryOffsets: Record<string, number> = {};
  let offset = 0;
  for (const cat of categoryOrder) {
    categoryOffsets[cat] = offset;
    offset += grouped[cat].length;
  }
  const totalAttachments = attachments.length;

  /* Shared state for all attachments (flat array keyed by assignmentId) */
  const { checked: attChecked, toggle: toggleAtt } = useChecklistState(
    `att-${assignment.id}`,
    totalAttachments,
  );

  /* Checklist state */
  const { checked: chkChecked, toggle: toggleChk } = useChecklistState(
    `chk-${assignment.id}`,
    checklistItems.length,
  );

  const totalSubtasks = checklistItems.length + totalAttachments;
  const doneSubtasks = chkChecked.filter(Boolean).length + attChecked.filter(Boolean).length;

  const hasFooter = totalSubtasks > 0;

  /* ─── Auto-complete when all file + checklist items are checked ─── */
  const autoCompleteRef = useRef(false);
  useEffect(() => {
    if (doneSubtasks < totalSubtasks) {
      autoCompleteRef.current = false;
      return;
    }
    if (
      totalSubtasks > 0 &&
      doneSubtasks === totalSubtasks &&
      !isCompleted &&
      !autoCompleteRef.current &&
      onToggleComplete
    ) {
      autoCompleteRef.current = true;
      onToggleComplete(assignment.id, false);
    }
  }, [doneSubtasks, totalSubtasks, isCompleted, onToggleComplete, assignment.id]);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.97 },
        show:   { opacity: 1, y: 0,  scale: 1, transition: { type: "spring", stiffness: 340, damping: 28 } }
      }}
      whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 24 } }}
      whileTap={{ scale: 0.99 }}
      style={{ willChange: "transform" }}
    >
      <Card
        className={`overflow-hidden border-r-4 relative ${isCompleted ? "bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}
        style={{
          borderRightColor: isCompleted ? "#10b981" : (assignment.subjectColor || "hsl(var(--primary))"),
          boxShadow: isCompleted
            ? "0 2px 12px -4px rgba(16,185,129,0.15)"
            : `0 2px 12px -4px ${assignment.subjectColor || "hsl(var(--primary))"}25`,
        }}
      >
        {onToggleComplete && (
          <button
            onClick={() => onToggleComplete(assignment.id, isCompleted)}
            className="absolute top-4 left-4 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 bg-background"
            style={{
              borderColor: isCompleted ? "#10b981" : "var(--muted-foreground)",
              backgroundColor: isCompleted ? "#10b981" : "var(--background)"
            }}
          >
            <motion.div
              initial={false}
              animate={{ scale: isCompleted ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </motion.div>
          </button>
        )}

        <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-4 space-y-0 pl-12">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: `${assignment.subjectColor}15` || "transparent",
                  color: assignment.subjectColor || "inherit",
                  borderColor: `${assignment.subjectColor}40` || "transparent"
                }}
              >
                {assignment.subjectName}
              </Badge>
              <Badge className={`text-xs font-semibold rounded-full border-0 ${TYPE_COLORS[assignment.type] || ""}`}>
                {ASSIGNMENT_TYPE_LABELS[assignment.type]}
              </Badge>
              {(assignment as any).eventTitle && (
                <Badge
                  variant="outline"
                  className="text-xs rounded-full flex items-center gap-1"
                  style={{
                    backgroundColor: `${(assignment as any).eventColor}15` || "transparent",
                    color: (assignment as any).eventColor || "inherit",
                    borderColor: `${(assignment as any).eventColor}40` || "transparent"
                  }}
                >
                  <CalendarDays className="h-3 w-3" />
                  {(assignment as any).eventTitle}
                </Badge>
              )}
            </div>
            <h3 className={`font-bold text-lg leading-tight line-clamp-2 ${isCompleted ? "text-muted-foreground line-through" : ""}`}>
              {assignment.title}
            </h3>
          </div>
        </CardHeader>

        <CardContent className={`p-4 pt-2 pb-3 ${isCompleted ? "opacity-70" : ""}`}>
          {assignment.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
              {assignment.description}
            </p>
          )}

          {assignment.externalUrl && (
            <div className="mb-3">
              <a
                href={assignment.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 text-xs font-bold transition-all w-full justify-center group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>فتح الواجب / النموذج عبر الرابط الخارجي</span>
              </a>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-2">
            <div className={`flex items-center text-sm font-medium gap-2 flex-wrap ${isUrgent && !isCompleted ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
              <Calendar className="h-4 w-4 opacity-70 shrink-0" />
              <span>التسليم: {formattedDate}</span>
              {dueBadge && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${dueBadge.className}`}>
                  <dueBadge.icon className="h-3 w-3" />
                  {dueBadge.label}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-4 mt-1">
              {!isCompleted && isUrgent && (
                <Badge className={`shrink-0 rounded-full border-0 ${PRIORITY_COLORS[assignment.priority] || ""}`}>
                  {ASSIGNMENT_PRIORITY_LABELS[assignment.priority]}
                </Badge>
              )}
              {assignment.assignedDate && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    أُسندت: {(() => {
                      try {
                        const d = parseISO(assignment.assignedDate);
                        return !isNaN(d.getTime()) ? format(d, "d MMM", { locale: ar }) : assignment.assignedDate;
                      } catch {
                        return assignment.assignedDate;
                      }
                    })()}
                  </span>
                </div>
              )}
              {assignment.pageNumber && (
                <div className="flex items-center gap-1.5">
                  <span>صفحة {assignment.pageNumber}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Notes button */}
        <div className="px-4 pb-1 flex justify-end">
          <NotesPanel entityType="assignment" entityId={assignment.id} />
        </div>

        {hasFooter && (
          <CardFooter className={`p-4 pt-0 ${isCompleted ? "opacity-70" : ""}`}>
            <div className="w-full space-y-3">
              {/* Combined progress bar */}
              <div className="bg-muted/30 rounded-xl p-3 border border-border/40 space-y-2.5">
                <ProgressBar done={doneSubtasks} total={totalSubtasks} isCompleted={isCompleted} />

                {/* Text checklist items */}
                {checklistItems.length > 0 && (
                  <ChecklistSection
                    items={checklistItems}
                    checked={chkChecked}
                    onToggle={toggleChk}
                    isCompleted={isCompleted}
                  />
                )}
              </div>

              {/* Attachment sections (files/links) */}
              {categoryOrder.map((cat) => (
                <AttachmentSection
                  key={cat}
                  category={cat}
                  items={grouped[cat]}
                  attChecked={attChecked}
                  onToggleAtt={toggleAtt}
                  globalOffset={categoryOffsets[cat]}
                />
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
}
