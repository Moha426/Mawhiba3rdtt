import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Languages, Plus, Trash2, Edit, Search, Tag, Volume2,
  CheckCircle2, Sparkles, BookOpen, RotateCcw, Download, Upload,
  Filter, Layers, GraduationCap, Check, AlertCircle, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_FLASHCARDS, type Flashcard } from "@/data/flashcards-data";
import { getStoredFlashcards, saveStoredFlashcards, deleteStoredFlashcard } from "@/lib/cloud-sync";
import { usePersistentState } from "@/lib/api-client-react";

const PRESET_CATEGORIES = [
  "أكاديمي وSTEP",
  "مفردات الموهبة",
  "مفردات العلوم",
  "كلمات متكررة",
  "مصطلحات اليومية",
  "عام"
];

export function FlashcardsTab() {
  const { toast } = useToast();
  const [cards, setCards] = usePersistentState<Flashcard[]>("flashcards", DEFAULT_FLASHCARDS);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("الكل");

  // Save cards changes helper
  const updateCardsList = (updated: Flashcard[]) => {
    setCards(updated);
    saveStoredFlashcards(updated);
  };

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");

  // Form State
  const [formWord, setFormWord] = useState("");
  const [formPhonetic, setFormPhonetic] = useState("");
  const [formPartOfSpeech, setFormPartOfSpeech] = useState<"noun" | "verb" | "adjective" | "adverb" | "phrase">("noun");
  const [formMeaningAr, setFormMeaningAr] = useState("");
  const [formExampleEn, setFormExampleEn] = useState("");
  const [formExampleAr, setFormExampleAr] = useState("");
  const [formCategory, setFormCategory] = useState("أكاديمي وSTEP");
  const [formDifficulty, setFormDifficulty] = useState<"سهل" | "متوسط" | "متقدم">("متوسط");

  // Get categories list
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(cards.map(c => c.category)));
    return Array.from(new Set([...PRESET_CATEGORIES, ...cats]));
  }, [cards]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (selectedCategory !== "الكل" && card.category !== selectedCategory) return false;
      if (selectedDifficulty !== "الكل" && card.difficulty !== selectedDifficulty) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesWord = card.word.toLowerCase().includes(q);
        const matchesAr = card.meaningAr.includes(q);
        const matchesExEn = card.exampleEn?.toLowerCase().includes(q);
        const matchesCategory = card.category.toLowerCase().includes(q);
        if (!matchesWord && !matchesAr && !matchesExEn && !matchesCategory) return false;
      }
      return true;
    });
  }, [cards, selectedCategory, selectedDifficulty, search]);

  const handleOpenAdd = () => {
    setEditingCard(null);
    setFormWord("");
    setFormPhonetic("");
    setFormPartOfSpeech("noun");
    setFormMeaningAr("");
    setFormExampleEn("");
    setFormExampleAr("");
    setFormCategory("أكاديمي وSTEP");
    setFormDifficulty("متوسط");
    setShowAddModal(true);
  };

  const handleOpenEdit = (card: Flashcard) => {
    setEditingCard(card);
    setFormWord(card.word);
    setFormPhonetic(card.phonetic || "");
    setFormPartOfSpeech(card.partOfSpeech || "noun");
    setFormMeaningAr(card.meaningAr);
    setFormExampleEn(card.exampleEn || "");
    setFormExampleAr(card.exampleAr || "");
    setFormCategory(card.category);
    setFormDifficulty(card.difficulty || "متوسط");
    setShowAddModal(true);
  };

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWord.trim() || !formMeaningAr.trim()) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى كتابة الكلمة بالإنجليزية والمعنى بالعربية على الأقل.",
        variant: "destructive"
      });
      return;
    }

    if (editingCard) {
      // Update existing
      const updated = cards.map(c => {
        if (c.id === editingCard.id) {
          return {
            ...c,
            word: formWord.trim(),
            phonetic: formPhonetic.trim() || "/.../",
            partOfSpeech: formPartOfSpeech,
            meaningAr: formMeaningAr.trim(),
            exampleEn: formExampleEn.trim() || `Example with ${formWord.trim()}.`,
            exampleAr: formExampleAr.trim() || `جملة توضيحية للكلمة ${formWord.trim()}.`,
            category: formCategory.trim() || "عام",
            difficulty: formDifficulty,
          };
        }
        return c;
      });
      updateCardsList(updated);
      toast({ title: "تم تحديث الكلمة ✏️", description: `تم تعديل بيانات "${formWord.trim()}" بنجاح.` });
    } else {
      // Check duplicate
      const wordClean = formWord.trim();
      const isDuplicate = cards.some(c => c.word?.trim().toLowerCase() === wordClean.toLowerCase());
      if (isDuplicate) {
        toast({
          title: "تنبيه",
          description: `الكلمة "${wordClean}" موجودة بالفعل في البطاقات.`,
          variant: "destructive"
        });
        return;
      }

      // Add new
      const newCardItem: Flashcard = {
        id: `fc-admin-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        word: wordClean,
        phonetic: formPhonetic.trim() || "/.../",
        partOfSpeech: formPartOfSpeech,
        meaningAr: formMeaningAr.trim(),
        exampleEn: formExampleEn.trim() || `Example with ${wordClean}.`,
        exampleAr: formExampleAr.trim() || `جملة توضيحية للكلمة ${wordClean}.`,
        category: formCategory.trim() || "عام",
        difficulty: formDifficulty,
      };
      const updated = [newCardItem, ...cards.filter(c => c.word?.trim().toLowerCase() !== wordClean.toLowerCase())];
      updateCardsList(updated);
      toast({ title: "تمت إضافة الكلمة 🌟", description: `تمت إضافة كلمة "${newCardItem.word}" بنجاح!` });
    }

    setShowAddModal(false);
  };

  const handleDeleteCard = (id: string, word: string) => {
    deleteStoredFlashcard(id);
    setCards(prev => prev.filter(c => String(c.id) !== String(id)));
    toast({ title: "تم الحذف", description: `تم حذف كلمة "${word}" بنجاح وحفظ الحذف بالسحابة.` });
  };

  const handleResetToDefaults = () => {
    const existingIds = new Set(cards.map(c => c.id));
    const missingDefaults = DEFAULT_FLASHCARDS.filter(c => !existingIds.has(c.id));
    const merged = [...cards, ...missingDefaults];
    updateCardsList(merged);
    toast({ title: "تم الاسترجاع 🔄", description: "تمت إضافة كافة الكلمات الافتراضية لبطاقات الإنجليزية." });
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cards, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `english_flashcards_export_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast({ title: "تم التصدير 📥", description: "تم تصدير ملف بطاقات الإنجليزية بنجاح." });
  };

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Validate items
        const validItems: Flashcard[] = parsed.map((item: any, idx: number) => ({
          id: item.id || `fc-imported-${Date.now()}-${idx}`,
          word: item.word || "Word",
          phonetic: item.phonetic || "/.../",
          partOfSpeech: item.partOfSpeech || "noun",
          meaningAr: item.meaningAr || "المعنى",
          exampleEn: item.exampleEn || "",
          exampleAr: item.exampleAr || "",
          category: item.category || "عام",
          difficulty: item.difficulty || "متوسط",
        }));

        const existingWords = new Set(cards.map(c => c.word.toLowerCase()));
        const uniqueNew = validItems.filter(item => !existingWords.has(item.word.toLowerCase()));
        const merged = [...uniqueNew, ...cards];
        updateCardsList(merged);
        setShowImportModal(false);
        setImportJsonText("");
        toast({ title: "تم الاستيراد بنجاح 🚀", description: `تم استيراد ${uniqueNew.length} كلمة جديدة إلى البطاقات.` });
      } else {
        toast({ title: "تنسيق غير صالح", description: "يرجى إدخال مصفوفة JSON تحتوي على بطاقات صحيحة.", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ في قراءة JSON", description: "تأكد من صحة رمز JSON المدخل.", variant: "destructive" });
    }
  };

  // Speech pronunciation test
  const speakTest = (word: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Languages className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              إدارة بطاقات ومفردات الإنجليزية
              <Badge variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200">
                {cards.length} كلمة
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              إضافة وتعديل كلمات الإنجليزية ومصطلحات STEP والموهبة لتظهر مباشرة للطلاب والمتدربين 🇬🇧
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleOpenAdd} className="gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4" />
            إضافة كلمة جديدة
          </Button>
          <Button onClick={() => setShowImportModal(true)} variant="outline" className="gap-2 rounded-xl">
            <Upload className="h-4 w-4" />
            استيراد JSON
          </Button>
          <Button onClick={handleExportJSON} variant="outline" className="gap-2 rounded-xl">
            <Download className="h-4 w-4" />
            تصدير
          </Button>
          <Button onClick={handleResetToDefaults} variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            استرجاع الافتراضي
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث بالكلمة، المعنى، أو التخصص..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 rounded-xl text-xs h-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          {/* Categories select */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl">
              <SelectValue placeholder="القسم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="الكل">جميع الأقسام</SelectItem>
              {availableCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Difficulty select */}
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl">
              <SelectValue placeholder="الصعوبة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="الكل">جميع المستويات</SelectItem>
              <SelectItem value="سهل">سهل 🟢</SelectItem>
              <SelectItem value="متوسط">متوسط 🟡</SelectItem>
              <SelectItem value="متقدم">متقدم 🔴</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards Table / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCards.map((card) => (
          <motion.div
            key={card.id}
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col justify-between hover:border-primary/40 transition-all shadow-sm group relative"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground font-sans tracking-tight">{card.word}</h3>
                    <button
                      onClick={() => speakTest(card.word)}
                      className="text-muted-foreground hover:text-indigo-600 transition-colors p-1"
                      title="استماع للنطق"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{card.phonetic}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      card.difficulty === "سهل"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : card.difficulty === "متقدم"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    }`}
                  >
                    {card.difficulty || "متوسط"}
                  </Badge>
                </div>
              </div>

              <div className="my-2 p-2.5 bg-muted/40 rounded-xl text-sm font-semibold text-primary/90 flex items-center justify-between">
                <span>{card.meaningAr}</span>
                <span className="text-[10px] font-mono uppercase bg-background px-1.5 py-0.5 rounded text-muted-foreground border border-border/40">
                  {card.partOfSpeech}
                </span>
              </div>

              {card.exampleEn && (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p className="font-sans italic text-foreground/80 dir-ltr text-left bg-muted/20 p-2 rounded-lg">
                    "{card.exampleEn}"
                  </p>
                  {card.exampleAr && <p className="text-[11px] text-muted-foreground px-1">{card.exampleAr}</p>}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {card.category}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleOpenEdit(card)}
                  className="h-8 w-8 text-muted-foreground hover:text-indigo-600"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteCard(card.id, card.word)}
                  className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredCards.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground space-y-3 bg-card border border-dashed rounded-2xl">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">لا توجد بطاقات مطابقة للبحث أو التصفية الحالية.</p>
            <Button onClick={handleOpenAdd} variant="outline" size="sm" className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              إضافة كلمة جديدة الآن
            </Button>
          </div>
        )}
      </div>

      {/* Add / Edit Card Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Languages className="h-5 w-5 text-indigo-600" />
              {editingCard ? "تعديل بطاقة الإنجليزية" : "إضافة كلمة إنجليزية جديدة"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              أدخل تفاصيل الكلمة باللغة الإنجليزية والمعنى العربي مع مثال توضيحي.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCard} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">الكلمة بالإنجليزية (Word) *</Label>
                <Input
                  required
                  placeholder="e.g. Achievement"
                  value={formWord}
                  onChange={(e) => setFormWord(e.target.value)}
                  className="rounded-xl dir-ltr"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">رموز النطق (Phonetic)</Label>
                <Input
                  placeholder="e.g. /əˈtʃiːv.mənt/"
                  value={formPhonetic}
                  onChange={(e) => setFormPhonetic(e.target.value)}
                  className="rounded-xl dir-ltr font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">المعنى بالعربية *</Label>
                <Input
                  required
                  placeholder="مثال: إنجاز / نجاح"
                  value={formMeaningAr}
                  onChange={(e) => setFormMeaningAr(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">نوع الكلمة (Part of Speech)</Label>
                <Select value={formPartOfSpeech} onValueChange={(v: any) => setFormPartOfSpeech(v)}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="noun">اسم (Noun)</SelectItem>
                    <SelectItem value="verb">فعل (Verb)</SelectItem>
                    <SelectItem value="adjective">صفة (Adjective)</SelectItem>
                    <SelectItem value="adverb">ظرف (Adverb)</SelectItem>
                    <SelectItem value="phrase">عبارة (Phrase)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">القسم / التصنيف</Label>
                <Input
                  placeholder="مثال: أكاديمي وSTEP"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">درجة الصعوبة</Label>
                <Select value={formDifficulty} onValueChange={(v: any) => setFormDifficulty(v)}>
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="سهل">سهل 🟢</SelectItem>
                    <SelectItem value="متوسط">متوسط 🟡</SelectItem>
                    <SelectItem value="متقدم">متقدم 🔴</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">جملة توضيحية بالإنجليزية (Example Sentence)</Label>
              <Textarea
                placeholder="Passing the STEP exam was a great achievement."
                value={formExampleEn}
                onChange={(e) => setFormExampleEn(e.target.value)}
                className="rounded-xl text-xs dir-ltr rows-2"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">ترجمة الجملة بالعربية</Label>
              <Input
                placeholder="كان اجتياز اختبار STEP إنجازاً عظيماً."
                value={formExampleAr}
                onChange={(e) => setFormExampleAr(e.target.value)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="rounded-xl text-xs">
                إلغاء
              </Button>
              <Button type="submit" className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                {editingCard ? "حفظ التغييرات" : "إضافة البطاقة"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk JSON Import Dialog */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
              استيراد مصفوفة بطاقات JSON
            </DialogTitle>
            <DialogDescription className="text-xs">
              ألصق مصفوفة JSON تحتوي على الكلمات لإضافتها دفعة واحدة لبطاقات المنصة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              placeholder='[
  {
    "word": "Innovate",
    "meaningAr": "يبتكر / يجدد",
    "category": "أكاديمي وSTEP",
    "difficulty": "متوسط"
  }
]'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="font-mono text-xs dir-ltr h-40 rounded-xl"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportModal(false)} className="rounded-xl text-xs">
                إلغاء
              </Button>
              <Button onClick={handleImportJSON} className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                استيراد البطاقات
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
