import { useEffect, useRef } from "react";
import { parseISO, differenceInCalendarDays } from "date-fns";

const STORAGE_KEY = "notified-date";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function hasNotifiedToday(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === getToday();
  } catch {
    return false;
  }
}

function markNotifiedToday() {
  try {
    localStorage.setItem(STORAGE_KEY, getToday());
  } catch {}
}

function fireNotification(title: string, body: string, icon?: string) {
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: icon ?? "/logo.png",
      dir: "rtl",
      lang: "ar",
    });
  } catch {}
}

export function useNotifications(
  assignments: Array<{ title: string; dueDate: string; subjectName?: string }> = []
) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (firedRef.current) return;
    if (hasNotifiedToday()) return;
    if (!assignments.length) return;

    const proceed = () => {
      if (Notification.permission !== "granted") return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueToday = assignments.filter((a) => {
        if (!a.dueDate) return false;
        try {
          const d = parseISO(a.dueDate);
          return !isNaN(d.getTime()) && differenceInCalendarDays(d, today) === 0;
        } catch { return false; }
      });

      const dueTomorrow = assignments.filter((a) => {
        if (!a.dueDate) return false;
        try {
          const d = parseISO(a.dueDate);
          return !isNaN(d.getTime()) && differenceInCalendarDays(d, today) === 1;
        } catch { return false; }
      });

      if (dueToday.length > 0) {
        fireNotification(
          `📚 ${dueToday.length === 1 ? "مهمة تُسلَّم اليوم" : `${dueToday.length} مهام تُسلَّم اليوم`}`,
          dueToday.map((a) => `• ${a.title}${a.subjectName ? ` (${a.subjectName})` : ""}`).join("\n")
        );
      }

      if (dueTomorrow.length > 0) {
        setTimeout(() => {
          fireNotification(
            `⏰ ${dueTomorrow.length === 1 ? "مهمة تُسلَّم غداً" : `${dueTomorrow.length} مهام تُسلَّم غداً`}`,
            dueTomorrow.map((a) => `• ${a.title}${a.subjectName ? ` (${a.subjectName})` : ""}`).join("\n")
          );
        }, 2000);
      }

      if (dueToday.length > 0 || dueTomorrow.length > 0) {
        markNotifiedToday();
        firedRef.current = true;
      }
    };

    if (Notification.permission === "granted") {
      proceed();
    }
  }, [assignments]);
}
