import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  setDoc,
  getDoc
} from "firebase/firestore";
import { db, safeFirestoreWrite, handleQuotaExceeded } from "./firebase";
import { addStudyFile, type StudyFile, getStoredPlatforms, saveStoredPlatforms, getStoredFlashcards, saveStoredFlashcards } from "./cloud-sync";

export type SuggestionType = "file" | "platform" | "flashcard" | "quiz" | "assignment" | "schedule" | "calendar" | "general";
export type SuggestionStatus = "pending" | "approved" | "rejected";

export interface StudentSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  category?: string;
  description?: string;
  data: any; // specific payload (file url, platform details, flashcard details, quiz details)
  studentId: number;
  studentName: string;
  studentUsername?: string;
  status: SuggestionStatus;
  adminFeedback?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_SUGGESTIONS_KEY = "talented_student_suggestions_v1";

export function getLocalSuggestions(): StudentSuggestion[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUGGESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalSuggestions(list: StudentSuggestion[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SUGGESTIONS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("student_suggestions_change", { detail: { suggestions: list } }));
  } catch {}
}

/**
 * Submit a new student suggestion
 */
export async function submitStudentSuggestion(params: {
  type: SuggestionType;
  title: string;
  category?: string;
  description?: string;
  data: any;
  studentId: number;
  studentName: string;
  studentUsername?: string;
}): Promise<StudentSuggestion> {
  const newSuggestion: StudentSuggestion = {
    id: `sug_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type: params.type,
    title: params.title,
    category: params.category || "عام",
    description: params.description || "",
    data: params.data,
    studentId: params.studentId,
    studentName: params.studentName,
    studentUsername: params.studentUsername,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const current = getLocalSuggestions();
  saveLocalSuggestions([newSuggestion, ...current]);

  // Sync to Firestore
  safeFirestoreWrite(async () => {
    const docRef = doc(db, "suggestions", newSuggestion.id);
    await setDoc(docRef, {
      ...newSuggestion,
      serverTime: serverTimestamp()
    });
  });

  return newSuggestion;
}

/**
 * Subscribe to suggestions in real-time
 */
export function subscribeToSuggestions(onUpdate: (suggestions: StudentSuggestion[]) => void): () => void {
  // Emit initial local
  onUpdate(getLocalSuggestions());

  const handleLocal = (e: any) => {
    if (e.detail?.suggestions) {
      onUpdate(e.detail.suggestions);
    } else {
      onUpdate(getLocalSuggestions());
    }
  };
  window.addEventListener("student_suggestions_change", handleLocal);

  try {
    const q = query(collection(db, "suggestions"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const cloudList: StudentSuggestion[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        cloudList.push({
          id: docSnap.id,
          type: d.type || "file",
          title: d.title || "اقتراح",
          category: d.category,
          description: d.description,
          data: d.data || {},
          studentId: d.studentId || 1,
          studentName: d.studentName || "طالب",
          studentUsername: d.studentUsername,
          status: d.status || "pending",
          adminFeedback: d.adminFeedback,
          reviewedBy: d.reviewedBy,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt,
        });
      });

      // Merge local with cloud
      const local = getLocalSuggestions();
      const map = new Map<string, StudentSuggestion>();
      local.forEach(s => map.set(s.id, s));
      cloudList.forEach(s => map.set(s.id, s));
      const merged = Array.from(map.values()).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      saveLocalSuggestions(merged);
      onUpdate(merged);
    }, (err) => {
      console.warn("Suggestions realtime error:", err);
    });

    return () => {
      window.removeEventListener("student_suggestions_change", handleLocal);
      unsub();
    };
  } catch {
    return () => {
      window.removeEventListener("student_suggestions_change", handleLocal);
    };
  }
}

/**
 * Admin: Approve a suggestion and publish it to the relevant section
 */
export async function approveStudentSuggestion(
  suggestion: StudentSuggestion,
  adminName: string = "المشرف"
): Promise<void> {
  const updated: StudentSuggestion = {
    ...suggestion,
    status: "approved",
    reviewedBy: adminName,
    updatedAt: new Date().toISOString(),
  };

  // 1. Publish to the target section based on type
  try {
    if (suggestion.type === "file") {
      const fileData = suggestion.data;
      await addStudyFile({
        title: suggestion.title || fileData.title,
        category: suggestion.category || fileData.category || "تجميعات",
        subject: fileData.subject || suggestion.category || "عام",
        url: fileData.fileUrl || fileData.url || "",
        size: fileData.size || "1.5 MB",
        pages: fileData.pages || 12,
        tags: fileData.tags || ["مساهمة طلابية"],
        description: suggestion.description || fileData.description || `ملف مقترح من الطالب ${suggestion.studentName}`,
        uploadedBy: suggestion.studentName,
      });
    } else if (suggestion.type === "platform") {
      const platData = suggestion.data;
      const current = getStoredPlatforms();
      const newPlatform = {
        id: `plat_sug_${Date.now()}`,
        name: suggestion.title || platData.name,
        url: platData.url || platData.fileUrl || "",
        category: suggestion.category || platData.category || "مخصصة",
        desc: suggestion.description || platData.desc || `منصة مقترحة من الطالب ${suggestion.studentName}`,
        badge: "مساهمة طلابية ⭐",
        color: platData.color || "#3b82f6",
        tags: platData.tags || ["مورد طلابي"],
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      saveStoredPlatforms([newPlatform, ...current]);
    } else if (suggestion.type === "quiz") {
      const quizData = suggestion.data;
      const customQuizzesKey = "talented_custom_quizzes_v1";
      try {
        const existing = JSON.parse(localStorage.getItem(customQuizzesKey) || "[]");
        const newQuiz = {
          id: `quiz_sug_${Date.now()}`,
          title: suggestion.title || quizData.title,
          category: suggestion.category || quizData.category || "قدرات",
          description: suggestion.description || quizData.description || `اختبار مقترح من الطالب ${suggestion.studentName}`,
          externalUrl: quizData.externalUrl || quizData.url || quizData.fileUrl || "",
          tags: quizData.tags || ["اختبار مقترح"],
          createdBy: suggestion.studentName,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(customQuizzesKey, JSON.stringify([newQuiz, ...existing]));
      } catch {}
    } else if (suggestion.type === "flashcard") {
      const cardData = suggestion.data;
      const current = getStoredFlashcards();
      const newCard = {
        id: `fc-sug-${Date.now()}`,
        word: cardData.word || suggestion.title,
        phonetic: cardData.phonetic || "/.../",
        partOfSpeech: cardData.partOfSpeech || "noun",
        meaningAr: cardData.meaningAr || cardData.translation || suggestion.description || "",
        exampleEn: cardData.exampleEn || "",
        exampleAr: cardData.exampleAr || "",
        category: suggestion.category || cardData.category || "أكاديمي وSTEP",
        difficulty: cardData.difficulty || "متوسط",
      };
      saveStoredFlashcards([newCard, ...current]);
    }
  } catch (e) {
    console.error("Error publishing approved suggestion:", e);
  }

  // 2. Update suggestion status in storage & Firestore
  const list = getLocalSuggestions().map(s => s.id === suggestion.id ? updated : s);
  saveLocalSuggestions(list);

  safeFirestoreWrite(async () => {
    const docRef = doc(db, "suggestions", suggestion.id);
    await setDoc(docRef, { ...updated, serverTime: serverTimestamp() }, { merge: true });
  });
}

/**
 * Admin: Reject a suggestion with optional feedback
 */
export async function rejectStudentSuggestion(
  id: string,
  feedback?: string,
  adminName: string = "المشرف"
): Promise<void> {
  const current = getLocalSuggestions();
  const updated = current.map(s => {
    if (s.id === id) {
      return {
        ...s,
        status: "rejected" as const,
        adminFeedback: feedback || "تمت المراجعة والاعتذار عن النشر حالياً",
        reviewedBy: adminName,
        updatedAt: new Date().toISOString(),
      };
    }
    return s;
  });

  saveLocalSuggestions(updated);

  safeFirestoreWrite(async () => {
    const docRef = doc(db, "suggestions", id);
    await setDoc(docRef, {
      status: "rejected",
      adminFeedback: feedback || "تمت المراجعة والاعتذار عن النشر حالياً",
      reviewedBy: adminName,
      updatedAt: new Date().toISOString(),
      serverTime: serverTimestamp()
    }, { merge: true });
  });
}

/**
 * Delete a suggestion
 */
export async function deleteStudentSuggestion(id: string): Promise<void> {
  const current = getLocalSuggestions().filter(s => s.id !== id);
  saveLocalSuggestions(current);

  safeFirestoreWrite(async () => {
    const docRef = doc(db, "suggestions", id);
    await deleteDoc(docRef);
  });
}
