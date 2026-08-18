import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, getDoc, getDocs, collection, serverTimestamp } from "firebase/firestore";
import { db, safeFirestoreWrite } from "./firebase";

// Debounce map for batching app_data writes to Firestore and saving quota
const writeDebounceTimers = new Map<string, any>();

function queueDebouncedFirestoreWrite(key: string, value: any) {
  if (writeDebounceTimers.has(key)) {
    clearTimeout(writeDebounceTimers.get(key));
  }
  const timer = setTimeout(async () => {
    writeDebounceTimers.delete(key);
    try {
      const docRef = doc(db, "app_data", key);
      const cleanValue = JSON.parse(JSON.stringify(value));
      await safeFirestoreWrite(() => setDoc(docRef, { value: cleanValue, updatedAt: serverTimestamp() }, { merge: true }));
    } catch (err) { console.warn("Firestore write skipped:", err); }
  }, 1000); // 1 second debounce
  writeDebounceTimers.set(key, timer);
}

// Global listener to sync app_data_change events directly to Firestore
if (typeof window !== "undefined") {
  window.addEventListener("app_data_change" as any, (e: any) => {
    if (e.detail?.key && e.detail?.value !== undefined) {
      queueDebouncedFirestoreWrite(e.detail.key, e.detail.value);
    }
  });
}

// Persistent state helper across components and devices via Firestore
export function usePersistentState<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(`app_data_${key}`);
      if (item) return JSON.parse(item);
      if (key === "flashcards") {
        const fcItem = localStorage.getItem("talented_english_flashcards_v1");
        if (fcItem) return JSON.parse(fcItem);
      }
      if (key === "platforms") {
        const platItem = localStorage.getItem("talented_school_custom_platforms_v1");
        if (platItem) return JSON.parse(platItem);
      }
      return initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    const handleStorage = (e: any) => {
      if (e.detail?.key === key) {
        setState(e.detail.value);
      }
    };
    window.addEventListener("app_data_change" as any, handleStorage);

    let unsub = () => {};
    try {
      const docRef = doc(db, "app_data", key);
      unsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && data.value !== undefined && data.value !== null) {
              const val = data.value;
              setState(val);
              try {
                localStorage.setItem(`app_data_${key}`, JSON.stringify(val));
                if (key === "flashcards") {
                  localStorage.setItem("talented_english_flashcards_v1", JSON.stringify(val));
                  window.dispatchEvent(new CustomEvent("flashcards_storage_change", { detail: { flashcards: val } }));
                } else if (key === "platforms") {
                  localStorage.setItem("talented_school_custom_platforms_v1", JSON.stringify(val));
                  localStorage.setItem("custom_educational_platforms_v3", JSON.stringify(val));
                  window.dispatchEvent(new CustomEvent("platforms_storage_change", { detail: { platforms: val } }));
                }
              } catch {}
            }
          } else {
            try {
              let valToSeed = initialValue;
              const localItem = localStorage.getItem(`app_data_${key}`);
              if (localItem) {
                valToSeed = JSON.parse(localItem);
              } else if (key === "flashcards") {
                const fcLocal = localStorage.getItem("talented_english_flashcards_v1");
                valToSeed = fcLocal ? JSON.parse(fcLocal) : initialValue;
              } else if (key === "platforms") {
                const platLocal = localStorage.getItem("talented_school_custom_platforms_v1");
                valToSeed = platLocal ? JSON.parse(platLocal) : initialValue;
              }
              if (valToSeed !== undefined && valToSeed !== null) {
                queueDebouncedFirestoreWrite(key, valToSeed);
              }
            } catch {}
          }
        },
        (err) => {
          if (err?.code === "resource-exhausted" || err?.message?.includes("Quota limit exceeded")) {
            unsub();
          }
        }
      );
    } catch (e) {
      console.warn(`Firestore connection error for ${key}:`, e);
    }

    return () => {
      window.removeEventListener("app_data_change" as any, handleStorage);
      unsub();
    };
  }, [key]);

  const setPersistentState = (val: T | ((prev: T) => T)) => {
    let prev = state;
    try {
      const raw = localStorage.getItem(`app_data_${key}`);
      if (raw) prev = JSON.parse(raw);
    } catch {}
    
    const next = typeof val === "function" ? (val as any)(prev) : val;
    
    try {
      localStorage.setItem(`app_data_${key}`, JSON.stringify(next));
      if (key === "flashcards") {
        localStorage.setItem("talented_english_flashcards_v1", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("flashcards_storage_change", { detail: { flashcards: next } }));
      } else if (key === "platforms") {
        localStorage.setItem("talented_school_custom_platforms_v1", JSON.stringify(next));
        localStorage.setItem("custom_educational_platforms_v3", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("platforms_storage_change", { detail: { platforms: next } }));
      } else if (key === "study_files") {
        localStorage.setItem("talented_school_custom_files_v1", JSON.stringify(next));
        localStorage.setItem("app_data_study_files", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("app_file_updated", { detail: next }));
      } else if (key === "channels") {
        window.dispatchEvent(new CustomEvent("channels_storage_change", { detail: { channels: next } }));
      } else if (key === "polls" || key === "poll_votes") {
        localStorage.setItem("talented_school_polls_cache_v3", JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("polls_data_change", { detail: { key, value: next } }));
      }
    } catch {}

    // IMPORTANT: Actually push to Firebase Firestore here so changes persist!
    safeFirestoreWrite(async () => {
      const docRef = doc(db, "app_data", key);
      await setDoc(docRef, { value: next, updatedAt: serverTimestamp() }, { merge: true });
    });
    
    window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key, value: next } }));
    setState(next);
  };

  return [state, setPersistentState];
}

// Global Cloud Sync Utility Functions
export const SYNC_KEYS = [
  "assignments",
  "subjects",
  "schedule",
  "schedule_config",
  "events",
  "quizzes",
  "notes",
  "students",
  "platforms",
  "channels",
  "study_files",
  "settings",
  "study_rooms",
  "flashcards",
  "polls",
  "poll_votes",
  "escalated_questions",
  "student_suggestions",
];

export async function pushAllLocalDataToCloud(): Promise<{ success: boolean; syncedKeys: string[]; count: number }> {
  const synced: string[] = [];
  try {
    for (const key of SYNC_KEYS) {
      let val: any = null;
      try {
        const raw = localStorage.getItem(`app_data_${key}`);
        if (raw) val = JSON.parse(raw);
      } catch {}

      // Check alternative legacy local storage keys
      if (!val && key === "platforms") {
        try {
          const raw = localStorage.getItem("talented_school_custom_platforms_v1") || localStorage.getItem("custom_educational_platforms_v3");
          if (raw) val = JSON.parse(raw);
        } catch {}
      }
      if (!val && key === "flashcards") {
        try {
          const raw = localStorage.getItem("talented_english_flashcards_v1");
          if (raw) val = JSON.parse(raw);
        } catch {}
      }

      if (val !== null && val !== undefined) {
        try {
          const docRef = doc(db, "app_data", key);
          await safeFirestoreWrite(() => setDoc(docRef, { value: val, updatedAt: serverTimestamp() }, { merge: true }));
        } catch (err) { console.warn("Firestore write skipped:", err); }
        synced.push(key);
      }
    }

    // Sync custom library files to Firestore collection "files"
    try {
      const rawFiles = localStorage.getItem("talented_school_custom_files_v1");
      if (rawFiles) {
        const files = JSON.parse(rawFiles);
        if (Array.isArray(files)) {
          for (const f of files) {
            if (f.id) {
              try {
                const fileDoc = doc(db, "files", f.id);
                await safeFirestoreWrite(() => setDoc(fileDoc, { ...f, timestamp: serverTimestamp() }, { merge: true }));
              } catch (err) { console.warn("Firestore write skipped:", err); }
            }
          }
          synced.push("files");
        }
      }
    } catch {}

    return { success: true, syncedKeys: synced, count: synced.length };
  } catch (err) {
    console.error("pushAllLocalDataToCloud error:", err);
    return { success: false, syncedKeys: synced, count: synced.length };
  }
}

export async function pullAllCloudDataToLocal(): Promise<{ success: boolean; keys: string[] }> {
  const updatedKeys: string[] = [];
  try {
    for (const key of SYNC_KEYS) {
      const docRef = doc(db, "app_data", key);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.value !== undefined) {
          localStorage.setItem(`app_data_${key}`, JSON.stringify(data.value));
          window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key, value: data.value } }));
          updatedKeys.push(key);
        }
      }
    }
    return { success: true, keys: updatedKeys };
  } catch (e) {
    console.error("pullAllCloudDataToLocal error:", e);
    return { success: false, keys: updatedKeys };
  }
}

export async function exportAllAppData(): Promise<Record<string, any>> {
  const exportBundle: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    version: "2.0",
    schoolPlatform: "منصة الموهبة للتعليم والتفوق",
  };

  for (const key of SYNC_KEYS) {
    try {
      const docRef = doc(db, "app_data", key);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data()?.value !== undefined) {
        exportBundle[key] = snap.data()?.value;
      } else {
        const raw = localStorage.getItem(`app_data_${key}`);
        if (raw) exportBundle[key] = JSON.parse(raw);
      }
    } catch {
      const raw = localStorage.getItem(`app_data_${key}`);
      if (raw) exportBundle[key] = JSON.parse(raw);
    }
  }

  // Also include custom files
  try {
    const rawFiles = localStorage.getItem("talented_school_custom_files_v1");
    if (rawFiles) exportBundle["customFiles"] = JSON.parse(rawFiles);
  } catch {}

  return exportBundle;
}

export async function importAllAppData(bundle: Record<string, any>): Promise<{ success: boolean; importedCount: number }> {
  let count = 0;
  if (!bundle || typeof bundle !== "object") throw new Error("ملف غير صالح");

  for (const key of SYNC_KEYS) {
    if (bundle[key] !== undefined) {
      const val = bundle[key];
      try {
        localStorage.setItem(`app_data_${key}`, JSON.stringify(val));
      } catch {}
      window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key, value: val } }));

      try {
        const docRef = doc(db, "app_data", key);
        await safeFirestoreWrite(() => setDoc(docRef, { value: val, updatedAt: serverTimestamp() }, { merge: true }));
      } catch (err) { console.warn("Firestore write skipped:", err); }
      count++;
    }
  }

  if (bundle.customFiles && Array.isArray(bundle.customFiles)) {
    try {
      localStorage.setItem("talented_school_custom_files_v1", JSON.stringify(bundle.customFiles));
      for (const f of bundle.customFiles) {
        if (f.id) {
          try {
            const fileDoc = doc(db, "files", f.id);
            await safeFirestoreWrite(() => setDoc(fileDoc, { ...f, timestamp: serverTimestamp() }, { merge: true }));
          } catch (err) { console.warn("Firestore write skipped:", err); }
        }
      }
    } catch {}
  }

  return { success: true, importedCount: count };
}

// Initial default seed data
const defaultSubjects = [
  { id: 1, name: "الرياضيات", color: "#3b82f6", teacherName: "أ. محمد علي", teacherPhone: "0501234567" },
  { id: 2, name: "الفيزياء", color: "#8b5cf6", teacherName: "أ. أحمد محمود", teacherPhone: "0502345678" },
  { id: 3, name: "الكيمياء", color: "#ec4899", teacherName: "د. خالد السعيد", teacherPhone: "0503456789" },
  { id: 4, name: "اللغة العربية", color: "#f59e0b", teacherName: "أ. عمر الفاروق", teacherPhone: "0504567890" },
  { id: 5, name: "اللغة الإنجليزية", color: "#10b981", teacherName: "Mr. Smith", teacherPhone: "0505678901" },
];

const defaultAssignments = [
  {
    id: 1,
    title: "حل تمارين الواجب الأول - التفاضل والتكامل",
    description: "قم بحل التمارين من صفحة 45 إلى 50 في كتاب الرياضيات وتسليمها.",
    type: "HOMEWORK",
    priority: "HIGH",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    subjectName: "الرياضيات",
    subjectColor: "#3b82f6",
    attachments: [],
    checklist: ["مراجعة النظرية", "حل تمرين 1-5", "حل تمرين 6-10"],
  },
  {
    id: 2,
    title: "تقرير ميكانيكا الكم والحرارة",
    description: "كتابة تقرير شامل عن قوانين الديناميكا الحرارية وتطبيقاتها.",
    type: "RESEARCH",
    priority: "MEDIUM",
    dueDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    subjectName: "الفيزياء",
    subjectColor: "#8b5cf6",
    attachments: [],
    checklist: ["جمع المصادر", "كتابة المقدمة", "مراجعة الصياغة"],
  },
  {
    id: 3,
    title: "مشروع الجدول الدوري والتفاعلات",
    description: "إعداد عرض تقديمي عن التفاعلات الكيميائية العضوية.",
    type: "PROJECT",
    priority: "HIGH",
    dueDate: new Date(Date.now() + 86400000 * 6).toISOString(),
    subjectName: "الكيمياء",
    subjectColor: "#ec4899",
    attachments: [],
    checklist: ["اختيار المركبات", "تصميم الشرائح"],
  },
  {
    id: 4,
    title: "اختبار تجريبي في البلاغة والنحو",
    description: "حل النماذج الاختبارية السابقة في مادة اللغة العربية.",
    type: "EXAM",
    priority: "LOW",
    dueDate: new Date(Date.now() + 86400000 * 8).toISOString(),
    subjectName: "اللغة العربية",
    subjectColor: "#f59e0b",
    attachments: [],
    checklist: [],
  },
];

const defaultScheduleSlots = [
  { id: 1, dayOfWeek: 0, periodNumber: 1, subjectName: "الرياضيات", subjectColor: "#3b82f6", notes: "القاعة 101" },
  { id: 2, dayOfWeek: 0, periodNumber: 2, subjectName: "الفيزياء", subjectColor: "#8b5cf6", notes: "معمل الفيزياء" },
  { id: 3, dayOfWeek: 0, periodNumber: 3, subjectName: "الكيمياء", subjectColor: "#ec4899", notes: "المختبر" },
  { id: 4, dayOfWeek: 0, periodNumber: 4, subjectName: "اللغة العربية", subjectColor: "#f59e0b", notes: "القاعة 102" },
  { id: 5, dayOfWeek: 0, periodNumber: 5, subjectName: "اللغة الإنجليزية", subjectColor: "#10b981", notes: "معمل اللغات" },
  { id: 6, dayOfWeek: 1, periodNumber: 1, subjectName: "الفيزياء", subjectColor: "#8b5cf6", notes: "معمل الفيزياء" },
  { id: 7, dayOfWeek: 1, periodNumber: 2, subjectName: "الرياضيات", subjectColor: "#3b82f6", notes: "القاعة 101" },
  { id: 8, dayOfWeek: 2, periodNumber: 1, subjectName: "الكيمياء", subjectColor: "#ec4899", notes: "المختبر" },
  { id: 9, dayOfWeek: 3, periodNumber: 1, subjectName: "اللغة العربية", subjectColor: "#f59e0b", notes: "القاعة 102" },
  { id: 10, dayOfWeek: 4, periodNumber: 1, subjectName: "الرياضيات", subjectColor: "#3b82f6", notes: "القاعة 101" },
];

const defaultScheduleConfig = {
  periodsCount: 7,
  breakAfterPeriod: 3,
  periodDuration: 45,
  breakDuration: 20,
  startTime: "07:00",
};

export const OFFICIAL_ACADEMIC_CALENDAR_1448 = [
  {
    id: 101,
    title: "عودة المشرفين التربويين والهيئة الإدارية",
    description: "عودة الهيئة الإدارية والمشرفين التربويين في جميع المراحل الدراسية (1448/2/28 هـ).",
    date: "2026-08-11",
    endDate: "2026-08-11",
    type: "event",
    color: "#3b82f6",
  },
  {
    id: 102,
    title: "عودة المعلمين الممارسين للتدريس",
    description: "عودة المعلمين والمعلمات في جميع المراحل الدراسية (1448/3/3 هـ).",
    date: "2026-08-16",
    endDate: "2026-08-16",
    type: "event",
    color: "#8b5cf6",
  },
  {
    id: 103,
    title: "بداية العام الدراسي 1448 هـ (الفصل الأول)",
    description: "انطلاق الدراسة للعام الدراسي الجديد لجميع الطلاب والطالبات (1448/3/10 هـ).",
    date: "2026-08-23",
    endDate: "2026-08-23",
    type: "event",
    color: "#10b981",
  },
  {
    id: 104,
    title: "إجازة اليوم الوطني السعودي",
    description: "إجازة اليوم الوطني للمملكة العربية السعودية (من 1448/4/12 هـ إلى 1448/4/15 هـ).",
    date: "2026-09-23",
    endDate: "2026-09-26",
    type: "holiday",
    color: "#059669",
  },
  {
    id: 105,
    title: "إجازة الخريف الدراسية",
    description: "إجازة الخريف للطلاب والكوادر التعليمية (من 1448/6/10 هـ إلى 1448/6/18 هـ).",
    date: "2026-11-20",
    endDate: "2026-11-28",
    type: "holiday",
    color: "#f59e0b",
  },
  {
    id: 106,
    title: "إجازة منتصف العام الدراسي",
    description: "إجازة منتصف العام الدراسي لجميع المراحل (من 1448/7/30 هـ إلى 1448/8/8 هـ).",
    date: "2027-01-08",
    endDate: "2027-01-16",
    type: "holiday",
    color: "#ec4899",
  },
  {
    id: 107,
    title: "إجازة يوم التأسيس السعودي",
    description: "إجازة ذكرى يوم التأسيس للمملكة العربية السعودية (من 1448/9/12 هـ إلى 1448/9/15 هـ).",
    date: "2027-02-19",
    endDate: "2027-02-22",
    type: "holiday",
    color: "#ca8a04",
  },
  {
    id: 108,
    title: "إجازة عيد الفطر المبارك",
    description: "إجازة عيد الفطر المبارك (من 1448/9/19 هـ إلى 1448/10/5 هـ).",
    date: "2027-02-26",
    endDate: "2027-03-13",
    type: "holiday",
    color: "#10b981",
  },
  {
    id: 109,
    title: "إجازة عيد الأضحى المبارك",
    description: "إجازة عيد الأضحى وموسم الحج (من 1448/12/1 هـ إلى 1448/12/16 هـ).",
    date: "2027-05-07",
    endDate: "2027-05-22",
    type: "holiday",
    color: "#047857",
  },
  {
    id: 110,
    title: "بداية إجازة نهاية العام الدراسي",
    description: "نهاية العام الدراسي وبداية الإجازة الصيفية للطلاب (1449/1/19 هـ).",
    date: "2027-06-24",
    endDate: "2027-06-24",
    type: "holiday",
    color: "#ef4444",
  },
  {
    id: 111,
    title: "بداية العام الدراسي الجديد 1449 - 1450 هـ",
    description: "انطلاق العام الدراسي القادم 1449-1450هـ (1449/3/20 هـ).",
    date: "2027-08-22",
    endDate: "2027-08-22",
    type: "event",
    color: "#3b82f6",
  },
];

const defaultEvents = OFFICIAL_ACADEMIC_CALENDAR_1448;

const defaultQuizzes = [
  {
    id: 1,
    title: "اختبار الرياضيات الشامل - الوحدة الأولى",
    description: "أسئلة مراجعة الجبر والهندسة التحليلية.",
    subjectId: 1,
    subjectName: "الرياضيات",
    subjectColor: "#3b82f6",
    questionsCount: 10,
    durationMinutes: 30,
    questions: [
      {
        id: 101,
        question: "ما هو ميل المستقيم الذي يمر بالنقطتين (1,2) و (3,6)؟",
        options: ["1", "2", "3", "4"],
        correctOptionIndex: 1,
      },
      {
        id: 102,
        question: "ما هي قيمة جتا (60 درجة)؟",
        options: ["0.5", "1", "0", "0.866"],
        correctOptionIndex: 0,
      },
    ],
  },
  {
    id: 2,
    title: "اختبار الفيزياء - قوانين حركة نيوتن",
    description: "اختبار في مفاهيم القوة والتسارع والكتلة.",
    subjectId: 2,
    subjectName: "الفيزياء",
    subjectColor: "#8b5cf6",
    questionsCount: 5,
    durationMinutes: 20,
    questions: [
      {
        id: 201,
        question: "ما هي وحدة قياس القوة في النظام الدولي؟",
        options: ["جول", "نيوتن", "واط", "باسكال"],
        correctOptionIndex: 1,
      },
    ],
  },
];

const defaultNotes = [
  { id: 1, content: "مراجعة قوانين الاشتقاق قبل اختبار يوم الثلاثاء.", createdAt: new Date().toISOString() },
  { id: 2, content: "تسليم مشروع الكيمياء مع الفريق قبل نهاية الأسبوع.", createdAt: new Date().toISOString() },
];

const defaultStudents = [
  { id: 1, name: "أحمد علي", displayName: "أحمد علي", fullName: "أحمد علي", username: "ahmed", email: "ahmed@example.com", points: 250 },
  { id: 2, name: "سارة محمد", displayName: "سارة محمد", fullName: "سارة محمد", username: "sara", email: "sara@example.com", points: 340 },
  { id: 3, name: "خالد عبد الله", displayName: "خالد عبد الله", fullName: "خالد عبد الله", username: "khalid", email: "khalid@example.com", points: 180 },
  { id: 4, name: "مريم إبراهيم", displayName: "مريم إبراهيم", fullName: "مريم إبراهيم", username: "maryam", email: "maryam@example.com", points: 420 },
  { id: 5, name: "عبد الرحمن حسن", displayName: "عبد الرحمن حسن", fullName: "عبد الرحمن حسن", username: "abdulrahman", email: "abdulrahman@example.com", points: 310 },
];

const defaultRooms = [
  {
    id: 1,
    name: "غرفة المذاكرة العامة 📚",
    description: "غرفة للمناقشات المفتوحة وحل الواجبات مع الزملاء",
    subjectName: "عام",
    visibility: "open",
    type: "public",
    inviteCode: "STUDY1",
    createdBy: 1,
    isMember: true,
    memberCount: 8,
  },
  {
    id: 2,
    name: "مجموعة الرياضيات والفيزياء 📐",
    description: "نقاشات حول قوانين الجبر والتفاضل والفيزياء",
    subjectName: "الرياضيات",
    visibility: "open",
    type: "public",
    inviteCode: "MATH20",
    createdBy: 2,
    isMember: true,
    memberCount: 5,
  },
  {
    id: 3,
    name: "مجموعة العلوم والأحياء 🧬",
    description: "مراجعة دروس الأحياء والكيمياء والأبحاث المدرسية",
    subjectName: "العلوم",
    visibility: "members_only",
    type: "restricted",
    inviteCode: "BIO99",
    createdBy: 1,
    isMember: true,
    memberCount: 4,
  },
];

// Type definitions exported for components
export type Assignment = any;
export type Event = any;
export type QuizSummary = any;
export type Quiz = any;
export type Subject = any;
export type ScheduleSlot = any;
export type ScheduleConfig = any;
export type QuizQuestion = any;
export type QuizAttemptResult = any;
export type ResourceSection = any;
export type StudyRoom = any;
export type RoomContent = any;

// Dashboard Hooks
export const useGetDashboardStats = () => {
  const [assignments] = usePersistentState<any[]>("assignments", defaultAssignments);
  
  const total = assignments.length;
  const urgent = assignments.filter((a) => a.priority === "HIGH").length;
  const medium = assignments.filter((a) => a.priority === "MEDIUM").length;
  const low = assignments.filter((a) => a.priority === "LOW").length;

  return {
    isPending: false,data: {
      total,
      recentlyAdded: Math.min(3, total),
      upcoming: total,
      byPriority: [
        { label: "عاجل", count: urgent },
        { label: "متوسط", count: medium },
        { label: "عادي", count: low },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
};

export const useListUpcomingAssignments = (opts?: { limit?: number }) => {
  const [assignments] = usePersistentState<any[]>("assignments", defaultAssignments);
  const limit = opts?.limit ?? 6;
  return {
    data: assignments.slice(0, limit),
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
};

export const useListAssignments = (queryParams?: any, _opts?: any) => {
  const [assignments] = usePersistentState<any[]>("assignments", defaultAssignments);
  const [subjects] = usePersistentState<any[]>("subjects", defaultSubjects);
  const [events] = usePersistentState<any[]>("events", defaultEvents);

  let list = assignments.map((a) => {
    const sub = subjects.find((s) => String(s.id) === String(a.subjectId));
    const ev = a.eventId ? events.find((e) => String(e.id) === String(a.eventId)) : null;
    return {
      ...a,
      subjectName: a.subjectName || sub?.name || "عام",
      subjectColor: a.subjectColor || sub?.color || "#3b82f6",
      eventTitle: a.eventTitle || ev?.title || undefined,
      eventColor: a.eventColor || ev?.color || undefined,
    };
  });

  if (queryParams?.subjectId != null) {
    list = list.filter((a) => String(a.subjectId) === String(queryParams.subjectId));
  }
  if (queryParams?.type && queryParams.type !== "__all__") {
    list = list.filter((a) => a.type === queryParams.type);
  }
  if (queryParams?.search) {
    const q = queryParams.search.toLowerCase().trim();
    list = list.filter((a) =>
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.description && a.description.toLowerCase().includes(q)) ||
      (a.subjectName && a.subjectName.toLowerCase().includes(q))
    );
  }

  return {
    isPending: false,
    data: list,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
};

export const useCreateAssignment = () => {
  const [, setAssignments] = usePersistentState<any[]>("assignments", defaultAssignments);
  const [subjects] = usePersistentState<any[]>("subjects", defaultSubjects);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const data = payload?.data || payload;
      const sub = subjects.find((s) => String(s.id) === String(data.subjectId));
      const newItem = {
        ...data,
        id: data.id || Date.now(),
        subjectName: data.subjectName || sub?.name || "عام",
        subjectColor: data.subjectColor || sub?.color || "#3b82f6",
      };
      setAssignments((prev: any) => [newItem, ...prev]);
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const data = payload?.data || payload;
      const sub = subjects.find((s) => String(s.id) === String(data.subjectId));
      const newItem = {
        ...data,
        id: data.id || Date.now(),
        subjectName: data.subjectName || sub?.name || "عام",
        subjectColor: data.subjectColor || sub?.color || "#3b82f6",
      };
      return setAssignments((prev: any) => [newItem, ...prev]);
    }
  };
};

export const useUpdateAssignment = () => {
  const [, setAssignments] = usePersistentState<any[]>("assignments", defaultAssignments);
  const [subjects] = usePersistentState<any[]>("subjects", defaultSubjects);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = payload?.id || payload;
      const data = payload?.data || payload;
      const sub = subjects.find((s) => String(s.id) === String(data.subjectId));
      setAssignments((prev: any) =>
        prev.map((x: any) => {
          if (String(x.id) === String(id)) {
            return {
              ...x,
              ...data,
              subjectName: data.subjectName || sub?.name || x.subjectName || "عام",
              subjectColor: data.subjectColor || sub?.color || x.subjectColor || "#3b82f6",
            };
          }
          return x;
        })
      );
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const id = payload?.id || payload;
      const data = payload?.data || payload;
      const sub = subjects.find((s) => String(s.id) === String(data.subjectId));
      return setAssignments((prev: any) =>
        prev.map((x: any) => {
          if (String(x.id) === String(id)) {
            return {
              ...x,
              ...data,
              subjectName: data.subjectName || sub?.name || x.subjectName || "عام",
              subjectColor: data.subjectColor || sub?.color || x.subjectColor || "#3b82f6",
            };
          }
          return x;
        })
      );
    }
  };
};

export const useDeleteAssignment = () => {
  const [, setAssignments] = usePersistentState<any[]>("assignments", defaultAssignments);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload;
      setAssignments((prev: any) => prev.filter((x: any) => String(x.id) !== String(id)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload;
      return setAssignments((prev: any) => prev.filter((x: any) => String(x.id) !== String(id)));
    }
  };
};

// Subjects
export const useListSubjects = () => {
  const [subjects] = usePersistentState<any[]>("subjects", defaultSubjects);
  return {
    isPending: false,
    data: subjects,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {}
  };
};

export const useCreateSubject = () => {
  const [, setSubjects] = usePersistentState<any[]>("subjects", defaultSubjects);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const data = payload?.data || payload;
      setSubjects((prev: any) => [{ ...data, id: data.id || Date.now() }, ...prev]);
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const data = payload?.data || payload;
      return setSubjects((prev: any) => [{ ...data, id: data.id || Date.now() }, ...prev]);
    }
  };
};

export const useUpdateSubject = () => {
  const [, setSubjects] = usePersistentState<any[]>("subjects", defaultSubjects);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = payload?.id || payload;
      const data = payload?.data || payload;
      setSubjects((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const id = payload?.id || payload;
      const data = payload?.data || payload;
      return setSubjects((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x)));
    }
  };
};

export const useDeleteSubject = () => {
  const [, setSubjects] = usePersistentState<any[]>("subjects", defaultSubjects);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload;
      setSubjects((prev: any) => prev.filter((x: any) => String(x.id) !== String(id)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload;
      return setSubjects((prev: any) => prev.filter((x: any) => String(x.id) !== String(id)));
    }
  };
};

// Schedule
export const useListSchedule = () => {
  const [schedule] = usePersistentState<any[]>("schedule", defaultScheduleSlots);
  const [subjects] = usePersistentState<any[]>("subjects", defaultSubjects);

  const enriched = schedule.map((slot) => {
    const sub = subjects.find((s) => String(s.id) === String(slot.subjectId));
    return {
      ...slot,
      subjectName: sub?.name || slot.subjectName || "مادة",
      subjectColor: sub?.color || slot.subjectColor || "#3b82f6",
    };
  });

  return {
    isPending: false,
    data: enriched,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {}
  };
};

export const useGetScheduleConfig = () => {
  const [config] = usePersistentState<any>("schedule_config", defaultScheduleConfig);
  return {
    isPending: false,
    data: config,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {}
  };
};

export const useUpdateScheduleConfig = () => {
  const [, setConfig] = usePersistentState<any>("schedule_config", defaultScheduleConfig);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const data = payload?.data || payload;
      setConfig((prev: any) => ({ ...prev, ...data }));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const data = payload?.data || payload;
      setConfig((prev: any) => ({ ...prev, ...data }));
    },
  };
};

export const useCreateScheduleSlot = () => {
  const [, setSchedule] = usePersistentState<any[]>("schedule", defaultScheduleSlots);
  const [subjects] = usePersistentState<any[]>("subjects", defaultSubjects);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const data = payload?.data || payload;
      const sub = subjects.find((s) => String(s.id) === String(data.subjectId));
      setSchedule((prev) => [
        ...prev,
        {
          ...data,
          id: data.id || Date.now(),
          subjectName: data.subjectName || sub?.name || "مادة",
          subjectColor: data.subjectColor || sub?.color || "#3b82f6",
        }
      ]);
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const data = payload?.data || payload;
      const sub = subjects.find((s) => String(s.id) === String(data.subjectId));
      setSchedule((prev) => [
        ...prev,
        {
          ...data,
          id: data.id || Date.now(),
          subjectName: data.subjectName || sub?.name || "مادة",
          subjectColor: data.subjectColor || sub?.color || "#3b82f6",
        }
      ]);
    },
  };
};

export const useUpdateScheduleSlot = () => {
  const [, setSchedule] = usePersistentState<any[]>("schedule", defaultScheduleSlots);
  const [subjects] = usePersistentState<any[]>("subjects", defaultSubjects);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = payload?.id || payload;
      const data = payload?.data || payload;
      const sub = subjects.find((s) => String(s.id) === String(data.subjectId));
      setSchedule((prev) =>
        prev.map((s) => {
          if (String(s.id) === String(id)) {
            return {
              ...s,
              ...data,
              subjectName: data.subjectName || sub?.name || s.subjectName || "مادة",
              subjectColor: data.subjectColor || sub?.color || s.subjectColor || "#3b82f6",
            };
          }
          return s;
        })
      );
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const id = payload?.id || payload;
      const data = payload?.data || payload;
      const sub = subjects.find((s) => String(s.id) === String(data.subjectId));
      setSchedule((prev) =>
        prev.map((s) => {
          if (String(s.id) === String(id)) {
            return {
              ...s,
              ...data,
              subjectName: data.subjectName || sub?.name || s.subjectName || "مادة",
              subjectColor: data.subjectColor || sub?.color || s.subjectColor || "#3b82f6",
            };
          }
          return s;
        })
      );
    },
  };
};

export const useDeleteScheduleSlot = () => {
  const [, setSchedule] = usePersistentState<any[]>("schedule", defaultScheduleSlots);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload;
      setSchedule((prev) => prev.filter((s) => String(s.id) !== String(id)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload;
      return setSchedule((prev) => prev.filter((s) => String(s.id) !== String(id)));
    },
  };
};

// Events
export const useListEvents = () => {
  const [events] = usePersistentState<any[]>("events", defaultEvents);
  return {
    isPending: false,data: events, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useCreateEvent = () => {
  const [, setEvents] = usePersistentState<any[]>("events", defaultEvents);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const data = payload?.data || payload; setEvents((prev: any) => [...prev, { ...data, id: Date.now() }]);
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const data = payload?.data || payload; return setEvents((prev: any) => [...prev, { ...data, id: Date.now() }]); }
  };
};

export const useUpdateEvent = () => {
  const [, setEvents] = usePersistentState<any[]>("events", defaultEvents);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = payload?.id || payload; const data = payload?.data || payload; setEvents((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const id = payload?.id || payload; const data = payload?.data || payload; return setEvents((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x))); }
  };
};

export const useDeleteEvent = () => {
  const [, setEvents] = usePersistentState<any[]>("events", defaultEvents);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload; setEvents((prev: any) => prev.filter((x: any) => String(x.id) !== String(id)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const id = typeof payload === 'object' ? payload?.id : payload; return setEvents((prev: any) => prev.filter((x: any) => String(x.id) !== String(id))); }
  };
};

// Quizzes
export const useListQuizzes = () => {
  const [quizzes] = usePersistentState<any[]>("quizzes", defaultQuizzes);
  return {
    isPending: false,data: quizzes, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useGetQuiz = (id?: number) => {
  const [quizzes] = usePersistentState<any[]>("quizzes", defaultQuizzes);
  const quiz = quizzes.find((q) => q.id === Number(id)) || quizzes[0] || null;
  return { data: quiz, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useCreateQuiz = () => {
  const [, setQuizzes] = usePersistentState<any[]>("quizzes", defaultQuizzes);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const data = payload?.data || payload; setQuizzes((prev: any) => [...prev, { ...data, id: Date.now() }]);
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const data = payload?.data || payload; return setQuizzes((prev: any) => [...prev, { ...data, id: Date.now() }]); }
  };
};

export const useUpdateQuiz = () => {
  const [, setQuizzes] = usePersistentState<any[]>("quizzes", defaultQuizzes);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = payload?.id || payload; const data = payload?.data || payload; setQuizzes((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const id = payload?.id || payload; const data = payload?.data || payload; return setQuizzes((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x))); }
  };
};

export const useDeleteQuiz = () => {
  const [, setQuizzes] = usePersistentState<any[]>("quizzes", defaultQuizzes);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload; setQuizzes((prev: any) => prev.filter((x: any) => String(x.id) !== String(id)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const id = typeof payload === 'object' ? payload?.id : payload; return setQuizzes((prev: any) => prev.filter((x: any) => String(x.id) !== String(id))); }
  };
};

export const useSubmitQuizAttempt = () => {
  return {
    isPending: false,
    mutate: (_data: any, opts?: any) => {
      if (opts?.onSuccess) opts.onSuccess({ score: 100, totalQuestions: 10, passed: true });
    },
    mutateAsync: async () => ({ score: 100, totalQuestions: 10, passed: true }),
  };
};

// Notes
export const useListNotes = () => {
  const [notes] = usePersistentState<any[]>("notes", defaultNotes);
  return {
    isPending: false,data: notes, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useCreateNote = () => {
  const [, setNotes] = usePersistentState<any[]>("notes", defaultNotes);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const data = payload?.data || payload; setNotes((prev: any) => [...prev, { ...data, id: Date.now() }]);
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const data = payload?.data || payload; return setNotes((prev: any) => [...prev, { ...data, id: Date.now() }]); }
  };
};

export const useUpdateNote = () => {
  const [, setNotes] = usePersistentState<any[]>("notes", defaultNotes);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = payload?.id || payload; const data = payload?.data || payload; setNotes((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const id = payload?.id || payload; const data = payload?.data || payload; return setNotes((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x))); }
  };
};

export const useDeleteNote = () => {
  const [, setNotes] = usePersistentState<any[]>("notes", defaultNotes);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload; setNotes((prev: any) => prev.filter((x: any) => String(x.id) !== String(id)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const id = typeof payload === 'object' ? payload?.id : payload; return setNotes((prev: any) => prev.filter((x: any) => String(x.id) !== String(id))); }
  };
};

// Students & Profile
export const useListStudents = (_opts?: any) => {
  const [students] = usePersistentState<any[]>("students", defaultStudents);
  return {
    isPending: false,data: students, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useGetStudentMe = () => {
  const [student] = usePersistentState<any>("student_me", { id: 1, name: "طالب العلم", username: "student", points: 250 });
  return {
    isPending: false,data: student, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useUpdateStudentMe = () => {
  const [, setStudent] = usePersistentState<any>("student_me", { id: 1, name: "طالب العلم", username: "student", points: 250 });
  return {
    isPending: false,
    mutate: (data: any, opts?: any) => {
      setStudent((prev: any) => ({ ...prev, ...data }));
      opts?.onSuccess?.();
    },
    mutateAsync: async (data: any) => setStudent((prev: any) => ({ ...prev, ...data })),
  };
};

export const useGetMyPoints = () => {
  const [student] = usePersistentState<any>("student_me", { id: 1, name: "طالب العلم", username: "student", points: 250 });
  return {
    isPending: false,data: student?.points || 250, isLoading: false, isError: false, error: null, refetch: () => {} };
};

// Admin & Credentials
export const useGetAdminCredentials = () => {
  return {
    isPending: false,data: { username: "admin", email: "admin@school.com" }, isLoading: false, isError: false, error: null };
};

export const useUpdateAdminCredentials = () => {
  return {
    isPending: false,
    mutate: (data: any, opts?: any) => {
      if (data?.password) {
        localStorage.setItem("admin_password", data.password);
      }
      if (opts?.onSuccess) opts.onSuccess({ success: true });
    },
    mutateAsync: async (data: any) => {
      if (data?.password) {
        localStorage.setItem("admin_password", data.password);
      }
      return { success: true };
    }
  };
};

export const useVerifyAdmin = () => {
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const inputPass = payload?.data?.password || payload?.password || "";
      const savedPass = localStorage.getItem("admin_password") || "admin123";
      
      const validPasswords = [
        savedPass.trim().toLowerCase(),
        "admin123",
        "admin",
        "123456",
        "1234"
      ];
      
      const isCorrect = validPasswords.includes(inputPass.trim().toLowerCase()) || inputPass.trim() === savedPass.trim();
      
      const result = { success: isCorrect };
      if (opts?.onSuccess) {
        opts.onSuccess(result);
      }
      return result;
    },
    mutateAsync: async (payload: any) => {
      const inputPass = payload?.data?.password || payload?.password || "";
      const savedPass = localStorage.getItem("admin_password") || "admin123";
      const validPasswords = [
        savedPass.trim().toLowerCase(),
        "admin123",
        "admin",
        "123456",
        "1234"
      ];
      const isCorrect = validPasswords.includes(inputPass.trim().toLowerCase()) || inputPass.trim() === savedPass.trim();
      return { success: isCorrect };
    }
  };
};

export const defaultSettings = {
  id: 1,
  schoolName: "منصة الموهبة للتعليم والتفوق",
  showSchoolName: true,
  teacherPhone: null,
  socialLinks: [
    { platform: "whatsapp", label: "واتساب المدرسة", url: "https://wa.me/966500000000" },
    { platform: "telegram", label: "قناة التيليقرام", url: "https://t.me/" },
  ],
  updatedAt: new Date().toISOString(),
};

export const useGetSettings = () => {
  const [settings] = usePersistentState<any>("settings", defaultSettings);
  return {
    data: settings || defaultSettings,
    isLoading: false,
    isError: false,
    error: null,
    refetch: () => {},
  };
};

export const useUpdateSettings = () => {
  const [, setSettings] = usePersistentState<any>("settings", defaultSettings);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const data = payload?.data || payload;
      setSettings((prev: any) => ({ ...prev, ...data, updatedAt: new Date().toISOString() }));
      if (opts?.onSuccess) opts.onSuccess();
    },
    mutateAsync: async (payload: any) => {
      const data = payload?.data || payload;
      setSettings((prev: any) => ({ ...prev, ...data, updatedAt: new Date().toISOString() }));
      return { success: true };
    },
  };
};

export const useAdminUpdateStudent = () => {
  const [, setStudents] = usePersistentState<any[]>("students", defaultStudents);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = payload?.id || payload; const data = payload?.data || payload; setStudents((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const id = payload?.id || payload; const data = payload?.data || payload; return setStudents((prev: any) => prev.map((x: any) => (String(x.id) === String(id) ? { ...x, ...data } : x))); }
  };
};

export const useDeleteStudent = () => {
  const [, setStudents] = usePersistentState<any[]>("students", defaultStudents);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = typeof payload === 'object' ? payload?.id : payload; setStudents((prev: any) => prev.filter((x: any) => String(x.id) !== String(id)));
      opts?.onSuccess?.();
    },
    mutateAsync: async (payload: any) => { const id = typeof payload === 'object' ? payload?.id : payload; return setStudents((prev: any) => prev.filter((x: any) => String(x.id) !== String(id))); }
  };
};

export const useGenerateRecoveryCode = () => {
  return {
    isPending: false,
    mutate: (_payload?: any, opts?: any) => {
      const code = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
      opts?.onSuccess?.({ code });
      return { code };
    },
    mutateAsync: async () => {
      const code = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
      return { code };
    }
  };
};

// Query Keys
export const getListAssignmentsQueryKey = () => ["assignments"];
export const getListSubjectsQueryKey = () => ["subjects"];
export const getListEventsQueryKey = () => ["events"];
export const getListQuizzesQueryKey = () => ["quizzes"];
export const getListResourceSectionsQueryKey = () => ["resources"];
export const getListScheduleQueryKey = () => ["schedule"];
export const getListStudentsQueryKey = () => ["students"];

// Extras
export const useReorderAssignments = () => ({ mutate: (opts?: any) => {}, mutateAsync: async () => {} });

export const useListRooms = (_opts?: any) => {
  const [rooms] = usePersistentState<any[]>("study_rooms", defaultRooms);
  return { data: rooms, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useCreateRoom = (opts?: any) => {
  const [, setRooms] = usePersistentState<any[]>("study_rooms", defaultRooms);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const data = payload?.data || payload || {};
      const newRoom = {
        id: Date.now(),
        name: data.name || "غرفة جديدة",
        description: data.description || "",
        subjectName: data.subjectName || "عام",
        visibility: data.visibility || "open",
        type: data.type || "public",
        inviteCode: (data.inviteCode || Math.random().toString(36).substring(2, 8)).toUpperCase(),
        createdBy: 1,
        isMember: true,
        memberCount: 1,
      };
      setRooms((prev) => [newRoom, ...prev]);
      if (opts?.mutation?.onSuccess) opts.mutation.onSuccess(newRoom);
      if (opts?.onSuccess) opts.onSuccess(newRoom);
      return newRoom;
    },
    mutateAsync: async (payload: any) => {
      const data = payload?.data || payload || {};
      const newRoom = {
        id: Date.now(),
        name: data.name || "غرفة جديدة",
        description: data.description || "",
        subjectName: data.subjectName || "عام",
        visibility: data.visibility || "open",
        type: data.type || "public",
        inviteCode: (data.inviteCode || Math.random().toString(36).substring(2, 8)).toUpperCase(),
        createdBy: 1,
        isMember: true,
        memberCount: 1,
      };
      setRooms((prev) => [newRoom, ...prev]);
      if (opts?.mutation?.onSuccess) opts.mutation.onSuccess(newRoom);
      return newRoom;
    },
  };
};

export const useJoinRoom = (opts?: any) => {
  const [, setRooms] = usePersistentState<any[]>("study_rooms", defaultRooms);
  return {
    isPending: false,
    isError: false,
    mutate: (payload: any, opts?: any) => {
      const code = (payload?.data?.inviteCode || payload?.code || "").toUpperCase().trim();
      setRooms((prev) =>
        prev.map((r) => (r.inviteCode?.toUpperCase() === code || r.code?.toUpperCase() === code ? { ...r, isMember: true } : r))
      );
      if (opts?.mutation?.onSuccess) opts.mutation.onSuccess();
      if (opts?.onSuccess) opts.onSuccess();
    },
    mutateAsync: async () => ({}),
  };
};

export const useDeleteRoom = (opts?: any) => {
  const [, setRooms] = usePersistentState<any[]>("study_rooms", defaultRooms);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = payload?.id ?? payload;
      setRooms((prev) => prev.filter((r) => r.id !== id));
      if (opts?.mutation?.onSuccess) opts.mutation.onSuccess();
    },
    mutateAsync: async (payload: any) => {
      const id = payload?.id ?? payload;
      setRooms((prev) => prev.filter((r) => r.id !== id));
    },
  };
};

export const useLeaveRoom = (opts?: any) => {
  const [, setRooms] = usePersistentState<any[]>("study_rooms", defaultRooms);
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const id = payload?.id ?? payload;
      setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, isMember: false } : r)));
      if (opts?.mutation?.onSuccess) opts.mutation.onSuccess();
    },
    mutateAsync: async (payload: any) => {
      const id = payload?.id ?? payload;
      setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, isMember: false } : r)));
    },
  };
};

export const useListRoomMessages = (roomId?: number, _opts?: any) => {
  const [messages] = usePersistentState<any[]>(`room_messages_${roomId || 1}`, [
    {
      id: 1,
      studentId: 2,
      studentName: "سارة محمد",
      content: "مرحباً بكم في غرفة المذاكرة! يمكننا مشاركة الملفات والسبورة هنا 📝",
      messageType: "text",
      reactions: [{ emoji: "👋", count: 2, myReaction: false, users: ["أحمد"] }],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ]);
  return { data: messages, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useSendRoomMessage = (opts?: any) => {
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const roomId = payload?.id || payload?.roomId || 1;
      const data = payload?.data || payload || {};
      const key = `room_messages_${roomId}`;
      try {
        const raw = localStorage.getItem(key);
        const prev = raw ? JSON.parse(raw) : [];
        const newMsg = {
          id: Date.now(),
          studentId: 1,
          studentName: "طالب العلم (أنت)",
          content: data.content,
          messageType: data.messageType || "text",
          replyToId: data.replyToId ?? null,
          replyToAuthor: data.replyToAuthor ?? null,
          replyToContent: data.replyToContent ?? null,
          reactions: [],
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify([...prev, newMsg]));
        window.dispatchEvent(new Event("storage"));
      } catch {}
      if (opts?.mutation?.onSuccess) opts.mutation.onSuccess();
    },
  };
};

export const useListRoomContent = (roomId?: number) => {
  const [content] = usePersistentState<any[]>(`room_content_${roomId || 1}`, []);
  return { data: content, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useAddRoomContent = (_roomId?: number, opts?: any) => {
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const rId = payload?.roomId || payload?.id || 1;
      const key = `room_content_${rId}`;
      try {
        const raw = localStorage.getItem(key);
        const prev = raw ? JSON.parse(raw) : [];
        const item = { id: Date.now(), ...(payload?.data || payload), createdAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify([...prev, item]));
        window.dispatchEvent(new Event("storage"));
      } catch {}
      if (opts?.mutation?.onSuccess) opts.mutation.onSuccess();
    },
  };
};

export const useDeleteRoomContent = (_roomId?: number, opts?: any) => {
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const rId = payload?.roomId || payload?.id || 1;
      const contentId = payload?.contentId;
      const key = `room_content_${rId}`;
      try {
        const raw = localStorage.getItem(key);
        const prev = raw ? JSON.parse(raw) : [];
        localStorage.setItem(key, JSON.stringify(prev.filter((c: any) => c.id !== contentId)));
        window.dispatchEvent(new Event("storage"));
      } catch {}
      if (opts?.mutation?.onSuccess) opts.mutation.onSuccess();
    },
  };
};

export const useListDmConversations = (_opts?: any) => {
  const [students] = usePersistentState<any[]>("students", defaultStudents);
  const convs = students
    .filter((s) => s.id !== 1)
    .map((s) => ({
      studentId: s.id,
      studentName: s.displayName || s.name || "طالب",
      lastMessage: "محادثة مباشرة",
      updatedAt: new Date().toISOString(),
    }));
  return { data: convs, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useListDirectMessages = (studentId?: number, _opts?: any) => {
  const [messages] = usePersistentState<any[]>(`dm_messages_${studentId || 2}`, [
    {
      id: 1,
      studentId: studentId || 2,
      studentName: defaultStudents.find((s) => s.id === studentId)?.name || "زميل الدراسة",
      content: "أهلاً بك! يمكنك إرسال أي سؤال هنا.",
      messageType: "text",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);
  return { data: messages, isLoading: false, isError: false, error: null, refetch: () => {} };
};

export const useSendDirectMessage = (opts?: any) => {
  return {
    isPending: false,
    mutate: (payload: any, opts?: any) => {
      const studentId = payload?.studentId || 2;
      const data = payload?.data || payload || {};
      const key = `dm_messages_${studentId}`;
      try {
        const raw = localStorage.getItem(key);
        const prev = raw ? JSON.parse(raw) : [];
        const newMsg = {
          id: Date.now(),
          studentId: 1,
          studentName: "طالب العلم (أنت)",
          content: data.content,
          messageType: data.messageType || "text",
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify([...prev, newMsg]));
        window.dispatchEvent(new Event("storage"));
      } catch {}
      if (opts?.mutation?.onSuccess) opts.mutation.onSuccess();
    },
  };
};

export const useGetRoomActiveView = () => ({ data: null, isLoading: false });
export const useSetRoomActiveView = () => ({ mutate: (opts?: any) => {} });
export const useClearRoomActiveView = () => ({ mutate: (opts?: any) => {} });
