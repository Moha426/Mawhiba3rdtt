import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, School, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";

type SocialLink = { platform: string; label: string; url: string };

type Settings = {
  id: number;
  schoolName: string | null;
  socialLinks: SocialLink[];
  updatedAt: string | null;
};

const PLATFORMS = [
  { id: "whatsapp",  label: "واتساب",    emoji: "💬" },
  { id: "instagram", label: "إنستغرام",  emoji: "📸" },
  { id: "twitter",   label: "تويتر/X",   emoji: "🐦" },
  { id: "youtube",   label: "يوتيوب",    emoji: "▶️" },
  { id: "telegram",  label: "تيليغرام",  emoji: "✈️" },
  { id: "tiktok",    label: "تيك توك",   emoji: "🎵" },
  { id: "snapchat",  label: "سناب شات",  emoji: "👻" },
  { id: "other",     label: "رابط آخر",  emoji: "🔗" },
];

function getPlatformEmoji(id: string) {
  return PLATFORMS.find(p => p.id === id)?.emoji ?? "🔗";
}

export function SettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then((data: Settings) => {
        setSchoolName(data.schoolName ?? "");
        setSocialLinks(data.socialLinks ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const addLink = () => {
    setSocialLinks(prev => [...prev, { platform: "other", label: "", url: "" }]);
  };

  const removeLink = (i: number) => {
    setSocialLinks(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateLink = (i: number, field: keyof SocialLink, val: string) => {
    setSocialLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: schoolName || null,
          teacherPhone: null,
          socialLinks,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تم الحفظ بنجاح ✅" });
    } catch {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">إعدادات الموقع</h2>
        <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>

      {/* School name */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <School className="h-4 w-4 text-primary" />
            اسم المدرسة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            placeholder="مثال: مدرسة الموهبة الثانوية للبنين"
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground mt-2">يظهر في القائمة الجانبية ويمكن استخدامه في الواجهة.</p>
        </CardContent>
      </Card>

      {/* Social links */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" />
            روابط ووسائل التواصل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {socialLinks.map((link, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex gap-2">
                  <select
                    value={link.platform}
                    onChange={e => {
                      const plat = PLATFORMS.find(p => p.id === e.target.value);
                      updateLink(i, "platform", e.target.value);
                      if (plat && !link.label) updateLink(i, "label", plat.label);
                    }}
                    className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>
                    ))}
                  </select>
                  <Input
                    value={link.label}
                    onChange={e => updateLink(i, "label", e.target.value)}
                    placeholder="الاسم / العنوان"
                    className="flex-1 rounded-xl"
                  />
                </div>
                <Input
                  value={link.url}
                  onChange={e => updateLink(i, "url", e.target.value)}
                  placeholder="https://..."
                  dir="ltr"
                  className="rounded-xl"
                  type="url"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLink(i)}
                className="mt-1 h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addLink}
            className="w-full gap-2 rounded-xl border-dashed"
          >
            <Plus className="h-4 w-4" />
            إضافة رابط
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {(schoolName || socialLinks.length > 0) && (
        <Card className="rounded-2xl border-border/50 bg-muted/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">معاينة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {schoolName && (
              <p className="font-bold text-lg">{schoolName}</p>
            )}
            {socialLinks.filter(l => l.url).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {socialLinks.filter(l => l.url).map((l, i) => (
                  <a
                    key={i}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border/60 rounded-full text-sm hover:bg-primary/5 hover:border-primary/30 transition-colors"
                  >
                    <span>{getPlatformEmoji(l.platform)}</span>
                    <span>{l.label || l.platform}</span>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
