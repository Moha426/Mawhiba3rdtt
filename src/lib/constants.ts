export const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  homework: "واجب منزلي",
  exam: "اختبار",
  project: "مشروع/بحث",
  class_activity: "مهام أدائية",
  other: "أخرى",
  reading: "قراءة",
};

export const ASSIGNMENT_PRIORITY_LABELS: Record<string, string> = {
  urgent: "عاجل",
  high: "مهم",
  medium: "متوسط",
  normal: "عادي",
  low: "منخفض",
};

export const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-900",
  high: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-900",
  medium: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900",
  normal: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-900",
  low: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-900",
};

export const TYPE_COLORS: Record<string, string> = {
  homework: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  exam: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  project: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  class_activity: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  other: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  reading: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
};
