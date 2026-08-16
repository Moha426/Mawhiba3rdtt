import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  PhoneCall,
  Tv,
  Globe,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Search,
  Sparkles,
  Shield,
  Trash2,
  Edit3,
  Pin,
  Download,
  Smartphone,
  CheckCircle2,
  Users,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePersistentState } from "@/lib/api-client-react";
import { DEFAULT_COMMUNITY_CHANNELS, type CommunityChannel } from "@/components/admin/channels-tab";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

const COLOR_PRESETS = [
  { label: "أزرق / نيلي ديسكورد", value: "from-indigo-600 to-blue-700" },
  { label: "سماوي تليجرام", value: "from-sky-500 to-blue-600" },
  { label: "زمردي واتساب", value: "from-emerald-600 to-teal-700" },
  { label: "ياقوتي يوتيوب", value: "from-rose-600 to-red-700" },
  { label: "بنفسجي ملكي", value: "from-purple-600 to-fuchsia-700" },
  { label: "كهرماني نشط", value: "from-amber-600 to-orange-700" },
  { label: "كربون داكن", value: "from-slate-700 to-zinc-900" },
];

export default function ChannelsPage() {
  const { toast } = useToast();
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";
  const [channels, setChannels] = usePersistentState<CommunityChannel[]>("channels", DEFAULT_COMMUNITY_CHANNELS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dialog State
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

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
      toast({ title: "تم التثبيت بنجاح 🎉", description: "أصبح تطبيق ثالث موهبة مثبتاً الآن على جهازك" });
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      try {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsAppInstalled(true);
          setInstallPrompt(null);
          return;
        }
      } catch (err) {
        console.warn(err);
      }
    }
    setIsDownloadModalOpen(true);
  };

  const handleSaveChannel = async () => {
    if (!formName.trim() || !formUrl.trim()) {
      toast({ title: "تنبيه", description: "يرجى كتابة اسم القناة ورابط الانضمام", variant: "destructive" });
      return;
    }

    const channelPayload: CommunityChannel = {
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
    if (editingChannel) {
      setChannels(currentList.map((c) => (c.id === editingChannel.id ? channelPayload : c)));
      toast({ title: "تم التعديل بنجاح ✏️", description: `تم تحديث وتنسيق قناة ${formName}` });
    } else {
      setChannels([channelPayload, ...currentList]);
      toast({ title: "تمت إضافة القناة بنجاح 🚀", description: `أصبحت قناة ${formName} متاحة الآن للجميع` });
    }

    setIsDialogOpen(false);
    resetForm();

    try {
      if (editingChannel) {
        await fetch(`/api/channels/${editingChannel.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(channelPayload),
        });
      } else {
        await fetch("/api/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(channelPayload),
        });
      }
    } catch {}
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    const currentList = Array.isArray(channels) ? channels : [];
    setChannels(currentList.filter((c) => String(c.id) !== String(id)));
    toast({ title: "تم الحذف", description: `تم حذف قناة ${name}` });

    try {
      await fetch(`/api/channels/${id}`, { method: "DELETE" });
    } catch {}
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

  const resetForm = () => {
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
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "تم نسخ الرابط", description: "يمكنك الآن مشاركة الرابط مع زملائك" });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getPlatformIcon = (type: CommunityChannel["type"]) => {
    switch (type) {
      case "discord":
        return <MessageSquare className="h-6 w-6 text-indigo-400" />;
      case "telegram":
        return <Send className="h-6 w-6 text-sky-400" />;
      case "whatsapp":
        return <PhoneCall className="h-6 w-6 text-emerald-400" />;
      case "youtube":
        return <Tv className="h-6 w-6 text-rose-400" />;
      default:
        return <Globe className="h-6 w-6 text-amber-400" />;
    }
  };

  const channelList = Array.isArray(channels) ? channels : [];
  const categories = ["الكل", ...Array.from(new Set(channelList.map((c) => c.category)))];

  const filteredChannels = channelList.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.desc && c.desc.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "الكل" || c.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* ─── Header & Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-6 rounded-3xl border border-border/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Layers className="h-4 w-4" />
            <span>بوابة القنوات والمجتمعات الدراسية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            قنوات الدفعة وخوادم النقاش
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            انضم مباشرة لخوادم ديسكورد الصوتية، قنوات التليجرام لتسريبات وتجميعات القدرات، ومجموعات الواتساب الرسمية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="h-11 px-5 rounded-2xl font-bold gap-2 shadow-md bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-5 w-5" />
                  <span>إضافة قناة (إدارة)</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md sm:max-w-lg rounded-3xl border-border/80" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span>{editingChannel ? "تعديل وتنسيق القناة" : "إضافة قناة ومجتمع جديد"}</span>
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
                      id="isPinnedMobile"
                      checked={formIsPinned}
                      onChange={(e) => setFormIsPinned(e.target.checked)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <label htmlFor="isPinnedMobile" className="text-xs font-bold cursor-pointer text-foreground">
                      تثبيت القناة في أعلى الصفحة 📌
                    </label>
                  </div>
                </div>

                <DialogFooter className="flex gap-2 pt-3 border-t border-border/50">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                    إلغاء
                  </Button>
                  <Button onClick={handleSaveChannel} className="rounded-xl font-bold bg-primary text-primary-foreground">
                    حفظ وتطبيق التنسيق
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ─── Android App Direct Banner ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-lg border border-emerald-400/30"
      >
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4 text-center md:text-right flex-col md:flex-row">
            <div className="p-3.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/25 shadow-inner">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start mb-0.5">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold tracking-wide">
                  تطبيق الهاتف PWA
                </span>
                <span className="text-emerald-200 text-xs font-semibold">جاهز للتثبيت</span>
              </div>
              <h2 className="text-xl font-bold">تطبيق منصة ثالث ثانوي موهبة</h2>
              <p className="text-xs text-emerald-100 max-w-xl mt-1 leading-relaxed">
                ثبّت المنصة مباشرة على هاتفك أو جهازك لتصفح الجداول والواجبات والمكتبة بسرعة فائقة وبدون انقطاع.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isAppInstalled ? (
              <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/20 backdrop-blur-md font-bold text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <span>التطبيق مثبت لديك بالفعل</span>
              </div>
            ) : (
              <Button
                onClick={handleInstallClick}
                className="h-12 px-6 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold shadow-md gap-2"
              >
                <Download className="h-5 w-5" />
                <span>تثبيت على الشاشة الرئيسية</span>
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Search & Category Filters ─── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن قناة أو مجموعة..."
            className="pr-10 rounded-2xl h-11 bg-card/80 border-border/60"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Channel Cards Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredChannels.map((channel, index) => (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -4 }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              {/* Top Gradient Header */}
              <div className="h-20 bg-muted/30 border-b border-border/50 p-5 relative overflow-hidden flex items-start justify-between transition-colors group-hover:bg-muted/50">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${channel.color || "from-indigo-500 to-blue-500"}`} />
                <div className="relative z-10 flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${channel.color || "from-indigo-500 to-blue-500"} text-white shadow-sm`}>
                    {getPlatformIcon(channel.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">{channel.category}</span>
                    <h3 className="font-bold text-foreground text-base sm:text-lg line-clamp-1 group-hover:text-primary transition-colors">{channel.name}</h3>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-1.5">
                  {channel.badge && (
                    <Badge variant="secondary" className="text-[10px] font-bold shadow-none bg-primary/10 text-primary border-primary/20">
                      {channel.badge}
                    </Badge>
                  )}
                  {channel.isPinned && (
                    <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-200/50 dark:border-amber-700/30" title="قناة مثبتة ومميزة">
                      <Pin className="h-3.5 w-3.5 fill-current" />
                    </div>
                  )}
                </div>
              </div>

              {/* Body Content */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {channel.desc || "انضم وتفاعل مع زملائك الموهوبين في النقاشات الدراسية وحلول المسائل."}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>{channel.memberCount || "نشط 👥"}</span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(channel)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                        title="تنسيق وتعديل القناة"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChannel(channel.id, channel.name)}
                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                        title="حذف القناة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => handleCopyLink(channel.url, channel.id)}
                    className="h-10 rounded-xl font-bold gap-2 text-xs border-border/80 hover:bg-muted"
                  >
                    {copiedId === channel.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-500">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>نسخ الرابط</span>
                      </>
                    )}
                  </Button>

                  <a
                    href={channel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button
                      className={`w-full h-10 rounded-xl font-bold gap-2 text-xs text-white shadow-md bg-gradient-to-r ${
                        channel.color || "from-indigo-600 to-blue-700"
                      } hover:opacity-90`}
                    >
                      <span>انضمام مباشر</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredChannels.length === 0 && (
        <div className="text-center py-16 bg-card/40 rounded-3xl border border-dashed border-border/80">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="font-bold text-lg text-foreground">لا توجد قنوات تطابق بحثك</h3>
          <p className="text-xs text-muted-foreground mt-1">جرّب تغيير عبارة البحث</p>
        </div>
      )}
    </div>
  );
}
