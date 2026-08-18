import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useStudentProfile } from "@/lib/use-student-profile";

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
  userVotedRating?: number | null;
  averageRating?: number;
  hasVoted: boolean;
  isExpired: boolean;
}

const LOCAL_POLLS_KEY = "talented_school_polls_cache_v3";
const LOCAL_USER_VOTES_KEY = "talented_school_user_votes_cache_v3";

export const SAMPLE_POLL_TEMPLATES: Poll[] = [
  {
    id: 1,
    question: "ما هو الوقت الأنسب لجدولة حصص المراجعة المكثفة لاختبار القدرات والتحصيلي القادم؟",
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
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
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
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
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
    allowMultiple: false,
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

export async function fetchPollsApi(): Promise<Poll[]> {
  try {
    const res = await fetch("/api/polls");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        try {
          localStorage.setItem(LOCAL_POLLS_KEY, JSON.stringify(data));
        } catch {}
        return data;
      }
    }
  } catch (err) {
    console.warn("Using cached polls fallback:", err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_POLLS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

export async function fetchPollVotesApi(pollId: number): Promise<PollVote[]> {
  try {
    const res = await fetch(`/api/polls/${pollId}/votes`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Failed to fetch votes for poll ${pollId}:`, err);
  }
  return [];
}

export async function createPollApi(pollData: Partial<Poll>): Promise<Poll> {
  let created: Poll | null = null;
  try {
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pollData),
    });
    if (res.ok) {
      created = await res.json();
    }
  } catch (err) {
    console.warn("Server create failed, saving to local state:", err);
  }

  if (!created) {
    created = {
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
  }

  try {
    const cached = localStorage.getItem(LOCAL_POLLS_KEY);
    const list: Poll[] = cached ? JSON.parse(cached) : [];
    const updated = [created, ...list.filter((p) => p.id !== created!.id)];
    localStorage.setItem(LOCAL_POLLS_KEY, JSON.stringify(updated));
  } catch {}

  window.dispatchEvent(new CustomEvent("polls_data_change"));
  return created;
}

export async function updatePollApi(id: number, pollData: Partial<Poll>): Promise<Poll> {
  let updated: Poll | null = null;
  try {
    const res = await fetch(`/api/polls/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pollData),
    });
    if (res.ok) {
      updated = await res.json();
    }
  } catch (err) {
    console.warn("Server update failed:", err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_POLLS_KEY);
    const list: Poll[] = cached ? JSON.parse(cached) : [];
    const nextList = list.map((p) => {
      if (Number(p.id) === Number(id)) {
        const item = { ...p, ...pollData, updatedAt: new Date().toISOString() };
        if (!updated) updated = item;
        return item;
      }
      return p;
    });
    localStorage.setItem(LOCAL_POLLS_KEY, JSON.stringify(nextList));
  } catch {}

  window.dispatchEvent(new CustomEvent("polls_data_change"));
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
  try {
    const res = await fetch(`/api/polls/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      console.warn("Server delete returned non-ok status");
    }
  } catch (err) {
    console.warn("Server delete error:", err);
  }

  try {
    const cached = localStorage.getItem(LOCAL_POLLS_KEY);
    if (cached) {
      const list: Poll[] = JSON.parse(cached);
      const filtered = list.filter((p) => Number(p.id) !== Number(id));
      localStorage.setItem(LOCAL_POLLS_KEY, JSON.stringify(filtered));
    }
  } catch (err) {
    console.warn("Local storage delete error:", err);
  }

  // Also clean up local votes
  try {
    const votesCached = localStorage.getItem(LOCAL_USER_VOTES_KEY);
    if (votesCached) {
      const votesMap = JSON.parse(votesCached);
      delete votesMap[id];
      localStorage.setItem(LOCAL_USER_VOTES_KEY, JSON.stringify(votesMap));
    }
  } catch {}

  window.dispatchEvent(new CustomEvent("polls_data_change"));
  return true;
}

export async function votePollApi(
  pollId: number,
  userId: string,
  userName: string,
  optionIndex: number | null,
  textAnswer?: string | null,
  ratingValue?: number | null
): Promise<any> {
  let result: any = null;
  try {
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, userName, optionIndex, textAnswer, ratingValue }),
    });
    if (res.ok) {
      result = await res.json();
    }
  } catch (err) {
    console.warn("Server vote failed, saving locally:", err);
  }

  // Store in client storage
  try {
    const stored = localStorage.getItem(LOCAL_USER_VOTES_KEY);
    const votesMap = stored ? JSON.parse(stored) : {};
    if (!votesMap[pollId]) {
      votesMap[pollId] = {
        optionIndices: [],
        textAnswers: [],
        ratingValue: null,
        votedAt: new Date().toISOString(),
      };
    }
    const currentEntry = votesMap[pollId];
    if (!Array.isArray(currentEntry.optionIndices)) {
      currentEntry.optionIndices = currentEntry.optionIndex !== undefined && currentEntry.optionIndex !== null ? [currentEntry.optionIndex] : [];
    }
    if (!Array.isArray(currentEntry.textAnswers)) {
      currentEntry.textAnswers = currentEntry.textAnswer ? [currentEntry.textAnswer] : [];
    }

    if (optionIndex !== null && optionIndex !== undefined) {
      if (currentEntry.optionIndices.includes(optionIndex)) {
        currentEntry.optionIndices = currentEntry.optionIndices.filter((idx: number) => idx !== optionIndex);
      } else {
        currentEntry.optionIndices.push(optionIndex);
      }
      currentEntry.optionIndex = optionIndex;
    }

    if (textAnswer) {
      currentEntry.textAnswers.push(textAnswer);
      currentEntry.textAnswer = textAnswer;
    }

    if (ratingValue !== null && ratingValue !== undefined) {
      currentEntry.ratingValue = ratingValue;
    }

    currentEntry.votedAt = new Date().toISOString();
    votesMap[pollId] = currentEntry;
    localStorage.setItem(LOCAL_USER_VOTES_KEY, JSON.stringify(votesMap));
  } catch {}

  window.dispatchEvent(new CustomEvent("polls_data_change"));
  return result || { success: true };
}

export async function withdrawPollVoteApi(pollId: number, userId: string): Promise<any> {
  try {
    await fetch(`/api/polls/${pollId}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  } catch (err) {
    console.warn("Server withdraw failed:", err);
  }

  try {
    const stored = localStorage.getItem(LOCAL_USER_VOTES_KEY);
    if (stored) {
      const votesMap = JSON.parse(stored);
      delete votesMap[pollId];
      localStorage.setItem(LOCAL_USER_VOTES_KEY, JSON.stringify(votesMap));
    }
  } catch {}

  window.dispatchEvent(new CustomEvent("polls_data_change"));
  return { success: true };
}

export function usePolls() {
  const { user } = useAuth();
  const { profile } = useStudentProfile();
  const [rawPolls, setRawPolls] = useState<Poll[]>([]);
  const [votesByPoll, setVotesByPoll] = useState<Record<number, PollVote[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const currentUserId = useMemo(() => {
    return user?.uid || (profile?.id ? String(profile.id) : "guest_user");
  }, [user, profile]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const pollsList = await fetchPollsApi();
      setRawPolls(pollsList);

      const votesMap: Record<number, PollVote[]> = {};
      await Promise.all(
        pollsList.map(async (p) => {
          const v = await fetchPollVotesApi(p.id);
          votesMap[p.id] = v;
        })
      );
      setVotesByPoll(votesMap);
    } catch (err) {
      console.warn("Failed to load polls:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };

    window.addEventListener("polls_data_change", handleSync);
    const interval = setInterval(loadData, 20000);

    return () => {
      window.removeEventListener("polls_data_change", handleSync);
      clearInterval(interval);
    };
  }, [loadData]);

  // Local storage votes fallback
  const localVotesMap = useMemo(() => {
    try {
      const stored = localStorage.getItem(LOCAL_USER_VOTES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, [rawPolls]);

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

      const votes = votesByPoll[poll.id] || [];
      const optionCounts = new Array(parsedOptions.length).fill(0);
      const userVotedOptions: number[] = [];
      const userTextResponses: string[] = [];
      let userVotedText: string | null = null;
      let userVotedRating: number | null = null;
      let totalRatingSum = 0;
      let totalRatingCount = 0;

      for (const vote of votes) {
        if (vote.optionIndex !== null && vote.optionIndex !== undefined && vote.optionIndex >= 0) {
          if (optionCounts[vote.optionIndex] !== undefined) {
            optionCounts[vote.optionIndex]++;
          }
          if (vote.userId === currentUserId && !userVotedOptions.includes(vote.optionIndex)) {
            userVotedOptions.push(vote.optionIndex);
          }
        }
        if (vote.ratingValue) {
          totalRatingSum += vote.ratingValue;
          totalRatingCount++;
          if (vote.userId === currentUserId) {
            userVotedRating = vote.ratingValue;
          }
        }
        if (vote.textAnswer && vote.userId === currentUserId) {
          if (!userTextResponses.includes(vote.textAnswer)) {
            userTextResponses.push(vote.textAnswer);
          }
          userVotedText = vote.textAnswer;
        }
      }

      // Check local cache if not found in server response
      const localVote = localVotesMap[poll.id];
      if (localVote) {
        if (Array.isArray(localVote.optionIndices)) {
          for (const idx of localVote.optionIndices) {
            if (!userVotedOptions.includes(idx)) {
              userVotedOptions.push(idx);
              if (optionCounts[idx] !== undefined) optionCounts[idx]++;
            }
          }
        } else if (localVote.optionIndex !== null && localVote.optionIndex !== undefined && !userVotedOptions.includes(localVote.optionIndex)) {
          userVotedOptions.push(localVote.optionIndex);
          if (optionCounts[localVote.optionIndex] !== undefined) {
            optionCounts[localVote.optionIndex]++;
          }
        }

        if (Array.isArray(localVote.textAnswers)) {
          for (const ans of localVote.textAnswers) {
            if (!userTextResponses.includes(ans)) {
              userTextResponses.push(ans);
            }
          }
          if (localVote.textAnswers.length > 0 && !userVotedText) {
            userVotedText = localVote.textAnswers[localVote.textAnswers.length - 1];
          }
        } else if (localVote.textAnswer && !userVotedText) {
          userVotedText = localVote.textAnswer;
          if (!userTextResponses.includes(localVote.textAnswer)) {
            userTextResponses.push(localVote.textAnswer);
          }
        }

        if (localVote.ratingValue && !userVotedRating) {
          userVotedRating = localVote.ratingValue;
        }
      }

      const totalCalculatedVotes = optionCounts.reduce((a, b) => a + b, 0) || votes.length || poll.totalVotes || 0;
      const optionPercentages = parsedOptions.map((_, idx) => {
        if (totalCalculatedVotes === 0) return 0;
        return Math.round((optionCounts[idx] / totalCalculatedVotes) * 100);
      });

      const averageRating = totalRatingCount > 0 ? Number((totalRatingSum / totalRatingCount).toFixed(1)) : 5.0;

      const isExpired = Boolean(poll.expiresAt && new Date(poll.expiresAt).getTime() < Date.now());
      const hasVoted = userVotedOptions.length > 0 || Boolean(userVotedText) || userTextResponses.length > 0 || userVotedRating !== null;

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
  }, [rawPolls, votesByPoll, currentUserId, localVotesMap]);

  return {
    polls: pollsWithStats,
    isLoading,
    refreshPolls: loadData,
    currentUserId,
  };
}
