import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db, safeFirestoreWrite } from "./firebase";

export interface StudentRecord {
  id: number;
  username: string;
  displayName: string;
  email?: string;
  password?: string;
  role: string;
  profilePicture?: string | null;
  points?: number;
  level?: number;
  createdAt: string;
}

const LOCAL_STORAGE_STUDENTS_KEY = "talented_students_v2";

export function getLocalStudents(): StudentRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STUDENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalStudents(students: StudentRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_STUDENTS_KEY, JSON.stringify(students));
    window.dispatchEvent(new CustomEvent("students_data_change", { detail: { students } }));
  } catch {}
}

/**
 * Register a new student or update existing profile in state & Firestore
 */
export async function registerOrUpdateStudent(params: {
  displayName: string;
  username?: string;
  email?: string;
  password?: string;
  id?: number;
  points?: number;
  level?: number;
}): Promise<StudentRecord> {
  const current = getLocalStudents();
  
  let numericId = params.id;
  if (!numericId) {
    const seed = params.email || params.username || params.displayName;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    numericId = Math.abs(hash) || Math.floor(1000 + Math.random() * 9000);
  }

  const cleanUsername = params.username?.trim() || params.email?.split("@")[0] || params.displayName.replace(/\s+/g, "_").toLowerCase();

  const student: StudentRecord = {
    id: numericId,
    username: cleanUsername,
    displayName: params.displayName.trim(),
    email: params.email?.trim() || `${cleanUsername}@talented.app`,
    password: params.password || "123456",
    role: "student",
    profilePicture: null,
    points: params.points ?? 350,
    level: params.level ?? 2,
    createdAt: new Date().toISOString(),
  };

  const existingIndex = current.findIndex(s => s.id === student.id || (student.email && s.email === student.email));
  let updatedList: StudentRecord[];
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = { ...updatedList[existingIndex], ...student };
  } else {
    updatedList = [student, ...current];
  }

  saveLocalStudents(updatedList);

  // Sync to Firestore `students` collection
  safeFirestoreWrite(async () => {
    const docRef = doc(db, "students", String(student.id));
    await setDoc(docRef, {
      ...student,
      serverTime: serverTimestamp()
    }, { merge: true });
  });

  // Sync to backend server API
  try {
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(student),
    });
  } catch {}

  return student;
}

/**
 * Real-time subscription to students list for Admin dashboard
 */
export function subscribeToStudents(onUpdate: (students: StudentRecord[]) => void): () => void {
  onUpdate(getLocalStudents());

  const handleLocal = (e: any) => {
    if (e.detail?.students) {
      onUpdate(e.detail.students);
    } else {
      onUpdate(getLocalStudents());
    }
  };
  window.addEventListener("students_data_change", handleLocal);

  try {
    const colRef = collection(db, "students");
    const unsub = onSnapshot(colRef, (snapshot) => {
      const cloudList: StudentRecord[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        cloudList.push({
          id: d.id || parseInt(docSnap.id, 10) || 1,
          username: d.username || "student",
          displayName: d.displayName || d.name || "طالب",
          email: d.email || `${d.username || 'student'}@talented.app`,
          password: d.password || "••••••••",
          role: d.role || "student",
          profilePicture: d.profilePicture || null,
          points: d.points || 350,
          level: d.level || 1,
          createdAt: d.createdAt || new Date().toISOString(),
        });
      });

      if (cloudList.length > 0) {
        const map = new Map<number, StudentRecord>();
        getLocalStudents().forEach(s => map.set(s.id, s));
        cloudList.forEach(s => map.set(s.id, s));
        const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        saveLocalStudents(merged);
        onUpdate(merged);
      }
    }, (err) => {
      console.warn("Students realtime snapshot error:", err);
    });

    return () => {
      window.removeEventListener("students_data_change", handleLocal);
      unsub();
    };
  } catch {
    return () => {
      window.removeEventListener("students_data_change", handleLocal);
    };
  }
}

/**
 * Delete a student
 */
export async function deleteStudentRecord(id: number): Promise<void> {
  const current = getLocalStudents().filter(s => s.id !== id);
  saveLocalStudents(current);

  safeFirestoreWrite(async () => {
    const docRef = doc(db, "students", String(id));
    await deleteDoc(docRef);
  });

  try {
    await fetch(`/api/students/${id}`, { method: "DELETE" });
  } catch {}
}
