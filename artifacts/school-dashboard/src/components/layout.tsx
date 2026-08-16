import { type ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { ScrollSpring } from "@/components/scroll-spring";
import { Link, useLocation } from "wouter";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  GraduationCap,
  LogOut,
  UserCircle,
  Sun,
  Moon,
  Trophy,
  Settings,
  Shield,
  Timer,
  Palette,
  MessageSquare,
  Users,
  MessageCircle,
  Camera,
  Twitter,
  Youtube,
  Send,
  Music2,
  Ghost,
  Link2,
} from "lucide-react";
import logoSrc from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { useStudentProfile } from "@/lib/use-student-profile";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme, COLOR_THEMES, type ColorTheme } from "@/lib/theme";
import { NotificationBell } from "@/components/notification-bell";
import { useClerk } from "@clerk/react";

interface LayoutProps {
  children: ReactNode;
}

type SocialLink = { platform: string; label: string; url: string };
type SiteSettings = { schoolName: string | null; teacherPhone: string | null; socialLinks: SocialLink[] };

function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then((d: SiteSettings) => setSettings(d))
      .catch(() => {});
  }, []);
  return settings;
}

type LucideIcon = typeof MessageCircle;
const PLATFORM_ICONS: Record<string, LucideIcon> = {
  whatsapp: MessageCircle,
  instagram: Camera,
  twitter: Twitter,
  youtube: Youtube,
  telegram: Send,
  tiktok: Music2,
  snapchat: Ghost,
  other: Link2,
};

const navItems = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/assignments", label: "المهام", icon: BookOpen },
  { href: "/quizzes", label: "الاختبارات", icon: Trophy },
  { href: "/calendar", label: "التقويم", icon: CalendarDays },
  { href: "/schedule", label: "الجدول", icon: GraduationCap },
  { href: "/teacher", label: "المعلمون", icon: Users },
  { href: "/timer", label: "مؤقت المذاكرة", icon: Timer },
  { href: "/chat", label: "الدردشة", icon: MessageSquare },
];


/* ─── Animated icon with spring hover effect ─── */
function AnimatedNavIcon({
  icon: Icon,
  isActive,
  color,
}: {
  icon: typeof LayoutDashboard;
  isActive: boolean;
  color: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      animate={
        hovered && !isActive
          ? { scale: 1.18, y: -1 }
          : isActive
          ? { scale: 1.08, y: 0 }
          : { scale: 1, y: 0 }
      }
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="relative"
    >
      <Icon className="h-[22px] w-[22px]" />
    </motion.div>
  );
}

/* ─── Desktop sidebar nav link ─── */
function SidebarNavLink({
  href,
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isActive: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link href={href} onClick={onClick}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-200 ${
          isActive
            ? "bg-primary/12 text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <AnimatePresence>
          {hovered && !isActive && (
            <motion.div
              layoutId={`sidebar-hover-${href}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 rounded-xl bg-muted/50"
            />
          )}
        </AnimatePresence>

        {isActive && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full"
            transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
          />
        )}

        <motion.div
          animate={
            hovered && !isActive
              ? { scale: 1.18, x: -2 }
              : { scale: 1, x: 0 }
          }
          transition={{ type: "spring", stiffness: 380, damping: 20 }}
          className="relative z-10 shrink-0"
        >
          <Icon className="h-[18px] w-[18px]" />
        </motion.div>

        <span className="text-sm relative z-10">{label}</span>
      </motion.div>
    </Link>
  );
}

/* ─── Color theme picker ─── */
function ColorThemePicker({ popupDirection = "up" }: { popupDirection?: "up" | "down" }) {
  const { colorTheme, setColorTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const popupPositionClass = popupDirection === "down"
    ? "top-full mt-2 left-0"
    : "bottom-full mb-2 left-0";

  const current = COLOR_THEMES.find(ct => ct.id === colorTheme);

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.92 }}
        className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors"
        title="تغيير لون الثيم"
      >
        <div
          className="h-4.5 w-4.5 rounded-full ring-2 ring-white/40 shadow-sm"
          style={{ backgroundColor: current?.primary, width: 18, height: 18 }}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: popupDirection === "down" ? -6 : 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: popupDirection === "down" ? -6 : 6 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className={`absolute ${popupPositionClass} z-50 bg-card border border-border rounded-2xl shadow-2xl p-3`}
            >
              <p className="text-[11px] font-semibold text-muted-foreground mb-2.5 px-0.5">لون الثيم</p>
              <div className="grid grid-cols-3 gap-1">
                {COLOR_THEMES.map(ct => {
                  const isActive = colorTheme === ct.id;
                  return (
                    <motion.button
                      key={ct.id}
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setColorTheme(ct.id as ColorTheme, {
                          x: rect.left + rect.width / 2,
                          y: rect.top + rect.height / 2,
                        });
                        setOpen(false);
                      }}
                      className={`flex flex-col items-center gap-1.5 px-2 py-2 rounded-xl transition-colors ${
                        isActive ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="relative">
                        <div
                          className="h-7 w-7 rounded-full transition-all duration-200"
                          style={{
                            backgroundColor: ct.primary,
                            boxShadow: isActive
                              ? `0 0 0 2px white, 0 0 0 4px ${ct.primary}`
                              : `0 1px 3px ${ct.primary}60`,
                          }}
                        />
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                              <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <span className={`text-[9.5px] font-medium leading-none ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}>{ct.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── 5-tap admin easter egg hook ─── */
function useAdminEasterEgg(onTrigger: () => void) {
  const tapsRef = useRef<number[]>([]);

  return useCallback(() => {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current.filter(t => now - t < 3000), now];
    if (tapsRef.current.length >= 5) {
      tapsRef.current = [];
      onTrigger();
    }
  }, [onTrigger]);
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const siteSettings = useSiteSettings();
  const { profile: studentProfile } = useStudentProfile();
  const { signOut } = useClerk();

  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/" });
  };

  const handleAdminEasterEgg = useAdminEasterEgg(() => setLocation("/admin"));

  const ThemeButton = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
      title={theme === "dark" ? "الوضع المضيء" : "الوضع الداكن"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
          >
            <Sun className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
          >
            <Moon className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );

  const SidebarFooter = () => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {theme === "dark" ? "الوضع الداكن" : "الوضع المضيء"}
        </span>
        <div className="flex items-center gap-0.5">
          {studentProfile && <NotificationBell />}
          <ColorThemePicker />
          <ThemeButton />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {studentProfile ? (
          <motion.div
            key="user-chip"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between bg-muted/40 px-3 py-2.5 rounded-xl border border-border/40"
          >
            <Link href="/profile" className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
              <div className="bg-primary/10 text-primary p-1.5 rounded-lg shrink-0 overflow-hidden h-7 w-7 flex items-center justify-center">
                {studentProfile.profilePicture ? (
                  <img src={studentProfile.profilePicture} alt="" className="h-full w-full object-cover rounded-md" />
                ) : (
                  <UserCircle className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-semibold truncate">{studentProfile.displayName}</span>
                <span className="text-[10px] text-muted-foreground truncate">@{studentProfile.username}</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="login-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Link href="/sign-in">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-primary/20 hover:bg-primary/5 text-primary rounded-xl h-10"
              >
                <UserCircle className="h-4 w-4" />
                دخول الطلاب
              </Button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {isAdmin && (
        <Link href="/admin/dashboard">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/8 text-primary text-sm font-medium cursor-pointer hover:bg-primary/15 transition-colors"
          >
            <Settings className="h-4 w-4" />
            لوحة التحكم
          </motion.div>
        </Link>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">

      {/* ─── Mobile top header ─── */}
      <header
        className="lg:hidden fixed top-3 inset-x-3 z-50 h-14 rounded-2xl flex items-center px-4 gap-2"
        style={{
          background: theme === "dark"
            ? "rgba(15, 10, 30, 0.55)"
            : "rgba(255, 255, 255, 0.55)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: theme === "dark"
            ? "1px solid rgba(255,255,255,0.10)"
            : "1px solid rgba(0,0,0,0.07)",
          boxShadow: theme === "dark"
            ? "0 4px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.06) inset"
            : "0 4px 20px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.9) inset",
        }}
      >
        <motion.img
          src={logoSrc}
          alt="ثاني موهبة"
          className="h-8 w-auto dark:invert-0 invert cursor-pointer select-none"
          onClick={handleAdminEasterEgg}
          whileTap={{ scale: 0.92 }}
        />
        {siteSettings?.schoolName && (
          <span className="text-xs font-semibold text-foreground/70 truncate max-w-[120px]">
            {siteSettings.schoolName}
          </span>
        )}
        <div className="flex-1" />
        {studentProfile && <NotificationBell />}
        <ColorThemePicker popupDirection="down" />
        <ThemeButton />
        {studentProfile ? (
          <Link href="/profile">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 cursor-pointer"
            >
              <div className="h-5 w-5 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
                {studentProfile.profilePicture ? (
                  <img src={studentProfile.profilePicture} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-primary">{studentProfile.displayName.charAt(0)}</span>
                )}
              </div>
              <span className="text-xs font-semibold max-w-[80px] truncate">{studentProfile.displayName}</span>
            </motion.div>
          </Link>
        ) : (
          <Link href="/sign-in">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary hover:bg-primary/5 rounded-lg px-3">
              دخول
            </Button>
          </Link>
        )}
      </header>

      {/* ─── Desktop floating sidebar ─── */}
      <aside className="hidden lg:flex fixed right-4 top-4 bottom-4 w-[264px] z-40 flex-col rounded-2xl glass-strong shadow-2xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent pointer-events-none rounded-t-2xl" />
        <div className="relative flex flex-col items-center justify-center px-5 pt-5 pb-4 border-b border-border/40 shrink-0 gap-1">
          <motion.img
            src={logoSrc}
            alt="ثاني موهبة"
            className="h-12 w-auto dark:invert-0 invert cursor-pointer select-none"
            onClick={handleAdminEasterEgg}
            whileTap={{ scale: 0.92 }}
          />
          {siteSettings?.schoolName && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-medium text-muted-foreground text-center leading-tight"
            >
              {siteSettings.schoolName}
            </motion.p>
          )}
          {(siteSettings?.teacherPhone || (siteSettings?.socialLinks && siteSettings.socialLinks.filter(l => l.url).length > 0)) && (
            <div className="flex gap-1.5 mt-1 flex-wrap justify-center">
              {siteSettings?.teacherPhone && (
                <a
                  href={`https://wa.me/${siteSettings.teacherPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="واتساب المعلم"
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span>واتساب</span>
                </a>
              )}
              {siteSettings?.socialLinks && siteSettings.socialLinks.filter(l => l.url).map((l, i) => {
                const PlatformIcon = PLATFORM_ICONS[l.platform] ?? Link2;
                return (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={l.label || l.platform}
                    className="h-6 w-6 rounded-lg flex items-center justify-center bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all hover:scale-110"
                  >
                    <PlatformIcon className="h-3.5 w-3.5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
        <div className="relative flex-1 overflow-auto px-4 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={location === item.href}
              />
            ))}
          </nav>
        </div>
        <div className="relative px-4 pb-5 pt-4 border-t border-border/40 shrink-0 bg-gradient-to-t from-muted/20 to-transparent">
          <SidebarFooter />
        </div>
      </aside>

      {/* ─── Mobile floating bottom nav ─── */}
      <MobileBottomNav location={location} />

      {/* ─── Animated background orbs (CPU-light, CSS animation only) ─── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute rounded-full opacity-[0.055] dark:opacity-[0.035] animate-orb-a"
          style={{
            width: 560, height: 560,
            top: "-15%", right: "-12%",
            background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 68%)",
            filter: "blur(56px)",
          }}
        />
        <div
          className="absolute rounded-full opacity-[0.045] dark:opacity-[0.025] animate-orb-b"
          style={{
            width: 420, height: 420,
            bottom: "-14%", left: "-8%",
            background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 68%)",
            filter: "blur(48px)",
          }}
        />
      </div>

      {/* ─── Main content with spring scroll ─── */}
      <ScrollSpring
        scrollKey={location}
        className="fixed inset-0 z-10
          lg:top-0 lg:bottom-0 lg:right-[280px]"
      >
        <main className="px-4 pt-[88px] pb-[112px] lg:px-8 lg:pt-10 lg:pb-10">
          <div className="mx-auto max-w-5xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                style={{ willChange: "opacity, transform" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </ScrollSpring>
    </div>
  );
}

/* ─── Mobile floating bottom navigation ─── */
function MobileBottomNav({ location }: { location: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  const mobileNavItems = [
    { href: "/", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/assignments", label: "المهام", icon: BookOpen },
    { href: "/quizzes", label: "الاختبارات", icon: Trophy },
    { href: "/schedule", label: "الجدول", icon: GraduationCap },
    { href: "/calendar", label: "التقويم", icon: CalendarDays },
    { href: "/teacher", label: "المعلمون", icon: Users },
    { href: "/timer", label: "المؤقت", icon: Timer },
    { href: "/chat", label: "الدردشة", icon: MessageSquare },
    ...(isAdmin ? [{ href: "/admin/dashboard", label: "التحكم", icon: Shield }] : []),
  ];

  const activeIndex = mobileNavItems.findIndex((item) => {
    if (item.href === "/") return location === "/";
    if (item.href === "/quizzes") return location.startsWith("/quizzes") || location.startsWith("/quiz/");
    if (item.href === "/admin/dashboard") return location.startsWith("/admin");
    return location.startsWith(item.href);
  });

  return (
    <motion.nav
      className="lg:hidden fixed bottom-4 inset-x-4 z-50"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.15 }}
    >
      <div
        className="relative flex items-center justify-around px-2 py-2.5 rounded-[36px] overflow-hidden"
        style={{
          background: isDark
            ? "rgba(15, 10, 30, 0.55)"
            : "rgba(255, 255, 255, 0.55)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: isDark
            ? "1px solid rgba(255,255,255,0.10)"
            : "1px solid rgba(0,0,0,0.07)",
          boxShadow: isDark
            ? "0 -4px 24px rgba(0,0,0,0.35), 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "0 -2px 12px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        {activeIndex !== -1 && (
          <motion.div
            className="absolute top-1.5 bottom-1.5 rounded-[20px] pointer-events-none"
            layoutId="bottom-nav-pill"
            style={{
              width: `calc(${100 / mobileNavItems.length}% - 8px)`,
              right: `calc(${(activeIndex / mobileNavItems.length) * 100}% + 4px)`,
              background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 80%, transparent) 100%)",
              opacity: 0.18,
            }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
          />
        )}

        {mobileNavItems.map((item, i) => (
          <BottomNavItem
            key={item.href}
            item={item}
            isActive={activeIndex === i}
            totalCount={mobileNavItems.length}
          />
        ))}
      </div>
    </motion.nav>
  );
}

function BottomNavItem({
  item,
  isActive,
  totalCount,
}: {
  item: { href: string; label: string; icon: typeof LayoutDashboard };
  isActive: boolean;
  totalCount: number;
}) {
  const [pressed, setPressed] = useState(false);
  const Icon = item.icon;

  return (
    <Link href={item.href}>
      <motion.div
        onTapStart={() => setPressed(true)}
        onTap={() => setPressed(false)}
        onTapCancel={() => setPressed(false)}
        className="relative flex flex-col items-center justify-center gap-1 py-1 cursor-pointer select-none"
        style={{ width: `calc((100vw - 32px) / ${totalCount} - 4px)`, minWidth: 44 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 500, damping: 22 }}
      >
        <motion.div
          className="relative flex items-center justify-center"
          animate={
            isActive
              ? { y: -3, scale: 1.12 }
              : pressed
              ? { scale: 0.9 }
              : { y: 0, scale: 1 }
          }
          transition={{ type: "spring", stiffness: 440, damping: 22 }}
        >
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              >
                <div
                  className="absolute inset-0 rounded-full blur-lg scale-[2.2]"
                  style={{ background: "var(--primary)", opacity: 0.3 }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <Icon
            className={`h-[22px] w-[22px] transition-colors duration-200 ${
              isActive ? "text-primary" : "text-muted-foreground"
            }`}
          />
        </motion.div>
        <motion.span
          className={`text-[9px] font-medium leading-none transition-colors duration-200 ${
            isActive ? "text-primary" : "text-muted-foreground/70"
          }`}
          animate={isActive ? { scale: 1.05 } : { scale: 1 }}
        >
          {item.label}
        </motion.span>
      </motion.div>
    </Link>
  );
}
