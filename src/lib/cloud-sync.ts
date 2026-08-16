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

const LOCAL_STORAGE_FILES_KEY = "talented_school_custom_files_v1";
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

// Fetch custom and curated files from Cloud SQL + Local cache
export async function getStudyFiles(): Promise<StudyFile[]> {
  try {
    const customLocal: StudyFile[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FILES_KEY) || "[]");
    const deletedIds = getDeletedFileIds();

    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const cloudFiles = await res.json();
        if (Array.isArray(cloudFiles)) {
          const map = new Map<string, StudyFile>();
          INITIAL_CURATED_FILES.forEach(f => map.set(f.id, f));
          customLocal.forEach(f => map.set(f.id, f));
          cloudFiles.forEach((d: any) => {
            let tags: string[] = [];
            try {
              if (d.tags) tags = typeof d.tags === "string" ? JSON.parse(d.tags) : d.tags;
            } catch {}
            map.set(d.id, {
              id: d.id,
              title: d.title || "ملف",
              category: d.category || "أخرى",
              subject: d.subject || "",
              url: d.url || "",
              size: d.size || "1.5 MB",
              pages: d.pages || 10,
              tags,
              description: d.description || "",
              isCustom: true,
              isFavorite: d.isFavorite || false,
              color: d.color,
              uploadedBy: d.uploadedBy,
              createdAt: d.createdAt || new Date().toISOString()
            });
          });
          return Array.from(map.values()).filter(f => !deletedIds.has(f.id));
        }
      }
    } catch (e) {
      console.warn("API fetch files fallback to local cache:", e);
    }

    const map = new Map<string, StudyFile>();
    INITIAL_CURATED_FILES.forEach(f => map.set(f.id, f));
    customLocal.forEach(f => map.set(f.id, f));
    return Array.from(map.values()).filter(f => !deletedIds.has(f.id));
  } catch (err) {
    console.error("Error reading study files:", err);
    return INITIAL_CURATED_FILES.filter(f => !getDeletedFileIds().has(f.id));
  }
}

/**
 * Subscribe to study files in real time
 */
export function subscribeToStudyFiles(onUpdate: (files: StudyFile[]) => void): () => void {
  // Emit initial local state immediately
  try {
    const customLocal: StudyFile[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FILES_KEY) || "[]");
    const deletedIds = getDeletedFileIds();
    const map = new Map<string, StudyFile>();
    INITIAL_CURATED_FILES.forEach(f => map.set(f.id, f));
    customLocal.forEach(f => map.set(f.id, f));
    onUpdate(Array.from(map.values()).filter(f => !deletedIds.has(f.id)));
  } catch {}

  let isMounted = true;
  const refresh = async () => {
    const all = await getStudyFiles();
    if (isMounted) onUpdate(all);
  };

  refresh();

  const handleUpdateEvent = () => {
    refresh();
  };

  window.addEventListener("app_file_deleted", handleUpdateEvent);
  window.addEventListener("app_file_updated", handleUpdateEvent);

  const interval = setInterval(refresh, 8000);

  return () => {
    isMounted = false;
    clearInterval(interval);
    window.removeEventListener("app_file_deleted", handleUpdateEvent);
    window.removeEventListener("app_file_updated", handleUpdateEvent);
  };
}

// Add a new file
export async function addStudyFile(file: Omit<StudyFile, "id" | "createdAt">): Promise<StudyFile> {
  const newFile: StudyFile = {
    ...file,
    id: "custom_" + Date.now(),
    isCustom: true,
    createdAt: new Date().toISOString()
  };

  try {
    const current = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FILES_KEY) || "[]");
    const updated = [newFile, ...current];
    localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save to local storage:", err);
  }

  // Save to Cloud SQL PostgreSQL API
  try {
    await fetch("/api/files", {
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
    });
  } catch (e) {
    console.warn("Cloud SQL save file error:", e);
  }

  window.dispatchEvent(new CustomEvent("app_file_updated"));
  return newFile;
}

// Delete custom or curated file
export async function deleteStudyFile(id: string): Promise<void> {
  recordDeletedFileId(id);

  try {
    const current: StudyFile[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FILES_KEY) || "[]");
    const updated = current.filter(f => f.id !== id);
    localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  try {
    await fetch(`/api/files/${id}`, { method: "DELETE" });
  } catch (e) {
    console.warn("Cloud SQL delete file error:", e);
  }

  window.dispatchEvent(new CustomEvent("app_file_deleted", { detail: id }));
}

// Update study file
export async function updateStudyFile(id: string, updates: Partial<StudyFile>): Promise<StudyFile | null> {
  let updatedFile: StudyFile | null = null;
  try {
    const customLocal: StudyFile[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FILES_KEY) || "[]");
    const existingIndex = customLocal.findIndex(f => f.id === id);

    if (existingIndex >= 0) {
      customLocal[existingIndex] = { ...customLocal[existingIndex], ...updates };
      localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify(customLocal));
      updatedFile = customLocal[existingIndex];
    } else {
      const curated = INITIAL_CURATED_FILES.find(f => f.id === id);
      if (curated) {
        const cloned: StudyFile = { ...curated, ...updates, isCustom: true };
        const updated = [cloned, ...customLocal];
        localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify(updated));
        updatedFile = cloned;
      }
    }
  } catch (err) {
    console.error("Failed to update study file:", err);
  }

  if (!updatedFile) {
    updatedFile = { id, ...updates } as StudyFile;
  }

  window.dispatchEvent(new CustomEvent("app_file_updated"));
  return updatedFile;
}

// Toggle favorite study file
export function toggleStudyFileFavorite(id: string): boolean {
  try {
    const customLocal: StudyFile[] = JSON.parse(localStorage.getItem(LOCAL_STORAGE_FILES_KEY) || "[]");
    const existingIndex = customLocal.findIndex(f => f.id === id);
    if (existingIndex >= 0) {
      customLocal[existingIndex].isFavorite = !customLocal[existingIndex].isFavorite;
      localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify(customLocal));
      try {
        fetch(`/api/files/${id}/favorite`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFavorite: customLocal[existingIndex].isFavorite })
        }).catch(() => {});
      } catch {}
      return !!customLocal[existingIndex].isFavorite;
    } else {
      const curated = INITIAL_CURATED_FILES.find(f => f.id === id);
      if (curated) {
        const cloned: StudyFile = { ...curated, isFavorite: true, isCustom: true };
        localStorage.setItem(LOCAL_STORAGE_FILES_KEY, JSON.stringify([cloned, ...customLocal]));
        return true;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return false;
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

export function getStoredPlatforms(defaultList: any[] = []): any[] {
  try {
    const saved = localStorage.getItem("app_data_platforms") ||
                  localStorage.getItem(LOCAL_STORAGE_PLATFORMS_KEY) || 
                  localStorage.getItem("custom_educational_platforms_v3") || 
                  localStorage.getItem("custom_educational_platforms_v2");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let merged = [...parsed];
        defaultList.forEach((defItem) => {
          const index = merged.findIndex((p: any) => 
            p.id === defItem.id || 
            (p.url && defItem.url && (p.url.includes(defItem.id) || defItem.url.includes(p.id))) ||
            (p.name && defItem.name && p.name.trim() === defItem.name.trim())
          );
          if (index === -1) {
            merged.push(defItem);
          } else {
            merged[index] = {
              ...defItem,
              ...merged[index],
              isFavorite: merged[index].isFavorite || false,
              isCustom: merged[index].isCustom || false,
            };
          }
        });

        merged = merged.map((item: any) => {
          const newItem = { ...item };
          if (!newItem.tags || !Array.isArray(newItem.tags) || newItem.tags.length === 0) {
            newItem.tags = [newItem.category || "منصة", "مورد تعليمي"];
          }
          if (newItem.url) {
            if (newItem.url.includes("t.me") || newItem.url.includes("telegram")) {
              if (!newItem.badge) newItem.badge = "تليجرام 📱";
              newItem.openInNewTab = true;
            } else if (newItem.url.includes("salla.sa") || (newItem.name && newItem.name.includes("متجر"))) {
              if (!newItem.badge) newItem.badge = "متجر وحقائب 🛒";
              newItem.openInNewTab = true;
            } else if (newItem.url.includes("youtube.com") || newItem.url.includes("youtu.be")) {
              if (!newItem.badge) newItem.badge = "شروحات فيديو 📺";
            }
          }
          return newItem;
        });

        return merged;
      }
    }
  } catch (e) {
    console.error("Error reading platforms from storage:", e);
  }
  return defaultList;
}

export function saveStoredPlatforms(platforms: any[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PLATFORMS_KEY, JSON.stringify(platforms));
    localStorage.setItem("app_data_platforms", JSON.stringify(platforms));
    localStorage.setItem("custom_educational_platforms_v3", JSON.stringify(platforms));
    localStorage.setItem("custom_educational_platforms_v2", JSON.stringify(platforms));
    window.dispatchEvent(new CustomEvent("platforms_storage_change", { detail: { platforms } }));
    window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key: "platforms", value: platforms } }));
  } catch (e) {
    console.error("Error saving platforms to storage:", e);
  }
}

// Ensure global changes sync back to platforms page
if (typeof window !== "undefined") {
  window.addEventListener("app_data_change", (e: any) => {
    if (e.detail?.key === "platforms" && Array.isArray(e.detail.value)) {
      try {
        localStorage.setItem(LOCAL_STORAGE_PLATFORMS_KEY, JSON.stringify(e.detail.value));
        localStorage.setItem("app_data_platforms", JSON.stringify(e.detail.value));
        window.dispatchEvent(new CustomEvent("platforms_storage_change", { detail: { platforms: e.detail.value } }));
      } catch {}
    }
  });
}

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
    localStorage.setItem(LOCAL_STORAGE_PLATFORM_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error(e);
  }
}

// Custom Reminders
export function getCustomReminders(): CustomReminder[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_REMINDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCustomReminder(reminder: Omit<CustomReminder, "id" | "completed">): CustomReminder {
  const newReminder: CustomReminder = {
    ...reminder,
    id: "rem_" + Date.now(),
    completed: false,
    createdAt: new Date().toISOString()
  };
  const current = getCustomReminders();
  const updated = [newReminder, ...current];
  localStorage.setItem(LOCAL_STORAGE_REMINDERS_KEY, JSON.stringify(updated));
  return newReminder;
}

export function toggleReminderStatus(id: string): CustomReminder[] {
  const current = getCustomReminders();
  const updated = current.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
  localStorage.setItem(LOCAL_STORAGE_REMINDERS_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteReminder(id: string): CustomReminder[] {
  const current = getCustomReminders();
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem(LOCAL_STORAGE_REMINDERS_KEY, JSON.stringify(updated));
  return updated;
}

// Flashcards Storage & Persistence
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
      localStorage.setItem(LOCAL_STORAGE_DELETED_FLASHCARDS_KEY, JSON.stringify(current));
    }
  } catch {}
}

export function getStoredFlashcards(defaultList: any[] = []): any[] {
  const deletedIds = getDeletedFlashcardIds();
  try {
    const savedAppData = localStorage.getItem("app_data_flashcards");
    const savedLegacy = localStorage.getItem(LOCAL_STORAGE_FLASHCARDS_KEY);
    const saved = savedAppData || savedLegacy;
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((c: any) => c && c.id && !deletedIds.has(c.id));
      }
    }
  } catch (e) {
    console.error("Error reading flashcards from storage:", e);
  }
  return defaultList.filter((c: any) => c && c.id && !deletedIds.has(c.id));
}

export function saveStoredFlashcards(flashcards: any[]) {
  const deletedIds = getDeletedFlashcardIds();
  const cleanList = flashcards.filter(c => c && c.id && !deletedIds.has(c.id));
  try {
    localStorage.setItem(LOCAL_STORAGE_FLASHCARDS_KEY, JSON.stringify(cleanList));
    localStorage.setItem("app_data_flashcards", JSON.stringify(cleanList));
    window.dispatchEvent(new CustomEvent("flashcards_storage_change", { detail: { flashcards: cleanList } }));
    window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key: "flashcards", value: cleanList } }));
  } catch (e) {
    console.error("Error saving flashcards to storage:", e);
  }
}

export function deleteStoredFlashcard(id: string, fallbackList: any[] = []) {
  recordDeletedFlashcardId(id);
  const current = getStoredFlashcards(fallbackList);
  const updated = current.filter(c => c.id !== id);
  try {
    localStorage.setItem(LOCAL_STORAGE_FLASHCARDS_KEY, JSON.stringify(updated));
    localStorage.setItem("app_data_flashcards", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("flashcards_storage_change", { detail: { flashcards: updated } }));
    window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key: "flashcards", value: updated } }));
  } catch (e) {
    console.error(e);
  }
}

// Ensure global changes sync back to flashcards page
if (typeof window !== "undefined") {
  window.addEventListener("app_data_change", (e: any) => {
    if (e.detail?.key === "flashcards" && Array.isArray(e.detail.value)) {
      try {
        localStorage.setItem(LOCAL_STORAGE_FLASHCARDS_KEY, JSON.stringify(e.detail.value));
        localStorage.setItem("app_data_flashcards", JSON.stringify(e.detail.value));
        window.dispatchEvent(new CustomEvent("flashcards_storage_change", { detail: { flashcards: e.detail.value } }));
      } catch {}
    }
  });
}
