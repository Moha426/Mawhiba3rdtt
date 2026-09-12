import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db, safeFirestoreWrite } from "./firebase";
import { idbGet, idbSet, safeLocalStorageSet } from "./indexed-db";

export interface StudyFile {
  id: string;
  title: string;
  category: "قدرات كمي" | "قدرات لفظي" | "تجميعات" | "تحصيلي" | "ملخصات وقوانين" | "خرائط مفاهيم" | "أخرى" | string;
  subject?: string;
  url: string;
  size?: string;
  pages?: number;
  tags: string[];
  description?: string;
  isCustom?: boolean;
  isFavorite?: boolean;
  color?: string;
  uploadedBy?: string;
  createdAt?: any;
}

export interface PlatformCustomItem {
  id: string;
  name: string;
  url: string;
  category: "قدرات وتحصيلي" | "منصات تعليمية" | "فيديو ومحتوى" | "مخصصة" | string;
  desc: string;
  badge?: string;
  color: string;
  gradient?: string;
  iconBg?: string;
  tags: string[];
  isCustom?: boolean;
  isFavorite?: boolean;
  createdAt?: any;
}

export interface CustomReminder {
  id: string;
  userId?: string;
  title: string;
  category: string;
  scheduledTime: string;
  completed: boolean;
  createdAt?: any;
}

// Built-in Curated Educational Resources & PDFs
export const INITIAL_CURATED_FILES: StudyFile[] = [
  {
    id: "qudrat-math-1",
    title: "تجميعات 1445-1446 الشاملة - القدرات (القسم الكمي)",
    category: "قدرات كمي",
    subject: "الرياضيات والمنطق",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    size: "14.2 MB",
    pages: 120,
    tags: ["تجميعات 1446", "قدرات كمي", "الهندسة", "الجبر", "الاحتمالات"],
    description: "أحدث الأسئلة ونماذج المحوسب للقدرات مع الشرح والحلول النموذجية خطوة بخطوة."
  },
  {
    id: "qudrat-verbal-1",
    title: "حقيبة التناظر اللفظي واستيعاب المقروء وإكمال الجمل",
    category: "قدرات لفظي",
    subject: "اللغة العربية",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    size: "9.8 MB",
    pages: 85,
    tags: ["قدرات لفظي", "تناظر لفظي", "إكمال الجمل", "المفردة الشاذة"],
    description: "بنك شامل لأكثر العلاقات تكراراً في التناظر واستراتيجيات حل قطع استيعاب المقروء."
  },
  {
    id: "tahsili-math-physics",
    title: "ملخص قوانين التحصيلي الذهبية (رياضيات + فيزياء)",
    category: "تحصيلي",
    subject: "تحصيلي علمي",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    size: "6.5 MB",
    pages: 45,
    tags: ["تحصيلي", "قوانين فيزياء", "حساب المثلثات", "تفاضل وتكامل"],
    description: "جميع قوانين المرحلة الثانوية مجمعة ومرتبة مع تطبيقات مباشرة وأهم التريكات."
  },
  {
    id: "tahsili-chem-bio",
    title: "خرائط المفاهيم الشاملة لمادتي الكيمياء والأحياء (تحصيلي)",
    category: "خرائط مفاهيم",
    subject: "كيمياء وأحياء",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    size: "12.0 MB",
    pages: 60,
    tags: ["خرائط مفاهيم", "كيمياء عضوية", "علم البيئة", "الوراثة"],
    description: "مخططات بصرية ملونة لتسهيل الحفظ والمراجعة السريعة قبل الاختبار."
  },
  {
    id: "shortcuts-sheet",
    title: "شيت القوانين السحرية للحل السريع في القدرات",
    category: "ملخصات وقوانين",
    subject: "مهارات الحل السريع",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    size: "3.4 MB",
    pages: 22,
    tags: ["استراتيجيات", "حل سريع", "قوانين ذهبية", "توفير الوقت"],
    description: "أقصر الطرق الرياضية لحل مسائل الأعمار، السرعة والمسافة، والنسب المئوية بدون معادلات معقدة."
  },
  {
    id: "exam-bank-1445",
    title: "نماذج اختبارات القدرات المحوسبة المجانية للتدريب الذاتي",
    category: "تجميعات",
    subject: "اختبارات تجريبية",
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    size: "18.5 MB",
    pages: 150,
    tags: ["اختبارات تجريبية", "محوسب", "تجميعات حديثة"],
    description: "اختبارات كاملة تحاكي واجهة قياس الفعلية لقياس الزمن ومستوى الجاهزية."
  }
];

export const LOCAL_STORAGE_FILES_KEY = "talented_school_custom_files_v1";
export const LOCAL_STORAGE_APP_DATA_FILES_KEY = "app_data_study_files";
const LOCAL_STORAGE_REMINDERS_KEY = "talented_school_custom_reminders_v1";
const LOCAL_STORAGE_DELETED_FILES_KEY = "talented_school_deleted_files_v1";

function getDeletedFileIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_FILES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function recordDeletedFileId(id: string) {
  try {
    const current = Array.from(getDeletedFileIds());
    if (!current.includes(id)) {
      current.push(id);
      localStorage.setItem(LOCAL_STORAGE_DELETED_FILES_KEY, JSON.stringify(current));
    }
  } catch {}
}

/**
 * Deduplicate any array of study files by id to guarantee unique keys and prevent duplicate renders
 */
export function deduplicateFiles(files: StudyFile[]): StudyFile[] {
  if (!Array.isArray(files)) return [];
  const seen = new Set<string>();
  const result: StudyFile[] = [];
  for (const f of files) {
    if (!f || !f.id) continue;
    const strId = String(f.id);
    if (!seen.has(strId)) {
      seen.add(strId);
      result.push(f);
    }
  }
  return result;
}

/**
 * Save complete study files list to local cache (IndexedDB + safe localStorage) and Firestore cloud storage
 */
export function saveStudyFiles(files: StudyFile[]) {
  const cleanFiles = deduplicateFiles(files);
  try {
    // 1. Asynchronously store full fidelity in IndexedDB (bypasses 5MB quota)
    idbSet("study_files", cleanFiles);

    // 2. Safely store in localStorage with automatic quota management
    safeLocalStorageSet(LOCAL_STORAGE_APP_DATA_FILES_KEY, cleanFiles);

    window.dispatchEvent(new CustomEvent("app_file_updated", { detail: cleanFiles }));
    window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key: "study_files", value: cleanFiles } }));
  } catch (e) {
    console.warn("Notice: Local study files write warning:", e);
  }

  // Cloud Firestore Sync
  safeFirestoreWrite(async () => {
    const docRef = doc(db, "app_data", "study_files");
    await setDoc(docRef, { value: cleanFiles, updatedAt: serverTimestamp() }, { merge: true });
  });
}

/**
 * Fetch custom and curated files from IndexedDB + Firestore + Cloud SQL + Local cache
 */
export async function getStudyFiles(): Promise<StudyFile[]> {
  const deletedIds = getDeletedFileIds();
  try {
    // 1. Try IndexedDB first for full-fidelity payload (avoids quota issues)
    try {
      const idbData = await idbGet<StudyFile[]>("study_files");
      if (idbData && Array.isArray(idbData) && idbData.length > 0) {
        return deduplicateFiles(idbData.filter(f => f && f.id && !deletedIds.has(f.id)));
      }
    } catch {}

    // 2. Try local cache
    const savedAppData = localStorage.getItem(LOCAL_STORAGE_APP_DATA_FILES_KEY);
    const savedLocal = localStorage.getItem(LOCAL_STORAGE_FILES_KEY);
    const saved = savedAppData || savedLocal;

    let localList: StudyFile[] | null = null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localList = deduplicateFiles(parsed);
        }
      } catch {}
    }

    // 3. Try Firestore cloud
    try {
      const docRef = doc(db, "app_data", "study_files");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const d = snap.data();
        if (d && Array.isArray(d.value)) {
          const cloudFiles = deduplicateFiles(d.value.filter(f => f && f.id && !deletedIds.has(f.id)));
          saveStudyFiles(cloudFiles);
          return cloudFiles;
        }
      }
    } catch {}

    if (localList !== null) {
      return deduplicateFiles(localList.filter(f => f && f.id && !deletedIds.has(f.id)));
    }

    // 4. Fallback to default curated list
    return deduplicateFiles(INITIAL_CURATED_FILES.filter(f => !deletedIds.has(f.id)));
  } catch (err) {
    console.warn("Notice: Error reading study files, falling back to curated list:", err);
    return deduplicateFiles(INITIAL_CURATED_FILES.filter(f => !deletedIds.has(f.id)));
  }
}

/**
 * Subscribe to study files in real time via Firestore and IndexedDB
 */
export function subscribeToStudyFiles(onUpdate: (files: StudyFile[]) => void): () => void {
  const safeUpdate = (list: StudyFile[]) => {
    onUpdate(deduplicateFiles(list));
  };

  // Emit initial local state immediately
  try {
    const deletedIds = getDeletedFileIds();
    
    // Quick async load from IndexedDB
    idbGet<StudyFile[]>("study_files").then((idbFiles) => {
      if (idbFiles && Array.isArray(idbFiles) && idbFiles.length > 0) {
        safeUpdate(idbFiles.filter(f => f && f.id && !deletedIds.has(f.id)));
      }
    }).catch(() => {});

    const saved = localStorage.getItem(LOCAL_STORAGE_APP_DATA_FILES_KEY) || localStorage.getItem(LOCAL_STORAGE_FILES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        safeUpdate(parsed.filter(f => f && f.id && !deletedIds.has(f.id)));
      } else {
        safeUpdate(INITIAL_CURATED_FILES.filter(f => !deletedIds.has(f.id)));
      }
    } else {
      safeUpdate(INITIAL_CURATED_FILES.filter(f => !deletedIds.has(f.id)));
    }
  } catch {
    safeUpdate(INITIAL_CURATED_FILES);
  }

  // Local window events listener
  const handleLocalChange = (e: any) => {
    if (e.detail && Array.isArray(e.detail)) {
      safeUpdate(e.detail);
    } else if (e.detail?.key === "study_files" && Array.isArray(e.detail.value)) {
      safeUpdate(e.detail.value);
    } else {
      getStudyFiles().then(safeUpdate);
    }
  };
  window.addEventListener("app_file_updated", handleLocalChange);
  window.addEventListener("app_file_deleted", handleLocalChange);
  window.addEventListener("app_data_change", handleLocalChange as any);

  // Firestore Realtime Subscription
  let unsubFirestore = () => {};
  try {
    const docRef = doc(db, "app_data", "study_files");
    unsubFirestore = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.value)) {
          const deletedIds = getDeletedFileIds();
          const clean = deduplicateFiles(data.value.filter(f => f && f.id && !deletedIds.has(f.id)));
          
          // Asynchronously update IndexedDB and safe localStorage
          idbSet("study_files", clean);
          safeLocalStorageSet(LOCAL_STORAGE_APP_DATA_FILES_KEY, clean);

          safeUpdate(clean);
        }
      } else {
        // Seed if missing
        safeFirestoreWrite(async () => {
          await setDoc(docRef, { value: INITIAL_CURATED_FILES, updatedAt: serverTimestamp() });
        });
      }
    }, (err) => {
      console.warn("Study files firestore onSnapshot warning:", err);
    });
  } catch (e) {
    console.warn("Firestore subscription error for study_files:", e);
  }

  return () => {
    window.removeEventListener("app_file_updated", handleLocalChange);
    window.removeEventListener("app_file_deleted", handleLocalChange);
    window.removeEventListener("app_data_change", handleLocalChange as any);
    unsubFirestore();
  };
}

// Add a new file
export async function addStudyFile(file: Omit<StudyFile, "id" | "createdAt">): Promise<StudyFile> {
  const newFile: StudyFile = {
    ...file,
    id: "custom_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    isCustom: true,
    createdAt: new Date().toISOString()
  };

  const current = await getStudyFiles();
  const updated = [newFile, ...current];
  saveStudyFiles(updated);

  // Also save to Express API if running
  try {
    fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newFile.id,
        title: newFile.title,
        category: newFile.category,
        subject: newFile.subject,
        url: newFile.url,
        size: newFile.size,
        pages: newFile.pages,
        tags: JSON.stringify(newFile.tags || []),
        description: newFile.description,
        color: newFile.color,
        uploadedBy: newFile.uploadedBy,
      }),
    }).catch(() => {});
  } catch {}

  return newFile;
}

// Delete custom or curated file
export async function deleteStudyFile(id: string): Promise<void> {
  recordDeletedFileId(id);
  const current = await getStudyFiles();
  const updated = current.filter(f => f.id !== id);
  saveStudyFiles(updated);

  try {
    fetch(`/api/files/${id}`, { method: "DELETE" }).catch(() => {});
  } catch {}
}

// Update study file
export async function updateStudyFile(id: string, updates: Partial<StudyFile>): Promise<StudyFile | null> {
  const current = await getStudyFiles();
  let updatedFile: StudyFile | null = null;
  const updated = current.map(f => {
    if (f.id === id) {
      updatedFile = { ...f, ...updates };
      return updatedFile;
    }
    return f;
  });

  if (updatedFile) {
    saveStudyFiles(updated);
  }
  return updatedFile;
}

// Toggle favorite study file
export function toggleStudyFileFavorite(id: string): boolean {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_APP_DATA_FILES_KEY) || localStorage.getItem(LOCAL_STORAGE_FILES_KEY);
    const list: StudyFile[] = raw ? JSON.parse(raw) : INITIAL_CURATED_FILES;
    let isFav = false;
    const updated = list.map(f => {
      if (f.id === id) {
        isFav = !f.isFavorite;
        return { ...f, isFavorite: isFav };
      }
      return f;
    });
    saveStudyFiles(updated);
    return isFav;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Custom Categories for Library
const LOCAL_STORAGE_LIBRARY_CATEGORIES_KEY = "talented_school_custom_lib_cats_v1";
export const DEFAULT_LIBRARY_CATEGORIES = [
  "قدرات كمي",
  "قدرات لفظي",
  "تجميعات",
  "تحصيلي",
  "ملخصات وقوانين",
  "خرائط مفاهيم",
];

export function getLibraryCategories(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_LIBRARY_CATEGORIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_LIBRARY_CATEGORIES;
}

export function saveLibraryCategories(categories: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_LIBRARY_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error(e);
  }
}

// Platform Categories & Persistence
export const LOCAL_STORAGE_PLATFORMS_KEY = "talented_school_custom_platforms_v1";
const LOCAL_STORAGE_PLATFORM_CATEGORIES_KEY = "talented_school_custom_plat_cats_v1";
export const DEFAULT_PLATFORM_CATEGORIES = [
  "قدرات وتحصيلي",
  "اختبارات دولية (SAT/IELTS/STEP)",
  "برامج الموهبة وCPP",
  "منصات تعليمية",
  "قنوات وتليجرام",
  "فيديو ومحتوى",
  "مخصصة",
];

export function getPlatformCategories(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_PLATFORM_CATEGORIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_PLATFORM_CATEGORIES;
}

export function savePlatformCategories(categories: string[]) {
  try {
    safeLocalStorageSet(LOCAL_STORAGE_PLATFORM_CATEGORIES_KEY, categories);
  } catch (e) {
    console.warn(e);
  }
}

export function getStoredPlatforms(defaultList: any[] = []): any[] {
  try {
    const saved = localStorage.getItem("app_data_platforms") ||
                  localStorage.getItem(LOCAL_STORAGE_PLATFORMS_KEY) || 
                  localStorage.getItem("custom_educational_platforms_v3") || 
                  localStorage.getItem("custom_educational_platforms_v2");
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Notice: reading platforms from storage:", e);
  }
  return defaultList;
}

export function saveStoredPlatforms(platforms: any[]) {
  try {
    idbSet("app_data_platforms", platforms);
    safeLocalStorageSet(LOCAL_STORAGE_PLATFORMS_KEY, platforms);
    safeLocalStorageSet("app_data_platforms", platforms);
    window.dispatchEvent(new CustomEvent("platforms_storage_change", { detail: { platforms } }));
    window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key: "platforms", value: platforms } }));
  } catch (e) {
    console.warn("Notice: saving platforms to storage:", e);
  }
  safeFirestoreWrite(async () => {
    const docRef = doc(db, "app_data", "platforms");
    await setDoc(docRef, { value: platforms, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// Flashcards Storage & Persistence - Bug-Free Deletion & Empty Handling
export const LOCAL_STORAGE_FLASHCARDS_KEY = "talented_english_flashcards_v1";
export const LOCAL_STORAGE_DELETED_FLASHCARDS_KEY = "talented_english_deleted_ids_v1";

export function getDeletedFlashcardIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_FLASHCARDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function recordDeletedFlashcardId(id: string) {
  try {
    const current = Array.from(getDeletedFlashcardIds());
    if (!current.includes(id)) {
      current.push(id);
      safeLocalStorageSet(LOCAL_STORAGE_DELETED_FLASHCARDS_KEY, current);
    }
  } catch {}
}

/**
 * Returns stored flashcards without reviving deleted default cards when empty.
 */
export function getStoredFlashcards(defaultList: any[] = []): any[] {
  const deletedIds = getDeletedFlashcardIds();
  const isCustomCard = (c: any) =>
    c && c.id && (
      c.isCustom ||
      c.isPersonal ||
      String(c.id).startsWith("custom_") ||
      String(c.id).startsWith("fc-admin-") ||
      String(c.id).startsWith("fc-personal-") ||
      String(c.id).startsWith("fc-ai-") ||
      String(c.id).startsWith("fc-imported-")
    );
  try {
    const savedAppData = localStorage.getItem("app_data_flashcards");
    const savedLegacy = localStorage.getItem(LOCAL_STORAGE_FLASHCARDS_KEY);
    const saved = savedAppData !== null ? savedAppData : savedLegacy;
    if (saved !== null && saved !== undefined) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const defaultWords = new Set(defaultList.map((d: any) => d?.word?.trim()?.toLowerCase()));
        const customClean = parsed.filter((c: any) => isCustomCard(c) && !deletedIds.has(c.id) && !defaultWords.has(c?.word?.trim()?.toLowerCase()));
        const cleanDefaults = defaultList.filter((c: any) => c && c.id && !deletedIds.has(c.id));
        return [...cleanDefaults, ...customClean];
      }
    }
  } catch (e) {
    console.warn("Notice: reading flashcards from storage:", e);
  }
  return defaultList.filter((c: any) => c && c.id && !deletedIds.has(c.id));
}

export function saveStoredFlashcards(flashcards: any[]) {
  const deletedIds = getDeletedFlashcardIds();
  const cleanList = Array.isArray(flashcards) ? flashcards.filter(c => c && c.id && !deletedIds.has(c.id)) : [];
  try {
    idbSet("app_data_flashcards", cleanList);
    safeLocalStorageSet(LOCAL_STORAGE_FLASHCARDS_KEY, cleanList);
    safeLocalStorageSet("app_data_flashcards", cleanList);
    window.dispatchEvent(new CustomEvent("flashcards_storage_change", { detail: { flashcards: cleanList } }));
    window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key: "flashcards", value: cleanList } }));
  } catch (e) {
    console.warn("Notice: saving flashcards to storage:", e);
  }

  // Cloud Firestore persistence
  safeFirestoreWrite(async () => {
    const docRef = doc(db, "app_data", "flashcards");
    await setDoc(docRef, { value: cleanList, updatedAt: serverTimestamp() }, { merge: true });
  });
}

export function deleteStoredFlashcard(id: string, fallbackList: any[] = []) {
  recordDeletedFlashcardId(id);
  const current = getStoredFlashcards(fallbackList);
  const updated = current.filter(c => c.id !== id);
  saveStoredFlashcards(updated);
}

// Custom Reminders
export function getCustomReminders(): CustomReminder[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REMINDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomReminder(params: {
  title: string;
  category?: string;
  scheduledTime: string;
}): CustomReminder {
  const newReminder: CustomReminder = {
    id: `rem_${Date.now()}`,
    title: params.title,
    category: params.category || "مذاكرة",
    scheduledTime: params.scheduledTime,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  const current = getCustomReminders();
  const updated = [newReminder, ...current];
  try {
    safeLocalStorageSet(LOCAL_STORAGE_REMINDERS_KEY, updated);
  } catch {}
  return newReminder;
}

export function toggleReminderStatus(id: string): CustomReminder[] {
  const current = getCustomReminders();
  const updated = current.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
  try {
    safeLocalStorageSet(LOCAL_STORAGE_REMINDERS_KEY, updated);
  } catch {}
  return updated;
}

export function deleteReminder(id: string): CustomReminder[] {
  const current = getCustomReminders();
  const updated = current.filter(r => r.id !== id);
  try {
    safeLocalStorageSet(LOCAL_STORAGE_REMINDERS_KEY, updated);
  } catch {}
  return updated;
}

// Ensure global changes sync back
if (typeof window !== "undefined") {
  window.addEventListener("app_data_change", (e: any) => {
    if (e.detail?.key === "platforms" && Array.isArray(e.detail.value)) {
      try {
        idbSet("app_data_platforms", e.detail.value);
        safeLocalStorageSet(LOCAL_STORAGE_PLATFORMS_KEY, e.detail.value);
        safeLocalStorageSet("app_data_platforms", e.detail.value);
        window.dispatchEvent(new CustomEvent("platforms_storage_change", { detail: { platforms: e.detail.value } }));
      } catch {}
    }
    if (e.detail?.key === "flashcards" && Array.isArray(e.detail.value)) {
      try {
        idbSet("app_data_flashcards", e.detail.value);
        safeLocalStorageSet(LOCAL_STORAGE_FLASHCARDS_KEY, e.detail.value);
        safeLocalStorageSet("app_data_flashcards", e.detail.value);
        window.dispatchEvent(new CustomEvent("flashcards_storage_change", { detail: { flashcards: e.detail.value } }));
      } catch {}
    }
    if (e.detail?.key === "study_files" && Array.isArray(e.detail.value)) {
      try {
        idbSet("study_files", e.detail.value);
        safeLocalStorageSet(LOCAL_STORAGE_FILES_KEY, e.detail.value);
        safeLocalStorageSet(LOCAL_STORAGE_APP_DATA_FILES_KEY, e.detail.value);
        window.dispatchEvent(new CustomEvent("app_file_updated", { detail: e.detail.value }));
      } catch {}
    }
  });
}
