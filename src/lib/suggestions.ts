import { addStudyFile, getStoredPlatforms, saveStoredPlatforms, getStoredFlashcards, saveStoredFlashcards } from "./cloud-sync";

export type SuggestionType = "file" | "platform" | "flashcard" | "quiz" | "assignment" | "schedule" | "calendar" | "general";
export type SuggestionStatus = "pending" | "approved" | "rejected";

export interface StudentSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  category?: string;
  description?: string;
  data: any; // specific payload
  studentId: number;
  studentName: string;
  studentUsername?: string;
  status: SuggestionStatus;
  adminReply?: string;
  adminRepliedAt?: string;
  adminFeedback?: string; // Backwards compatible alias
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
 * Submit a new student suggestion/request
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

  // Add to local list first for instant UI response
  const current = getLocalSuggestions();
  saveLocalSuggestions([newSuggestion, ...current]);

  // Save to the SQL database API
  try {
    const response = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSuggestion),
    });
    if (response.ok) {
      const result = await response.json();
      if (result.data && result.data[0]) {
        return result.data[0];
      }
    }
  } catch (err) {
    console.warn("Failed to save suggestion to backend, using local store:", err);
  }

  return newSuggestion;
}

/**
 * Fetch all suggestions/requests from the backend
 */
export async function fetchAllSuggestionsFromServer(): Promise<StudentSuggestion[]> {
  try {
    const res = await fetch("/api/suggestions");
    if (res.ok) {
      const list: StudentSuggestion[] = await res.json();
      if (Array.isArray(list)) {
        // Map fields for safety and JSON parsing of data
        const mappedList = list.map((item: any) => {
          let parsedData = item.data;
          if (typeof item.data === "string") {
            try {
              parsedData = JSON.parse(item.data);
            } catch {
              parsedData = item.data;
            }
          }
          return {
            ...item,
            data: parsedData || {},
            adminFeedback: item.adminReply || item.adminFeedback, // alias support
          };
        });
        saveLocalSuggestions(mappedList);
        return mappedList;
      }
    }
  } catch (e) {
    console.warn("Failed to fetch suggestions from backend:", e);
  }
  return getLocalSuggestions();
}

/**
 * Subscribe to suggestions (polls the backend every 4 seconds for updates)
 */
export function subscribeToSuggestions(onUpdate: (suggestions: StudentSuggestion[]) => void): () => void {
  // Emit current local cache immediately
  onUpdate(getLocalSuggestions());

  const handleLocal = (e: any) => {
    if (e.detail?.suggestions) {
      onUpdate(e.detail.suggestions);
    }
  };
  window.addEventListener("student_suggestions_change", handleLocal);

  const poll = async () => {
    const updated = await fetchAllSuggestionsFromServer();
    onUpdate(updated);
  };

  poll();
  const timer = setInterval(poll, 4000);

  return () => {
    window.removeEventListener("student_suggestions_change", handleLocal);
    clearInterval(timer);
  };
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
    adminReply: "تمت الموافقة والنشر بنجاح ✅",
    adminRepliedAt: new Date().toISOString(),
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

  // 2. Update status in DB
  try {
    await fetch(`/api/suggestions/${suggestion.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "approved",
        adminReply: "تمت الموافقة والنشر بنجاح ✅",
        adminRepliedAt: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.warn("Failed to update suggestion in backend:", err);
  }

  // Update local
  const list = getLocalSuggestions().map(s => s.id === suggestion.id ? updated : s);
  saveLocalSuggestions(list);
}

/**
 * Admin: Reject a suggestion with a feedback message/reply
 */
export async function rejectStudentSuggestion(
  id: string,
  replyText?: string,
  adminName: string = "المشرف"
): Promise<void> {
  const reply = replyText || "تمت المراجعة والاعتذار عن النشر حالياً";
  const replyTime = new Date().toISOString();

  try {
    await fetch(`/api/suggestions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "rejected",
        adminReply: reply,
        adminRepliedAt: replyTime,
      }),
    });
  } catch (err) {
    console.warn("Failed to reject suggestion in backend:", err);
  }

  const current = getLocalSuggestions();
  const updated = current.map(s => {
    if (s.id === id) {
      return {
        ...s,
        status: "rejected" as const,
        adminReply: reply,
        adminFeedback: reply, // alias
        adminRepliedAt: replyTime,
        reviewedBy: adminName,
        updatedAt: replyTime,
      };
    }
    return s;
  });
  saveLocalSuggestions(updated);
}

/**
 * Delete a suggestion completely
 */
export async function deleteStudentSuggestion(id: string): Promise<void> {
  try {
    await fetch(`/api/suggestions/${id}`, { method: "DELETE" });
  } catch (err) {
    console.warn("Failed to delete suggestion in backend:", err);
  }

  const current = getLocalSuggestions().filter(s => s.id !== id);
  saveLocalSuggestions(current);
}
