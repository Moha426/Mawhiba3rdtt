import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, School, Link2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";

type SocialLink = { platform: string; label: string; url: string };

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
  const { data: settingsData, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const [saving, setSaving] = useState(false);
  const [showSchoolName, setShowSchoolName] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (settingsData) {
      setShowSchoolName(settingsData.showSchoolName !== false);
      setSchoolName(settingsData.schoolName ?? "");
      setSocialLinks(settingsData.socialLinks ?? []);
    }
  }, [settingsData]);

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
      const trimmedName = schoolName.trim();
      await updateSettings.mutateAsync({
        data: {
          showSchoolName: showSchoolName,
          schoolName: trimmedName,
          teacherPhone: null,
          socialLinks,
        },
      });
      toast({ title: "تم حفظ الإعدادات ومزامنتها بنجاح ✅" });
    } catch {
      toast({ title: "حدث خطأ أثناء الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="py-12 flex justify-center"><LoadingSpinner /></div>;

  const isVisibleInUi = showSchoolName && schoolName.trim().length > 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">إعدادات الموقع</h2>
        <Button onClick={handleSave} disabled={saving} className="gap-2 rounded-xl">
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>

      {/* School name & display visibility */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <School className="h-4 w-4 text-primary" />
              اسم المدرسة والظهور
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {showSchoolName ? (
                  <>
                    <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>ظاهر في الواجهة</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>مخفي من الواجهة</span>
                  </>
                )}
              </span>
              <Switch
                checked={showSchoolName}
                onCheckedChange={setShowSchoolName}
                aria-label="تفعيل أو إخفاء اسم المدرسة"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              نص اسم المدرسة
            </label>
            <Input
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="مثال: مدرسة الموهبة الثانوية للبنين (أو اتركه فارغاً للإخفاء)"
              className="rounded-xl"
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {showSchoolName
              ? "يظهر اسم المدرسة في أعلى الشريط العلوي وفي القائمة الجانبية وصفحة المعلم. يمكنك إلغاء تفعيل المفتاح أعلاه أو مسح النص لإخفائه تماماً."
              : "تم إخفاء اسم المدرسة حالياً ولن يظهر في الشريط العلوي أو القائمة الجانبية أو أي مكان بالواجهة."}
          </p>
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
      <Card className="rounded-2xl border-border/50 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-muted-foreground flex items-center justify-between">
            <span>معاينة الظهور</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${isVisibleInUi ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
              {isVisibleInUi ? "اسم المدرسة معروض" : "اسم المدرسة مخفي"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isVisibleInUi ? (
            <div className="p-3 bg-background rounded-xl border border-border/60">
              <p className="text-xs text-muted-foreground mb-1">الشريط العلوي / القائمة الجانبية:</p>
              <p className="font-bold text-lg text-primary">{schoolName.trim()}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              اسم المدرسة غير معروض في واجهة الموقع حالياً.
            </p>
          )}

          {socialLinks.filter(l => l.url).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
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
    </div>
  );
}
