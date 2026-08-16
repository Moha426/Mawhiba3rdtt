export interface PollOption {
  text: string;
  votes?: number;
}

export interface Poll {
  id: number;
  question: string;
  options: string | string[]; // Can be serialized JSON or array
  status: "active" | "closed";
  type: "choice" | "text";
  imageUrl?: string;
  isPublic: boolean;
  totalVotes: number;
  allowMultiple: boolean;
  preventWithdraw: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PollVote {
  id: number;
  pollId: number;
  userId?: string;
  userName?: string;
  optionIndex?: number;
  textAnswer?: string;
  createdAt: string;
}

export async function fetchAllPolls(): Promise<Poll[]> {
  try {
    const res = await fetch(`/api/polls?t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to fetch polls");
    const data = await res.json();
    return data.map((p: any) => ({
      ...p,
      options: typeof p.options === "string" ? JSON.parse(p.options) : p.options
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function createPoll(data: Partial<Poll>): Promise<Poll | null> {
  try {
    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create poll");
    const p = await res.json();
    return {
      ...p,
      options: typeof p.options === "string" ? JSON.parse(p.options) : (p.options || [])
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function updatePollStatus(id: number, status: "active" | "closed"): Promise<boolean> {
  try {
    const res = await fetch(`/api/polls/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    return res.ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function deletePoll(id: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/polls/${id}`, { method: "DELETE" });
    return res.ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function submitPollVote(pollId: number, data: { 
  userId?: string; 
  userName?: string; 
  optionIndex?: number; 
  textAnswer?: string 
}): Promise<PollVote | null> {
  try {
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to submit vote");
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function withdrawPollVote(pollId: number, userName: string, userId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/polls/${pollId}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, userId })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "فشل سحب التصويت" };
    }
    return { success: true, ...data };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: err.message || "فشل سحب التصويت" };
  }
}

export async function syncPollVotes(id: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/polls/${id}/sync`, { method: "POST" });
    return res.ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function fetchPollVotes(pollId: number): Promise<PollVote[]> {
  try {
    const res = await fetch(`/api/polls/${pollId}/votes?t=${Date.now()}`);
    if (!res.ok) throw new Error("Failed to fetch votes");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}
