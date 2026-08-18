import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Timer, Coffee, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = { label: string; minutes: number; color: string; icon: typeof Timer; desc: string };

const MODES: Mode[] = [
  { label: "مذاكرة",      minutes: 25, color: "hsl(256 72% 58%)", icon: Timer,  desc: "ركّز على مادتك" },
  { label: "راحة قصيرة", minutes: 5,  color: "hsl(172 50% 42%)", icon: Coffee, desc: "استرح قليلاً" },
  { label: "راحة طويلة", minutes: 15, color: "hsl(38 90% 48%)",  icon: Zap,    desc: "خذ وقتك" },
];

const VIEWBOX = 280;
const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.9);
  } catch (e) {
    // AudioContext not allowed or supported
  }
}

export default function TimerPage() {
  const [modeIdx, setModeIdx] = useState(0);
  const [customMinutes, setCustomMinutes] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const mode = MODES[modeIdx];
  const totalSeconds = (customMinutes && !isNaN(Number(customMinutes)) && Number(customMinutes) > 0)
    ? Number(customMinutes) * 60
    : mode.minutes * 60;

  const [seconds, setSeconds] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setRunning(false);
    setDone(false);
    setSeconds(totalSeconds);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [totalSeconds]);

  useEffect(() => { reset(); }, [modeIdx, customMinutes, reset]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDone(true);
            beep();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const progress = seconds / totalSeconds;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const activeColor = showCustom ? "#64748b" : mode.color;

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 lg:gap-8 py-2 sm:py-4">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">مؤقت المذاكرة</h1>
        <p className="text-muted-foreground mt-1 text-sm">نظام بومودورو للتركيز والإنتاجية</p>
      </div>

      {/* Mode selector */}
      <div className="flex flex-wrap justify-center gap-1.5 p-1 bg-muted/50 rounded-2xl border border-border/40">
        {MODES.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.button
              key={m.label}
              onClick={() => { setModeIdx(i); setShowCustom(false); setCustomMinutes(""); }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                modeIdx === i && !showCustom
                  ? "text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {modeIdx === i && !showCustom && (
                <motion.div
                  layoutId="mode-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: m.color }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1 sm:gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </span>
            </motion.button>
          );
        })}
        <motion.button
          onClick={() => setShowCustom(true)}
          whileTap={{ scale: 0.95 }}
          className={`relative px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
            showCustom ? "text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {showCustom && (
            <motion.div
              layoutId="mode-pill"
              className="absolute inset-0 rounded-xl bg-slate-600"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">مخصص</span>
        </motion.button>
      </div>

      {/* Custom input */}
      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3"
          >
            <input
              type="number"
              min="1"
              max="180"
              value={customMinutes}
              onChange={e => setCustomMinutes(e.target.value)}
              placeholder="25"
              className="w-20 sm:w-24 text-center text-xl sm:text-2xl font-bold border border-border rounded-xl px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              dir="ltr"
            />
            <span className="text-muted-foreground">دقيقة</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Circular timer — responsive */}
      <div
        className="relative w-[min(72vw,240px)] sm:w-[min(70vw,280px)] lg:w-80"
        style={{ aspectRatio: "1 / 1" }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          className="rotate-[-90deg]"
        >
          <circle
            cx={VIEWBOX / 2} cy={VIEWBOX / 2} r={RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted/40"
          />
          <motion.circle
            cx={VIEWBOX / 2} cy={VIEWBOX / 2} r={RADIUS}
            fill="none"
            stroke={activeColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: running ? "stroke-dashoffset 1s linear" : "stroke-dashoffset 0.4s ease" }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-center"
              >
                <div className="flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1.1, 1.15, 1] }}
                    transition={{ duration: 0.7, ease: "easeInOut" }}
                  >
                    <svg viewBox="0 0 40 40" className="w-10 h-10 sm:w-12 sm:h-12" fill="none">
                      <circle cx="20" cy="20" r="18" fill={activeColor + "22"} />
                      <path d="M12 20 Q16 12 20 20 Q24 28 28 20" stroke={activeColor} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                      <circle cx="20" cy="14" r="2.5" fill={activeColor} />
                      <path d="M15 27 L20 22 L25 27" stroke={activeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      <circle cx="13" cy="24" r="1.5" fill={activeColor + "bb"} />
                      <circle cx="27" cy="24" r="1.5" fill={activeColor + "bb"} />
                    </svg>
                  </motion.div>
                </div>
                <p className="text-lg sm:text-xl font-bold mt-1" style={{ color: activeColor }}>
                  أحسنت!
                </p>
                <p className="text-xs text-muted-foreground">انتهى الوقت</p>
              </motion.div>
            ) : (
              <motion.div
                key="timer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <div
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold tabular-nums tracking-tighter"
                  style={{ color: activeColor }}
                  dir="ltr"
                >
                  {mins}:{secs}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {showCustom ? "وقت مخصص" : mode.desc}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="outline"
          onClick={reset}
          className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl"
          title="إعادة تعيين"
        >
          <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <motion.button
          whileTap={{ scale: 0.9, transition: { duration: 0.08 } }}
          whileHover={{ scale: 1.05, transition: { duration: 0.12 } }}
          onClick={() => { if (!done) setRunning(r => !r); }}
          disabled={done}
          className="h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center shadow-lg text-white disabled:opacity-60 transition-opacity"
          style={{ backgroundColor: activeColor, willChange: "transform" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {running ? (
              <motion.span
                key="pause"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 30 }}
                transition={{ type: "spring", stiffness: 600, damping: 28, mass: 0.6 }}
              >
                <Pause className="h-6 w-6 sm:h-7 sm:w-7" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ scale: 0, rotate: 30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -30 }}
                transition={{ type: "spring", stiffness: 600, damping: 28, mass: 0.6 }}
              >
                <Play className="h-6 w-6 sm:h-7 sm:w-7 mr-[-2px]" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <div className="h-11 w-11 sm:h-12 sm:w-12" />
      </div>

      {/* Sessions guide */}
      <div className="w-full max-w-sm rounded-2xl border border-border/40 bg-muted/20 p-3 sm:p-4 space-y-2">
        <p className="text-sm font-semibold text-center">دورة بومودورو المقترحة</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex gap-1 shrink-0">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MODES[0].color }} />
            ))}
          </div>
          <span>4 جلسات مذاكرة (25 دقيقة)</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex gap-1 shrink-0">
            {[1,2,3].map(i => (
              <div key={i} className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MODES[1].color }} />
            ))}
          </div>
          <span>3 راحات قصيرة (5 دقائق)</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: MODES[2].color }} />
          <span>راحة طويلة بعد الدورة (15 دقيقة)</span>
        </div>
      </div>
    </div>
  );
}
