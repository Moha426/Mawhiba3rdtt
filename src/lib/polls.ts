import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useStudentProfile } from "@/lib/use-student-profile";
import { usePersistentState } from "./api-client-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, safeFirestoreWrite } from "./firebase";

export type PollType = "choice" | "text" | "quiz" | "action" | "rating" | "emoji";

export interface Poll {
  id: number;
  question: string;
  options: string[] | string;
  status: "active" | "closed";
  type: PollType;
  category?: string;
  imageUrl?: string | null;
  isPublic: boolean;
  totalVotes: number;
  allowMultiple: boolean;
  preventWithdraw: boolean;
  isPinned?: boolean;
  correctOptionIndex?: number | null;
  quizExplanation?: string | null;
  actionTitle?: string | null;
  actionDescription?: string | null;
  actionStatus?: "pending" | "executed" | null;
  actionExecutedBy?: string | null;
  actionExecutedAt?: string | null;
  showVoterNames?: boolean;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PollVote {
  id: number;
  pollId: number;
  userId: string;
  userName: string;
  optionIndex?: number | null;
  textAnswer?: string | null;
  ratingValue?: number | null;
  createdAt: string;
}

export interface PollWithStats extends Poll {
  parsedOptions: string[];
  votes: PollVote[];
  optionCounts: number[];
  optionPercentages: number[];
  userVotedOptions: number[];
  userVotedText?: string | null;
  userTextResponses: string[];
  userVotes: PollVote[];
  userVotedRating?: number | null;
  averageRating?: number;
  hasVoted: boolean;
  isExpired: boolean;
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "guest_client";
  try {
    let deviceId = localStorage.getItem("app_poll_device_id_v3");
    if (!deviceId) {
      deviceId = "device_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      localStorage.setItem("app_poll_device_id_v3", deviceId);
    }
    return deviceId;
  } catch {
    return "device_guest";
  }
}

export const SAMPLE_POLL_TEMPLATES: Poll[] = [
  {
    id: 1,
    question: "ما هو الوقت الأنسب لجدولة حصص المراجعة المكثفة لااختبار القدرات والتحصيلي القادم؟",
    options: [
      "العصر (من 4:00 إلى 5:30 عصراً)",
      "المساء (من 7:30 إلى 9:00 مساءً)",
      "عطلة نهاية الأسبوع (السبت صباحاً)",
      "تسجيلات مرئية متاحة في أي وقت"
    ],
    status: "active",
    type: "choice",
    category: "تنظيمي وجداول",
    imageUrl: null,
    isPublic: true,
    totalVotes: 0,
    allowMultiple: false,
    preventWithdraw: false,
    isPinned: true,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    question: "قرار تنفيذي: هل تؤيد اعتماد يوم السبت كيوم تدريب حر وتجميعات إضافية؟",
    options: ["نعم، أؤيد بشدة ونحتاج حصص تجميعات", "لا، أفضل الاكتفاء بأيام الأسبوع"],
    status: "active",
    type: "action",
    category: "قرارات وفعاليات",
    actionTitle: "تثبيت حصص التجميعات الحرة يوم السبت في الجدول الدراسي",
    actionDescription: "في حال وصول نسبة التأييد لأكثر من 60% سيتم إدراج الرابط في الجدول وتنبيه المعلمين.",
    actionStatus: "pending",
    imageUrl: null,
    isPublic: true,
    totalVotes: 0,
    allowMultiple: false,
    preventWithdraw: false,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    question: "تحدي اليوم (قدرات كمي): إذا كان 4x + 3 = 19، فما قيمة 2x - 1؟",
    options: ["5", "7", "9", "11"],
    status: "active",
    type: "quiz",
    category: "تحدي وتنافس",
    correctOptionIndex: 1,
    quizExplanation: "الحل: 4x = 19 - 3 = 16 => x = 4. بالتعويض: 2(4) - 1 = 8 - 1 = 7. أحسنت!",
    imageUrl: null,
    isPublic: true,
    totalVotes: 0,
    allowMultiple: false,
    preventWithdraw: true,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    question: "صندوق الأفكار: ما هي الميزة أو التجميعة التي تقترح إضافتها للمكتبة والمنصة هذا الشهر؟",
    options: [],
    status: "active",
    type: "text",
    category: "اقتراحات الطلاب",
    imageUrl: null,
    isPublic: true,
    totalVotes: 0,
    allowMultiple: true,
    preventWithdraw: false,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 5,
    question: "تقييمك لمستوى صعوبة وشروحات بطاقات المفردات الإنجليزية (STEP Vocab)؟",
    options: ["نجمة 1 (سهل جداً)", "نجمتان", "3 نجوم (مناسب)", "4 نجوم", "5 نجوم (ممتاز ومفيد جداً)"],
    status: "active",
    type: "rating",
    category: "استطلاع جودة",
    imageUrl: null,
    isPublic: true,
    totalVotes: 0,
    allowMultiple: false,
    preventWithdraw: false,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    createdAt: new Date().toISOString(),
  }
];

export const DEFAULT_POLLS = SAMPLE_POLL_TEMPLATES;

function getCloudPolls(): Poll[] {
  try {
    const raw = localStorage.getItem("app_data_polls");
    if (raw) return JSON.parse(raw);
    const cached = localStorage.getItem("talented_school_polls_cache_v3");
    if (cached) return JSON.parse(cached);
  } catch {}
  return SAMPLE_POLL_TEMPLATES;
}

function saveCloudPolls(polls: Poll[]) {
  try {
    localStorage.setItem("app_data_polls", JSON.stringify(polls));
    localStorage.setItem("talented_school_polls_cache_v3", JSON.stringify(polls));
  } catch {}

  safeFirestoreWrite(async () => {
    const docRef = doc(db, "app_data", "polls");
    await setDoc(docRef, { value: polls, updatedAt: serverTimestamp() }, { merge: true });
  });

  window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key: "polls", value: polls } }));
  window.dispatchEvent(new CustomEvent("polls_data_change", { detail: { key: "polls", value: polls } }));
}

function getCloudVotes(): PollVote[] {
  try {
    const raw = localStorage.getItem("app_data_poll_votes");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCloudVotes(votes: PollVote[]) {
  try {
    localStorage.setItem("app_data_poll_votes", JSON.stringify(votes));
  } catch {}

  safeFirestoreWrite(async () => {
    const docRef = doc(db, "app_data", "poll_votes");
    await setDoc(docRef, { value: votes, updatedAt: serverTimestamp() }, { merge: true });
  });

  window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key: "poll_votes", value: votes } }));
  window.dispatchEvent(new CustomEvent("polls_data_change", { detail: { key: "poll_votes", value: votes } }));
}

export async function fetchPollsApi(): Promise<Poll[]> {
  return getCloudPolls();
}

export async function fetchPollVotesApi(pollId: number): Promise<PollVote[]> {
  const votes = getCloudVotes();
  return votes.filter((v) => Number(v.pollId) === Number(pollId));
}

export async function createPollApi(pollData: Partial<Poll>): Promise<Poll> {
  const newPoll: Poll = {
    id: Date.now(),
    question: pollData.question || "استطلاع جديد",
    options: pollData.options || [],
    status: pollData.status || "active",
    type: pollData.type || "choice",
    category: pollData.category || "عام",
    imageUrl: pollData.imageUrl || null,
    isPublic: pollData.isPublic !== false,
    totalVotes: 0,
    allowMultiple: Boolean(pollData.allowMultiple),
    preventWithdraw: Boolean(pollData.preventWithdraw),
    isPinned: Boolean(pollData.isPinned),
    correctOptionIndex: pollData.correctOptionIndex,
    quizExplanation: pollData.quizExplanation,
    actionTitle: pollData.actionTitle,
    actionDescription: pollData.actionDescription,
    actionStatus: pollData.actionStatus || "pending",
    expiresAt: pollData.expiresAt !== undefined ? pollData.expiresAt : null,
    createdAt: new Date().toISOString(),
  };

  const currentPolls = getCloudPolls();
  const updatedPolls = [newPoll, ...currentPolls.filter((p) => Number(p.id) !== Number(newPoll.id))];
  saveCloudPolls(updatedPolls);

  try {
    fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPoll),
    }).catch(() => {});
  } catch {}

  return newPoll;
}

export async function updatePollApi(id: number, pollData: Partial<Poll>): Promise<Poll> {
  const currentPolls = getCloudPolls();
  let updated: Poll | null = null;
  const nextList = currentPolls.map((p) => {
    if (Number(p.id) === Number(id)) {
      updated = { ...p, ...pollData, updatedAt: new Date().toISOString() };
      return updated;
    }
    return p;
  });
  saveCloudPolls(nextList);

  try {
    fetch(`/api/polls/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pollData),
    }).catch(() => {});
  } catch {}

  return updated || (pollData as Poll);
}

export async function executePollActionApi(id: number, executedBy: string): Promise<Poll> {
  const patchData = {
    actionStatus: "executed" as const,
    actionExecutedBy: executedBy,
    actionExecutedAt: new Date().toISOString(),
  };
  return await updatePollApi(id, patchData);
}

export async function deletePollApi(id: number): Promise<boolean> {
  const currentPolls = getCloudPolls();
  const nextList = currentPolls.filter((p) => Number(p.id) !== Number(id));
  saveCloudPolls(nextList);

  const currentVotes = getCloudVotes();
  const nextVotes = currentVotes.filter((v) => Number(v.pollId) !== Number(id));
  saveCloudVotes(nextVotes);

  try {
    fetch(`/api/polls/${id}`, { method: "DELETE" }).catch(() => {});
  } catch {}

  return true;
}

export async function votePollApi(
  pollId: number,
  userId: string,
  userName: string,
  optionIndex: number | null,
  textAnswer?: string | null,
  ratingValue?: number | null,
  isMultiple?: boolean
): Promise<any> {
  const currentVotes = getCloudVotes();
  const newVote: PollVote = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    pollId,
    userId,
    userName: userName || "طالب",
    optionIndex: optionIndex !== undefined ? optionIndex : null,
    textAnswer: textAnswer || null,
    ratingValue: ratingValue !== undefined ? ratingValue : null,
    createdAt: new Date().toISOString(),
  };

  let nextVotes: PollVote[];
  if (isMultiple) {
    nextVotes = [...currentVotes, newVote];
  } else {
    const existingIndex = currentVotes.findIndex(
      (v) => Number(v.pollId) === Number(pollId) && v.userId === userId
    );
    if (existingIndex >= 0) {
      nextVotes = [...currentVotes];
      nextVotes[existingIndex] = newVote;
    } else {
      nextVotes = [...currentVotes, newVote];
    }
  }

  saveCloudVotes(nextVotes);

  try {
    fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, userName, optionIndex, textAnswer, ratingValue }),
    }).catch(() => {});
  } catch {}

  return { success: true, vote: newVote };
}

export async function updatePollVoteByIdApi(voteId: number, newAnswer: string): Promise<boolean> {
  const currentVotes = getCloudVotes();
  const nextVotes = currentVotes.map((v) => {
    if (Number(v.id) === Number(voteId)) {
      return { ...v, textAnswer: newAnswer };
    }
    return v;
  });
  saveCloudVotes(nextVotes);
  return true;
}

export async function deletePollVoteByIdApi(voteId: number): Promise<boolean> {
  const currentVotes = getCloudVotes();
  const nextVotes = currentVotes.filter((v) => Number(v.id) !== Number(voteId));
  saveCloudVotes(nextVotes);
  return true;
}

export async function withdrawPollVoteApi(pollId: number, userId: string): Promise<any> {
  const currentVotes = getCloudVotes();
  const nextVotes = currentVotes.filter(
    (v) => !(Number(v.pollId) === Number(pollId) && v.userId === userId)
  );
  saveCloudVotes(nextVotes);

  try {
    fetch(`/api/polls/${pollId}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    }).catch(() => {});
  } catch {}

  return { success: true };
}

export function usePolls() {
  const { user } = useAuth();
  const { profile } = useStudentProfile();

  const [rawPolls] = usePersistentState<Poll[]>("polls", SAMPLE_POLL_TEMPLATES);
  const [allVotes] = usePersistentState<PollVote[]>("poll_votes", []);

  const currentUserId = useMemo(() => {
    if (user?.uid) return user.uid;
    if (profile?.id) return `student_${profile.id}`;
    return getOrCreateDeviceId();
  }, [user, profile]);

  const pollsWithStats = useMemo<PollWithStats[]>(() => {
    return rawPolls.map((poll) => {
      let parsedOptions: string[] = [];
      if (Array.isArray(poll.options)) {
        parsedOptions = poll.options;
      } else if (typeof poll.options === "string") {
        try {
          parsedOptions = JSON.parse(poll.options);
        } catch {
          parsedOptions = poll.options ? [poll.options] : [];
        }
      }

      const votes = allVotes.filter((v) => Number(v.pollId) === Number(poll.id));
      const optionCounts = new Array(parsedOptions.length).fill(0);
      const userVotedOptions: number[] = [];
      const userTextResponses: string[] = [];
      const userVotes: PollVote[] = [];
      let userVotedText: string | null = null;
      let userVotedRating: number | null = null;
      let totalRatingSum = 0;
      let totalRatingCount = 0;

      for (const vote of votes) {
        const isMine = vote.userId === currentUserId;
        if (isMine) {
          userVotes.push(vote);
        }

        if (vote.optionIndex !== null && vote.optionIndex !== undefined && vote.optionIndex >= 0) {
          if (optionCounts[vote.optionIndex] !== undefined) {
            optionCounts[vote.optionIndex]++;
          }
          if (isMine && !userVotedOptions.includes(vote.optionIndex)) {
            userVotedOptions.push(vote.optionIndex);
          }
        }

        if (vote.ratingValue !== null && vote.ratingValue !== undefined) {
          totalRatingSum += Number(vote.ratingValue);
          totalRatingCount++;
          if (isMine) {
            userVotedRating = Number(vote.ratingValue);
          }
        }

        if (vote.textAnswer) {
          if (isMine) {
            userTextResponses.push(vote.textAnswer);
            userVotedText = vote.textAnswer;
          }
        }
      }

      const totalCalculatedVotes = votes.length || poll.totalVotes || 0;
      const optionPercentages = parsedOptions.map((_, idx) => {
        if (totalCalculatedVotes === 0) return 0;
        return Math.round((optionCounts[idx] / totalCalculatedVotes) * 100);
      });

      const averageRating = totalRatingCount > 0 ? Number((totalRatingSum / totalRatingCount).toFixed(1)) : 5.0;
      const isExpired = Boolean(poll.expiresAt && new Date(poll.expiresAt).getTime() < Date.now());
      const hasVoted = userVotedOptions.length > 0 || userTextResponses.length > 0 || userVotedRating !== null;

      return {
        ...poll,
        totalVotes: totalCalculatedVotes,
        parsedOptions,
        votes,
        optionCounts,
        optionPercentages,
        userVotedOptions,
        userVotedText,
        userTextResponses,
        userVotes,
        userVotedRating,
        averageRating,
        hasVoted,
        isExpired,
      };
    }).sort((a, b) => {
      if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
        return b.isPinned ? 1 : -1;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [rawPolls, allVotes, currentUserId]);

  return {
    polls: pollsWithStats,
    isLoading: false,
    refreshPolls: () => {},
    currentUserId,
  };
}
