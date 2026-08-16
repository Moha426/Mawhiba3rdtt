import { useAuth, useUser } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";

export type StudentProfile = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  profilePicture: string | null;
  createdAt: string;
};

async function provisionStudent(displayName: string): Promise<StudentProfile> {
  const res = await fetch("/api/student-auth/clerk-provision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) throw new Error("Provision failed");
  return res.json() as Promise<StudentProfile>;
}

export function useStudentProfile() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  const displayName =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "طالب";

  const { data, isLoading } = useQuery<StudentProfile>({
    queryKey: ["student-profile", user?.id],
    queryFn: () => provisionStudent(displayName),
    enabled: isLoaded && !!isSignedIn && !!user,
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });

  return { profile: data ?? null, isLoading: !isLoaded || isLoading };
}
