import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Volume2, VolumeX, RotateCw, CheckCircle2, XCircle, 
  Sparkles, Layers, Plus, Search, Filter, Shuffle, ArrowRight, ArrowLeft,
  BookOpen, Trophy, Award, Trash2, Edit, Check, GraduationCap, Send, UserCheck, Shield, Printer,
  Eye, FileText, Settings2, X, Download, ImageIcon, Loader2, FileDown
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { DEFAULT_FLASHCARDS, type Flashcard } from "@/data/flashcards-data";
import { getStoredFlashcards, saveStoredFlashcards, deleteStoredFlashcard } from "@/lib/cloud-sync";
import { submitStudentSuggestion } from "@/lib/suggestions";
import { useStudentProfile } from "@/lib/use-student-profile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { StudentSuggestDialog } from "@/components/student-suggest-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePersistentState } from "@/lib/api-client-react";
import { useGetSettings } from "@workspace/api-client-react";

const MASTERED_CARDS_KEY = "talented_english_mastered_ids_v1";
const REVIEW_CARDS_KEY = "talented_english_review_ids_v1";
const STUDENT_PERSONAL_CARDS_KEY = "talented_student_personal_flashcards_v1";

interface EnhancedFlashcard extends Flashcard {
  isPersonal?: boolean;
  studentId?: number;
}

export default function FlashcardsPage() {
  const { toast } = useToast();
  const { profile } = useStudentProfile();
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";

  // Shared platform cards synchronized in real-time via Firestore
  const [sharedCards, setSharedCards] = usePersistentState<Flashcard[]>("flashcards", DEFAULT_FLASHCARDS);

  // Student's own private cards
  const [personalCards, setPersonalCards] = useState<EnhancedFlashcard[]>(() => {
    try {
      const stored = localStorage.getItem(STUDENT_PERSONAL_CARDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Combined cards list
  const cards = useMemo(() => {
    const list = Array.isArray(sharedCards) ? sharedCards : DEFAULT_FLASHCARDS;
    return [...personalCards, ...list];
  }, [personalCards, sharedCards]);

  const [masteredIds, setMasteredIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(MASTERED_CARDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [reviewIds, setReviewIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(REVIEW_CARDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["الكل"]);
  const [statusFilter, setStatusFilter] = useState<"all" | "mastered" | "review" | "personal">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"study" | "grid">("study");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(cards.map(c => c.category)));
    return ["الكل", ...cats];
  }, [cards]);

  // Multi-category toggle helper
  const toggleCategory = useCallback((cat: string) => {
    setCurrentIndex(0);
    if (cat === "الكل") {
      setSelectedCategories(["الكل"]);
      return;
    }
    setSelectedCategories((prev) => {
      const exists = prev.includes(cat);
      if (exists) {
        const next = prev.filter((c) => c !== cat);
        return next.length === 0 ? ["الكل"] : next;
      } else {
        const next = prev.filter((c) => c !== "الكل");
        return [...next, cat];
      }
    });
  }, []);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Multi-category check
      if (!selectedCategories.includes("الكل") && selectedCategories.length > 0) {
        if (!selectedCategories.includes(card.category)) return false;
      }
      
      // Status check
      if (statusFilter === "mastered" && !masteredIds.includes(card.id)) return false;
      if (statusFilter === "review" && !reviewIds.includes(card.id)) return false;
      if (statusFilter === "personal" && !(card as EnhancedFlashcard).isPersonal) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesWord = card.word.toLowerCase().includes(q);
        const matchesMeaning = card.meaningAr.includes(q);
        const matchesCategory = card.category.toLowerCase().includes(q);
        if (!matchesWord && !matchesMeaning && !matchesCategory) return false;
      }

      return true;
    });
  }, [cards, selectedCategories, statusFilter, searchQuery, masteredIds, reviewIds]);

  const safeIndex = Math.min(currentIndex, Math.max(0, filteredCards.length - 1));
  const currentCard = filteredCards[safeIndex];

  // Site Settings for School Name Synchronization
  const { data: settingsData } = useGetSettings();
  const siteSchoolName = (settingsData?.showSchoolName !== false && settingsData?.schoolName?.trim())
    ? settingsData.schoolName.trim()
    : "مدرسة الموهوبين";

  const [customSchoolName, setCustomSchoolName] = useState<string>("");
  const schoolName = customSchoolName.trim() || siteSchoolName;

  // Print Grouping Mode: "mixed" = all in continuous pages with department tags; "by_category" = pages split by department
  const [printGroupingMode, setPrintGroupingMode] = useState<"mixed" | "by_category">("mixed");

  // PDF Export Preview & Pagination State (100% synchronized with filteredCards)
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);
  const [cardsPerPage, setCardsPerPage] = useState<number>(10);

  // Filtered cards for print preview (100% strictly synced with active filteredCards on screen)
  const printCards = useMemo(() => {
    return filteredCards.filter(c => c && c.word && typeof c.word === "string" && c.word.trim().length > 0);
  }, [filteredCards]);

  type PrintPageData = {
    cards: Flashcard[];
    categoryTitle?: string;
  };

  // Chunk printCards into pages according to cardsPerPage and printGroupingMode
  const printPagesData = useMemo<PrintPageData[]>(() => {
    if (printGroupingMode === "by_category") {
      const categoryMap = new Map<string, Flashcard[]>();
      for (const card of printCards) {
        const cat = card.category || "عام";
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, []);
        }
        categoryMap.get(cat)!.push(card);
      }

      const pages: PrintPageData[] = [];
      categoryMap.forEach((catCards, catName) => {
        for (let i = 0; i < catCards.length; i += cardsPerPage) {
          pages.push({
            cards: catCards.slice(i, i + cardsPerPage),
            categoryTitle: catName,
          });
        }
      });
      return pages.length > 0 ? pages : [{ cards: [] }];
    } else {
      const pages: PrintPageData[] = [];
      for (let i = 0; i < printCards.length; i += cardsPerPage) {
        pages.push({
          cards: printCards.slice(i, i + cardsPerPage),
        });
      }
      return pages.length > 0 ? pages : [{ cards: [] }];
    }
  }, [printCards, cardsPerPage, printGroupingMode]);

  // New Card Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [addMode, setAddMode] = useState<"personal" | "suggest" | "admin">("personal");
  const [newCard, setNewCard] = useState<Partial<EnhancedFlashcard>>({
    word: "",
    phonetic: "",
    partOfSpeech: "noun",
    meaningAr: "",
    exampleEn: "",
    exampleAr: "",
    category: "أكاديمي وSTEP",
    difficulty: "متوسط",
  });

  const handleAIGenerateCards = async () => {
    try {
      toast({
        title: "جاري توليد بطاقات ذكية... 🤖",
        description: "نقوم الآن باختيار كلمات هامة لاختبار STEP عبر الذكاء الاصطناعي."
      });
      
      const res = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 4 })
      });
      
      if (!res.ok) throw new Error("Failed to generate");
      
      const data = await res.json();
      if (Array.isArray(data)) {
        const newCards: EnhancedFlashcard[] = data.map((item: any, idx: number) => ({
          ...item,
          id: `fc-ai-${Date.now()}-${idx}`,
          isPersonal: true
        }));
        
        savePersonalCards([...newCards, ...personalCards]);
        
        toast({
          title: "تم توليد بطاقات ذكية بنجاح! ✨",
          description: `أُضيفَت ${newCards.length} بطاقات جديدة لقائمتك الخاصة.`
        });
      }
    } catch (err) {
      console.error("AI generation error:", err);
      // Fallback
      const fallback: EnhancedFlashcard[] = [
        {
          id: `fc-ai-${Date.now()}-1`,
          word: "Pragmatic",
          phonetic: "/præɡˈmætɪk/",
          partOfSpeech: "adjective",
          meaningAr: "عملي، واقعي",
          exampleEn: "We need a pragmatic approach to solve this problem.",
          exampleAr: "نحتاج إلى نهج عملي لحل هذه المشكلة.",
          category: "أكاديمي وSTEP",
          difficulty: "متقدم",
          isPersonal: true,
        }
      ];
      savePersonalCards([...fallback, ...personalCards]);
      toast({
        title: "تنبيه ⚠️",
        description: "تمت إضافة بطاقات تجريبية، تأكد من إعداد مفتاح API الخاص بك للتوليد الذكي.",
        variant: "destructive"
      });
    }
  };

  const savePersonalCards = (newList: EnhancedFlashcard[]) => {
    setPersonalCards(newList);
    try {
      localStorage.setItem(STUDENT_PERSONAL_CARDS_KEY, JSON.stringify(newList));
    } catch {}
  };

  // Save personal cards to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STUDENT_PERSONAL_CARDS_KEY, JSON.stringify(personalCards));
    } catch {}
  }, [personalCards]);

  useEffect(() => {
    try {
      localStorage.setItem(MASTERED_CARDS_KEY, JSON.stringify(masteredIds));
    } catch {}
  }, [masteredIds]);

  useEffect(() => {
    try {
      localStorage.setItem(REVIEW_CARDS_KEY, JSON.stringify(reviewIds));
    } catch {}
  }, [reviewIds]);

  // Speech synthesis for English pronunciation
  const speakWord = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      toast({ title: "عذراً", description: "المتصفح لا يدعم نطق الصوت القارئ" });
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [toast]);

  // Action handlers
  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, filteredCards.length));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % Math.max(1, filteredCards.length));
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    if (filteredCards.length > 1) {
      const randomIndex = Math.floor(Math.random() * filteredCards.length);
      setCurrentIndex(randomIndex);
      toast({ title: "تم الترتيب العشوائي 🎲", description: "تم اختيار بطاقة عشوائية جديدة" });
    }
  };

  const markMastered = (id: string) => {
    setMasteredIds((prev) => Array.from(new Set([...prev, id])));
    setReviewIds((prev) => prev.filter(rId => rId !== id));
    toast({
      title: "أتقنت الكلمة! 🎉",
      description: "تم نقل الكلمة إلى قائمة الكلمات المتقنة بنجاح.",
    });
    handleNext();
  };

  const markReview = (id: string) => {
    setReviewIds((prev) => Array.from(new Set([...prev, id])));
    setMasteredIds((prev) => prev.filter(mId => mId !== id));
    toast({
      title: "أضيفت للمراجعة 🔁",
      description: "سوف تظهر هذه الكلمة في قائمة مراجعاتك القادمة.",
    });
    handleNext();
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.word?.trim() || !newCard.meaningAr?.trim()) {
      toast({ title: "خطأ", description: "يرجى كتابة الكلمة بالإنجليزية والمعنى بالعربية", variant: "destructive" });
      return;
    }

    const wordVal = newCard.word.trim();
    const meaningVal = newCard.meaningAr.trim();
    const phoneticVal = newCard.phonetic?.trim() || "/.../";
    const partOfSpeechVal = (newCard.partOfSpeech as any) || "noun";
    const exampleEnVal = newCard.exampleEn?.trim() || `Example with ${wordVal}.`;
    const exampleArVal = newCard.exampleAr?.trim() || `جملة توضيحية للكلمة ${wordVal}.`;
    const categoryVal = newCard.category?.trim() || "أكاديمي وSTEP";
    const difficultyVal = (newCard.difficulty as any) || "متوسط";

    if (isAdmin || addMode === "admin") {
      const created: Flashcard = {
        id: `fc-global-${Date.now()}`,
        word: wordVal,
        phonetic: phoneticVal,
        partOfSpeech: partOfSpeechVal,
        meaningAr: meaningVal,
        exampleEn: exampleEnVal,
        exampleAr: exampleArVal,
        category: categoryVal,
        difficulty: difficultyVal,
      };
      saveStoredFlashcards([created, ...sharedCards]);
      setSharedCards(prev => [created, ...prev]);
      toast({ title: "تم إضافة البطاقة العامة 🌟", description: `تم نشر بطاقة "${created.word}" لجميع الطلاب.` });
    } else if (addMode === "suggest") {
      await submitStudentSuggestion({
        type: "flashcard",
        title: `بطاقة: ${wordVal}`,
        category: categoryVal,
        description: `المعنى: ${meaningVal}`,
        data: {
          word: wordVal,
          phonetic: phoneticVal,
          partOfSpeech: partOfSpeechVal,
          meaningAr: meaningVal,
          exampleEn: exampleEnVal,
          exampleAr: exampleArVal,
          category: categoryVal,
          difficulty: difficultyVal,
        },
        studentId: profile?.id || 1,
        studentName: profile?.name || "طالب",
        studentUsername: profile?.username,
      });
      toast({
        title: "تم إرسال الاقتراح للمشرف 🚀",
        description: `تم إرسال بطاقة "${wordVal}" للمشرف لمراجعتها والموافقة عليها.`,
      });
    } else {
      // Personal for student only
      const created: EnhancedFlashcard = {
        id: `fc-personal-${profile?.id || 1}-${Date.now()}`,
        word: wordVal,
        phonetic: phoneticVal,
        partOfSpeech: partOfSpeechVal,
        meaningAr: meaningVal,
        exampleEn: exampleEnVal,
        exampleAr: exampleArVal,
        category: categoryVal,
        difficulty: difficultyVal,
        isPersonal: true,
        studentId: profile?.id || 1,
      };
      savePersonalCards([created, ...personalCards]);
      toast({
        title: "تمت إضافة البطاقة الخاصة 👤",
        description: `أضيفت كلمة "${created.word}" لقائمتك الخاصة بك فقط.`,
      });
    }

    setIsAddOpen(false);
    setNewCard({
      word: "",
      phonetic: "",
      partOfSpeech: "noun",
      meaningAr: "",
      exampleEn: "",
      exampleAr: "",
      category: "أكاديمي وSTEP",
      difficulty: "متوسط",
    });
  };

  const handleDeleteCard = (id: string) => {
    const isPers = personalCards.some(c => c.id === id);
    if (isPers) {
      const updatedPersonal = personalCards.filter(c => c.id !== id);
      savePersonalCards(updatedPersonal);
      toast({ title: "تم الحذف", description: "تم حذف البطاقة من قائمتك الخاصة بنجاح" });
    } else {
      deleteStoredFlashcard(id, DEFAULT_FLASHCARDS);
      setSharedCards(prev => prev.filter(c => c.id !== id));
      toast({ title: "تم الحذف", description: "تم حذف البطاقة وحفظ التعديل سحابياً" });
    }
    setMasteredIds(prev => prev.filter(mId => mId !== id));
    setReviewIds(prev => prev.filter(rId => rId !== id));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, filteredCards.length]);

  const masteredCount = masteredIds.length;
  const reviewCount = reviewIds.length;
  const progressPercent = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportProgress, setExportProgress] = useState("");

  const handlePrint = () => {
    setShowPrintPreviewModal(true);
  };

  const createSvgDataForSheet = (sheetElem: HTMLElement): string => {
    const cloned = sheetElem.cloneNode(true) as HTMLElement;
    cloned.style.borderRadius = "0px";
    cloned.style.border = "none";
    cloned.style.boxShadow = "none";
    cloned.style.margin = "0px";
    cloned.style.width = "794px";
    cloned.style.height = "1123px";

    let htmlContent = new XMLSerializer().serializeToString(cloned);
    htmlContent = htmlContent.replace(/oklch\([^;}]+\)/gi, "#6366f1");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&amp;family=Plus+Jakarta+Sans:wght@500;600;700;800&amp;display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      div, p, span, h1, h2, h3 {
        font-family: 'IBM Plex Sans Arabic', 'Plus Jakarta Sans', Arial, sans-serif !important;
        line-height: 1.35;
      }
    </style>
  </defs>
  <foreignObject width="100%" height="100%" x="0" y="0">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:794px; height:1123px; font-family: 'IBM Plex Sans Arabic', 'Plus Jakarta Sans', Arial, sans-serif; background-color: #ffffff; border-radius: 0px; margin: 0; padding: 0;">
      ${htmlContent}
    </div>
  </foreignObject>
</svg>`;
  };

  const renderSvgToPngDataUrl = async (svgString: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      const timer = setTimeout(() => {
        URL.revokeObjectURL(url);
        reject(new Error("SVG load timeout"));
      }, 4000);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 2382;
          canvas.height = 3369;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            return reject(new Error("Canvas context 2d unavailable"));
          }
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/png", 1.0));
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };

      img.onerror = (err) => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        reject(err);
      };

      img.src = url;
    });
  };

  const sanitizeClonedDocForHtml2Canvas = (clonedDoc: Document) => {
    // Sanitize oklch colors from style tags without removing Tailwind CSS
    const styleTags = clonedDoc.querySelectorAll("style");
    styleTags.forEach((styleEl) => {
      if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
        styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/gi, "rgba(99, 102, 241, 0.5)");
      }
    });

    // Sanitize inline style attributes that might contain oklch
    const styledEls = clonedDoc.querySelectorAll("[style]");
    styledEls.forEach((el) => {
      const styleAttr = el.getAttribute("style");
      if (styleAttr && styleAttr.includes("oklch")) {
        el.setAttribute("style", styleAttr.replace(/oklch\([^;}]+\)/gi, "#6366f1"));
      }
    });

    // Inject strict baseline and alignment fixes for Arabic and English typography in html2canvas (forcing upward text lift)
    const fontStyle = clonedDoc.createElement("style");
    fontStyle.innerHTML = `
      * {
        box-sizing: border-box !important;
        letter-spacing: normal !important;
        -webkit-font-smoothing: antialiased !important;
        text-rendering: geometricPrecision !important;
      }
      p, h1, h2, h3, h4, h5, h6, span {
        margin-block-start: 0px !important;
        margin-block-end: 0px !important;
        transform: translateY(-2.5px) !important;
      }
      p[dir="rtl"], span[dir="rtl"], div[dir="rtl"] p, div[dir="rtl"] span {
        transform: translateY(-4px) !important;
        position: relative !important;
        top: -1.5px !important;
      }
      h2, h3 {
        transform: translateY(-2.5px) !important;
      }
    `;
    clonedDoc.head.appendChild(fontStyle);
  };

  const handleExportPDF = async () => {
    if (printPagesData.length === 0) return;
    setIsExportingPDF(true);
    setExportProgress("جاري تجهيز الصفحات والخطوط للـ PDF بدقة عالية...");

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 350));

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < printPagesData.length; i++) {
        setExportProgress(`جاري معالجة صفحة A4 رقم ${i + 1} من ${printPagesData.length}...`);

        const sheetElem =
          document.getElementById(`a4-paper-sheet-${i}`) ||
          document.getElementById(`export-offscreen-sheet-${i}`);

        if (!sheetElem) continue;

        let imgData: string | null = null;

        // 1. High precision rendering via html2canvas with direct DOM metrics and font baseline stabilization
        const canvas = await html2canvas(sheetElem, {
          scale: 2.2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            sanitizeClonedDocForHtml2Canvas(clonedDoc);
          },
        });
        imgData = canvas.toDataURL("image/png", 1.0);

        if (i > 0) {
          pdf.addPage("a4", "p");
        }

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }

      setExportProgress("جاري حفظ ملف الـ PDF...");
      const cleanSchool = schoolName.replace(/\s+/g, "_");
      pdf.save(`بطاقات_المفردات_${cleanSchool}.pdf`);

      toast({
        title: "تم تصدير ملف PDF بنجاح 📄",
        description: "تم دمج وتنسيق كافة الصفحات بحواف ناعمة ودقة متناهية.",
      });
    } catch (error: any) {
      console.error("Export PDF error:", error);
      toast({
        title: "خطأ أثناء التصدير",
        description: "تعذر إنشاء ملف الـ PDF. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
      setExportProgress("");
    }
  };

  const handleExportPNGs = async () => {
    if (printPagesData.length === 0) return;
    setIsExportingPDF(true);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));

      for (let i = 0; i < printPagesData.length; i++) {
        setExportProgress(`جاري تنزيل الصفحة ${i + 1} من ${printPagesData.length} كصورة PNG...`);

        const sheetElem =
          document.getElementById(`a4-paper-sheet-${i}`) ||
          document.getElementById(`export-offscreen-sheet-${i}`);

        if (!sheetElem) continue;

        const canvas = await html2canvas(sheetElem, {
          scale: 2.2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: 794,
          height: 1123,
          windowWidth: 794,
          windowHeight: 1123,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            sanitizeClonedDocForHtml2Canvas(clonedDoc);
          },
        });
        const image = canvas.toDataURL("image/png", 1.0);

        const catLabel = selectedCategories.includes("الكل") ? "جميع_الفئات" : selectedCategories.join("_");
        const link = document.createElement("a");
        link.download = `بطاقات_المفردات_${catLabel}_صفحة_${i + 1}.png`;
        link.href = image;
        link.click();

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      toast({
        title: "تم تنزيل الصور بنجاح 🖼️",
        description: "تم حفظ كافة الصفحات كصور PNG عالية الدقة بنجاح.",
      });
    } catch (error: any) {
      console.error("Export PNGs error:", error);
      toast({
        title: "خطأ في التنزيل",
        description: "تعذر تنزيل الصور. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
      setExportProgress("");
    }
  };

  const handleExportSVGs = async () => {
    if (printPagesData.length === 0) return;
    setIsExportingPDF(true);

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));

      for (let i = 0; i < printPagesData.length; i++) {
        setExportProgress(`جاري تصدير الصفحة ${i + 1} من ${printPagesData.length} كـ SVG...`);

        const sheetElem =
          document.getElementById(`a4-paper-sheet-${i}`) ||
          document.getElementById(`export-offscreen-sheet-${i}`);

        if (!sheetElem) continue;

        const svgData = createSvgDataForSheet(sheetElem);
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const catLabel = selectedCategories.includes("الكل") ? "جميع_الفئات" : selectedCategories.join("_");
        const link = document.createElement("a");
        link.download = `بطاقات_المفردات_${catLabel}_صفحة_${i + 1}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      toast({
        title: "تم تنزيل ملفات SVG بنجاح 📐",
        description: `تم تصدير ${printPagesData.length} صفحة بصيغة SVG المتجهة فائقة الوضوح.`,
      });
    } catch (error: any) {
      console.error("Export SVG error:", error);
      toast({
        title: "خطأ في تصدير SVG",
        description: "تعذر إنشاء ملفات SVG. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
      setExportProgress("");
    }
  };

  const handleExecutePrint = () => {
    try {
      const sheets = printPagesData.map((_, i) => {
        const el = document.getElementById(`a4-paper-sheet-${i}`) || document.getElementById(`export-offscreen-sheet-${i}`);
        return el ? el.outerHTML : "";
      }).join('<div style="page-break-after: always; break-after: page; height: 0; overflow: hidden;"></div>');

      const printWin = window.open("", "_blank", "width=900,height=1100");
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
          <head>
            <meta charset="utf-8">
            <title>طباعة بطاقات المفردات - مدرسة الموهوبين</title>
            <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
            <style>
              @page { size: A4 portrait; margin: 0; }
              body {
                font-family: 'IBM Plex Sans Arabic', 'Plus Jakarta Sans', sans-serif;
                background: white;
                color: black;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              @media print {
                body { padding: 0; background: white; }
                div[id^="a4-paper-sheet"], div[id^="export-offscreen-sheet"] {
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                }
              }
            </style>
          </head>
          <body>
            ${sheets}
            <script>
              setTimeout(() => {
                window.print();
              }, 400);
            </script>
          </body>
          </html>
        `);
        printWin.document.close();
        return;
      }
      window.print();
    } catch (e) {
      window.print();
    }
  };

  const getA4CardStyle = (count: number) => {
    if (count <= 6) {
      return {
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
        cardPadding: "16px 20px",
        cardRadius: "20px",
        boxRadius: "14px",
        wordSize: "28px",
        partSize: "13px",
        meaningSize: "20px",
        exampleEnSize: "15px",
        exampleArSize: "13px",
        innerGap: "14px",
        headerPadding: "8px",
        boxPadding: "12px 16px",
      };
    }
    if (count <= 8) {
      return {
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "12px",
        cardPadding: "13px 16px",
        cardRadius: "18px",
        boxRadius: "12px",
        wordSize: "22px",
        partSize: "12px",
        meaningSize: "18px",
        exampleEnSize: "14px",
        exampleArSize: "12px",
        innerGap: "9px",
        headerPadding: "6px",
        boxPadding: "9px 13px",
      };
    }
    if (count <= 10) {
      return {
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "10px",
        cardPadding: "10px 13px",
        cardRadius: "16px",
        boxRadius: "10px",
        wordSize: "18.5px",
        partSize: "11px",
        meaningSize: "16px",
        exampleEnSize: "13px",
        exampleArSize: "11px",
        innerGap: "7px",
        headerPadding: "5px",
        boxPadding: "7px 11px",
      };
    }
    if (count <= 12) {
      return {
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "8px",
        cardPadding: "8px 10px",
        cardRadius: "14px",
        boxRadius: "8px",
        wordSize: "15px",
        partSize: "9px",
        meaningSize: "14px",
        exampleEnSize: "11px",
        exampleArSize: "10px",
        innerGap: "6px",
        headerPadding: "3px",
        boxPadding: "6px 8px",
      };
    }
    if (count <= 15) {
      return {
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "8px",
        cardPadding: "8px 10px",
        cardRadius: "12px",
        boxRadius: "6px",
        wordSize: "16px",
        partSize: "9px",
        meaningSize: "15px",
        exampleEnSize: "12.5px",
        exampleArSize: "11px",
        innerGap: "4px",
        headerPadding: "2px",
        boxPadding: "5px 8px",
      };
    }
    if (count <= 16) {
      return {
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "6px",
        cardPadding: "5px 7px",
        cardRadius: "10px",
        boxRadius: "5px",
        wordSize: "13.5px",
        partSize: "7.5px",
        meaningSize: "12.5px",
        exampleEnSize: "10px",
        exampleArSize: "9px",
        innerGap: "4px",
        headerPadding: "2px",
        boxPadding: "4px 6px",
      };
    }
    // 20 cards per page
    return {
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "5px",
      cardPadding: "4px 5px",
      cardRadius: "8px",
      boxRadius: "4px",
      wordSize: "12px",
      partSize: "7px",
      meaningSize: "11px",
      exampleEnSize: "9px",
      exampleArSize: "8px",
      innerGap: "3px",
      headerPadding: "2px",
      boxPadding: "3px 4px",
    };
  };

  const renderA4PageSheet = (
    pageData: PrintPageData,
    pageIdx: number,
    totalPages: number,
    sheetId: string
  ) => {
    const layout = getA4CardStyle(cardsPerPage);
    const pageCards = pageData.cards || [];
    const pageCategoryTitle = pageData.categoryTitle;

    return (
      <div
        key={sheetId}
        id={sheetId}
        style={{
          width: "794px",
          height: "1123px",
          minHeight: "1123px",
          maxHeight: "1123px",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          padding: "32px",
          boxSizing: "border-box",
          fontFamily: "'IBM Plex Sans Arabic', 'Cairo', 'IBM Plex Sans', sans-serif",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRadius: "0px",
          border: "none",
          boxShadow: "none",
        }}
        className="mx-auto shrink-0 bg-white"
        dir="ltr"
      >
        {/* Sheet Header */}
        <div
          style={{ borderBottom: "2px solid #312e81", paddingBottom: "12px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          className="shrink-0"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "12px", backgroundColor: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #c7d2fe" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0, padding: 0, lineHeight: "1.2", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
                {schoolName} - {pageCategoryTitle ? `قسم: ${pageCategoryTitle}` : "بطاقات المفردات الإنجليزية"}
              </h2>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#4338ca", margin: "3px 0 0 0", padding: 0, lineHeight: "1.2", fontFamily: "'IBM Plex Sans', 'Plus Jakarta Sans', sans-serif" }}>
                English Vocabulary Flashcards - STEP & Academic Practice
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ padding: "5px 14px", borderRadius: "9999px", backgroundColor: "#e0e7ff", color: "#3730a3", fontSize: "12px", fontWeight: "700", border: "1.5px solid #c7d2fe", display: "inline-block", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", lineHeight: "1.2" }}>
              صفحة {pageIdx + 1} من {totalPages}
            </span>
          </div>
        </div>

        {/* Cards Grid */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: layout.gridTemplateColumns,
            alignContent: "start",
            gridAutoRows: "auto",
            gap: layout.gap,
            maxHeight: "970px",
          }}
        >
          {pageCards.map((card, idx) => (
            <div
              key={card.id ? `${card.id}-${idx}` : `card-${idx}`}
              style={{
                backgroundColor: "#ffffff",
                border: "1.5px solid #c7d2fe",
                borderRadius: layout.cardRadius,
                padding: layout.cardPadding,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: layout.innerGap || "6px",
                height: "100%",
                fontFamily: "'IBM Plex Sans Arabic', 'Cairo', 'IBM Plex Sans', Arial, sans-serif",
                overflow: "hidden",
                boxShadow: "0 2px 8px -2px rgba(99, 102, 241, 0.08)",
              }}
            >
              {/* Word and Badges Header */}
              <div style={{ borderBottom: "1.5px solid #e0e7ff", paddingBottom: layout.headerPadding, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                  <h3 style={{ fontSize: layout.wordSize, fontWeight: "800", color: "#0f172a", margin: 0, padding: 0, lineHeight: "1.15", fontFamily: "'IBM Plex Sans', 'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.01em" }}>
                    {card.word}
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {/* Category / Department Badge */}
                    {card.category && (
                      <span style={{ padding: "2px 7px", borderRadius: "8px", backgroundColor: "#e0e7ff", color: "#3730a3", fontSize: layout.partSize, fontWeight: "700", border: "1px solid #c7d2fe", lineHeight: "1.15", whiteSpace: "nowrap", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif" }}>
                        {card.category}
                      </span>
                    )}
                    {/* Part of Speech Badge */}
                    {card.partOfSpeech && (
                      <span style={{ padding: "2px 7px", borderRadius: "9999px", backgroundColor: "#f3e8ff", color: "#7e22ce", fontSize: layout.partSize, fontWeight: "700", border: "1px solid #e9d5ff", lineHeight: "1.15", whiteSpace: "nowrap", fontFamily: "'IBM Plex Sans', 'Plus Jakarta Sans', sans-serif" }}>
                        {card.partOfSpeech}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Inner Boxes Group */}
              <div style={{ display: "flex", flexDirection: "column", gap: layout.innerGap || "6px", width: "100%", marginTop: "auto", marginBottom: "auto" }}>
                {/* Meaning Arabic Box */}
                <div style={{ backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0", padding: layout.boxPadding, borderRadius: layout.boxRadius, boxSizing: "border-box", width: "100%", display: "flex", alignItems: "center" }}>
                  <p style={{ fontSize: layout.meaningSize, fontWeight: "800", color: "#15803d", margin: 0, padding: 0, textAlign: "right", lineHeight: "1.25", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', sans-serif", width: "100%" }} dir="rtl">
                    {card.meaningAr}
                  </p>
                </div>

                {/* Example Box */}
                {card.exampleEn ? (
                  <div style={{ backgroundColor: "#f8fafc", border: "1.5px solid #e2e8f0", padding: layout.boxPadding, borderRadius: layout.boxRadius, boxSizing: "border-box", width: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <p style={{ fontSize: layout.exampleEnSize, fontWeight: "600", color: "#334155", margin: 0, padding: 0, lineHeight: "1.25", fontFamily: "'IBM Plex Sans', 'Plus Jakarta Sans', sans-serif" }}>
                      "{card.exampleEn}"
                    </p>
                    {card.exampleAr && (
                      <p style={{ fontSize: layout.exampleArSize, marginTop: "2px", margin: "2px 0 0 0", padding: 0, textAlign: "right", color: "#64748b", lineHeight: "1.2", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', sans-serif" }} dir="rtl">
                        {card.exampleAr}
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: layout.partSize, color: "#64748b", fontWeight: "600", padding: "2px 4px" }}>
                    <span>⭐ مفردات قياس وSTEP</span>
                    <span>{card.category}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sheet Footer */}
        <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", fontSize: "10px", color: "#64748b", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'IBM Plex Sans Arabic', 'Cairo', sans-serif", lineHeight: "1.2" }} className="shrink-0">
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <span>منصة {schoolName} التعليمية - {pageCategoryTitle ? `قسم ${pageCategoryTitle}` : "بطاقات المفردات"}</span>
          </div>
          <span>إجمالي الكلمات ببطاقات الصفحة: {pageCards.length}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="min-h-screen pb-20 space-y-5 print:hidden" dir="rtl">
        {/* ─── Header Banner ─── */}
      <div className="relative rounded-3xl p-4 sm:p-5 md:p-6 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-background border border-indigo-500/20 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>تقنية Flashcards الاستذكار التفاعلي</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight">
              بطاقات مفردات اللغة الإنجليزية 🇬🇧
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              احفظ وطوّر حصيلتك اللغوية باحترافية لاختبارات قياس، STEP، والتحصيلي مع النطق الصوتي وأمثلة توضيحية.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 shrink-0 w-full md:w-auto">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="rounded-xl h-10 gap-2 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-xs transition-all print:hidden"
            >
              <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>طباعة وتصدير البطاقات 🖨️</span>
            </Button>
            <Button
              onClick={handleAIGenerateCards}
              variant="outline"
              className="rounded-xl h-10 gap-2 text-xs font-bold bg-background/90 hover:bg-muted border-border/70 text-foreground"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>توليد بالذكاء الاصطناعي</span>
            </Button>
            <Button
              onClick={() => setIsSuggestOpen(true)}
              variant="outline"
              className="rounded-xl h-10 gap-2 text-xs font-bold bg-background/90 hover:bg-muted border-border/70 text-foreground"
            >
              <Send className="h-4 w-4 text-indigo-500" />
              <span>اقتراح أو تصحيح</span>
            </Button>
            <StudentSuggestDialog
              isOpen={isSuggestOpen}
              onClose={() => setIsSuggestOpen(false)}
              defaultType="flashcard"
              defaultCategory="أكاديمي وSTEP"
            />
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl h-10 gap-2 text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-indigo-500/25 transition-all">
                  <Plus className="h-4 w-4" />
                  <span>{isAdmin ? "إضافة بطاقة" : "إضافة / اقتراح"}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] rounded-3xl" dir="rtl">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-500" />
                    <span>{isAdmin ? "إضافة بطاقة عامة للمنصة" : "إضافة بطاقة أو اقتراح مفردة"}</span>
                  </DialogTitle>
                </DialogHeader>

                {/* Mode Selector for Students */}
                {!isAdmin && (
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-2xl border border-border/40 text-xs">
                    <button
                      type="button"
                      onClick={() => setAddMode("personal")}
                      className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                        addMode === "personal"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>بطاقتي الخاصة (لي فقط)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("suggest")}
                      className={`py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                        addMode === "suggest"
                          ? "bg-purple-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>اقتراح نشر للمشرف 🚀</span>
                    </button>
                  </div>
                )}

                {addMode === "suggest" && !isAdmin && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs leading-relaxed">
                    ✨ سيتم إرسال الكلمة للمشرف لمراجعتها والموافقة على نشرها لجميع زملائك في المنصة.
                  </div>
                )}

                <form onSubmit={handleAddCard} className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">الكلمة بالإنجليزية *</Label>
                      <Input
                        placeholder="e.g. Perseverance"
                        value={newCard.word}
                        onChange={(e) => setNewCard({ ...newCard, word: e.target.value })}
                        required
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">الرمز الصوتي Phonetic</Label>
                      <Input
                        placeholder="e.g. /ˌpɜː.sɪˈvɪə.rəns/"
                        value={newCard.phonetic}
                        onChange={(e) => setNewCard({ ...newCard, phonetic: e.target.value })}
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">نوع الكلمة</Label>
                      <select
                        className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm"
                        value={newCard.partOfSpeech}
                        onChange={(e) => setNewCard({ ...newCard, partOfSpeech: e.target.value as any })}
                      >
                        <option value="noun">اسم (Noun)</option>
                        <option value="verb">فعل (Verb)</option>
                        <option value="adjective">صفة (Adjective)</option>
                        <option value="adverb">ظرف (Adverb)</option>
                        <option value="phrase">عبارة (Phrase)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">التصنيف</Label>
                      <Input
                        placeholder="مثال: أكاديمي وSTEP"
                        value={newCard.category}
                        onChange={(e) => setNewCard({ ...newCard, category: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">المعنى بالعربية *</Label>
                    <Input
                      placeholder="مثال: المثابرة والتحمل"
                      value={newCard.meaningAr}
                      onChange={(e) => setNewCard({ ...newCard, meaningAr: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">جملة توضيحية بالإنجليزية</Label>
                    <Input
                      placeholder="Sentence in English"
                      value={newCard.exampleEn}
                      onChange={(e) => setNewCard({ ...newCard, exampleEn: e.target.value })}
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">ترجمة الجملة التوضيحية</Label>
                    <Input
                      placeholder="ترجمة الجملة بالعربية"
                      value={newCard.exampleAr}
                      onChange={(e) => setNewCard({ ...newCard, exampleAr: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-2.5">
                    {isAdmin ? "حفظ ونشر البطاقة" : addMode === "suggest" ? "إرسال الاقتراح للمشرف" : "حفظ في بطاقاتي الخاصة"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ─── Stats Progress Bar ─── */}
        <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-card/60 border border-border/40 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">إجمالي البطاقات</p>
              <p className="text-base font-black text-foreground">{cards.length}</p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-card/60 border border-border/40 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">أتقنتها</p>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{masteredCount}</p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-card/60 border border-border/40 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <RotateCw className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">تحتاج مراجعة</p>
              <p className="text-base font-black text-amber-600 dark:text-amber-400">{reviewCount}</p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-card/60 border border-border/40 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
              <Trophy className="h-4 w-4" />
            </div>
            <div className="w-full">
              <p className="text-[11px] text-muted-foreground font-medium">نسبة الإتقان</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-xs font-bold text-foreground">{progressPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Controls, Filters & View Toggle ─── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category & Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-muted/50 p-1 rounded-2xl border border-border/50">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              الكل ({cards.length})
            </button>
            <button
              onClick={() => setStatusFilter("mastered")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "mastered" ? "bg-emerald-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المتقنة ({masteredCount})
            </button>
            <button
              onClick={() => setStatusFilter("review")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === "review" ? "bg-amber-500 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              المراجعة ({reviewCount})
            </button>
            {personalCards.length > 0 && (
              <button
                onClick={() => setStatusFilter("personal")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === "personal" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                بطاقاتي الخاصة ({personalCards.length}) 👤
              </button>
            )}
          </div>

          {/* Multi-Category Selector Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full no-scrollbar">
            <span className="text-xs font-bold text-muted-foreground shrink-0 ml-1">التصنيفات:</span>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-card text-muted-foreground border-border/70 hover:border-indigo-500/50 hover:text-foreground"
                  }`}
                >
                  <span>{cat}</span>
                  {cat !== "الكل" && isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن كلمة أو معنى..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentIndex(0);
              }}
              className="pr-9 h-10 rounded-2xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="rounded-2xl h-10 gap-1.5 text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shrink-0"
              title="طباعة البطاقات وتصديرها"
            >
              <Printer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">طباعة البطاقات</span>
              <span className="sm:hidden">طباعة</span>
            </Button>

            <div className="flex items-center bg-muted/50 p-1 rounded-2xl border border-border/50 shrink-0">
              <button
                onClick={() => setViewMode("study")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === "study" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>المذاكرة التفاعلية</span>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === "grid" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>عرض القائمة</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN STUDY MODE ─── */}
      {viewMode === "study" && (
        <div className="flex flex-col items-center justify-center space-y-6 pt-2">
          {filteredCards.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-border/60 bg-card/40 w-full max-w-lg space-y-3">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-base font-bold text-foreground">لا توجد بطاقات مطابقة لخيارات الفلترة الحالية</p>
              <p className="text-xs text-muted-foreground">جرّب تغيير التصنيف أو البحث أو إضافة كلمات جديدة.</p>
            </div>
          ) : (
            <>
              {/* Card Header Position Tracker */}
              <div className="flex items-center justify-between w-full max-w-xl px-2 text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span>بطاقة {currentIndex + 1} من {filteredCards.length}</span>
                  {masteredIds.includes(currentCard.id) && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">
                      متقنة ✅
                    </span>
                  )}
                  {reviewIds.includes(currentCard.id) && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px]">
                      تحتاج مراجعة 🔁
                    </span>
                  )}
                </span>

                <button
                  onClick={handleShuffle}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  <span>عشوائي</span>
                </button>
              </div>

              {/* 3D FLIP CONTAINER */}
              <div 
                className="w-full max-w-md mx-auto min-h-[250px] sm:min-h-[275px] md:min-h-[300px] perspective-1000 cursor-pointer select-none py-1 px-1"
                onClick={handleFlip}
              >
                <motion.div
                  className="relative w-full h-full rounded-2xl p-4 sm:p-5 md:p-6 border border-border/70 bg-card shadow-lg flex flex-col justify-between transition-all duration-300"
                  style={{
                    transformStyle: "preserve-3d",
                    transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                  }}
                >
                  {/* FRONT OF CARD */}
                  <div 
                    className="flex flex-col justify-between h-full space-y-3"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 text-[11px] font-bold border border-indigo-500/20">
                          {currentCard.category}
                        </span>
                        {(currentCard as EnhancedFlashcard).isPersonal && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-500/20">
                            بطاقتي الخاصة 👤
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => speakWord(currentCard.word)}
                          className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                            isSpeaking 
                              ? "bg-indigo-600 text-white animate-pulse" 
                              : "bg-muted hover:bg-indigo-500/15 text-foreground hover:text-indigo-500"
                          }`}
                          title="استمع للنطق الصوتي"
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(currentCard.id)}
                          className="h-8 w-8 rounded-xl bg-muted hover:bg-red-500/15 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-all"
                          title="حذف هذه البطاقة"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-center py-2 space-y-1">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {currentCard.partOfSpeech}
                      </span>
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight break-words leading-tight" dir="ltr">
                        {currentCard.word}
                      </h2>
                    </div>

                    <div className="flex items-center justify-center text-[11px] text-muted-foreground font-medium gap-1.5 pt-2 border-t border-border/30">
                      <RotateCw className="h-3 w-3 text-indigo-500 animate-spin-slow" />
                      <span>اضغط للقلب والتعرف على المعنى والأمثلة</span>
                    </div>
                  </div>

                  {/* BACK OF CARD */}
                  <div 
                    className="absolute inset-0 p-4 sm:p-5 md:p-6 rounded-2xl flex flex-col justify-between bg-card border border-indigo-500/20 shadow-inner overflow-y-auto max-h-full"
                    style={{ 
                      backfaceVisibility: "hidden", 
                      transform: "rotateY(180deg)" 
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                        المعنى بالعربية
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWord(currentCard.exampleEn || currentCard.word);
                        }}
                        className="h-8 w-8 rounded-xl bg-muted hover:bg-indigo-500/15 text-foreground flex items-center justify-center transition-colors"
                        title="استمع للجملة"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="text-center py-2 space-y-2.5 my-auto">
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                        {currentCard.meaningAr}
                      </h3>

                      {currentCard.exampleEn && (
                        <div className="p-3 rounded-2xl bg-muted/50 border border-border/40 text-right space-y-1 mt-2">
                          <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug" dir="ltr">
                            "{currentCard.exampleEn}"
                          </p>
                          {currentCard.exampleAr && (
                            <p className="text-xs text-muted-foreground leading-snug">
                              "{currentCard.exampleAr}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons inside card back */}
                    <div 
                      className="flex items-center justify-center gap-2 sm:gap-3 pt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs gap-1.5 font-bold"
                        onClick={() => markReview(currentCard.id)}
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>مراجعة لاحقاً</span>
                      </Button>

                      <Button
                        size="sm"
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold shadow-md"
                        onClick={() => markMastered(currentCard.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>أتقنتها ممتاز</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Navigation Arrows */}
              <div className="flex items-center justify-between w-full max-w-xl px-2 gap-4">
                <Button
                  variant="outline"
                  className="rounded-2xl gap-2 font-bold flex-1 h-11"
                  onClick={handlePrev}
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>السابقة</span>
                </Button>

                <Button
                  className="rounded-2xl gap-2 font-bold flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={handleNext}
                >
                  <span>التالية</span>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── GRID LIST VIEW MODE ─── */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredCards.length === 0 ? (
            <div className="col-span-full p-12 text-center rounded-3xl border border-dashed border-border/60 bg-card/40 space-y-2">
              <Layers className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-base font-bold text-foreground">لا توجد بطاقات مطابقة في القائمة</p>
            </div>
          ) : (
            filteredCards.map((card) => {
              const isMastered = masteredIds.includes(card.id);
              const isReview = reviewIds.includes(card.id);

              return (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group relative rounded-3xl p-5 border border-border/60 bg-card hover:border-indigo-500/40 transition-all duration-300 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {card.category}
                        </span>
                        {(card as EnhancedFlashcard).isPersonal && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            خاصة بي 👤
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-foreground mt-2 tracking-tight" dir="ltr">
                        {card.word}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => speakWord(card.word)}
                        className="h-8 w-8 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="استمع للكلمة"
                      >
                        <Volume2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="h-8 w-8 rounded-xl bg-muted/60 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-muted/40 space-y-1">
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {card.meaningAr}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2" dir="ltr">
                      {card.exampleEn}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {card.partOfSpeech}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => markReview(card.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                          isReview ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        مراجعة
                      </button>
                      <button
                        onClick={() => markMastered(card.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                          isMastered ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        متقنة ✅
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
      </div>

      {/* ─── PDF Print Preview Modal ─── */}
      <Dialog open={showPrintPreviewModal} onOpenChange={setShowPrintPreviewModal}>
        <DialogContent className="max-w-5xl max-h-[94vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-3xl" dir="rtl">
          <DialogHeader className="pb-3 border-b border-border/60 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-black">معاينة وتصدير بطاقات المفردات (PDF)</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    تنسيق عالي الدقة ومطابق 100% لمعاينة صفحات A4 الجاهزة للطباعة الحقيقية.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Controls toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 my-2 p-3 bg-muted/50 rounded-2xl border border-border/50 text-xs shrink-0">
            {/* School Name Input (Synced with Settings) */}
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-[11px] font-bold text-foreground">اسم المدرسة / الجهة (مُتزامن):</Label>
              <Input
                value={customSchoolName}
                onChange={(e) => setCustomSchoolName(e.target.value)}
                placeholder={siteSchoolName}
                className="h-9 text-xs font-bold rounded-xl bg-background"
              />
            </div>

            {/* Cards Per Page Selector */}
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-[11px] font-bold text-foreground">عدد البطاقات بالصفحة:</Label>
              <select
                value={cardsPerPage}
                onChange={(e) => setCardsPerPage(Number(e.target.value))}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 font-semibold text-xs text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value={6}>6 بطاقات (مكبرة)</option>
                <option value={8}>8 بطاقات (مستحسن - 2×4)</option>
                <option value={10}>10 بطاقات (مكثفة - 2×5)</option>
                <option value={12}>12 بطاقة (شبكة 3×4)</option>
                <option value={15}>15 بطاقة (شبكة 3×5)</option>
                <option value={16}>16 بطاقة (شبكة 4×4)</option>
                <option value={20}>20 بطاقة (أقصى استغلال 4×5)</option>
              </select>
            </div>

            {/* Page Grouping Mode */}
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-[11px] font-bold text-foreground">تقسيم الصفحات حسب الأقسام:</Label>
              <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border h-9">
                <button
                  type="button"
                  onClick={() => setPrintGroupingMode("mixed")}
                  className={`flex-1 h-7 rounded-lg text-[10px] font-bold transition-all ${
                    printGroupingMode === "mixed"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  مدمجة
                </button>
                <button
                  type="button"
                  onClick={() => setPrintGroupingMode("by_category")}
                  className={`flex-1 h-7 rounded-lg text-[10px] font-bold transition-all ${
                    printGroupingMode === "by_category"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  حسب الأقسام 📑
                </button>
              </div>
            </div>

            {/* Print Summary */}
            <div className="flex flex-col justify-center space-y-1 bg-background/80 p-2.5 rounded-xl border border-border/40 sm:col-span-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>إجمالي الكلمات:</span>
                <span className="font-bold text-foreground">{printCards.length} بطاقة</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>صفحات A4:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{printPagesData.length} صفحة</span>
              </div>
            </div>

            {/* Category Multi-Selector for Print Preview */}
            <div className="space-y-1 sm:col-span-4 border-t border-border/40 pt-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-foreground">تصفية الأقسام والتصنيفات المختارة للطباعة:</Label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {selectedCategories.includes("الكل") ? "جميع الأقسام" : `${selectedCategories.length} أقسام مختارة`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-background text-muted-foreground border-border hover:border-indigo-500/50 hover:text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="h-4 w-4 text-indigo-500" />
              <span>المعاينة بالأسفل تطابق تماماً ملف الـ PDF وشيتات الطباعة</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="rounded-xl h-9 gap-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md min-w-[170px]"
              >
                {isExportingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-[11px]">{exportProgress || "جاري التصدير..."}</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>تصدير ملف PDF</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleExecutePrint}
                disabled={isExportingPDF}
                className="rounded-xl h-9 gap-1.5 text-xs font-bold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
                title="طباعة عبر أمر الطابعة المباشر بالمتصفح"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>طباعة مباشرة 🖨️</span>
              </Button>
            </div>
          </div>

          {/* Scrollable A4 Pages Preview */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-900/10 dark:bg-slate-950/50 rounded-2xl border border-border/50 space-y-6">
            {printPagesData.map((pageData, pageIdx) => (
              <div key={pageIdx} className="space-y-2">
                <div className="flex items-center justify-between px-2 text-xs font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                    صفحة A4 رقم ({pageIdx + 1} من {printPagesData.length})
                    {pageData.categoryTitle && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                        قسم: {pageData.categoryTitle}
                      </span>
                    )}
                  </span>
                  <span>عدد الكلمات بالصفحة: {pageData.cards.length}</span>
                </div>

                {/* A4 Paper Sheet Wrapper */}
                <div className="overflow-x-auto py-2 flex justify-center bg-slate-100 p-4 rounded-xl">
                  <div className="shadow-2xl border border-slate-300">
                    {renderA4PageSheet(pageData, pageIdx, printPagesData.length, `a4-paper-sheet-${pageIdx}`)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Printable Template (Hidden in UI, visible in Browser Print) ─── */}
      <div id="flashcards-print-container" className="hidden print:block w-full h-auto bg-white text-black p-0 m-0" dir="ltr">
        {printPagesData.map((pageData, pageIdx) => (
          <div key={pageIdx} className="print-page p-4 bg-white text-black w-full h-auto border-b border-gray-200 print:border-none">
            <div className="mb-3 border-b-2 border-gray-900 pb-2 flex items-center justify-between">
              <div>
                <h1 className="text-base font-black text-gray-900">{schoolName} - {pageData.categoryTitle ? `قسم ${pageData.categoryTitle}` : "بطاقات المفردات الإنجليزية"}</h1>
                <p className="text-[11px] font-semibold text-gray-600">English Vocabulary Flashcards - STEP & Academic</p>
              </div>
              <div className="text-right font-mono text-xs text-gray-700">
                <p className="font-bold">صفحة {pageIdx + 1} من {printPagesData.length}</p>
                <p className="text-[10px] text-gray-500">{new Date().toLocaleDateString('ar-SA')}</p>
              </div>
            </div>

            <div className="print-grid">
              {pageData.cards.map((card, idx) => (
                <div key={card.id ? `print-${card.id}-${idx}` : `print-card-${idx}`} className="print-card">
                  <div className="flex items-baseline justify-between border-b border-gray-200 pb-1 mb-1.5">
                    <h3 className="font-bold text-sm text-gray-900" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{card.word}</h3>
                    <div className="flex items-center gap-1">
                      {card.category && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{card.category}</span>
                      )}
                      {card.partOfSpeech && (
                        <span className="text-[10px] font-mono text-gray-500 uppercase">{card.partOfSpeech}</span>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-sm text-right text-emerald-800 my-1" dir="rtl">{card.meaningAr}</p>
                  {card.exampleEn && (
                    <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-200 text-xs">
                      <p className="font-medium text-gray-800 leading-tight" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>"{card.exampleEn}"</p>
                      {card.exampleAr && <p className="mt-0.5 text-right text-gray-600 text-[11px] leading-tight" dir="rtl">{card.exampleAr}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2 border-t border-gray-300 flex items-center justify-between text-[10px] text-gray-500 font-mono">
              <span>منصة {schoolName}</span>
              <span>الصفحة {pageIdx + 1} من {printPagesData.length}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Dedicated Offscreen DOM area for html2canvas Export ─── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "-9999px",
          width: "794px",
          zIndex: -9999,
          pointerEvents: "none",
          visibility: "visible",
          opacity: 1,
        }}
        dir="ltr"
      >
        {printPagesData.map((pageData, pageIdx) =>
          renderA4PageSheet(pageData, pageIdx, printPagesData.length, `export-offscreen-sheet-${pageIdx}`)
        )}
      </div>
    </>
  );
}
