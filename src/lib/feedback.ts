import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useStudentProfile } from "@/lib/use-student-profile";

export interface StudentQuestion {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  questionText: string;
  imageUrl?: string | null;
  aiExplanationAttempt?: string | null;
  teacherReply?: string | null;
  repliedBy?: string | null;
  status: "pending" | "answered" | "reviewed";
  createdAt: string;
  repliedAt?: string | null;
}

export interface StudentSuggestion {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  content: string;
  category: "أكاديمي" | "المنصة" | "الجدول" | "المكتبة" | "عام";
  status: "pending" | "approved" | "implemented" | "rejected";
  adminResponse?: string | null;
  likes: number;
  createdAt: string;
  updatedAt?: string;
}

const LOCAL_QUESTIONS_KEY = "talented_student_questions_cache_v1";
const LOCAL_SUGGESTIONS_KEY = "talented_student_suggestions_cache_v1";

export async function fetchQuestionsApi(): Promise<StudentQuestion[]> {
  try {
    const res = await fetch("/api/escalated-questions");
    if (!res.ok) throw new Error("Failed to fetch questions");
    const data = await res.json();
    if (Array.isArray(data)) {
      try {
        localStorage.setItem(LOCAL_QUESTIONS_KEY, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn("Using cached questions fallback:", err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_QUESTIONS_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return [];
}

export async function submitQuestionApi(payload: {
  studentId: string;
  studentName: string;
  subject: string;
  questionText: string;
  imageUrl?: string | null;
  aiExplanationAttempt?: string | null;
}): Promise<StudentQuestion> {
  const res = await fetch("/api/escalated-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "فشل إرسال السؤال للمعلم");
  }
  const created = await res.json();
  window.dispatchEvent(new CustomEvent("questions_data_change"));
  return created;
}

export async function fetchSuggestionsApi(): Promise<StudentSuggestion[]> {
  try {
    const res = await fetch("/api/suggestions");
    if (!res.ok) throw new Error("Failed to fetch suggestions");
    const data = await res.json();
    if (Array.isArray(data)) {
      try {
        localStorage.setItem(LOCAL_SUGGESTIONS_KEY, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn("Using cached suggestions fallback:", err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_SUGGESTIONS_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return [];
}

export async function submitSuggestionApi(payload: {
  studentId: string;
  studentName: string;
  title: string;
  content: string;
  category: string;
}): Promise<StudentSuggestion> {
  const res = await fetch("/api/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "فشل إرسال المقترح");
  }
  const created = await res.json();
  window.dispatchEvent(new CustomEvent("suggestions_data_change"));
  return created;
}

export async function likeSuggestionApi(id: string, newLikes: number): Promise<any> {
  const res = await fetch(`/api/suggestions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ likes: newLikes }),
  });
  if (!res.ok) throw new Error("Failed to like suggestion");
  window.dispatchEvent(new CustomEvent("suggestions_data_change"));
  return await res.json();
}
