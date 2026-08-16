import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

export function getDynamicGuestName(): string {
  try {
    let stored = localStorage.getItem("guest_student_name");
    if (!stored) {
      const adjectives = ["موهوب", "متميز", "طموح", "مجتهد", "مبدع", "ذكي", "متفوق"];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const num = Math.floor(1000 + Math.random() * 9000);
      stored = `طالب ${adj} #${num}`;
      localStorage.setItem("guest_student_name", stored);
    }
    return stored;
  } catch {
    return "طالب متميز #2048";
  }
}

export type StudentProfile = {
  id: number;
  username: string;
  displayName: string;
  fullName?: string;
  role: string;
  profilePicture: string | null;
  createdAt: string;
  points?: number;
};

export function useStudentProfile() {
  const { user, isLoading: authLoading } = useAuth();

  const displayName = user?.name || user?.username || getDynamicGuestName();

  const { data: profile, isLoading } = useQuery<StudentProfile>({
    queryKey: ["student-profile", user?.id || "guest", displayName],
    queryFn: async () => {
      try {
        const res = await fetch("/api/student-auth/clerk-provision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ displayName }),
        });
        if (res.ok) return await res.json();
      } catch {}

      // Calculate stable numeric ID from user string/name
      let numericId = 1;
      const seedStr = user?.id || user?.username || displayName;
      if (seedStr) {
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
          hash = (hash << 5) - hash + seedStr.charCodeAt(i);
          hash |= 0;
        }
        numericId = Math.abs(hash) || 1;
      }

      return {
        id: numericId,
        username: user?.username || displayName,
        displayName,
        fullName: displayName,
        role: "student",
        profilePicture: null,
        createdAt: new Date().toISOString(),
        points: 250,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  return { profile: profile ?? null, isLoading: authLoading || isLoading };
}
