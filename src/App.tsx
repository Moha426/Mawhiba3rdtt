import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/lib/theme";
import { AnimatePresence, motion } from "framer-motion";
import { Chatbot } from "@/components/chatbot";
import { AuthProvider } from "@/lib/auth";
import { SignInForm } from "@/pages/sign-in";
import { SignUpForm } from "@/pages/sign-up";

import Dashboard from "@/pages/dashboard";
import Assignments from "@/pages/assignments";
import CalendarPage from "@/pages/calendar";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import NotFound from "@/pages/not-found";
import Schedule from "@/pages/schedule";
import ProfilePage from "@/pages/profile";
import QuizzesPage from "@/pages/quizzes";
import QuizPage from "@/pages/quiz";
import TimerPage from "@/pages/timer";
import TeacherPage from "@/pages/teacher";
import PlatformsPage from "@/pages/platforms";
import LibraryPage from "@/pages/library";
import FlashcardsPage from "@/pages/flashcards";
import AITutorPage from "@/pages/ai-tutor";
import ChannelsPage from "@/pages/channels";
import { AppLogo } from "@/components/app-logo";

const queryClient = new QueryClient();

const basePath = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}



const pageVariants = {
  initial: { opacity: 0, y: 14, scale: 0.99, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, scale: 0.99, filter: "blur(3px)" },
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 320,
  damping: 32,
  mass: 0.9,
};

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="w-full h-full flex-1 flex flex-col min-h-0"
      style={{ willChange: "opacity, transform, filter" }}
    >
      {children}
    </motion.div>
  );
}

/* ── Floating star particle ── */
function StarField() {
  const stars = Array.from({ length: 38 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    duration: Math.random() * 5 + 4,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.5 + 0.1,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: s.opacity }}
          animate={{ opacity: [s.opacity, s.opacity * 3.5, s.opacity], scale: [1, 1.6, 1] }}
          transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/* ── Animated mesh gradient orb ── */
function Orb({ size, top, left, right, bottom, color, delay, duration }: {
  size: number; top?: string; left?: string; right?: string; bottom?: string;
  color: string; delay?: number; duration?: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: size, height: size, top, left, right, bottom, background: color, filter: `blur(${Math.round(size * 0.22)}px)` }}
      animate={{ scale: [1, 1.2, 0.95, 1], y: [0, -30, 10, 0], x: [0, 16, -8, 0] }}
      transition={{ duration: duration ?? 10, repeat: Infinity, ease: "easeInOut", delay: delay ?? 0 }}
    />
  );
}

/* ── Feature chip shown on the card ── */
function FeatureChip({ icon, text, delay }: { icon: React.ReactNode; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 280, damping: 28 }}
      className="flex items-center gap-2 px-3 py-2 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <span className="text-purple-300">{icon}</span>
      <span className="text-white/70 text-xs font-medium">{text}</span>
    </motion.div>
  );
}

function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      dir="rtl"
      className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(160deg, #06000f 0%, #130030 30%, #1e0050 55%, #0d0028 80%, #030008 100%)" }}
    >
      {/* ── Background orbs ── */}
      <Orb size={800} top="-20%" right="-15%" color="radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(109,40,217,0.22) 50%, transparent 72%)" delay={0} duration={11} />
      <Orb size={600} bottom="-20%" left="-12%" color="radial-gradient(circle, rgba(67,56,202,0.55) 0%, rgba(79,70,229,0.22) 50%, transparent 72%)" delay={2.5} duration={13} />
      <Orb size={380} top="40%" left="30%" color="radial-gradient(circle, rgba(192,132,252,0.4) 0%, transparent 70%)" delay={1} duration={8} />
      <Orb size={220} top="15%" left="55%" color="radial-gradient(circle, rgba(233,213,255,0.3) 0%, transparent 70%)" delay={4} duration={6} />

      {/* ── Star field ── */}
      <StarField />

      {/* ── Subtle grid ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />

      {/* ── Main content ── */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto px-5 py-10 flex flex-col items-center gap-6 min-h-[100dvh] justify-center">

        {/* ── Logo + headline ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.05 }}
          className="flex flex-col items-center gap-3 text-center"
        >

          <div>
            <motion.h1
              className="text-white font-black text-5xl md:text-6xl tracking-tight leading-none mb-2"
              style={{ textShadow: "0 0 40px rgba(168,85,247,0.6)" }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 24 }}
            >
              ثالث موهبة
            </motion.h1>
            <motion.p
              className="text-purple-300/80 text-sm font-medium mt-1.5 tracking-wide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
            >
              بوابتك للتفوق الدراسي ✦
            </motion.p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            <FeatureChip
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
              text="متابعة المهام"
              delay={0.35}
            />
            <FeatureChip
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>}
              text="جدول الحصص"
              delay={0.42}
            />
            <FeatureChip
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>}
              text="اختبارات تفاعلية"
              delay={0.49}
            />
          </div>
        </motion.div>

        {/* ── Clerk form card ── */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 30, delay: 0.2 }}
          className="w-full relative"
        >
          {/* Card glow */}
          <div
            className="absolute -inset-3 rounded-[36px] pointer-events-none"
            style={{
              background: "radial-gradient(ellipse, rgba(139,92,246,0.3) 0%, transparent 65%)",
              filter: "blur(18px)",
            }}
          />

          {/* Glass card */}
          <div
            className="relative rounded-[28px] overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.07)",
              backdropFilter: "blur(64px)",
              WebkitBackdropFilter: "blur(64px)",
              border: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 24px 72px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.1) inset, inset 0 1.5px 0 rgba(255,255,255,0.22)",
            }}
          >
            {/* Top shimmer line */}
            <div
              className="absolute top-0 inset-x-0 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.55) 50%, transparent 95%)" }}
            />
            {/* Inner top glow */}
            <div
              className="absolute top-0 inset-x-0 h-28 pointer-events-none"
              style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.08) 0%, transparent 100%)" }}
            />
            {/* Corner sparkle */}
            <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-white/40 pointer-events-none" style={{ boxShadow: "0 0 6px 2px rgba(255,255,255,0.3)" }} />

            {children}
          </div>
        </motion.div>

        {/* ── Footer ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-[11px] text-white/20 pb-2"
        >
          جميع الحقوق محفوظة · ثالث موهبة 2026
        </motion.p>
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthBackground>
      <SignInForm />
    </AuthBackground>
  );
}

function SignUpPage() {
  return (
    <AuthBackground>
      <SignUpForm />
    </AuthBackground>
  );
}


function AppRouter() {
  const [location] = useLocation();

  const isAuthPage = location.startsWith("/sign-in") || location.startsWith("/sign-up") || location.startsWith("/login") || location.startsWith("/student-login");
  const isEmbed = window.location.search.includes("embed=true");

  if (isAuthPage) {
    return (
      <Switch>
        <Route path="/sign-in"><SignInPage /></Route>
        <Route path="/sign-up"><SignUpPage /></Route>
        <Route path="/login"><SignInPage /></Route>
        <Route path="/student-login"><SignInPage /></Route>
        <Route path="/sign-in/:rest*"><SignInPage /></Route>
        <Route path="/sign-up/:rest*"><SignUpPage /></Route>
        <Route><SignInPage /></Route>
      </Switch>
    );
  }

  const routing = (
    <AnimatePresence mode="wait" initial={false}>
      <Switch key={location}>
        <Route path="/"><AnimatedPage><Dashboard /></AnimatedPage></Route>
        <Route path="/channels"><AnimatedPage><ChannelsPage /></AnimatedPage></Route>
        <Route path="/ai-tutor"><AnimatedPage><AITutorPage /></AnimatedPage></Route>
        <Route path="/flashcards"><AnimatedPage><FlashcardsPage /></AnimatedPage></Route>
        <Route path="/library"><AnimatedPage><LibraryPage /></AnimatedPage></Route>
        <Route path="/assignments"><AnimatedPage><Assignments /></AnimatedPage></Route>
        <Route path="/calendar"><AnimatedPage><CalendarPage /></AnimatedPage></Route>
        <Route path="/schedule"><AnimatedPage><Schedule /></AnimatedPage></Route>
        <Route path="/quizzes"><AnimatedPage><QuizzesPage /></AnimatedPage></Route>
        <Route path="/quiz/:id"><AnimatedPage><QuizPage /></AnimatedPage></Route>
        <Route path="/student-login"><Redirect to="/sign-in" /></Route>
        <Route path="/profile"><AnimatedPage><ProfilePage /></AnimatedPage></Route>
        <Route path="/admin"><AnimatedPage><AdminLogin /></AnimatedPage></Route>
        <Route path="/timer"><AnimatedPage><TimerPage /></AnimatedPage></Route>
        <Route path="/teacher"><AnimatedPage><TeacherPage /></AnimatedPage></Route>
        <Route path="/feedback"><AnimatedPage><TeacherPage /></AnimatedPage></Route>
        <Route path="/suggestions"><AnimatedPage><TeacherPage /></AnimatedPage></Route>
        <Route path="/platforms"><AnimatedPage><PlatformsPage /></AnimatedPage></Route>
        <Route path="/admin/dashboard"><AnimatedPage><AdminDashboard /></AnimatedPage></Route>
        <Route><AnimatedPage><NotFound /></AnimatedPage></Route>
      </Switch>
    </AnimatePresence>
  );

  if (isEmbed) {
    return <div className="h-screen w-screen overflow-hidden bg-background">{routing}</div>;
  }

  return <Layout>{routing}</Layout>;
}

import { usePersistentState } from "@/lib/api-client-react";

function RootApp() {
  // Mount these listeners globally so that flashcards and platforms continuously sync
  // from Firestore to LocalStorage via `app_data_change` events in cloud-sync.ts
  usePersistentState<any[]>("flashcards", []);
  usePersistentState<any[]>("platforms", []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppRouter />
          <Chatbot />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <WouterRouter base={basePath}>
        <RootApp />
      </WouterRouter>
    </ThemeProvider>
  );
}

export default App;
