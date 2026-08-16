import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Plus, Trash2, Edit, Search, Tag, ExternalLink,
  CheckCircle2, Palette, Sparkles, Award, Youtube, RotateCcw,
  SlidersHorizontal, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CategoryManager } from "@/components/category-manager";
import {
  getPlatformCategories,
  savePlatformCategories,
  DEFAULT_PLATFORM_CATEGORIES,
  getStoredPlatforms,
  saveStoredPlatforms,
} from "@/lib/cloud-sync";
import { useToast } from "@/hooks/use-toast";
import type { PlatformItem } from "@/pages/platforms";
import { DEFAULT_PLATFORMS, PRESET_COLORS } from "@/pages/platforms";
import { usePersistentState } from "@/lib/api-client-react";

export function PlatformsTab() {
  const { toast } = useToast();
  // Force global sync
  usePersistentState<PlatformItem[]>("platforms", []);

  const [platforms, setPlatforms] = useState<PlatformItem[]>(() => {
    return getStoredPlatforms(DEFAULT_PLATFORMS);
  });

  const [categories, setCategories] = useState<string[]>(() => getPlatformCategories());
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");

  useEffect(() => {
    const handleStorage = (e: any) => {
      if (e.detail?.platforms) {
        setPlatforms(e.detail.platforms);
      } else {
        setPlatforms(getStoredPlatforms(DEFAULT_PLATFORMS));
      }
    };
    window.addEventListener("platforms_storage_change" as any, handleStorage);
    return () => {
      window.removeEventListener("platforms_storage_change" as any, handleStorage);
    };
  }, []);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<PlatformItem | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCategory, setFormCategory] = useState("قدرات وتحصيلي");
  const [formCategories, setFormCategories] = useState<string[]>([]);
  const [formOpenInNewTab, setFormOpenInNewTab] = useState(true);
  const [formDesc, setFormDesc] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formColorIdx, setFormColorIdx] = useState(0);
  const [formSubLinks, setFormSubLinks] = useState<{ label: string; url: string }[]>([]);

  const savePlatformsList = (updated: PlatformItem[]) => {
    setPlatforms(updated);
    saveStoredPlatforms(updated);
  };

  const handleOpenAdd = () => {
    setEditingPlatform(null);
    setFormName("");
    setFormUrl("");
    setFormCategory(categories[0] || "قدرات وتحصيلي");
    setFormCategories([]);
    setFormOpenInNewTab(true);
    setFormDesc("");
    setFormBadge("جديد");
    setFormTags("");
    setFormColorIdx(0);
    setFormSubLinks([]);
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: PlatformItem) => {
    setEditingPlatform(item);
    setFormName(item.name);
    setFormUrl(item.url);
    setFormCategory(item.category);
    setFormCategories(item.categories || (item.category ? [item.category] : []));
    setFormOpenInNewTab(item.openInNewTab ?? true);
    setFormDesc(item.desc || "");
    setFormBadge(item.badge || "");
    setFormTags(item.tags ? item.tags.join(", ") : "");
    setFormSubLinks(item.subLinks ? item.subLinks.map(s => ({ ...s })) : []);
    const foundColor = PRESET_COLORS.findIndex(c => c.color === item.color);
    setFormColorIdx(foundColor >= 0 ? foundColor : 0);
    setShowAddModal(true);
  };

  const handleSavePlatformSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء اسم المنصة ورابطها",
        variant: "destructive"
      });
      return;
    }

    let url = formUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const selectedColor = PRESET_COLORS[formColorIdx] || PRESET_COLORS[0];
    const tagsArr = formTags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const validSubLinks = formSubLinks.filter(s => s.label.trim() && s.url.trim());

    if (editingPlatform) {
      const updated = platforms.map(p => {
        if (p.id === editingPlatform.id) {
          return {
            ...p,
            name: formName.trim(),
            url,
            category: formCategories[0] || formCategory,
            categories: formCategories.length > 0 ? formCategories : [formCategory],
            openInNewTab: formOpenInNewTab,
            desc: formDesc.trim() || "منصة تعليمية للمذاكرة والتفوق.",
            badge: formBadge.trim() || undefined,
            color: selectedColor.color,
            gradient: selectedColor.gradient,
            iconBg: selectedColor.bg,
            tags: tagsArr.length > 0 ? tagsArr : [formCategory],
            subLinks: validSubLinks.length > 0 ? validSubLinks : undefined,
          };
        }
        return p;
      });
      savePlatformsList(updated);
      toast({ title: "تم تحديث المنصة بنجاح ✏️" });
    } else {
      const newItem: PlatformItem = {
        id: "custom_" + Date.now(),
        name: formName.trim(),
        url,
        category: formCategories[0] || formCategory,
        categories: formCategories.length > 0 ? formCategories : [formCategory],
        openInNewTab: formOpenInNewTab,
        desc: formDesc.trim() || "منصة تعليمية للمذاكرة والتفوق.",
        badge: formBadge.trim() || "منصة مضافة",
        color: selectedColor.color,
        gradient: selectedColor.gradient,
        iconBg: selectedColor.bg,
        tags: tagsArr.length > 0 ? tagsArr : [formCategory, "مخصصة"],
        subLinks: validSubLinks.length > 0 ? validSubLinks : undefined,
        isCustom: true,
        isFavorite: false
      };
      savePlatformsList([newItem, ...platforms]);
      toast({ title: "تمت إضافة المنصة إلى القائمة 🚀" });
    }

    setShowAddModal(false);
  };

  const handleDeletePlatform = (id: string) => {
    const updated = platforms.filter(p => String(p.id) !== String(id));
    savePlatformsList(updated);
    toast({ title: "تم حذف المنصة بنجاح" });
  };

  const handleResetToDefaults = () => {
    savePlatformsList(DEFAULT_PLATFORMS);
    setCategories(DEFAULT_PLATFORM_CATEGORIES);
    savePlatformCategories(DEFAULT_PLATFORM_CATEGORIES);
    toast({ title: "تمت استعادة المنصات الافتراضية" });
  };

  const filtered = platforms.filter(p => {
    const matchCat = selectedCategory === "الكل" || p.category === selectedCategory;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.desc && p.desc.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
      p.url.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/50 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <span>إدارة المنصات والمراجع التعليمية</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            إضافة وتعديل وحذف منصات القدرات والتحصيلي والمواقع التعليمية المعروضة للطلاب.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleOpenAdd} className="rounded-xl gap-1.5 font-bold h-10 px-4">
            <Plus className="h-4 w-4" />
            <span>إضافة منصة جديدة</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowCategoryManager(true)}
            className="rounded-xl gap-1.5 font-bold h-10 px-4"
          >
            <Tag className="h-4 w-4 text-primary" />
            <span>إدارة التصنيفات</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleResetToDefaults}
            className="rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground"
            title="استعادة الافتراضي"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("الكل")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === "الكل"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({platforms.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرابط..."
            className="pr-9 h-9 rounded-xl bg-card border-border text-xs"
          />
        </div>
      </div>

      {/* Platforms Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => (
          <Card
            key={item.id}
            className="p-5 rounded-2xl border-border/60 bg-card hover:border-primary/40 transition-all flex flex-col justify-between relative overflow-hidden"
          >
            <div
              className="absolute top-0 right-0 left-0 h-1.5"
              style={{ background: item.gradient || item.color }}
            />

            <div>
              <div className="flex items-start justify-between gap-3 mb-3 pt-1">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                  style={{ background: item.iconBg || "rgba(99, 102, 241, 0.12)" }}
                >
                  {item.id === "youtube" ? (
                    <Youtube className="h-5 w-5 text-red-500" />
                  ) : item.category === "قدرات وتحصيلي" ? (
                    <Award className="h-5 w-5" style={{ color: item.color }} />
                  ) : (
                    <Globe className="h-5 w-5" style={{ color: item.color }} />
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {item.badge && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: item.color }}
                    >
                      {item.badge}
                    </span>
                  )}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {item.category}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-sm text-foreground mb-1 flex items-center gap-1.5">
                <span>{item.name}</span>
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {item.desc}
              </p>

              <div className="text-[11px] font-mono text-primary/80 truncate mb-3 bg-muted/40 px-2.5 py-1 rounded-lg dir-ltr text-left">
                {item.url}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium"
              >
                <span>زيارة</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(item)}
                  className="rounded-xl h-8 px-2.5 text-xs font-bold gap-1"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>تعديل</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePlatform(item.id)}
                  className="rounded-xl h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                  title="حذف المنصة"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border p-6">
          <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-foreground">لا توجد منصات مطابقة</h4>
          <p className="text-xs text-muted-foreground mt-1">أضف منصة جديدة لتظهر هنا للطلاب.</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {editingPlatform ? <Edit className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              <span>{editingPlatform ? "تعديل بيانات المنصة" : "إضافة منصة جديدة للمنظومة"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              حدد اسم المنصة، رابط الوصول، والتصنيف المناسب لتظهر في قائمة الطلاب.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlatformSubmit} className="space-y-3.5 mt-2">
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">اسم المنصة *</label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="مثال: منصة نون التعليمية"
                className="rounded-xl text-xs h-10"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">رابط الموقع (URL) *</label>
              <Input
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="https://example.com"
                dir="ltr"
                className="rounded-xl text-xs h-10 text-left font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">التصنيف</label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(c => {
                      const isSelected = formCategories.includes(c);
                      return (
                        <Badge 
                          key={c}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer hover:opacity-80 ${isSelected ? "" : "opacity-60"}`}
                          onClick={() => {
                            if (isSelected) {
                              setFormCategories(prev => prev.filter(cat => cat !== c));
                            } else {
                              setFormCategories(prev => [...prev, c]);
                            }
                          }}
                        >
                          {c}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground">يمكنك اختيار أكثر من تصنيف.</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">الشارة (Badge)</label>
                <Input
                  value={formBadge}
                  onChange={e => setFormBadge(e.target.value)}
                  placeholder="مثال: كويزات، مجاني"
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1.5 block flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-primary" />
                <span>لون وهوية البطاقة</span>
              </label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((col, idx) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setFormColorIdx(idx)}
                    className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                      formColorIdx === idx ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-sm" : "opacity-80 hover:opacity-100"
                    }`}
                    style={{ background: col.color }}
                    title={col.name}
                  >
                    {formColorIdx === idx && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">نبذة ومحتوى المنصة</label>
              <Input
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="تفاصيل وفائدة المنصة..."
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">الوسوم (مفصولة بفواصل)</label>
              <Input
                value={formTags}
                onChange={e => setFormTags(e.target.value)}
                placeholder="مثال: قدرات، كمي، شروحات"
                className="rounded-xl text-xs h-10"
              />
            </div>

            {/* Sub-links / Sub-sections editor */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>الأقسام والروابط الفرعية (اختياري)</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormSubLinks(prev => [...prev, { label: "", url: "" }])}
                  className="h-7 text-[11px] rounded-lg gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>إضافة فرعي</span>
                </Button>
              </div>

              {formSubLinks.map((sub, sIdx) => (
                <div key={sIdx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-xl border border-border/50">
                  <Input
                    value={sub.label}
                    onChange={e => {
                      const val = e.target.value;
                      setFormSubLinks(prev => prev.map((item, idx) => idx === sIdx ? { ...item, label: val } : item));
                    }}
                    placeholder="اسم القسم (مثال: قسم المفردات)"
                    className="h-8 text-xs rounded-lg flex-1 bg-background"
                  />
                  <Input
                    value={sub.url}
                    onChange={e => {
                      const val = e.target.value;
                      setFormSubLinks(prev => prev.map((item, idx) => idx === sIdx ? { ...item, url: val } : item));
                    }}
                    placeholder="رابط القسم الفرعي"
                    dir="ltr"
                    className="h-8 text-xs rounded-lg flex-1 bg-background text-left font-mono"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormSubLinks(prev => prev.filter((_, idx) => idx !== sIdx))}
                    className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl text-xs font-bold"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={!formName.trim() || !formUrl.trim()}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{editingPlatform ? "حفظ التعديلات" : "إضافة المنصة"}</span>
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                <input 
                  type="checkbox" 
                  id="openInNewTab"
                  checked={formOpenInNewTab}
                  onChange={e => setFormOpenInNewTab(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="openInNewTab" className="text-xs font-bold text-foreground cursor-pointer select-none">
                  فتح الرابط في نافذة جديدة
                </label>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Category Manager */}
      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onSaveCategories={newCats => {
          setCategories(newCats);
          savePlatformCategories(newCats);
          toast({ title: "تم تحديث تصنيفات المنصات 🏷️" });
        }}
        title="إدارة وتخصيص تصنيفات المنصات"
      />
    </div>
  );
}
