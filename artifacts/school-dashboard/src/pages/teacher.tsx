import { useEffect, useState } from "react";
import { useListSubjects } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  Phone, ExternalLink, School, Users, MessageCircle, BookOpen, Info,
  Camera, Twitter, Youtube, Send, Music2, Ghost, Link2,
} from "lucide-react";
import { LoadingPage } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

type SocialLink = { platform: string; label: string; url: string };
type SiteSettings = { schoolName: string | null; teacherPhone: string | null; socialLinks: SocialLink[] };
type LucideIcon = typeof MessageCircle;

const PLATFORM_META: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  whatsapp:  { icon: MessageCircle, label: "واتساب",    color: "#25d366" },
  instagram: { icon: Camera,        label: "انستقرام",  color: "#e1306c" },
  twitter:   { icon: Twitter,       label: "تويتر",    color: "#1da1f2" },
  youtube:   { icon: Youtube,       label: "يوتيوب",   color: "#ff0000" },
  telegram:  { icon: Send,          label: "تيليقرام", color: "#0088cc" },
  tiktok:    { icon: Music2,        label: "تيك توك",  color: "#333333" },
  snapchat:  { icon: Ghost,         label: "سناب شات", color: "#f5a623" },
  other:     { icon: Link2,         label: "رابط",     color: "#6366f1" },
};

export default function TeacherPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const { data: subjects = [], isLoading } = useListSubjects();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: SiteSettings) => setSettings(d))
      .catch(() => {});
  }, []);

  if (isLoading) return <LoadingPage />;

  const subjectsWithTeacher = subjects.filter((s) => s.teacherName || s.teacherPhone);
  const socialLinks = (settings?.socialLinks ?? []).filter((l) => l.url);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <PageHeader
        icon={Users}
        title="المعلمون والتواصل"
        subtitle="بيانات المعلمين وطرق التواصل معهم"
      />

      {/* School info card */}
      {(settings?.schoolName || settings?.teacherPhone) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm"
        >
          <div className="p-4 flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <School className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              {settings?.schoolName && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium">المدرسة</p>
                  <p className="font-bold text-base">{settings.schoolName}</p>
                </div>
              )}
              {settings?.teacherPhone && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <a
                    href={`https://wa.me/${settings.teacherPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    واتساب المعلم
                  </a>
                  <a
                    href={`tel:${settings.teacherPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground border border-border/50 text-xs font-semibold hover:bg-muted/80 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {settings.teacherPhone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="px-4 pb-4 pt-0 border-t border-border/30 mt-0">
              <p className="text-xs text-muted-foreground font-medium mt-3 mb-2">روابط التواصل الاجتماعي</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link, i) => {
                  const meta = PLATFORM_META[link.platform] ?? PLATFORM_META.other;
                  return (
                    <motion.a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors hover:opacity-80"
                      style={{
                        backgroundColor: `${meta.color}12`,
                        borderColor: `${meta.color}30`,
                        color: meta.color,
                      }}
                    >
                      <meta.icon className="h-3.5 w-3.5" />
                      <span>{link.label || meta.label}</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </motion.a>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Per-subject teacher cards */}
      {subjectsWithTeacher.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-bold text-sm">معلمو المواد</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {subjectsWithTeacher.map((subject, i) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 + i * 0.05 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-border/40 bg-card hover:shadow-md transition-all"
              >
                {/* Subject color dot */}
                <div
                  className="h-10 w-10 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor: `${subject.color}20`,
                    color: subject.color,
                    border: `1.5px solid ${subject.color}40`,
                  }}
                >
                  {subject.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm truncate">{subject.name}</p>
                    <Badge
                      className="text-[10px] py-0 px-2 h-4 border-0 rounded-full shrink-0"
                      style={{ backgroundColor: `${subject.color}18`, color: subject.color }}
                    >
                      مادة
                    </Badge>
                  </div>
                  {subject.teacherName && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {subject.teacherName}
                    </p>
                  )}
                  {subject.teacherPhone && (
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      <a
                        href={`https://wa.me/${subject.teacherPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" />
                        واتساب
                      </a>
                      <a
                        href={`tel:${subject.teacherPhone}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-muted-foreground border border-border/50 text-[11px] font-semibold hover:bg-muted/80 transition-colors"
                      >
                        <Phone className="h-3 w-3" />
                        {subject.teacherPhone}
                      </a>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!settings?.teacherPhone && !settings?.schoolName && subjectsWithTeacher.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Info className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-muted-foreground">لم تُضَف بيانات المعلمين بعد</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs">
            يمكن للمشرف إضافة أرقام المعلمين وروابط التواصل من لوحة التحكم
          </p>
        </div>
      )}
    </motion.div>
  );
}
