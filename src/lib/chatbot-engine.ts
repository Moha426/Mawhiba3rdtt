import type { Assignment, Subject, ScheduleSlot, ScheduleConfig, Event, QuizSummary } from "@workspace/api-client-react";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  cards?: CardData[];
  timestamp: Date;
}

export interface CardData {
  title: string;
  subtitle?: string;
  color?: string;
  tag?: string;
  href?: string;
}

export interface AppData {
  assignments: Assignment[];
  subjects: Subject[];
  schedule: ScheduleSlot[];
  scheduleConfig: ScheduleConfig | null;
  events: Event[];
  quizzes: QuizSummary[];
}

const DAY_NAMES: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

const TYPE_LABELS: Record<string, string> = {
  homework: "واجب منزلي",
  exam: "اختبار",
  project: "مشروع",
  class_activity: "نشاط صفي",
  resource: "ملف إثرائي",
  reading: "قراءة",
  other: "أخرى",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "🔴 عاجل",
  high: "🟠 مهم",
  medium: "🟡 متوسط",
  normal: "⚪ عادي",
  low: "⚫ منخفض",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getTodayDayOfWeek() {
  return new Date().getDay();
}

function getTomorrowDayOfWeek() {
  return (new Date().getDay() + 1) % 7;
}

function calcPeriodTime(periodIndex: number, config: ScheduleConfig): string {
  const [hStr, mStr] = config.startTime.split(":");
  let totalMinutes = parseInt(hStr) * 60 + parseInt(mStr);
  for (let i = 0; i < periodIndex; i++) {
    totalMinutes += config.periodDuration;
    if (i + 1 === config.breakAfterPeriod) {
      totalMinutes += config.breakDuration;
    }
  }
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-SA", { weekday: "long", month: "long", day: "numeric" });
}

function contains(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

export function processMessage(msg: string, data: AppData): { text: string; cards?: CardData[] } {
  const q = msg.trim().toLowerCase();

  // ── HELP ─────────────────────────────────────────────────────────────────────
  if (contains(q, ["مساعدة", "help", "ماذا تعرف", "ماذا تستطيع", "الأوامر", "أوامر"])) {
    return {
      text: "يمكنني مساعدتك في:\n\n📅 **جدول اليوم / الغد**\n📚 **المهام القادمة** أو مهام مادة معينة\n📖 **قائمة المواد**\n🏆 **الاختبارات القادمة**\n📆 **الفعاليات** القادمة\n\nاكتب سؤالك بالعربية وسأجاوبك! 😊",
    };
  }

  // ── SCHEDULE TODAY ────────────────────────────────────────────────────────────
  if (
    contains(q, ["جدول اليوم", "حصص اليوم", "دروس اليوم", "اليوم جدول"]) ||
    (contains(q, ["جدول"]) && contains(q, ["اليوم"]) && !contains(q, ["غد", "غداً", "بكرا", "بكره"]))
  ) {
    return buildScheduleResponse(getTodayDayOfWeek(), "اليوم", data);
  }

  // ── SCHEDULE TOMORROW ─────────────────────────────────────────────────────────
  if (
    contains(q, ["جدول غد", "جدول الغد", "جدول بكرا", "جدول بكره", "غداً", "غدا", "حصص غداً", "حصص الغد", "حصص بكرا", "حصص غد", "دروس غد"]) ||
    (contains(q, ["جدول"]) && contains(q, ["غد", "بكرا", "بكره", "الغد"])) ||
    (contains(q, ["غد", "بكرا", "الغد"]) && contains(q, ["حصص", "دروس", "مواد"]))
  ) {
    return buildScheduleResponse(getTomorrowDayOfWeek(), "الغد", data);
  }

  // ── SCHEDULE NAMED DAY ────────────────────────────────────────────────────────
  for (const [dayNum, dayName] of Object.entries(DAY_NAMES)) {
    if (contains(q, [dayName, `يوم ${dayName}`, `جدول ${dayName}`])) {
      if (contains(q, ["جدول", "حصص", "دروس", "مواد"])) {
        return buildScheduleResponse(Number(dayNum), dayName, data);
      }
    }
  }

  // ── UPCOMING ASSIGNMENTS (general) ───────────────────────────────────────────
  if (
    contains(q, ["المهام القادمة", "مهام قادمة", "مهام هذا الأسبوع", "مهام الأسبوع", "ماهي المهام", "ما هي المهام", "المهام اليوم", "واجبات قادمة", "واجبات"]) ||
    (contains(q, ["مهام", "واجبات"]) && contains(q, ["قادم", "أسبوع", "اليوم", "الأسبوع", "هذا"]))
  ) {
    return buildUpcomingAssignmentsResponse(data, null, null);
  }

  // ── EXAMS ─────────────────────────────────────────────────────────────────────
  if (contains(q, ["اختبار", "اختبارات", "امتحان", "امتحانات"])) {
    if (!contains(q, ["مادة", ...data.subjects.map((s) => s.name.toLowerCase())])) {
      return buildUpcomingAssignmentsResponse(data, "exam", null);
    }
  }

  // ── SUBJECTS LIST ─────────────────────────────────────────────────────────────
  if (
    contains(q, ["المواد", "قائمة المواد", "ما هي المواد", "ماهي المواد", "الدروس", "كم مادة", "كم مادة عندي"]) &&
    !contains(q, ["غد", "اليوم", "بكرا", "جدول"])
  ) {
    return buildSubjectsResponse(data);
  }

  // ── QUIZZES ───────────────────────────────────────────────────────────────────
  if (contains(q, ["اختبار إلكتروني", "اختبارات إلكترونية", "كويز", "quiz", "اختبار تفاعلي"])) {
    return buildQuizzesResponse(data);
  }

  // ── EVENTS ────────────────────────────────────────────────────────────────────
  if (contains(q, ["فعالية", "فعاليات", "مناسبة", "مناسبات", "نشاط", "أنشطة", "تقويم", "إجازة", "إجازات"])) {
    return buildEventsResponse(data);
  }

  // ── SUBJECT-SPECIFIC QUERY ────────────────────────────────────────────────────
  const matchedSubject = findSubjectInQuery(q, data.subjects);
  if (matchedSubject) {
    if (contains(q, ["اختبار", "امتحان"])) {
      return buildUpcomingAssignmentsResponse(data, "exam", matchedSubject.id);
    }
    if (contains(q, ["واجب", "مهمة", "مهام"])) {
      return buildUpcomingAssignmentsResponse(data, "homework", matchedSubject.id);
    }
    return buildSubjectDetailResponse(data, matchedSubject);
  }

  // ── GREETING ─────────────────────────────────────────────────────────────────
  if (contains(q, ["مرحبا", "هلا", "أهلا", "السلام عليكم", "hi", "hello", "سلام", "كيفك", "كيف حالك"])) {
    return {
      text: "أهلاً وسهلاً! 👋 أنا مساعد لوحة التحكم. يمكنني إخبارك بجدولك، مهامك، ملفات المواد، والاختبارات القادمة.\n\nاسأل عن أي شيء! 😊",
    };
  }

  // ── AI PLACEHOLDER ────────────────────────────────────────────────────────────
  return {
    text: "هذا السؤال يحتاج إلى الذكاء الاصطناعي 🤖\n\nسيتم ربط نموذج AI قريباً للإجابة على الأسئلة المفتوحة.\n\nيمكنني حالياً الإجابة على أسئلة عن:\n• الجدول الدراسي\n• المهام والواجبات\n• ملفات المواد\n• الاختبارات القادمة\n• الفعاليات",
  };
}

// ── BUILDERS ──────────────────────────────────────────────────────────────────

function buildScheduleResponse(dayOfWeek: number, dayLabel: string, data: AppData) {
  const slots = data.schedule.filter((s) => s.dayOfWeek === dayOfWeek);

  if (slots.length === 0) {
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    return {
      text: isWeekend
        ? `${DAY_NAMES[dayOfWeek]} هو يوم ${dayOfWeek === 5 ? "جمعة" : "سبت"} — لا توجد حصص! 🎉`
        : `لم يُضف جدول ${dayLabel} بعد. يمكن للمشرف إضافته من لوحة التحكم.`,
    };
  }

  const sorted = [...slots].sort((a, b) => a.periodNumber - b.periodNumber);
  const cards: CardData[] = sorted.map((s) => {
    const timeLabel =
      data.scheduleConfig
        ? calcPeriodTime(s.periodNumber - 1, data.scheduleConfig)
        : `ح${s.periodNumber}`;
    return {
      title: s.subjectName,
      subtitle: `الحصة ${s.periodNumber} — ${timeLabel}`,
      color: s.subjectColor,
      tag: `ح${s.periodNumber}`,
    };
  });

  return {
    text: `📅 جدول **${dayLabel}** (${DAY_NAMES[dayOfWeek]}) — ${sorted.length} حصص:`,
    cards,
  };
}

function buildUpcomingAssignmentsResponse(
  data: AppData,
  type: string | null,
  subjectId: number | null
) {
  const today = todayStr();
  let list = data.assignments.filter((a) => a.dueDate >= today);
  if (type) list = list.filter((a) => a.type === type);
  if (subjectId) list = list.filter((a) => a.subjectId === subjectId);

  list = list.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 8);

  if (list.length === 0) {
    const typeLabel = type ? TYPE_LABELS[type] || type : "مهام";
    return { text: `لا توجد ${typeLabel} قادمة 🎉 أنت في أمان!` };
  }

  const typeLabel = type ? TYPE_LABELS[type] || type : "مهمة";
  const cards: CardData[] = list.map((a) => ({
    title: a.title,
    subtitle: `${a.subjectName} — يُسلَّم ${formatDate(a.dueDate)}`,
    color: a.subjectColor,
    tag: TYPE_LABELS[a.type] || a.type,
  }));

  return {
    text: `📚 يوجد **${list.length}** ${typeLabel} قادمة:`,
    cards,
  };
}

function buildSubjectsResponse(data: AppData) {
  if (data.subjects.length === 0) {
    return { text: "لم تُضف أي مواد بعد. يمكن للمشرف إضافتها من لوحة التحكم." };
  }

  const cards: CardData[] = data.subjects.map((s) => ({
    title: s.name,
    subtitle: s.teacherName ? `المعلم: ${s.teacherName}` : undefined,
    color: s.color,
  }));

  return {
    text: `📖 يوجد **${data.subjects.length}** مواد دراسية:`,
    cards,
  };
}

function buildSubjectDetailResponse(data: AppData, subject: Subject) {
  const today = todayStr();
  const upcoming = data.assignments.filter(
    (a) => a.subjectId === subject.id && a.dueDate >= today
  );

  const lines = [
    `📖 **${subject.name}**`,
    subject.teacherName ? `👤 المعلم: ${subject.teacherName}` : null,
    subject.teacherPhone ? `📱 ${subject.teacherPhone}` : null,
    `\n📚 مهام قادمة: ${upcoming.length}`,
  ]
    .filter(Boolean)
    .join("\n");

  const cards: CardData[] = upcoming.slice(0, 4).map((a) => ({
    title: a.title,
    subtitle: `يُسلَّم ${formatDate(a.dueDate)}`,
    color: subject.color,
    tag: TYPE_LABELS[a.type] || a.type,
  }));

  return { text: lines, cards: cards.length ? cards : undefined };
}

function buildQuizzesResponse(data: AppData) {
  if (data.quizzes.length === 0) {
    return { text: "لا توجد اختبارات إلكترونية مضافة حتى الآن." };
  }

  const cards: CardData[] = data.quizzes.slice(0, 6).map((q) => ({
    title: q.title,
    subtitle: `${q.subjectName} — ${q.questionCount} سؤال`,
    color: q.subjectColor,
    tag: "اختبار",
    href: `/quiz/${q.id}`,
  }));

  return {
    text: `🏆 يوجد **${data.quizzes.length}** اختبار إلكتروني:`,
    cards,
  };
}

function buildEventsResponse(data: AppData) {
  const today = todayStr();
  const upcoming = data.events
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  if (upcoming.length === 0) {
    return { text: "لا توجد فعاليات أو مناسبات قادمة مضافة." };
  }

  const cards: CardData[] = upcoming.map((e) => ({
    title: e.title,
    subtitle: formatDate(e.date),
    color: e.color,
    tag: e.type === "holiday" ? "إجازة" : "فعالية",
  }));

  return {
    text: `📆 الفعاليات القادمة (${upcoming.length}):`,
    cards,
  };
}

function findSubjectInQuery(q: string, subjects: Subject[]): Subject | null {
  for (const s of subjects) {
    if (q.includes(s.name.toLowerCase())) return s;
    const words = s.name.split(/\s+/);
    if (words.length > 1 && words.some((w) => w.length > 3 && q.includes(w.toLowerCase()))) {
      return s;
    }
  }
  return null;
}
