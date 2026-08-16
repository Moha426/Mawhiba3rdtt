export function clearAdminSession() { localStorage.removeItem("isAdmin"); }

export type StudentProfile = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  profilePicture: string | null;
  createdAt: string;
};
