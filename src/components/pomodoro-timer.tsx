import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Coffee, BookOpen, Bell, Sparkles } from "lucide-react";

interface PomodoroTimerProps {
  onShareSession?: (durationMinutes: number, type: string) => void;
}

export function PomodoroTimer({ onShareSession }: PomodoroTimerProps) {
  const [mode, setMode] = useState<"study" | "shortBreak" | "longBreak">("study");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  const durations = {
    study: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  const modeLabels = {
    study: "مذاكرة مركزة 📚",
    shortBreak: "استراحة قصيرة ☕",
    longBreak: "استراحة طويلة 🌴",
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (mode === "study") {
        setCompletedSessions((prev) => prev + 1);
        if (onShareSession) {
          onShareSession(25, "جلسة مذاكرة بومودورو");
        }
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode, onShareSession]);

  const switchMode = (newMode: "study" | "shortBreak" | "longBreak") => {
    setMode(newMode);
    setTimeLeft(durations[newMode]);
    setIsRunning(false);
  };

  const resetTimer = () => {
    setTimeLeft(durations[mode]);
    setIsRunning(false);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 100 - (timeLeft / durations[mode]) * 100;

  return (
    <div className="flex flex-col h-full gap-3 p-1">
      {/* Mode selectors */}
      <div className="flex items-center gap-1.5 p-1 bg-black/25 rounded-xl border border-white/5">
        <button
          onClick={() => switchMode("study")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mode === "study"
              ? "bg-[#5865f2] text-white shadow-md"
              : "text-[#949ba4] hover:text-white hover:bg-white/5"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>تركيز (25د)</span>
        </button>
        <button
          onClick={() => switchMode("shortBreak")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mode === "shortBreak"
              ? "bg-[#23a55a] text-white shadow-md"
              : "text-[#949ba4] hover:text-white hover:bg-white/5"
          }`}
        >
          <Coffee className="h-3.5 w-3.5" />
          <span>راحة (5د)</span>
        </button>
        <button
          onClick={() => switchMode("longBreak")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mode === "longBreak"
              ? "bg-[#f0b232] text-black font-bold shadow-md"
              : "text-[#949ba4] hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>طويلة (15د)</span>
        </button>
      </div>

      {/* Clock display */}
      <div className="relative flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 my-auto">
        <div className="absolute top-3 right-3 text-[11px] font-medium text-[#949ba4] flex items-center gap-1">
          <Bell className="h-3 w-3" />
          {modeLabels[mode]}
        </div>

        {/* Circular progress or big digits */}
        <div className="text-5xl font-mono font-bold tracking-tight text-white my-3 drop-shadow-sm">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden mt-1 border border-white/5">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${progress}%`,
              backgroundColor: mode === "study" ? "#5865f2" : mode === "shortBreak" ? "#23a55a" : "#f0b232",
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="h-11 px-6 rounded-xl font-bold text-sm flex items-center gap-2 transition-transform active:scale-95 shadow-lg"
            style={{
              backgroundColor: isRunning ? "#ed4245" : "#5865f2",
              color: "#ffffff",
            }}
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4 fill-current" />
                <span>إيقاف مؤقت</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current ml-0.5" />
                <span>بدء الجلسة</span>
              </>
            )}
          </button>

          <button
            onClick={resetTimer}
            title="إعادة ضبط"
            className="h-11 w-11 rounded-xl bg-white/5 hover:bg-white/10 text-[#949ba4] hover:text-white flex items-center justify-center transition-colors border border-white/5"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Completed count & tips */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-black/20 border border-white/5 text-xs text-[#949ba4]">
        <span>الجلسات المكتملة اليوم:</span>
        <span className="font-bold text-white px-2 py-0.5 rounded-full bg-[#5865f2]/20 text-[#c9cdfb]">
          🍅 {completedSessions} جلسات
        </span>
      </div>
    </div>
  );
}
