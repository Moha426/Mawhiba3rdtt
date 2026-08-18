import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  PhoneCall,
  Tv,
  Globe,
  Plus,
  Trash2,
  Edit3,
  Pin,
  ExternalLink,
  Sparkles,
  Search,
  CheckCircle2,
  Copy,
  Layers,
  Users,
  Shield,
  Download,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePersistentState } from "@/lib/api-client-react";

export interface CommunityChannel {
  id: string;
  name: string;
  type: "discord" | "telegram" | "whatsapp" | "youtube" | "custom";
  url: string;
  category: string;
  desc?: string;
  badge?: string;
  color?: string;
  icon?: string;
  memberCount?: string;
  isPinned?: boolean;
}

export const DEFAULT_COMMUNITY_CHANNELS: CommunityChannel[] = [
  {
    id: "chan_discord_official",
    name: "خادم ديسكورد موهبة 3 الرسمي",
    type: "discord",
    url: "https://discord.com",
    category: "خوادم ديسكورد",
    desc: "المجتمع الصوتي والدراسي المباشر للدفعة، غرف مراجعة صامتة ونقاش جماعي للمسائل الصعبة",
    badge: "رسمي",
    color: "from-indigo-600 to-blue-700",
    icon: "MessageSquare",
    memberCount: "+450 موهوب",
    isPinned: true,
  },
  {
    id: "chan_telegram_qudrat",
    name: "قناة تجميعات وتسريبات القدرات",
    type: "telegram",
    url: "https://t.me",
    category: "قنوات تليجرام",
    desc: "ملفات وتجميعات يومية محلولة، نماذج اختبارات حديثة وقوانين ذهبية لاختبارات قياس",
    badge: "تجميعات",
    color: "from-sky-500 to-blue-600",
    icon: "Send",
    memberCount: "+1,200 مشترك",
    isPinned: true,
  },
  {
    id: "chan_whatsapp_study",
    name: "مجموعة واتساب الاستفسارات العاجلة",
    type: "whatsapp",
    url: "https://chat.whatsapp.com",
    category: "مجموعات واتساب",
    desc: "للتنبيهات اليومية السريعة، الواجبات والمهام المدرسية المباشرة بين الطلاب والمعلمين",
    badge: "عاجل",
    color: "from-emerald-600 to-teal-700",
    icon: "PhoneCall",
    memberCount: "+280 طالب",
    isPinned: false,
  },
  {
    id: "chan_youtube_lectures",
    name: "قناة شروحات التحصيلي والموهبة",
    type: "youtube",
    url: "https://youtube.com",
    category: "قنوات يوتيوب",
    desc: "شروحات مرئية تفاعلية لمنهج ثالث ثانوي ومفاهيم الفيزياء والرياضيات المتقدمة والقدرات",
    badge: "شروحات",
    color: "from-rose-600 to-red-700",
    icon: "Tv",
    memberCount: "+3,400 متابع",
    isPinned: false,
  },
];

const COLOR_PRESETS = [
  { label: "أزرق / نيلي ديسكورد", value: "from-indigo-600 to-blue-700" },
  { label: "سماوي تليجرام", value: "from-sky-500 to-blue-600" },
  { label: "زمردي واتساب", value: "from-emerald-600 to-teal-700" },
  { label: "ياقوتي يوتيوب", value: "from-rose-600 to-red-700" },
  { label: "بنفسجي ملكي", value: "from-purple-600 to-fuchsia-700" },
  { label: "كهرماني نشط", value: "from-amber-600 to-orange-700" },
  { label: "كربون داكن", value: "from-slate-700 to-zinc-900" },
];

export function ChannelsTab() {
  const { toast } = useToast();
  const [channels, setChannels] = usePersistentState<CommunityChannel[]>("channels", DEFAULT_COMMUNITY_CHANNELS);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<CommunityChannel | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CommunityChannel["type"]>("discord");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState("خوادم ديسكورد");
  const [formDesc, setFormDesc] = useState("");
  const [formBadge, setFormBadge] = useState("جديد");
  const [formColor, setFormColor] = useState("from-indigo-600 to-blue-700");
  const [formMemberCount, setFormMemberCount] = useState("نشط");
  const [formIsPinned, setFormIsPinned] = useState(false);

  const categories = useMemo(() => {
    const list = Array.isArray(channels) ? channels : [];
    return ["الكل", ...Array.from(new Set(list.map((c) => c.category)))];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    const list = Array.isArray(channels) ? channels : [];
    return list.filter((c) => {
      const matchSearch =
        (c.name || "").toLowerCase().includes((search || "").toLowerCase()) ||
        (c.desc && (c.desc || "").toLowerCase().includes((search || "").toLowerCase())) ||
        (c.category || "").toLowerCase().includes((search || "").toLowerCase());
      const matchCat = selectedCategory === "الكل" || c.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [channels, search, selectedCategory]);

  const openAddDialog = () => {
    setEditingChannel(null);
    setFormName("");
    setFormType("discord");
    setFormUrl("");
    setFormCategory("خوادم ديسكورد");
    setFormDesc("");
    setFormBadge("جديد");
    setFormColor("from-indigo-600 to-blue-700");
    setFormMemberCount("نشط");
    setFormIsPinned(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (channel: CommunityChannel) => {
    setEditingChannel(channel);
    setFormName(channel.name);
    setFormType(channel.type);
    setFormUrl(channel.url);
    setFormCategory(channel.category);
    setFormDesc(channel.desc || "");
    setFormBadge(channel.badge || "");
    setFormColor(channel.color || "from-indigo-600 to-blue-700");
    setFormMemberCount(channel.memberCount || "نشط");
    setFormIsPinned(channel.isPinned || false);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      toast({ title: "تنبيه", description: "يرجى كتابة اسم القناة ورابط الانضمام", variant: "destructive" });
      return;
    }

    const payload: CommunityChannel = {
      id: editingChannel ? editingChannel.id : `chan_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: formName.trim(),
      type: formType,
      url: formUrl.trim(),
      category: formCategory.trim() || "قنوات عامة",
      desc: formDesc.trim(),
      badge: formBadge.trim(),
      color: formColor,
      memberCount: formMemberCount.trim(),
      isPinned: formIsPinned,
    };

    const currentList = Array.isArray(channels) ? channels : [];
    let updated: CommunityChannel[];
    if (editingChannel) {
      updated = currentList.map((c) => (c.id === editingChannel.id ? payload : c));
      toast({ title: "تم التعديل بنجاح ✏️", description: `تم تحديث بيانات قناة ${formName}` });
    } else {
      updated = [payload, ...currentList];
      toast({ title: "تمت إضافة القناة بنجاح 🚀", description: `تم نشر قناة ${formName} للمنصة` });
    }

    setChannels(updated);
    setIsDialogOpen(false);

    // Save to Express API if running
    try {
      if (editingChannel) {
        await fetch(`/api/channels/${editingChannel.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    } catch {}
  };

  const handleDelete = async (id: string, name: string) => {
    const currentList = Array.isArray(channels) ? channels : [];
    const updated = currentList.filter((c) => String(c.id) !== String(id));
    setChannels(updated);
    toast({ title: "تم حذف القناة 🗑️", description: `تم حذف قناة "${name}" من المنصة` });

    try {
      await fetch(`/api/channels/${id}`, { method: "DELETE" });
    } catch {}
  };

  const togglePin = (channel: CommunityChannel) => {
    const currentList = Array.isArray(channels) ? channels : [];
    const updated = currentList.map((c) =>
      c.id === channel.id ? { ...c, isPinned: !c.isPinned } : c
    );
    setChannels(updated);
    toast({
      title: channel.isPinned ? "تم إلغاء التثبيت" : "تم تثبيت القناة بأعلى القائمة 📌",
    });
  };

  const getPlatformIcon = (type: CommunityChannel["type"]) => {
    switch (type) {
      case "discord":
        return <MessageSquare className="h-5 w-5 text-indigo-400" />;
      case "telegram":
        return <Send className="h-5 w-5 text-sky-400" />;
      case "whatsapp":
        return <PhoneCall className="h-5 w-5 text-emerald-400" />;
      case "youtube":
        return <Tv className="h-5 w-5 text-rose-400" />;
      default:
        return <Globe className="h-5 w-5 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header bar ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/60 p-5 rounded-2xl border border-border/60">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span>إدارة قنوات ومجتمعات الدفعة</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            إضافة وتعديل وحذف خوادم ديسكورد، قنوات تليجرام، ومجموعات الواتساب ومزامنتها سحابياً للطلاب
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="h-10 px-4 rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة قناة جديدة</span>
        </Button>
      </div>

      {/* ─── Search & Categories ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في أسماء القنوات، الوصف، أو التصنيف..."
            className="pr-10 h-10 rounded-xl"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="h-10 px-3 rounded-xl text-xs whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* ─── Channels Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredChannels.map((channel) => (
          <Card
            key={channel.id}
            className="rounded-2xl border-border/70 overflow-hidden relative group hover:border-primary/50 transition-all bg-card/70 backdrop-blur-sm shadow-sm"
          >
            <div className={`h-2.5 w-full bg-gradient-to-r ${channel.color || "from-indigo-600 to-blue-700"}`} />
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-muted/80 border border-border/50">
                    {getPlatformIcon(channel.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-foreground">{channel.name}</h3>
                      {channel.isPinned && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 gap-1">
                          <Pin className="h-3 w-3" /> مثبت
                        </Badge>
                      )}
                      {channel.badge && (
                        <Badge variant="outline" className="text-[10px]">
                          {channel.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{channel.category} • {channel.memberCount || "نشط"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePin(channel)}
                    className={`h-8 w-8 rounded-lg ${channel.isPinned ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
                    title={channel.isPinned ? "إلغاء التثبيت" : "تثبيت"}
                  >
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(channel)}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                    title="تعديل"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(channel.id, channel.name)}
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {channel.desc && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/30">
                  {channel.desc}
                </p>
              )}

              <div className="flex items-center justify-between pt-1 text-xs">
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-[240px]"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{channel.url}</span>
                </a>
                <span className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 bg-muted rounded-md">
                  {channel.type.toUpperCase()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredChannels.length === 0 && (
        <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border/70">
          <Layers className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-semibold text-muted-foreground">لا توجد قنوات مطابقة</p>
          <Button onClick={openAddDialog} variant="link" className="text-primary text-xs mt-1">
            إضافة قناة جديدة الآن
          </Button>
        </div>
      )}

      {/* ─── Add/Edit Dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg rounded-3xl border-border/80" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>{editingChannel ? "تعديل القناة" : "إضافة قناة ومجتمع جديد"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">اسم القناة / المجتمع *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: خادم ديسكورد موهبة 3 - قدرات وتحصيلي"
                className="rounded-xl h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">نوع المنصة</label>
                <select
                  value={formType}
                  onChange={(e) => {
                    const t = e.target.value as CommunityChannel["type"];
                    setFormType(t);
                    if (t === "discord") {
                      setFormCategory("خوادم ديسكورد");
                      setFormColor("from-indigo-600 to-blue-700");
                    } else if (t === "telegram") {
                      setFormCategory("قنوات تليجرام");
                      setFormColor("from-sky-500 to-blue-600");
                    } else if (t === "whatsapp") {
                      setFormCategory("مجموعات واتساب");
                      setFormColor("from-emerald-600 to-teal-700");
                    } else if (t === "youtube") {
                      setFormCategory("قنوات يوتيوب");
                      setFormColor("from-rose-600 to-red-700");
                    }
                  }}
                  className="w-full h-11 rounded-xl bg-background border border-input px-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="discord">ديسكورد (Discord)</option>
                  <option value="telegram">تليجرام (Telegram)</option>
                  <option value="whatsapp">واتساب (WhatsApp)</option>
                  <option value="youtube">يوتيوب (YouTube)</option>
                  <option value="custom">موقع / رابط خارجي</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">التصنيف</label>
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="مثال: قنوات القدرات"
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">رابط الانضمام المباشر *</label>
              <Input
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://discord.gg/... أو https://t.me/..."
                className="rounded-xl h-11 text-left font-mono text-xs"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">الوصف التعريفي للقناة</label>
              <Textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="شرح موجز لمحتوى القناة والفائدة المرجوة منها..."
                className="rounded-xl resize-none h-20 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">شارة مميزة (Badge)</label>
                <Input
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  placeholder="رسمي / تجميعات / شروحات"
                  className="rounded-xl h-11 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">عدد الأعضاء / الحالة</label>
                <Input
                  value={formMemberCount}
                  onChange={(e) => setFormMemberCount(e.target.value)}
                  placeholder="+500 موهوب"
                  className="rounded-xl h-11 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1.5">نمط اللون</label>
              <select
                value={formColor}
                onChange={(e) => setFormColor(e.target.value)}
                className="w-full h-11 rounded-xl bg-background border border-input px-3 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                {COLOR_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPinned"
                checked={formIsPinned}
                onChange={(e) => setFormIsPinned(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
              <label htmlFor="isPinned" className="text-xs font-bold cursor-pointer text-foreground">
                تثبيت القناة في أعلى الصفحة للطلاب 📌
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button onClick={handleSave} className="rounded-xl bg-primary text-primary-foreground">
              {editingChannel ? "حفظ التعديلات" : "إضافة القناة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
