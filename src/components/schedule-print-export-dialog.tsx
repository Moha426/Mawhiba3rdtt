import React, { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Printer, Download, Monitor, FileText, Sparkles, MapPin, 
  User, Clock, Coffee, Image as ImageIcon, School, CheckCircle2,
  Check, Layout, AlignRight, AlignLeft, ShieldCheck, BookOpen, Tv, Ratio,
  Maximize2, Upload, ImagePlus, Trash2, Eye, EyeOff, Sliders, Palette,
  Dumbbell, Trophy, Zap, Settings2, Paintbrush, ArrowRight, ArrowLeft, CalendarDays,
  Layers, Type, RotateCcw, Scaling
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { formatTime12h, formatTimeRangeRTL, getSubjectDecoration } from "@/lib/schedule-utils";
import { FontUploadManagerDialog } from "./font-upload-manager-dialog";
import { 
  CustomFont, 
  PRESET_FONTS, 
  loadCustomFonts, 
  parseUploadedFont, 
  saveCustomFont, 
  generateSvgFontDefinitions 
} from "@/lib/custom-fonts";

const DAYS_ORDER = [
  { id: 0, name: "الأحد", short: "أحد" },
  { id: 1, name: "الاثنين", short: "اثنين" },
  { id: 2, name: "الثلاثاء", short: "ثلاثاء" },
  { id: 3, name: "الأربعاء", short: "أربعاء" },
  { id: 4, name: "الخميس", short: "خميس" },
];

export function escapeXml(unsafe: string | number | null | undefined): string {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function shortenTeacherName(name: string | null | undefined, mode: "short" | "full" = "short"): string {
  if (!name) return "";
  const cleaned = name.trim();
  if (mode === "full") {
    if (cleaned.startsWith("أ.") || cleaned.startsWith("أ ") || cleaned.startsWith("د.") || cleaned.startsWith("د ") || cleaned.startsWith("Mr.")) {
      return cleaned;
    }
    return `أ. ${cleaned}`;
  }

  // Extract title if present (e.g. د. or أ. or Mr.)
  let title = "أ.";
  let rest = cleaned;
  if (cleaned.startsWith("د.") || cleaned.startsWith("د ")) {
    title = "د.";
    rest = cleaned.replace(/^د\.?\s*/, "");
  } else if (cleaned.startsWith("أ.") || cleaned.startsWith("أ ")) {
    title = "أ.";
    rest = cleaned.replace(/^أ\.?\s*/, "");
  } else if (cleaned.startsWith("Mr.") || cleaned.startsWith("Mr ")) {
    title = "Mr.";
    rest = cleaned.replace(/^Mr\.?\s*/, "");
  }

  // Split words to get the last name / family name
  const parts = rest.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return `${title} ${parts[0] || ""}`.trim();
  }
  // Take title + last name
  const lastName = parts[parts.length - 1];
  return `${title} ${lastName}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

export const PE_HIGHLIGHT_STYLES = {
  athleticLime: {
    id: "athleticLime",
    name: "أخضر رياضي ليموني (حيوي ومميز)",
    lightBg: "#f7fee7",
    lightBorder: "#84cc16",
    lightText: "#3f6212",
    lightBadgeBg: "#84cc16",
    lightBadgeText: "#365314",
    darkBg: "#142900",
    darkBorder: "#84cc16",
    darkText: "#ecfccb",
    darkBadgeBg: "#4d7c0f",
    darkBadgeText: "#f7fee7",
    accentColor: "#65a30d",
    badgeLabel: "🏃‍♂️ يوم البدنية",
  },
  goldenTrophy: {
    id: "goldenTrophy",
    name: "ذهبي البطولة والأنشطة (كأس التميز)",
    lightBg: "#fefce8",
    lightBorder: "#eab308",
    lightText: "#713f12",
    lightBadgeBg: "#fde047",
    lightBadgeText: "#854d0e",
    darkBg: "#2e2202",
    darkBorder: "#facc15",
    darkText: "#fef08a",
    darkBadgeBg: "#ca8a04",
    darkBadgeText: "#fef9c3",
    accentColor: "#d97706",
    badgeLabel: "🏆 يوم البدنية",
  },
  emeraldEnergy: {
    id: "emeraldEnergy",
    name: "زمردي النشاط واللياقة (طاقة وحيوية)",
    lightBg: "#ecfdf5",
    lightBorder: "#10b981",
    lightText: "#064e3b",
    lightBadgeBg: "#6ee7b7",
    lightBadgeText: "#065f46",
    darkBg: "#022c22",
    darkBorder: "#34d399",
    darkText: "#a7f3d0",
    darkBadgeBg: "#059669",
    darkBadgeText: "#ecfdf5",
    accentColor: "#059669",
    badgeLabel: "⚡ يوم البدنية",
  },
  vividOrange: {
    id: "vividOrange",
    name: "برتقالي القوة والرياضة (أولمبياد)",
    lightBg: "#fff7ed",
    lightBorder: "#f97316",
    lightText: "#7c2d12",
    lightBadgeBg: "#fdba74",
    lightBadgeText: "#9a3412",
    darkBg: "#331205",
    darkBorder: "#fb923c",
    darkText: "#ffedd5",
    darkBadgeBg: "#ea580c",
    darkBadgeText: "#fff7ed",
    accentColor: "#ea580c",
    badgeLabel: "🥇 يوم البدنية",
  },
} as const;

export type PEHighlightStyleKey = keyof typeof PE_HIGHLIGHT_STYLES;

export interface ScheduleSlotData {
  id?: number | string;
  dayOfWeek: number;
  periodNumber: number;
  subjectName: string;
  subjectColor?: string;
  teacherName?: string | null;
  room?: string | null;
  notes?: string | null;
}

export interface ScheduleConfigData {
  periodsCount?: number;
  periodDuration?: number;
  breakAfterPeriod?: number;
  breakDuration?: number;
  startTime?: string;
}

interface SchedulePrintExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: ScheduleSlotData[];
  subjects?: Array<{ name: string; teacherName?: string | null; teacherPhone?: string | null; room?: string | null; rooms?: string[] | null; color?: string | null }>;
  config?: ScheduleConfigData | null;
  defaultSchoolName?: string;
  initialTab?: "print" | "wallpaper";
}

export function SchedulePrintExportDialog({
  open,
  onOpenChange,
  slots = [],
  subjects = [],
  config,
  defaultSchoolName = "مدرسة الجش الثانوية",
  initialTab = "print",
}: SchedulePrintExportDialogProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"print" | "wallpaper">(initialTab);
  
  // Top Banner Image (الصورة المرفوعة فوق الجدول)
  const [topBannerImage, setTopBannerImage] = useState<string | null>(() => {
    try {
      return localStorage.getItem("schedule_top_banner_image") || null;
    } catch {
      return null;
    }
  });
  const [showTopBannerInPrint, setShowTopBannerInPrint] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("schedule_export_show_top_banner");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const [showTopBannerInWallpaper, setShowTopBannerInWallpaper] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("schedule_export_show_top_banner_wallpaper");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });
  const [topBannerHeight, setTopBannerHeight] = useState<"compact" | "medium" | "tall">(() => {
    try {
      return (localStorage.getItem("schedule_export_top_banner_height") as any) || "medium";
    } catch {
      return "medium";
    }
  });

  const [schoolName, setSchoolName] = useState(() => {
    try {
      return localStorage.getItem("schedule_export_school_name") || defaultSchoolName;
    } catch {
      return defaultSchoolName;
    }
  });
  const [className, setClassName] = useState(() => {
    try {
      return localStorage.getItem("schedule_export_class_name") || "ثالث ثانوي موهبة";
    } catch {
      return "ثالث ثانوي موهبة";
    }
  });
  const [academicTerm, setAcademicTerm] = useState(() => {
    try {
      return localStorage.getItem("schedule_export_academic_term") || "العام الدراسي 1448-1449هـ - الفصل الدراسي الأول";
    } catch {
      return "العام الدراسي 1448-1449هـ - الفصل الدراسي الأول";
    }
  });
  const [teacherNameMode, setTeacherNameMode] = useState<"short" | "full">("short");
  const [showRooms, setShowRooms] = useState(true);
  const [showTeachers, setShowTeachers] = useState(true);
  const [showTimes, setShowTimes] = useState(true);
  const [showTeacherDirectory, setShowTeacherDirectory] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);

  useEffect(() => {
    if (open) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      try {
        const savedBanner = localStorage.getItem("schedule_top_banner_image");
        setTopBannerImage(savedBanner || null);
        const savedShowBanner = localStorage.getItem("schedule_export_show_top_banner");
        if (savedShowBanner !== null) setShowTopBannerInPrint(savedShowBanner === "true");
        const savedShowWallpaperBanner = localStorage.getItem("schedule_export_show_top_banner_wallpaper");
        if (savedShowWallpaperBanner !== null) setShowTopBannerInWallpaper(savedShowWallpaperBanner === "true");
        const savedHeight = localStorage.getItem("schedule_export_top_banner_height");
        if (savedHeight) setTopBannerHeight(savedHeight as any);
        const savedSchool = localStorage.getItem("schedule_export_school_name");
        if (savedSchool) setSchoolName(savedSchool);
        const savedClass = localStorage.getItem("schedule_export_class_name");
        if (savedClass) setClassName(savedClass);
        const savedTerm = localStorage.getItem("schedule_export_academic_term");
        if (savedTerm) setAcademicTerm(savedTerm);
      } catch {}
    }
  }, [open, initialTab]);

  // 16:9 Wallpaper Theme and Layout customization
  const [wallpaperTheme, setWallpaperTheme] = useState<"light" | "marukoChalkboard" | "softLight" | "midnight" | "slate" | "amoled" | "emerald">("light");
  const [tablePosition, setTablePosition] = useState<"left" | "right">("right"); // Default: Table on the Right, clean and compact
  const [showDesktopGridZone, setShowDesktopGridZone] = useState(true);
  const [desktopCustomNote, setDesktopCustomNote] = useState("مساحة تطبيقات ويندوز والملفات");
  const [bottomCardTitle, setBottomCardTitle] = useState("ملاحظات وتنبيهات الأسبوع");
  const [bottomCardLine1, setBottomCardLine1] = useState("• الالتزام بالحضور الصباحي والتواجد قبل بداية الحصة الأولى");
  const [bottomCardLine2, setBottomCardLine2] = useState("• إحضار الكتب والواجبات المدرسية والمحافظة على النظام الصفي");
  const [wallpaperResolution, setWallpaperResolution] = useState<"1080p" | "1440p" | "4k">("4k");
  const [targetScreenSize, setTargetScreenSize] = useState<"75inch" | "65inch" | "55inch" | "desktop">("75inch");

  // 1. صورة خلف الجدول (خلفية الشاشة الكاملة 16:9 - تحت/خلف الجدول)
  const [bgBehindImage, setBgBehindImage] = useState<string | null>(() => {
    try {
      return (
        localStorage.getItem("schedule_bg_behind_image") ||
        (localStorage.getItem("schedule_cover_layer_position") === "below"
          ? localStorage.getItem("schedule_custom_bg_wallpaper")
          : null) ||
        null
      );
    } catch {
      return null;
    }
  });

  const [bgBehindOpacity, setBgBehindOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("schedule_bg_behind_opacity");
      return saved ? Math.min(100, Math.max(10, Number(saved))) : 100;
    } catch {
      return 100;
    }
  });

  const [bgBehindFitMode, setBgBehindFitMode] = useState<"exact" | "cover">(() => {
    try {
      return (localStorage.getItem("schedule_bg_behind_fit") as any) || "exact";
    } catch {
      return "exact";
    }
  });

  // 2. صورة فوق الجدول (طبقة التغطية الكاملة 16:9 - فوق الجدول مباشرة)
  const [overlayAboveImage, setOverlayAboveImage] = useState<string | null>(() => {
    try {
      return (
        localStorage.getItem("schedule_overlay_above_image") ||
        (localStorage.getItem("schedule_cover_layer_position") !== "below"
          ? localStorage.getItem("schedule_custom_bg_wallpaper")
          : null) ||
        null
      );
    } catch {
      return null;
    }
  });

  const [overlayAboveOpacity, setOverlayAboveOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("schedule_overlay_above_opacity");
      return saved ? Math.min(100, Math.max(10, Number(saved))) : 80;
    } catch {
      return 80;
    }
  });

  const [overlayAboveFitMode, setOverlayAboveFitMode] = useState<"exact" | "cover">(() => {
    try {
      return (localStorage.getItem("schedule_overlay_above_fit") as any) || "exact";
    } catch {
      return "exact";
    }
  });

  // Table Right Shift / Offset ("مائل لليمين أكثر")
  const [tableRightShift, setTableRightShift] = useState<"maxRight" | "standardRight" | "balanced">(() => {
    try {
      return (localStorage.getItem("schedule_export_table_right_shift") as any) || "standardRight";
    } catch {
      return "standardRight";
    }
  });

  // Table Width & Spacing ("أقل انضغاطاً")
  const [tableWidthMode, setTableWidthMode] = useState<"ultraSpacious" | "spacious" | "compact">(() => {
    try {
      return (localStorage.getItem("schedule_export_table_width_mode") as any) || "spacious";
    } catch {
      return "spacious";
    }
  });

  // Highlight Physical Education Day ("اليوم الذي يحتوي بدنية لونه مختلف")
  const [highlightPEDay, setHighlightPEDay] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("schedule_export_highlight_pe_day");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  // PE Highlight Color Style
  const [peHighlightStyle, setPeHighlightStyle] = useState<PEHighlightStyleKey>(() => {
    try {
      return (localStorage.getItem("schedule_export_pe_style") as PEHighlightStyleKey) || "athleticLime";
    } catch {
      return "athleticLime";
    }
  });

  // Subject Colors Distinction Mode ("ألوانه تفرق المواد عن بعضها")
  const [subjectColorContrast, setSubjectColorContrast] = useState<"highContrast" | "vivid" | "pastel">(() => {
    try {
      return (localStorage.getItem("schedule_export_color_contrast") as any) || "highContrast";
    } catch {
      return "highContrast";
    }
  });

  const [tableOpacity, setTableOpacity] = useState<"solid" | "glass" | "transparent">("glass");
  const [showVectorMotifsWithCustomBg, setShowVectorMotifsWithCustomBg] = useState(false);
  const bgBehindInputRef = useRef<HTMLInputElement>(null);
  const overlayAboveInputRef = useRef<HTMLInputElement>(null);
  const topBannerInputRef = useRef<HTMLInputElement>(null);
  const fontQuickUploadInputRef = useRef<HTMLInputElement>(null);

  // ── Custom Fonts Management State ──
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [selectedFontId, setSelectedFontId] = useState<string>(() => {
    try {
      return localStorage.getItem("schedule_selected_font_id") || "ibm-plex";
    } catch {
      return "ibm-plex";
    }
  });
  const [fontApplyScope, setFontApplyScope] = useState<"all" | "subjects">(() => {
    try {
      return (localStorage.getItem("schedule_font_apply_scope") as any) || "all";
    } catch {
      return "all";
    }
  });
  const [fontManagerOpen, setFontManagerOpen] = useState(false);

  // ── Font Sizing / Scaling State (تحجيم الخط) ──
  const [subjectFontScale, setSubjectFontScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("schedule_export_subject_font_scale");
      return saved ? Math.min(180, Math.max(60, Number(saved))) : 100;
    } catch {
      return 100;
    }
  });

  const [generalFontScale, setGeneralFontScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("schedule_export_general_font_scale");
      return saved ? Math.min(150, Math.max(70, Number(saved))) : 100;
    } catch {
      return 100;
    }
  });

  const updateSubjectFontScale = (scale: number) => {
    const clamped = Math.min(180, Math.max(60, Math.round(scale)));
    setSubjectFontScale(clamped);
    try {
      localStorage.setItem("schedule_export_subject_font_scale", String(clamped));
    } catch {}
  };

  const updateGeneralFontScale = (scale: number) => {
    const clamped = Math.min(150, Math.max(70, Math.round(scale)));
    setGeneralFontScale(clamped);
    try {
      localStorage.setItem("schedule_export_general_font_scale", String(clamped));
    } catch {}
  };

  const resetFontScales = () => {
    setSubjectFontScale(100);
    setGeneralFontScale(100);
    try {
      localStorage.setItem("schedule_export_subject_font_scale", "100");
      localStorage.setItem("schedule_export_general_font_scale", "100");
    } catch {}
    toast({
      title: "تمت استعادة المقاس الافتراضي",
      description: "تم ضبط أحجام خطوط الجدول إلى 100%.",
    });
  };

  const refreshCustomFonts = async () => {
    try {
      const fonts = await loadCustomFonts();
      setCustomFonts(fonts);
    } catch (err) {
      console.warn("Could not load custom fonts:", err);
    }
  };

  useEffect(() => {
    refreshCustomFonts();
  }, []);

  const handleQuickFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["ttf", "otf", "woff", "woff2"].includes(ext || "")) {
      toast({
        title: "صيغة غير مدعومة",
        description: "يرجى اختيار ملف خط بصيغة TTF أو OTF أو WOFF أو WOFF2.",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsed = await parseUploadedFont(file);
      await saveCustomFont(parsed);
      await refreshCustomFonts();
      setSelectedFontId(parsed.id);
      try {
        localStorage.setItem("schedule_selected_font_id", parsed.id);
      } catch {}

      toast({
        title: "تم رفع الخط وتفعيله بنجاح 🎉",
        description: `تم تثبيت الخط "${parsed.name}" وتطبيقه على الجدول المدرسي فوراً.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "فشل رفع الخط",
        description: "حدث خطأ أثناء معالجة ملف الخط.",
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  // Resolved dynamic active font families
  const activeFontInfo = useMemo(() => {
    const custom = customFonts.find((f) => f.id === selectedFontId);
    if (custom) {
      return {
        id: custom.id,
        name: custom.name,
        family: `'${custom.family}', 'IBM Plex Sans Arabic', sans-serif`,
        isCustom: true,
      };
    }
    const preset = PRESET_FONTS.find((p) => p.id === selectedFontId) || PRESET_FONTS[0];
    return {
      id: preset.id,
      name: preset.name,
      family: preset.family,
      isCustom: false,
    };
  }, [selectedFontId, customFonts]);

  const activeGeneralFontFamily = fontApplyScope === "all" ? activeFontInfo.family : "'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', sans-serif";
  const activeSubjectFontFamily = activeFontInfo.family;

  // Persistence helpers
  const handleTopBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "صيغة الملف غير مدعومة",
        description: "يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP).",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setTopBannerImage(result);
        setShowTopBannerInPrint(true);
        try {
          localStorage.setItem("schedule_top_banner_image", result);
          localStorage.setItem("schedule_export_show_top_banner", "true");
        } catch (err) {
          console.warn("Storage warning:", err);
        }
        toast({
          title: "تم رفع صورة الترويسة بنجاح!",
          description: "تم تثبيت الصورة فوق الجدول في ورقة الطباعة وملف PDF.",
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveTopBanner = () => {
    setTopBannerImage(null);
    try {
      localStorage.removeItem("schedule_top_banner_image");
    } catch {}
    toast({
      title: "تمت إزالة صورة الترويسة",
      description: "تم حذف الصورة من فوق الجدول.",
    });
  };

  // 1. Background Behind Handlers (صورة خلف الجدول)
  const handleBgBehindUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "صيغة غير مدعومة",
        description: "يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP).",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setBgBehindImage(result);
        try {
          localStorage.setItem("schedule_bg_behind_image", result);
        } catch {}
        toast({
          title: "تم تطبيق صورة خلف الجدول بنجاح!",
          description: "تم وضع صورتك كخلفية شاشة متكاملة (16:9) أسفل الجدول بدقة 4K.",
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveBgBehind = () => {
    setBgBehindImage(null);
    try {
      localStorage.removeItem("schedule_bg_behind_image");
    } catch {}
    toast({
      title: "تمت إزالة صورة خلف الجدول",
      description: "تم حذف صورة الخلفية والعودة للنمط الأصلي.",
    });
  };

  // 2. Overlay Above Handlers (صورة فوق الجدول)
  const handleOverlayAboveUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "صيغة غير مدعومة",
        description: "يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP).",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setOverlayAboveImage(result);
        try {
          localStorage.setItem("schedule_overlay_above_image", result);
        } catch {}
        toast({
          title: "تم تطبيق صورة فوق الجدول بنجاح!",
          description: "تم وضع صورتك كطبقة تغطية (16:9) فوق الجدول مباشرة بدقة 4K.",
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveOverlayAbove = () => {
    setOverlayAboveImage(null);
    try {
      localStorage.removeItem("schedule_overlay_above_image");
    } catch {}
    toast({
      title: "تمت إزالة صورة فوق الجدول",
      description: "تم حذف صورة التغطية والعودة لتصميم الجدول.",
    });
  };

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingWallpaperPDF, setIsExportingWallpaperPDF] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const svgPreviewContainerRef = useRef<HTMLDivElement>(null);

  const periodsCount = config?.periodsCount ?? 7;
  const breakAfterPeriod = config?.breakAfterPeriod ?? 3;
  const periodDuration = config?.periodDuration ?? 45;
  const breakDuration = config?.breakDuration ?? 20;
  const startTime = config?.startTime ?? "07:30";

  const maxUsedPeriod = slots.length > 0 ? Math.max(...slots.map((s) => s.periodNumber)) : periodsCount;
  const displayCount = Math.min(periodsCount, maxUsedPeriod);
  const PERIODS = Array.from({ length: displayCount }, (_, i) => i + 1);
  const hasBreak = displayCount >= breakAfterPeriod;

  // Period start and end times
  const periodTimes = useMemo(() => {
    const times: { start: string; end: string }[] = [];
    let cursor = startTime;
    for (let i = 1; i <= displayCount; i++) {
      const start = cursor;
      const end = addMinutes(cursor, periodDuration);
      times.push({ start, end });
      cursor = end;
      if (i === breakAfterPeriod) {
        cursor = addMinutes(cursor, breakDuration);
      }
    }
    return times;
  }, [startTime, displayCount, periodDuration, breakAfterPeriod, breakDuration]);

  // Teachers directory extraction
  const teachersList = useMemo(() => {
    const map = new Map<string, { name: string; shortName: string; subjects: string[]; rooms: string[]; phone?: string }>();
    subjects.forEach((sub) => {
      if (sub.teacherName) {
        const key = sub.teacherName.trim();
        const existing = map.get(key) || {
          name: key,
          shortName: shortenTeacherName(key, "short"),
          subjects: [],
          rooms: [],
          phone: sub.teacherPhone || undefined,
        };
        if (!existing.subjects.includes(sub.name)) existing.subjects.push(sub.name);
        const subRooms: string[] = Array.isArray(sub.rooms) ? sub.rooms : (sub.room ? [sub.room] : []);
        subRooms.forEach((r) => {
          if (!existing.rooms.includes(r)) existing.rooms.push(r);
        });
        if (sub.teacherPhone && !existing.phone) existing.phone = sub.teacherPhone;
        map.set(key, existing);
      }
    });

    // Also include teachers in slots
    slots.forEach((s) => {
      if (s.teacherName) {
        const key = s.teacherName.trim();
        if (!map.has(key)) {
          map.set(key, {
            name: key,
            shortName: shortenTeacherName(key, "short"),
            subjects: [s.subjectName],
            rooms: s.room ? [s.room] : [],
          });
        }
      }
    });

    return Array.from(map.values());
  }, [subjects, slots]);

  // Physical Education (PE) Days Detection ("اليوم الذي يحتوي بدنية")
  const peDayIds = useMemo(() => {
    const set = new Set<number>();
    slots.forEach((s) => {
      const name = (s.subjectName || "").toLowerCase().trim();
      if (
        name.includes("بدنية") ||
        name.includes("رياضة") ||
        name.includes("لياقة") ||
        name.includes("رياضيه") ||
        name.includes("رياضية") ||
        name.includes("pe") ||
        name.includes("sport") ||
        name.includes("بدنيه")
      ) {
        set.add(s.dayOfWeek);
      }
    });
    return set;
  }, [slots]);

  // ── 1. Direct Browser Print ──
  const handlePrint = () => {
    window.print();
  };

  // ── 2. Export High Quality PDF (A4 Landscape) ──
  const handleExportPDF = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExportingPDF(true);
      toast({
        title: "جاري إنشاء ملف PDF...",
        description: "يتم تحضير ملف PDF بتنسيق A4 عرضي عالي الدقة والخطوط الأصلية.",
      });

      // Ensure all Arabic webfonts are completely loaded and rendered
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));

      const element = printAreaRef.current;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const printable = clonedDoc.getElementById("schedule-a4-printable-paper");
          if (printable) {
            printable.style.fontFamily = "'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', -apple-system, sans-serif";
          }
        },
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 297;
      const pdfHeight = 210;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      pdf.save(`الجدول_الدراسي_${schoolName.replace(/\s+/g, "_")}.pdf`);

      toast({
        title: "تم تصدير ملف PDF بنجاح",
        description: "تم تحميل جدول الحصص بحجم A4 عرضي جاهز للطباعة وبأعلى جودة خطوط.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "فشل التصدير",
        description: "حدث خطأ أثناء إنشاء ملف PDF، يرجى المحاولة عبر زر الطباعة المباشرة.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // ── 3. SVG Wallpaper String Generator (16:9 Standard 1920x1080 Scaled Canvas) ──
  const generateWallpaperSVG = useMemo(() => {
    // Theme palette definitions with calming, harmonious base backgrounds
    const themes = {
      light: {
        id: "light",
        name: "ألباستر دافئ ناعم (الافتراضي الراقي)",
        bg1: "#fbfaf8",
        bg2: "#f3ede4",
        ambientGlow: "#fcefe3",
        glassBg: "#ffffff",
        cardBg: "#ffffff",
        cellBg: "#f8fafc",
        border: "#e2e8f0",
        borderSubtle: "#f1f5f9",
        accent: "#2563eb",
        glow: "#f8ede0",
        highlight: "#1d4ed8",
        textPrimary: "#0f172a",
        textMuted: "#64748b",
        dayBg: "#f8fafc",
        gold: "#b45309",
      },
      softSlate: {
        id: "softSlate",
        name: "رمادي سحابي عصري (Modern Cloud Slate)",
        bg1: "#f8fafc",
        bg2: "#e8eff7",
        ambientGlow: "#e0f2fe",
        glassBg: "#ffffff",
        cardBg: "#ffffff",
        cellBg: "#f8fafc",
        border: "#cbd5e1",
        borderSubtle: "#f1f5f9",
        accent: "#0ea5e9",
        glow: "#e0f2fe",
        highlight: "#0284c7",
        textPrimary: "#0f172a",
        textMuted: "#475569",
        dayBg: "#f1f5f9",
        gold: "#d97706",
      },
      sage: {
        id: "sage",
        name: "مريمية خضراء هادئة (Calm Sage)",
        bg1: "#f4f7f4",
        bg2: "#e5ece6",
        ambientGlow: "#ecfdf5",
        glassBg: "#ffffff",
        cardBg: "#ffffff",
        cellBg: "#f7faf7",
        border: "#d1ded3",
        borderSubtle: "#eef4ef",
        accent: "#10b981",
        glow: "#ecfdf5",
        highlight: "#059669",
        textPrimary: "#064e3b",
        textMuted: "#475569",
        dayBg: "#f0f7f2",
        gold: "#d97706",
      },
      arctic: {
        id: "arctic",
        name: "أزرق ثلجي نقي (Arctic Blue)",
        bg1: "#f0f6ff",
        bg2: "#e0edf8",
        ambientGlow: "#e0f2fe",
        glassBg: "#ffffff",
        cardBg: "#ffffff",
        cellBg: "#f6faff",
        border: "#cfe0f3",
        borderSubtle: "#e9f2fb",
        accent: "#0284c7",
        glow: "#e0f2fe",
        highlight: "#0369a1",
        textPrimary: "#0c4a6e",
        textMuted: "#475569",
        dayBg: "#edf5fd",
        gold: "#b45309",
      },
      softLight: {
        id: "softLight",
        name: "بيج مكتبي مريح (Warm Beige)",
        bg1: "#fffdf9",
        bg2: "#f5eee2",
        ambientGlow: "#fef3c7",
        glassBg: "#ffffff",
        cardBg: "#ffffff",
        cellBg: "#fdfbf7",
        border: "#ede4d4",
        borderSubtle: "#f7f1e6",
        accent: "#3b82f6",
        glow: "#eff6ff",
        highlight: "#1d4ed8",
        textPrimary: "#1e293b",
        textMuted: "#64748b",
        dayBg: "#fef9ee",
        gold: "#b45309",
      },
      marukoChalkboard: {
        id: "marukoChalkboard",
        name: "كحلي هادئ مريح للعين (Deep Soothing Navy)",
        bg1: "#0b132b",
        bg2: "#1c2541",
        ambientGlow: "#1e3a8a",
        glassBg: "#111c38",
        cardBg: "#162347",
        cellBg: "#111c3a",
        border: "#253763",
        borderSubtle: "#172447",
        accent: "#38bdf8",
        glow: "#1e3a8a",
        highlight: "#60a5fa",
        textPrimary: "#f8fafc",
        textMuted: "#94a3b8",
        dayBg: "#152244",
        gold: "#fbbf24",
      },
      midnight: {
        id: "midnight",
        name: "منتصف الليل (Midnight Slate)",
        bg1: "#060913",
        bg2: "#0c152e",
        ambientGlow: "#1d4ed8",
        glassBg: "#0f172a",
        cardBg: "#1e293b",
        cellBg: "#15203b",
        border: "#334155",
        borderSubtle: "#1e293b",
        accent: "#38bdf8",
        glow: "#1d4ed8",
        highlight: "#60a5fa",
        textPrimary: "#f8fafc",
        textMuted: "#94a3b8",
        dayBg: "#182647",
        gold: "#fbbf24",
      },
      slate: {
        id: "slate",
        name: "الفحمي الحديث (Cyber Slate)",
        bg1: "#080c14",
        bg2: "#111827",
        ambientGlow: "#4338ca",
        glassBg: "#172033",
        cardBg: "#1f293d",
        cellBg: "#182236",
        border: "#374151",
        borderSubtle: "#1f2937",
        accent: "#818cf8",
        glow: "#4338ca",
        highlight: "#a5b4fc",
        textPrimary: "#f3f4f6",
        textMuted: "#9ca3af",
        dayBg: "#1e2b45",
        gold: "#f59e0b",
      },
      amoled: {
        id: "amoled",
        name: "سواد نقي (AMOLED Black)",
        bg1: "#000000",
        bg2: "#0a0a0a",
        ambientGlow: "#2563eb",
        glassBg: "#0d0d0d",
        cardBg: "#161616",
        cellBg: "#121212",
        border: "#262626",
        borderSubtle: "#171717",
        accent: "#38bdf8",
        glow: "#2563eb",
        highlight: "#60a5fa",
        textPrimary: "#ffffff",
        textMuted: "#a3a3a3",
        dayBg: "#1a1a1a",
        gold: "#fbbf24",
      },
      emerald: {
        id: "emerald",
        name: "الزمردي الداكن (Deep Emerald)",
        bg1: "#02120e",
        bg2: "#07261f",
        ambientGlow: "#059669",
        glassBg: "#0a3027",
        cardBg: "#0e3d32",
        cellBg: "#0a3329",
        border: "#134e40",
        borderSubtle: "#0a352a",
        accent: "#34d399",
        glow: "#059669",
        highlight: "#6ee7b7",
        textPrimary: "#f0fdf4",
        textMuted: "#a7f3d0",
        dayBg: "#0f473a",
        gold: "#fbbf24",
      },
    };

    const t = themes[wallpaperTheme as keyof typeof themes] || themes.light;
    const isLightCanvas = ['light', 'softSlate', 'sage', 'arctic', 'softLight'].includes(wallpaperTheme);

    // 16:9 Canvas Dimensions: 1920 (W) x 1080 (H)
    const isTableLeft = tablePosition === "left";
    
    // Table Width ("أقل انضغاطاً وأكثر اتساعاً")
    const tableW = tableWidthMode === "ultraSpacious" ? 1420 : tableWidthMode === "spacious" ? 1360 : 1280;
    const tableH = 850;
    const tableY = 105;

    // Top Banner height and position directly above the table
    const bannerH = topBannerHeight === "compact" ? 64 : topBannerHeight === "tall" ? 84 : 74;
    const bannerY = Math.max(14, tableY - bannerH - 12);

    // Shift table comfortably to the right for RTL flow
    let tableX = 460;
    if (isTableLeft) {
      tableX = 80;
    } else {
      if (tableRightShift === "maxRight") {
        tableX = 500;
      } else if (tableRightShift === "standardRight") {
        tableX = 460;
      } else {
        tableX = 400;
      }
    }

    const daysCount = DAYS_ORDER.length;
    const tableHeaderHeight = 80;
    const periodsHeaderHeight = 44;
    const footerHeight = 32;
    const gridY = tableY + tableHeaderHeight + periodsHeaderHeight + 16;
    const availableGridH = tableH - (tableHeaderHeight + periodsHeaderHeight + footerHeight + 30);
    const rowHeight = availableGridH / daysCount;

    // Inside the table, it is 100% RTL (Right-to-Left):
    // Rightmost column = Day Name (الأحد، الاثنين...)
    // Then going LEFT with generous gaps: Period 1, Period 2, Period 3, (Break Column), Period 4...
    const paddingInside = 22;
    const usableTableW = tableW - (paddingInside * 2);
    const dayColWidth = 120;
    const breakColWidth = hasBreak ? 64 : 0;
    const colGap = 12; // Generous 12px horizontal gap between boxes
    const totalGaps = (displayCount * colGap) + (hasBreak ? colGap : 0);
    const periodsTotalW = usableTableW - dayColWidth - breakColWidth - totalGaps;
    const periodColWidth = Math.floor(periodsTotalW / displayCount);

    // Start from inner right
    const innerRightX = tableX + tableW - paddingInside;
    const dayColX = innerRightX - dayColWidth;

    // Compute period X coordinates from RIGHT to LEFT with spacious gaps
    const periodPositions: { period: number; x: number; w: number; isBreakBefore: boolean; breakX?: number }[] = [];
    let curX = dayColX;

    for (let idx = 0; idx < PERIODS.length; idx++) {
      const p = PERIODS[idx];
      let isBreakBefore = false;
      let breakX: number | undefined;

      // If previous period was breakAfterPeriod, insert break column before current period
      if (idx > 0 && PERIODS[idx - 1] === breakAfterPeriod && hasBreak) {
        curX -= colGap; // gap
        curX -= breakColWidth;
        isBreakBefore = true;
        breakX = curX;
      }

      curX -= colGap; // gap
      curX -= periodColWidth;
      periodPositions.push({
        period: p,
        x: curX,
        w: periodColWidth,
        isBreakBefore,
        breakX,
      });
    }

    // Top Periods Header (RTL) with smooth rounded corners
    const periodsHeadersSvg = periodPositions.map((pos, idx) => {
      const pTime = periodTimes[idx];
      let breakSvg = "";

      if (pos.isBreakBefore && pos.breakX !== undefined) {
        breakSvg = `
          <g>
            <!-- Break column header -->
            <rect x="${pos.breakX}" y="${tableY + tableHeaderHeight + 8}" width="${breakColWidth}" height="${periodsHeaderHeight}" rx="16" fill="#f59e0b" fill-opacity="0.12" stroke="#f59e0b" stroke-opacity="0.25" stroke-width="1"/>
            <g transform="translate(${pos.breakX + breakColWidth / 2 - 8}, ${tableY + tableHeaderHeight + 14}) scale(0.85)">
              <path d="M2 6 h14 v5 a4 4 0 0 1-4 4 h-6 a4 4 0 0 1-4-4 v-5 z" fill="#d97706" fill-opacity="0.95"/>
              <path d="M16 8 h2 a2 2 0 0 1 2 2 v0.5 a2 2 0 0 1-2 2 h-2" stroke="#d97706" stroke-width="1.6" fill="none" stroke-linecap="round"/>
              <path d="M0 17 h18" stroke="#d97706" stroke-width="1.6" stroke-linecap="round"/>
            </g>
            <text x="${pos.breakX + breakColWidth / 2}" y="${tableY + tableHeaderHeight + 39}" fill="#d97706" font-size="13" font-weight="900" text-anchor="middle">فسحة</text>
            
            <!-- Break column body extending down all days -->
            <rect x="${pos.breakX}" y="${gridY}" width="${breakColWidth}" height="${availableGridH}" rx="16" fill="#f59e0b" fill-opacity="0.06" stroke="#f59e0b" stroke-opacity="0.2" stroke-width="1"/>
            <g transform="translate(${pos.breakX + breakColWidth / 2}, ${gridY + availableGridH / 2}) rotate(-90)">
              <text x="0" y="4" fill="#d97706" font-size="14" font-weight="800" text-anchor="middle">فسحة (${escapeXml(breakDuration)} د)</text>
            </g>
          </g>
        `;
      }

      const s12 = pTime ? formatTime12h(pTime.start) : "";
      const e12 = pTime ? formatTime12h(pTime.end) : "";
      const timeText = pTime ? `من ${s12} إلى ${e12}` : "";

      const periodFontSize = Number(((16.5 * generalFontScale) / 100).toFixed(1));
      const timeFontSize = Number(((11.5 * generalFontScale) / 100).toFixed(1));

      return `
        ${breakSvg}
        <g>
          <rect x="${pos.x}" y="${tableY + tableHeaderHeight + 8}" width="${pos.w}" height="${periodsHeaderHeight}" rx="16" fill="${t.cardBg}" fill-opacity="0.95" stroke="${t.border}" stroke-width="1.2"/>
          <text x="${pos.x + pos.w / 2}" y="${tableY + tableHeaderHeight + 25}" fill="${t.textPrimary}" font-size="${periodFontSize}" font-weight="900" text-anchor="middle">الحصة ${escapeXml(pos.period)}</text>
          <text x="${pos.x + pos.w / 2}" y="${tableY + tableHeaderHeight + 42}" fill="${t.textMuted}" font-size="${timeFontSize}" font-weight="700" text-anchor="middle" direction="rtl">${escapeXml(timeText)}</text>
        </g>
      `;
    }).join("");

    // Days Rows & Subject Slot Cards (RTL) - 6px top and bottom padding provides 12px vertical spacing between cards
    const cardPaddingY = 6;
    const cardH = Math.floor(rowHeight - (cardPaddingY * 2));

    const selectedPeStyle = PE_HIGHLIGHT_STYLES[peHighlightStyle] || PE_HIGHLIGHT_STYLES.athleticLime;

    const daysRowsSvg = DAYS_ORDER.map((day, dIdx) => {
      const rowY = Math.floor(gridY + (dIdx * rowHeight) + cardPaddingY);
      const isPEDay = highlightPEDay && peDayIds.has(day.id);

      const slotsSvg = periodPositions.map((pos) => {
        const slot = slots.find((s) => s.dayOfWeek === day.id && s.periodNumber === pos.period);

        if (!slot) {
          return `
            <g>
              <rect x="${pos.x}" y="${rowY}" width="${pos.w}" height="${cardH}" rx="20" fill="${t.cellBg}" fill-opacity="0.3" stroke="${t.borderSubtle}" stroke-width="1" stroke-dasharray="4,4"/>
            </g>
          `;
        }

        const deco = getSubjectDecoration(slot.subjectName, slot.subjectColor);
        const rawColor = slot.subjectColor || deco.baseColor;
        const teacherName = showTeachers && slot.teacherName ? shortenTeacherName(slot.teacherName, teacherNameMode) : "";
        const roomName = showRooms && slot.room ? slot.room : "";

        // Enlarge font sizing to fill cell space prominently, boldly and cleanly with user scaling
        const subName = slot.subjectName.trim();
        let baseSubFontSize = 24;
        if (subName.length > 22) baseSubFontSize = 16.5;
        else if (subName.length > 16) baseSubFontSize = 19;
        else if (subName.length > 11) baseSubFontSize = 21.5;
        else if (subName.length > 7) baseSubFontSize = 23;

        const subFontSize = Number(((baseSubFontSize * subjectFontScale) / 100).toFixed(1));
        const teacherFontSize = Number(((15 * generalFontScale) / 100).toFixed(1));
        const roomFontSize = Number(((13 * generalFontScale) / 100).toFixed(1));

        const roomTagW = Math.min(pos.w - 16, 105);
        const roomTagX = pos.x + (pos.w - roomTagW) / 2;

        // Balanced vertical positions with room tag lifted higher
        let subjectY = rowY + cardH / 2 + 10;
        let teacherY = 0;
        let roomTagY = 0;

        if (teacherName && roomName) {
          subjectY = rowY + cardH * 0.35;
          teacherY = rowY + cardH * 0.58;
          roomTagY = rowY + cardH * 0.71;
        } else if (teacherName) {
          subjectY = rowY + cardH * 0.38;
          teacherY = rowY + cardH * 0.70;
        } else if (roomName) {
          subjectY = rowY + cardH * 0.38;
          roomTagY = rowY + cardH * 0.65;
        }

        const clipId = `cell-clip-${day.id}-${pos.period}`;

        return `
          <g>
            <defs>
              <clipPath id="${clipId}">
                <rect x="${pos.x}" y="${rowY}" width="${pos.w}" height="${cardH}" rx="20" />
              </clipPath>
            </defs>

            <!-- 1. Subject Cell Background with Calm Aesthetics & Ultra-Smooth Rounded Corners (rx=20) -->
            ${isLightCanvas ? `
              <rect x="${pos.x}" y="${rowY}" width="${pos.w}" height="${cardH}" rx="20" fill="${deco.lightBg || '#f8fafc'}" fill-opacity="${subjectColorContrast === 'highContrast' ? '0.92' : subjectColorContrast === 'vivid' ? '0.8' : '0.55'}" stroke="${rawColor}" stroke-opacity="0.35" stroke-width="1.3" />
            ` : `
              <rect x="${pos.x}" y="${rowY}" width="${pos.w}" height="${cardH}" rx="20" fill="${t.cellBg}" stroke="${rawColor}" stroke-opacity="0.45" stroke-width="1.3" />
              <rect x="${pos.x}" y="${rowY}" width="${pos.w}" height="${cardH}" rx="20" fill="${rawColor}" fill-opacity="0.14" />
            `}

            <!-- Subtle top accent pill for color distinction -->
            <rect x="${pos.x + pos.w / 2 - 32}" y="${rowY + 7}" width="64" height="4.5" rx="2.25" fill="${rawColor}" fill-opacity="${isLightCanvas ? '0.75' : '0.9'}"/>

            <!-- Themed Subject Vector Background Texture (Clipped strictly within cell rx=20, enlarged & placed downwards) -->
            <g clip-path="url(#${clipId})">
              <g transform="translate(${pos.x - 2}, ${rowY + cardH - 48}) scale(2.45) rotate(20 16 16)" opacity="${isLightCanvas ? '0.14' : '0.24'}" pointer-events="none">
                ${deco.getSideOrnamentSvg(rawColor)}
              </g>
            </g>

            <!-- Subject Name Large & Prominent (lowered vertically for relaxed balance with dynamic custom font) -->
            <text x="${pos.x + pos.w / 2}" y="${subjectY}" fill="${isLightCanvas ? '#020617' : '#ffffff'}" font-size="${subFontSize}" font-weight="900" font-family="${activeSubjectFontFamily}" text-anchor="middle">${escapeXml(subName)}</text>
            
            <!-- Teacher Info Badge -->
            ${teacherName ? `
              <g>
                <text x="${pos.x + pos.w / 2}" y="${teacherY}" fill="${isLightCanvas ? '#475569' : '#94a3b8'}" font-size="${teacherFontSize}" font-weight="700" text-anchor="middle">${escapeXml(teacherName)}</text>
              </g>
            ` : ""}
            
            <!-- Room Info Tag (Minimal, subtle rounded badge) -->
            ${roomName ? `
              <g>
                <rect x="${roomTagX}" y="${roomTagY}" width="${roomTagW}" height="24" rx="8" fill="${isLightCanvas ? '#ffffff' : t.cellBg}" fill-opacity="0.95" stroke="${rawColor}" stroke-width="1" stroke-opacity="0.3"/>
                <text x="${pos.x + pos.w / 2}" y="${roomTagY + 16.5}" fill="${isLightCanvas ? '#334155' : '#cbd5e1'}" font-size="${roomFontSize}" font-weight="800" text-anchor="middle">${escapeXml(roomName)}</text>
              </g>
            ` : ""}
          </g>
        `;
      }).join("");

      const dayFontSize = Number(((21 * generalFontScale) / 100).toFixed(1));

      return `
        <g>
          <!-- RTL Day Name Column (On the Far Right of the Table) with Smooth Corners rx="20" -->
          <g>
            ${isPEDay ? `
              <!-- Distinct Athletic Highlight for Physical Education Day without any text badges -->
              ${isLightCanvas ? `
                <rect x="${dayColX}" y="${rowY}" width="${dayColWidth}" height="${cardH}" rx="20" fill="${selectedPeStyle.lightBg}" stroke="${selectedPeStyle.lightBorder}" stroke-width="2"/>
                <!-- Athletic Side Accent Ribbon (placed comfortably inside, away from the outer edge) -->
                <line x1="${dayColX + dayColWidth - 12}" y1="${rowY + 16}" x2="${dayColX + dayColWidth - 12}" y2="${rowY + cardH - 16}" stroke="${selectedPeStyle.accentColor}" stroke-width="4.5" stroke-linecap="round"/>
                <text x="${dayColX + (dayColWidth - 8) / 2}" y="${rowY + cardH / 2 + 7.5}" fill="${selectedPeStyle.lightText}" font-size="${dayFontSize}" font-weight="900" text-anchor="middle">${escapeXml(day.name)}</text>
              ` : `
                <rect x="${dayColX}" y="${rowY}" width="${dayColWidth}" height="${cardH}" rx="20" fill="${selectedPeStyle.darkBg}" stroke="${selectedPeStyle.darkBorder}" stroke-width="2"/>
                <!-- Athletic Side Accent Ribbon (placed comfortably inside, away from the outer edge) -->
                <line x1="${dayColX + dayColWidth - 12}" y1="${rowY + 16}" x2="${dayColX + dayColWidth - 12}" y2="${rowY + cardH - 16}" stroke="${selectedPeStyle.darkBorder}" stroke-width="4.5" stroke-linecap="round"/>
                <text x="${dayColX + (dayColWidth - 8) / 2}" y="${rowY + cardH / 2 + 7.5}" fill="${selectedPeStyle.darkText}" font-size="${dayFontSize}" font-weight="900" text-anchor="middle">${escapeXml(day.name)}</text>
              `}
            ` : `
              <!-- Standard Day Card -->
              <rect x="${dayColX}" y="${rowY}" width="${dayColWidth}" height="${cardH}" rx="20" fill="${t.dayBg}" stroke="${t.border}" stroke-width="1.2"/>
              <!-- Subtle Accent Ribbon on Day Card (placed comfortably inside, away from the outer edge) -->
              <line x1="${dayColX + dayColWidth - 12}" y1="${rowY + 16}" x2="${dayColX + dayColWidth - 12}" y2="${rowY + cardH - 16}" stroke="${t.accent}" stroke-width="3.5" stroke-linecap="round"/>
              <text x="${dayColX + (dayColWidth - 8) / 2}" y="${rowY + cardH / 2 + 7.5}" fill="${t.textPrimary}" font-size="${dayFontSize}" font-weight="900" text-anchor="middle">${escapeXml(day.name)}</text>
            `}
          </g>
          <!-- RTL Period Slots for this day -->
          ${slotsSvg}
        </g>
      `;
    }).join("");

    return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" overflow="hidden">
  <defs>
    <!-- Embed Web Fonts and Custom Uploaded Fonts directly in SVG inside CDATA -->
    <style type="text/css"><![CDATA[
      ${generateSvgFontDefinitions(customFonts)}

      * {
        font-family: ${activeGeneralFontFamily};
      }
      text {
        font-family: ${activeGeneralFontFamily};
        -webkit-font-smoothing: antialiased;
      }
      .mono-num {
        font-family: 'IBM Plex Sans', monospace, sans-serif;
      }
    ]]></style>

    <!-- Master 16:9 Canvas Clip to ensure zero out-of-bounds bleed -->
    <clipPath id="canvasMasterClip">
      <rect x="0" y="0" width="1920" height="1080" />
    </clipPath>

    <!-- Harmonious Base Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.bg1}" />
      <stop offset="100%" stop-color="${t.bg2}" />
    </linearGradient>

    <!-- Light Theme Bounded Ambient Radiance (Strictly contained in 16:9 frame) -->
    <radialGradient id="lightAmbientTopLeft" cx="15%" cy="20%" r="50%">
      <stop offset="0%" stop-color="${t.ambientGlow}" stop-opacity="0.5" />
      <stop offset="100%" stop-color="${t.bg1}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="lightAmbientBottomRight" cx="85%" cy="80%" r="50%">
      <stop offset="0%" stop-color="${t.ambientGlow}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${t.bg1}" stop-opacity="0" />
    </radialGradient>
    
    <radialGradient id="glowTopRight" cx="85%" cy="20%" r="50%">
      <stop offset="0%" stop-color="${t.glow}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${t.bg1}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowBottomLeft" cx="15%" cy="85%" r="50%">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${t.bg1}" stop-opacity="0" />
    </radialGradient>

    <!-- Subtle Geometric Dot Grid for High-End Workspace Look -->
    <pattern id="desktopDots" width="36" height="36" patternUnits="userSpaceOnUse">
      <circle cx="18" cy="18" r="1.1" fill="${t.border}" fill-opacity="0.4"/>
    </pattern>

    <!-- Refined Multi-Layer Drop Shadow -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000000" flood-opacity="${isLightCanvas ? '0.06' : '0.5'}" />
    </filter>
  </defs>

  <!-- 1. 16:9 Canvas Backdrop (Strictly clipped to 1920x1080) -->
  <g clip-path="url(#canvasMasterClip)">
    ${isLightCanvas ? `
      <rect width="1920" height="1080" fill="url(#bgGrad)" />
      <rect width="1920" height="1080" fill="url(#lightAmbientTopLeft)" />
      <rect width="1920" height="1080" fill="url(#lightAmbientBottomRight)" />
      <rect width="1920" height="1080" fill="url(#desktopDots)" opacity="0.3" />
    ` : `
      <rect width="1920" height="1080" fill="url(#bgGrad)" />
      <rect width="1920" height="1080" fill="url(#glowTopRight)" />
      <rect width="1920" height="1080" fill="url(#glowBottomLeft)" />
      <rect width="1920" height="1080" fill="url(#desktopDots)" opacity="0.35" />
    `}

    <!-- ── 1. BACKGROUND IMAGE (صورة خلف الجدول - خلفية الشاشة 16:9) ── -->
    ${bgBehindImage ? `
      <image
        href="${escapeXml(bgBehindImage)}"
        xlink:href="${escapeXml(bgBehindImage)}"
        width="1920"
        height="1080"
        x="0"
        y="0"
        preserveAspectRatio="${bgBehindFitMode === 'cover' ? 'xMidYMid slice' : 'none'}"
        opacity="${bgBehindOpacity / 100}"
      />
    ` : ""}
  </g>

  <!-- ── 1.5 TOP BANNER IMAGE (شريط الترويسة العلوية فوق الجدول مباشرة) ── -->
  ${topBannerImage && showTopBannerInWallpaper ? `
    <g filter="url(#cardShadow)">
      <defs>
        <clipPath id="wallpaperTopBannerClip">
          <rect x="${tableX}" y="${bannerY}" width="${tableW}" height="${bannerH}" rx="18" />
        </clipPath>
      </defs>
      <rect x="${tableX}" y="${bannerY}" width="${tableW}" height="${bannerH}" rx="18" fill="${t.glassBg}" fill-opacity="0.96" stroke="${t.border}" stroke-width="1.5" />
      <image href="${escapeXml(topBannerImage)}" xlink:href="${escapeXml(topBannerImage)}" x="${tableX}" y="${bannerY}" width="${tableW}" height="${bannerH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#wallpaperTopBannerClip)" />
      <rect x="${tableX}" y="${bannerY}" width="${tableW}" height="${bannerH}" rx="18" fill="none" stroke="${t.border}" stroke-width="1.5" stroke-opacity="0.6" />
    </g>
  ` : ""}

  <!-- ── 2. SCHEDULE TABLE (RTL FROM RIGHT TO LEFT) ── -->
  <g filter="url(#cardShadow)">
    <!-- Outer Card with Ultra-Smooth Rounded Corners rx="30" -->
    <rect x="${tableX}" y="${tableY}" width="${tableW}" height="${tableH}" rx="30" fill="${t.glassBg}" fill-opacity="${bgBehindImage ? (tableOpacity === 'solid' ? '0.96' : tableOpacity === 'glass' ? '0.82' : tableOpacity === 'transparent' ? '0.04' : '0.82') : (isLightCanvas ? '0.98' : '0.94')}" stroke="${bgBehindImage && tableOpacity === 'transparent' ? 'none' : t.border}" stroke-width="1.6" />
    
    <!-- Table Top School Header (RTL: School Brand on Right, Quick Specs on Left) -->
    <!-- School Logo Vector Crest -->
    <rect x="${tableX + tableW - paddingInside - 52}" y="${tableY + 16}" width="52" height="52" rx="16" fill="${t.accent}" fill-opacity="0.12" stroke="${t.accent}" stroke-opacity="0.3" stroke-width="1.2"/>
    <path d="M14 4L2 10.5l12 6.5 10-5.4V19h2V10.5L14 4z M6 15v4.5L14 24l8-4.5V15l-8 4.5L6 15z" fill="${t.accent}" transform="translate(${tableX + tableW - paddingInside - 40}, ${tableY + 28}) scale(0.9)"/>

    <!-- School & Class Title (Right-Anchored, extending leftwards safely) -->
    <text x="${tableX + tableW - paddingInside - 64}" y="${tableY + 38}" fill="${t.textPrimary}" font-size="${(21 * generalFontScale / 100).toFixed(1)}" font-weight="800" text-anchor="end">${escapeXml(schoolName)}</text>
    <text x="${tableX + tableW - paddingInside - 64}" y="${tableY + 58}" fill="${t.textMuted}" font-size="${(13 * generalFontScale / 100).toFixed(1)}" font-weight="600" text-anchor="end">الجدول المدرسي الأسبوعي • ${escapeXml(className)} • ${escapeXml(academicTerm)}</text>

    <!-- Timing & Details Badge (Left-Aligned in Table Header) -->
    <rect x="${tableX + paddingInside}" y="${tableY + 20}" width="240" height="38" rx="13" fill="${t.cardBg}" stroke="${t.border}" stroke-width="1.2"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="${t.highlight}" transform="translate(${tableX + paddingInside + 12}, ${tableY + 30}) scale(0.8)"/>
    <text x="${tableX + paddingInside + 130}" y="${tableY + 44}" fill="${t.highlight}" font-size="12" font-weight="700" text-anchor="middle">بداية اليوم: ${escapeXml(startTime)} | ${escapeXml(periodsCount)} حصص</text>

    <!-- Header Divider Line -->
    <line x1="${tableX + paddingInside}" y1="${tableY + tableHeaderHeight}" x2="${tableX + tableW - paddingInside}" y2="${tableY + tableHeaderHeight}" stroke="${t.border}" stroke-width="1.2" stroke-opacity="0.6"/>

    <!-- RTL Days Column Header (On the Right) with smooth rx="16" -->
    <rect x="${dayColX}" y="${tableY + tableHeaderHeight + 8}" width="${dayColWidth}" height="${periodsHeaderHeight}" rx="16" fill="${t.dayBg}" stroke="${t.border}" stroke-width="1.2"/>
    <text x="${dayColX + dayColWidth / 2}" y="${tableY + tableHeaderHeight + 35}" fill="${t.textPrimary}" font-size="14" font-weight="800" text-anchor="middle">اليوم / الحصة</text>

    <!-- RTL Periods Headers (From Right to Left) -->
    ${periodsHeadersSvg}

    <!-- RTL Days Rows & Subject Slots -->
    ${daysRowsSvg}

    <!-- Table Bottom Footer -->
    <text x="${tableX + tableW - paddingInside}" y="${tableY + tableH - 16}" fill="${t.textMuted}" font-size="${(11.5 * generalFontScale / 100).toFixed(1)}" font-weight="600" text-anchor="end">${escapeXml(schoolName)} — جدول الحصص الأسبوعي</text>
    <text x="${tableX + paddingInside}" y="${tableY + tableH - 16}" fill="${t.textMuted}" font-size="${(11 * generalFontScale / 100).toFixed(1)}" font-weight="500">${escapeXml(academicTerm)}</text>
  </g>

  <!-- ── 3. OVERLAY IMAGE (صورة فوق الجدول - طبقة التغطية 16:9) ── -->
  ${overlayAboveImage ? `
    <g pointer-events="none">
      <image
        href="${escapeXml(overlayAboveImage)}"
        xlink:href="${escapeXml(overlayAboveImage)}"
        width="1920"
        height="1080"
        x="0"
        y="0"
        preserveAspectRatio="${overlayAboveFitMode === 'cover' ? 'xMidYMid slice' : 'none'}"
        opacity="${overlayAboveOpacity / 100}"
      />
    </g>
  ` : ""}
</svg>
    `.trim();
  }, [
    wallpaperTheme,
    tablePosition,
    tableRightShift,
    tableWidthMode,
    highlightPEDay,
    peHighlightStyle,
    subjectColorContrast,
    peDayIds,
    schoolName,
    className,
    academicTerm,
    slots,
    displayCount,
    PERIODS,
    hasBreak,
    breakAfterPeriod,
    breakDuration,
    periodTimes,
    showTeachers,
    showRooms,
    teacherNameMode,
    startTime,
    periodsCount,
    showDesktopGridZone,
    desktopCustomNote,
    bottomCardTitle,
    bottomCardLine1,
    bottomCardLine2,
    bgBehindImage,
    bgBehindOpacity,
    bgBehindFitMode,
    overlayAboveImage,
    overlayAboveOpacity,
    overlayAboveFitMode,
    topBannerImage,
    showTopBannerInWallpaper,
    topBannerHeight,
    tableOpacity,
    showVectorMotifsWithCustomBg,
    customFonts,
    activeGeneralFontFamily,
    activeSubjectFontFamily,
    subjectFontScale,
    generalFontScale,
  ]);

  // ── 4. Download SVG Vector File ──
  const handleDownloadSVG = () => {
    try {
      const blob = new Blob([generateWallpaperSVG], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `جدول_${schoolName.replace(/\s+/g, "_")}_خلفية_16_9_فيكتور.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "تم تحميل ملف SVG بنجاح (16:9 لشاشات 75 بوصة)",
        description: "الصورة بصيغة فيكتور نقية فائقة الوضوح مناسبة كخلفية للشاشات الذكية بمقاس 16:9.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "خطأ في التحميل",
        description: "تعذر إنشاء ملف SVG، يرجى المحاولة لاحقاً.",
        variant: "destructive",
      });
    }
  };

  // ── 5. Render SVG to 16:9 PNG (1080p / 1440p / 4K) & Download ──
  const handleDownloadPNG = async () => {
    try {
      setIsExportingImage(true);

      const targetWidth = wallpaperResolution === "4k" ? 3840 : wallpaperResolution === "1440p" ? 2560 : 1920;
      const targetHeight = wallpaperResolution === "4k" ? 2160 : wallpaperResolution === "1440p" ? 1440 : 1080;

      toast({
        title: `جاري إنشاء صورة 16:9 بدقة ${targetWidth}×${targetHeight}...`,
        description: "يتم تصيير الرسم إلى صورة فائقة النقاء مع الاحتفاظ الكامل بجودة الخطوط الأصلية.",
      });

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      const svgBlob = new Blob([generateWallpaperSVG], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      if (!bgBehindImage && !overlayAboveImage) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          canvas.toBlob((blob) => {
            if (blob) {
              const pngUrl = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = pngUrl;
              link.download = `جدول_${schoolName.replace(/\s+/g, "_")}_خلفية_16_9_${wallpaperResolution}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(pngUrl);

              toast({
                title: `تم تحميل صورة 16:9 بنجاح (${wallpaperResolution.toUpperCase()})`,
                description: "يمكنك الآن تعيينها كخلفية لسطح المكتب أو الشاشة الذكية 75 بوصة.",
              });
            }
            setIsExportingImage(false);
            URL.revokeObjectURL(url);
          }, "image/png");
        } else {
          setIsExportingImage(false);
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        setIsExportingImage(false);
        URL.revokeObjectURL(url);
        toast({
          title: "فشل التحويل إلى PNG",
          description: "يرجى تجربة تحميل ملف SVG أو إعادة المحاولة.",
          variant: "destructive",
        });
      };
      img.src = url;
    } catch (err) {
      console.error(err);
      setIsExportingImage(false);
    }
  };

  // ── 6. Export Wallpaper as PDF ──
  const handleExportWallpaperPDF = async () => {
    try {
      setIsExportingWallpaperPDF(true);
      const targetWidth = wallpaperResolution === "4k" ? 3840 : wallpaperResolution === "1440p" ? 2560 : 1920;
      const targetHeight = wallpaperResolution === "4k" ? 2160 : wallpaperResolution === "1440p" ? 1440 : 1080;

      toast({
        title: `جاري إنشاء ملف خلفية PDF (${wallpaperResolution.toUpperCase()})...`,
        description: "يتم تحضير ملف PDF عالي الدقة بمقاس 16:9 بالخطوط العربية الأصلية.",
      });

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      const svgBlob = new Blob([generateWallpaperSVG], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      if (!bgBehindImage && !overlayAboveImage) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const imgData = canvas.toDataURL("image/png", 1.0);

          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [297, 167.06],
          });

          pdf.addImage(imgData, "PNG", 0, 0, 297, 167.06, undefined, "FAST");
          pdf.save(`خلفية_جدول_${schoolName.replace(/\s+/g, "_")}_${wallpaperResolution}.pdf`);

          toast({
            title: `تم تصدير خلفية PDF بنجاح (${wallpaperResolution.toUpperCase()})`,
            description: "تم تحميل ملف PDF للخلفية بنجاح وبأعلى جودة.",
          });
        }
        setIsExportingWallpaperPDF(false);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        setIsExportingWallpaperPDF(false);
        URL.revokeObjectURL(url);
        toast({
          title: "فشل تصدير PDF",
          description: "تعذر إنشاء ملف PDF للخلفية، يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
      };
      img.src = url;
    } catch (err) {
      console.error(err);
      setIsExportingWallpaperPDF(false);
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع أثناء تصدير PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-3xl" dir="rtl">
          <DialogHeader className="pb-3 border-b border-border/60 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {activeTab === "wallpaper" ? <Monitor className="h-5 w-5 text-indigo-500" /> : <Printer className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-black">طباعة وتصدير الجدول الدراسي</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    تنسيقين مخصصين: شيت طباعة رسمي A4 عرضي، وخلفية شاشة ذكية داكنة بنسبة 16:9 مخصصة لويندوز والشاشات الكبيرة (75 بوصة).
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Mode Switch Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap pt-2 pb-2 shrink-0">
              <TabsList className="h-10 rounded-2xl bg-muted/60 p-1">
                <TabsTrigger
                  value="print"
                  className="rounded-xl px-4 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span>طباعة ورقية / PDF (A4 عرضي)</span>
                </TabsTrigger>

                <TabsTrigger
                  value="wallpaper"
                  className="rounded-xl px-4 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
                >
                  <Ratio className="h-4 w-4 text-indigo-500" />
                  <span>الجدول المصمم (خلفية شاشة 16:9 / 4K)</span>
                </TabsTrigger>
              </TabsList>

              {/* Hidden file input for uploading top banner image (available across all tabs) */}
              <input
                type="file"
                ref={topBannerInputRef}
                onChange={handleTopBannerUpload}
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                className="hidden"
              />

              {/* Hidden file input for uploading custom fonts (TTF, OTF, WOFF, WOFF2) */}
              <input
                type="file"
                ref={fontQuickUploadInputRef}
                onChange={handleQuickFontUpload}
                accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                className="hidden"
              />

              {/* Action Buttons Header */}
              {activeTab === "print" ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Font Customization Button */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFontManagerOpen(true)}
                    className="rounded-xl h-9 text-xs font-bold gap-1.5 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
                    title="تغيير أو رفع خطوط مخصصة للجدول"
                  >
                    <Type className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>الخط: {activeFontInfo.name}</span>
                  </Button>

                  {/* Upload / Change Top Banner button directly in Header */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => topBannerInputRef.current?.click()}
                    className="rounded-xl h-9 text-xs font-bold gap-2 border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20"
                    title="رفع صورة أو ترويسة لتظهر مباشرة فوق الجدول في ورقة الطباعة"
                  >
                    <ImagePlus className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{topBannerImage ? "تغيير صورة الترويسة" : "رفع صورة فوق الجدول"}</span>
                  </Button>

                  {topBannerImage && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveTopBanner}
                      className="rounded-xl h-9 text-xs font-bold gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                      title="إزالة صورة الترويسة من ورقة الطباعة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">حذف الصورة</span>
                    </Button>
                  )}

                  <Button
                    onClick={handleExportPDF}
                    disabled={isExportingPDF}
                    className="rounded-xl h-9 text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-sm"
                  >
                    {isExportingPDF ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span>تحميل كملف PDF (A4)</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="rounded-xl h-9 text-xs font-bold gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
                  >
                    <Printer className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>طباعة فورية</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Hidden file inputs for independent image uploads */}
                  <input
                    type="file"
                    ref={bgBehindInputRef}
                    onChange={handleBgBehindUpload}
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={overlayAboveInputRef}
                    onChange={handleOverlayAboveUpload}
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={topBannerInputRef}
                    onChange={handleTopBannerUpload}
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    className="hidden"
                  />

                  {/* Button 1: Upload image BEHIND table (صورة خلف الجدول) */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => bgBehindInputRef.current?.click()}
                    className={`rounded-xl h-9 text-xs font-bold gap-1.5 ${
                      bgBehindImage
                        ? "border-blue-500/50 text-blue-700 dark:text-blue-300 bg-blue-500/15"
                        : "border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/5 hover:bg-blue-500/15"
                    }`}
                    title="رفع صورة لتوضع كخلفية شاشة متكاملة 16:9 خلف الجدول"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{bgBehindImage ? "تغيير صورة الخلفية (خلف)" : "1. صورة خلف الجدول"}</span>
                  </Button>

                  {bgBehindImage && (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleRemoveBgBehind}
                      className="rounded-xl h-9 text-xs font-bold gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                      title="إزالة صورة خلف الجدول"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {/* Button 2: Upload image ABOVE table (صورة فوق الجدول) */}
                  <Button
                    type="button"
                    onClick={() => overlayAboveInputRef.current?.click()}
                    className={`rounded-xl h-9 text-xs font-bold gap-2 ${
                      overlayAboveImage
                        ? "bg-purple-700 hover:bg-purple-800 text-white"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                    } shadow-sm`}
                    title="رفع صورة لتوضع كطبقة تغطية بمقاس الشاشة 16:9 فوق الجدول مباشرة"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{overlayAboveImage ? "تغيير صورة التغطية (فوق)" : "2. صورة فوق الجدول"}</span>
                  </Button>

                  {overlayAboveImage && (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleRemoveOverlayAbove}
                      className="rounded-xl h-9 text-xs font-bold gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                      title="إزالة صورة التغطية من فوق الجدول"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFontManagerOpen(true)}
                    className="rounded-xl h-9 text-xs font-bold gap-1.5 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
                    title="تغيير أو رفع خطوط مخصصة للشاشة والجدول"
                  >
                    <Type className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>الخط: {activeFontInfo.name}</span>
                  </Button>

                  <Button
                    onClick={handleExportWallpaperPDF}
                    disabled={isExportingWallpaperPDF}
                    className="rounded-xl h-9 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    {isExportingWallpaperPDF ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    <span>تحميل كـ PDF</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleDownloadSVG}
                    className="rounded-xl h-9 text-xs font-bold gap-2 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>SVG</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleDownloadPNG}
                    disabled={isExportingImage}
                    className="rounded-xl h-9 text-xs font-bold gap-2 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
                  >
                    {isExportingImage ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                    <span>PNG ({wallpaperResolution.toUpperCase()})</span>
                  </Button>
                </div>
              )}
            </div>

            {/* ── TAB 1: A4 LANDSCAPE PRINT & PDF PREVIEW ── */}
            <TabsContent value="print" className="flex-1 flex flex-col overflow-hidden space-y-3 m-0">
              {/* Dedicated Top Banner / Header Image Control Card */}
              <div className="p-3 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 rounded-2xl border border-blue-500/20 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-3">
                  {topBannerImage ? (
                    <div className="relative h-11 w-20 rounded-xl overflow-hidden border border-blue-500/30 bg-background shrink-0 shadow-2xs">
                      <img src={topBannerImage} alt="معاينة الترويسة" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-foreground">صورة الترويسة العلوية فوق الجدول</h4>
                      {topBannerImage ? (
                        <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          الصورة مفعلة
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">(ارفع شعار المدرسة أو ترويسة الفصل لتظهر مباشرة فوق الجدول)</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      تظهر الصورة كترويسة رسمية عريضة فوق جدول الحصص في ورقة الطباعة وتصدير الـ PDF.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={() => topBannerInputRef.current?.click()}
                    className="h-8 rounded-xl text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{topBannerImage ? "تغيير الصورة المرفوعة" : "رفع صورة فوق الجدول"}</span>
                  </Button>

                  {topBannerImage && (
                    <>
                      {/* Show/Hide in Print Switch */}
                      <div className="flex items-center gap-2 bg-background/90 px-2.5 py-1 rounded-xl border border-border h-8">
                        <Switch
                          id="sw-top-banner-card"
                          checked={showTopBannerInPrint}
                          onCheckedChange={(v) => {
                            setShowTopBannerInPrint(v);
                            try { localStorage.setItem("schedule_export_show_top_banner", String(v)); } catch {}
                          }}
                          className="scale-75"
                        />
                        <Label htmlFor="sw-top-banner-card" className="text-[11px] font-bold cursor-pointer text-foreground">
                          {showTopBannerInPrint ? "ظاهرة في الطباعة" : "مخفية مؤقتاً"}
                        </Label>
                      </div>

                      {/* Banner Height Mode */}
                      <div className="flex items-center gap-1 bg-background/90 p-1 rounded-xl border border-border h-8">
                        <span className="text-[10px] font-bold text-muted-foreground px-1">الارتفاع:</span>
                        {[
                          { id: "compact", label: "مدمج" },
                          { id: "medium", label: "متوسط" },
                          { id: "tall", label: "كبير" },
                        ].map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              setTopBannerHeight(h.id as any);
                              try { localStorage.setItem("schedule_export_top_banner_height", h.id); } catch {}
                            }}
                            className={`h-6 px-2 rounded-lg text-[10px] font-bold transition-all ${
                              topBannerHeight === h.id ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {h.label}
                          </button>
                        ))}
                      </div>

                      {/* Remove Banner */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveTopBanner}
                        className="h-8 rounded-xl text-xs font-bold gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                        title="إزالة صورة الترويسة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Customization Controls Bar */}
              <div className="p-3 bg-muted/40 rounded-2xl border border-border/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs shrink-0">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">اسم المدرسة / الجهة:</Label>
                  <Input
                    value={schoolName}
                    onChange={(e) => {
                      setSchoolName(e.target.value);
                      try { localStorage.setItem("schedule_export_school_name", e.target.value); } catch {}
                    }}
                    className="h-8 text-xs font-bold rounded-xl bg-background"
                    placeholder="مدرسة الجش الثانوية"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">الصف / الشعبة:</Label>
                  <Input
                    value={className}
                    onChange={(e) => {
                      setClassName(e.target.value);
                      try { localStorage.setItem("schedule_export_class_name", e.target.value); } catch {}
                    }}
                    className="h-8 text-xs font-semibold rounded-xl bg-background"
                    placeholder="ثالث ثانوي موهبة"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">الفصل والعام الدراسي:</Label>
                  <Input
                    value={academicTerm}
                    onChange={(e) => {
                      setAcademicTerm(e.target.value);
                      try { localStorage.setItem("schedule_export_academic_term", e.target.value); } catch {}
                    }}
                    className="h-8 text-xs font-semibold rounded-xl bg-background"
                    placeholder="العام الدراسي 1448-1449هـ - الفصل الدراسي الأول"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">صيغة اسم المعلم:</Label>
                  <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border h-8">
                    <button
                      type="button"
                      onClick={() => setTeacherNameMode("short")}
                      className={`flex-1 h-6 rounded-lg text-[10px] font-bold transition-all ${
                        teacherNameMode === "short" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      مختصر (اللقب)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeacherNameMode("full")}
                      className={`flex-1 h-6 rounded-lg text-[10px] font-bold transition-all ${
                        teacherNameMode === "full" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      الاسم الكامل
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-r border-border/40 pr-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Switch id="sw-rooms" checked={showRooms} onCheckedChange={setShowRooms} className="scale-75" />
                      <Label htmlFor="sw-rooms" className="text-[11px] font-semibold cursor-pointer">عرض القاعات</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="sw-teachers" checked={showTeachers} onCheckedChange={setShowTeachers} className="scale-75" />
                      <Label htmlFor="sw-teachers" className="text-[11px] font-semibold cursor-pointer">عرض المعلمين</Label>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Switch id="sw-dir" checked={showTeacherDirectory} onCheckedChange={setShowTeacherDirectory} className="scale-75" />
                      <Label htmlFor="sw-dir" className="text-[11px] font-semibold cursor-pointer">دليل المعلمين</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="sw-sig" checked={showSignatures} onCheckedChange={setShowSignatures} className="scale-75" />
                      <Label htmlFor="sw-sig" className="text-[11px] font-semibold cursor-pointer">خانات التوقيع</Label>
                    </div>
                  </div>
                  {topBannerImage && (
                    <div className="flex flex-col gap-1 border-r border-border/30 pr-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="sw-top-banner"
                          checked={showTopBannerInPrint}
                          onCheckedChange={(v) => {
                            setShowTopBannerInPrint(v);
                            try { localStorage.setItem("schedule_export_show_top_banner", String(v)); } catch {}
                          }}
                          className="scale-75"
                        />
                        <Label htmlFor="sw-top-banner" className="text-[11px] font-bold cursor-pointer text-primary">صورة الترويسة</Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Font bar for printable sheet */}
              <div className="p-2.5 bg-background rounded-xl border border-border/70 flex flex-col gap-2.5 text-xs shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Type className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-bold text-[11px] text-foreground">نوع خط الطباعة:</span>
                    <select
                      value={selectedFontId}
                      onChange={(e) => {
                        setSelectedFontId(e.target.value);
                        try { localStorage.setItem("schedule_selected_font_id", e.target.value); } catch {}
                      }}
                      className="h-7 rounded-lg border border-border bg-background px-2 font-bold text-xs text-foreground cursor-pointer min-w-[160px]"
                    >
                      <optgroup label="الخطوط المرفوعة (المخصصة)">
                        {customFonts.length === 0 ? (
                          <option disabled value="">(لم ترفع خطوط بعد)</option>
                        ) : (
                          customFonts.map((f) => (
                            <option key={f.id} value={f.id}>
                              ✨ {f.name} ({f.format.toUpperCase()})
                            </option>
                          ))
                        )}
                      </optgroup>
                      <optgroup label="الخطوط العربية الأساسية">
                        {PRESET_FONTS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>

                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border h-7">
                      <button
                        type="button"
                        onClick={() => {
                          setFontApplyScope("all");
                          try { localStorage.setItem("schedule_font_apply_scope", "all"); } catch {}
                        }}
                        className={`px-2 h-5 rounded text-[10px] font-bold transition-all ${
                          fontApplyScope === "all" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        كامل الورقة
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFontApplyScope("subjects");
                          try { localStorage.setItem("schedule_font_apply_scope", "subjects"); } catch {}
                        }}
                        className={`px-2 h-5 rounded text-[10px] font-bold transition-all ${
                          fontApplyScope === "subjects" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        المواد فقط
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fontQuickUploadInputRef.current?.click()}
                      className="h-7 text-xs font-bold gap-1 rounded-lg border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
                    >
                      <Upload className="h-3 w-3" />
                      <span>رفع خط جديد</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setFontManagerOpen(true)}
                      className="h-7 text-xs font-bold gap-1 rounded-lg text-indigo-600 dark:text-indigo-400"
                    >
                      <Settings2 className="h-3 w-3" />
                      <span>إدارة الخطوط {customFonts.length > 0 && `(${customFonts.length})`}</span>
                    </Button>
                  </div>
                </div>

                {/* Font Scaling Row for Print */}
                <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
                      <Scaling className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-[10.5px] text-foreground whitespace-nowrap">حجم خط المواد:</span>
                      <button
                        type="button"
                        onClick={() => updateSubjectFontScale(subjectFontScale - 5)}
                        className="h-5 w-5 rounded bg-background hover:bg-muted border border-border flex items-center justify-center font-bold text-xs"
                        title="تصغير خط أسماء المواد"
                      >
                        -
                      </button>
                      <Slider
                        value={[subjectFontScale]}
                        onValueChange={([v]) => updateSubjectFontScale(v)}
                        min={60}
                        max={170}
                        step={5}
                        className="w-20 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => updateSubjectFontScale(subjectFontScale + 5)}
                        className="h-5 w-5 rounded bg-background hover:bg-muted border border-border flex items-center justify-center font-bold text-xs"
                        title="تكبير خط أسماء المواد"
                      >
                        +
                      </button>
                      <span className="font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400 min-w-[34px] text-center">
                        {subjectFontScale}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60">
                      <Type className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                      <span className="font-bold text-[10.5px] text-foreground whitespace-nowrap">خط باقي الجدول:</span>
                      <button
                        type="button"
                        onClick={() => updateGeneralFontScale(generalFontScale - 5)}
                        className="h-5 w-5 rounded bg-background hover:bg-muted border border-border flex items-center justify-center font-bold text-xs"
                        title="تصغير خط باقي الجدول"
                      >
                        -
                      </button>
                      <Slider
                        value={[generalFontScale]}
                        onValueChange={([v]) => updateGeneralFontScale(v)}
                        min={70}
                        max={140}
                        step={5}
                        className="w-16 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => updateGeneralFontScale(generalFontScale + 5)}
                        className="h-5 w-5 rounded bg-background hover:bg-muted border border-border flex items-center justify-center font-bold text-xs"
                        title="تكبير خط باقي الجدول"
                      >
                        +
                      </button>
                      <span className="font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400 min-w-[34px] text-center">
                        {generalFontScale}%
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60">
                      {[
                        { label: "صغير", subjectVal: 85, genVal: 90 },
                        { label: "افتراضي", subjectVal: 100, genVal: 100 },
                        { label: "كبير", subjectVal: 120, genVal: 110 },
                        { label: "عريض", subjectVal: 140, genVal: 115 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            updateSubjectFontScale(preset.subjectVal);
                            updateGeneralFontScale(preset.genVal);
                          }}
                          className={`px-1.5 h-5 rounded text-[9.5px] font-bold transition-all ${
                            subjectFontScale === preset.subjectVal && generalFontScale === preset.genVal
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(subjectFontScale !== 100 || generalFontScale !== 100) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetFontScales}
                      className="h-6 text-[10.5px] font-bold gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>إعادة ضبط 100%</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Scrollable A4 Landscape Sheet Preview */}
              <div className="flex-1 overflow-y-auto overflow-x-auto p-4 bg-slate-900/10 dark:bg-slate-950/50 rounded-2xl border border-border/50 flex justify-center">
                <div className="shadow-2xl border border-slate-300 rounded-lg overflow-hidden bg-white text-slate-900" style={{ width: "1050px", minWidth: "1050px" }}>
                  {/* The A4 Printable Paper Component */}
                  <div
                    ref={printAreaRef}
                    id="schedule-a4-printable-paper"
                    className="p-8 bg-white text-slate-900"
                    style={{
                      width: "1050px",
                      minHeight: "740px",
                      backgroundColor: "#ffffff",
                      color: "#0f172a",
                      boxSizing: "border-box",
                      fontFamily: activeGeneralFontFamily,
                    }}
                    dir="rtl"
                  >
                    {/* Official School Header */}
                    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
                      <div className="text-right space-y-0.5">
                        <p className="text-[11px] font-bold text-slate-600">المملكة العربية السعودية</p>
                        <p className="text-[11px] font-bold text-slate-600">وزارة التعليم</p>
                        <h2 className="text-base font-black text-slate-900">{schoolName}</h2>
                      </div>

                      <div className="text-center space-y-1">
                        <div className="inline-block px-4 py-1 rounded-full bg-slate-100 border border-slate-300 text-xs font-black text-slate-900">
                          الجدول الدراسي الأسبوعي
                        </div>
                        <p className="text-xs font-bold text-slate-700">{className} — {academicTerm}</p>
                      </div>

                      <div className="text-left font-mono text-[11px] text-slate-600 space-y-0.5" dir="ltr">
                        <p className="font-bold">Start: {startTime}</p>
                        <p>Period: {periodDuration} min</p>
                        <p>Date: {new Date().toLocaleDateString("ar-SA")}</p>
                      </div>
                    </div>

                    {/* Top Banner Image Above Table in Print */}
                    {showTopBannerInPrint && topBannerImage && (
                      <div
                        className={`mb-3.5 rounded-xl overflow-hidden border border-slate-300 flex items-center justify-center bg-slate-50 transition-all ${
                          topBannerHeight === "compact"
                            ? "h-16 max-h-16"
                            : topBannerHeight === "tall"
                            ? "h-32 max-h-32"
                            : "h-24 max-h-24"
                        }`}
                      >
                        <img
                          src={topBannerImage}
                          alt="ترويسة الجدول"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Table Grid (RTL: Days as Rows, Periods 1..N starting from Right to Left) */}
                    <div className="border border-slate-400 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-center border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                            <th className="p-2 border-l border-slate-300 w-24 bg-slate-200/80" style={{ fontSize: `${(12 * (generalFontScale / 100)).toFixed(1)}px` }}>اليوم</th>
                            {PERIODS.map((period, idx) => (
                              <React.Fragment key={period}>
                                <th className="p-2 border-l border-slate-300 font-extrabold" style={{ fontSize: `${(12 * (generalFontScale / 100)).toFixed(1)}px` }}>
                                  <div>الحصة {period}</div>
                                  {showTimes && (
                                    <div className="flex flex-col items-center justify-center font-bold leading-tight mt-1" dir="rtl" style={{ fontSize: `${(9 * (generalFontScale / 100)).toFixed(1)}px` }}>
                                      <span className="font-black text-slate-900">من {formatTime12h(periodTimes[idx]?.start)}</span>
                                      <span className="text-slate-500 font-semibold">إلى {formatTime12h(periodTimes[idx]?.end)}</span>
                                    </div>
                                  )}
                                </th>
                                {period === breakAfterPeriod && hasBreak && (
                                  <th className="p-1 border-l border-amber-300 bg-amber-50 text-amber-900 font-bold w-14" style={{ fontSize: `${(11 * (generalFontScale / 100)).toFixed(1)}px` }} rowSpan={1}>
                                    <div className="flex flex-col items-center justify-center p-1">
                                      <Coffee className="h-4 w-4 text-amber-600 mb-0.5 shrink-0" />
                                      <span className="font-black" style={{ fontSize: `${(10 * (generalFontScale / 100)).toFixed(1)}px` }}>فسحة</span>
                                    </div>
                                  </th>
                                )}
                              </React.Fragment>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {DAYS_ORDER.map((day, dayIdx) => (
                            <tr key={day.id} className={`border-b border-slate-300 last:border-0 ${dayIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                              <td className="p-2.5 font-bold text-slate-900 border-l border-slate-300 bg-slate-100/70" style={{ fontSize: `${(14 * (generalFontScale / 100)).toFixed(1)}px` }}>
                                {day.name}
                              </td>

                              {PERIODS.map((period) => {
                                const slot = slots.find((s) => s.dayOfWeek === day.id && s.periodNumber === period);
                                const teacherName = showTeachers && slot?.teacherName ? shortenTeacherName(slot.teacherName, teacherNameMode) : "";
                                const room = showRooms && slot?.room ? slot.room : "";
                                const deco = slot ? getSubjectDecoration(slot.subjectName, slot.subjectColor) : null;

                                return (
                                  <React.Fragment key={period}>
                                    <td className="p-1.5 border-l border-slate-300 align-middle h-20 min-w-[100px]">
                                      {slot && deco ? (
                                        <div
                                          className="p-2 rounded-xl border flex flex-col items-center justify-between gap-1 h-full min-h-[64px] shadow-2xs relative overflow-hidden"
                                          style={{
                                            backgroundColor: `${slot.subjectColor || deco.baseColor}0d`,
                                            borderColor: `${slot.subjectColor || deco.baseColor}35`,
                                          }}
                                        >
                                          {/* Watermark icon (Enlarged & positioned downwards in the bottom corner) */}
                                          {React.createElement(deco.icon, {
                                            className: "absolute -bottom-3 -left-3 w-14 h-14 pointer-events-none opacity-15 rotate-[20deg]",
                                            style: { color: slot.subjectColor || deco.baseColor },
                                          })}
                                          <div className="flex-1 flex items-center justify-center w-full relative z-10 py-0.5">
                                            <span
                                              className="font-black text-slate-950 dark:text-slate-950 leading-tight text-center line-clamp-2"
                                              style={{
                                                fontFamily: activeSubjectFontFamily,
                                                fontWeight: 900,
                                                fontSize: `${(12 * (subjectFontScale / 100)).toFixed(1)}px`,
                                              }}
                                            >
                                              {slot.subjectName}
                                            </span>
                                          </div>

                                          {teacherName && (
                                            <div
                                              className="flex items-center gap-1 font-semibold text-slate-700 leading-tight truncate max-w-full"
                                              style={{ fontSize: `${(9.5 * (generalFontScale / 100)).toFixed(1)}px` }}
                                            >
                                              <User className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                                              <span>{teacherName}</span>
                                            </div>
                                          )}

                                          {room && (
                                            <div
                                              className="flex items-center gap-1 font-bold px-1.5 py-0.2 rounded bg-white text-slate-800 border border-slate-300 shadow-2xs"
                                              style={{ fontSize: `${(8.5 * (generalFontScale / 100)).toFixed(1)}px` }}
                                            >
                                              <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                                              <span>{room}</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="h-full rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                                          —
                                        </div>
                                      )}
                                    </td>

                                    {period === breakAfterPeriod && hasBreak && dayIdx === 0 && (
                                      <td
                                        rowSpan={DAYS_ORDER.length}
                                        className="border-l border-amber-300 bg-amber-50/60 p-2 text-center align-middle font-bold text-amber-800 text-[11px] w-14 overflow-visible"
                                      >
                                        <div className="flex flex-col items-center justify-center gap-1">
                                          <Coffee className="h-4 w-4 text-amber-600 shrink-0" />
                                          <span style={{ writingMode: "vertical-rl" }}>فسحة ({breakDuration}د)</span>
                                        </div>
                                      </td>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Teachers & Rooms Summary Directory (Bottom Section) */}
                    {showTeacherDirectory && teachersList.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-300">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-700" />
                            دليل معلمي المواد والقاعات:
                          </span>
                          <span className="text-[10px] text-slate-500">إجمالي {teachersList.length} معلماً مسجلين بالجدول</span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-[10px]">
                          {teachersList.map((t, i) => (
                            <div key={i} className="p-1.5 rounded-lg border border-slate-300 bg-slate-50/80 flex flex-col justify-between">
                              <span className="font-bold text-slate-900 truncate">{t.shortName}</span>
                              <span className="text-slate-600 text-[9px] truncate">{t.subjects.join("، ")}</span>
                              {t.rooms.length > 0 && (
                                <span className="text-[9px] font-semibold text-primary">القاعة: {t.rooms.join(" · ")}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Official Signatures Line */}
                    {showSignatures && (
                      <div className="mt-4 pt-3 border-t-2 border-slate-800 grid grid-cols-3 text-center text-xs font-bold text-slate-800">
                        <div>
                          <p className="text-slate-500 text-[10px]">وكيل الشؤون التعليمية</p>
                          <p className="mt-4 text-slate-900">....................................</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px]">المرشد الطلابي / رائد الفصل</p>
                          <p className="mt-4 text-slate-900">....................................</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px]">مدير المدرسة</p>
                          <p className="mt-4 text-slate-900">....................................</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── TAB 2: SMART SCREEN / WINDOWS DESKTOP 16:9 WALLPAPER (75-INCH & 4K READY) ── */}
            <TabsContent value="wallpaper" className="flex-1 flex flex-col overflow-hidden space-y-3 m-0">
              {/* ── 1. BACKGROUND IMAGE BEHIND TABLE (صورة خلف الجدول 16:9) ── */}
              <div className="p-3.5 bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-indigo-500/10 rounded-2xl border border-blue-500/25 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-foreground">1. صورة خلف الجدول (خلفية الشاشة 16:9 — تحت الجدول)</h4>
                      {bgBehindImage ? (
                        <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          خلفية مفعّلة (تحت الجدول)
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">(ارفع أي صورة أو تصميم ليكون خلف الجدول بدقة 4K)</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      توضع كخلفية شاشة متكاملة 1920×1080 أسفل الجدول، ويمكنك التحكم بوضوحها أو جعل الجدول شفافاً لإبرازها.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={() => bgBehindInputRef.current?.click()}
                    className="h-8 rounded-xl text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{bgBehindImage ? "تغيير صورة الخلفية" : "رفع صورة خلف الجدول"}</span>
                  </Button>

                  {bgBehindImage && (
                    <>
                      {/* خلفية الجدول شفاف/زجاجي/معتم لإظهار صورة الخلفية */}
                      <div className="flex items-center gap-1 bg-background p-0.5 rounded-xl border border-border h-8">
                        <span className="text-[10px] font-bold text-muted-foreground px-1.5">شكل الجدول:</span>
                        <button
                          type="button"
                          onClick={() => setTableOpacity("transparent")}
                          className={`px-2 h-6 rounded-lg text-[10px] font-bold transition-all ${
                            tableOpacity === "transparent" ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="جدول شفاف لإظهار صورة الخلفية بوضوح تام"
                        >
                          شفاف
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableOpacity("glass")}
                          className={`px-2 h-6 rounded-lg text-[10px] font-bold transition-all ${
                            tableOpacity === "glass" ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="جدول زجاجي نصف شفاف"
                        >
                          زجاجي
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableOpacity("solid")}
                          className={`px-2 h-6 rounded-lg text-[10px] font-bold transition-all ${
                            tableOpacity === "solid" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="جدول معتم"
                        >
                          معتم
                        </button>
                      </div>

                      {/* Opacity Slider */}
                      <div className="flex items-center gap-2 bg-background/90 px-2.5 py-1 rounded-xl border border-border h-8 min-w-[160px]">
                        <span className="text-[10px] font-bold text-foreground whitespace-nowrap">وضوح الخلفية:</span>
                        <Slider
                          value={[bgBehindOpacity]}
                          onValueChange={([val]) => {
                            setBgBehindOpacity(val);
                            try { localStorage.setItem("schedule_bg_behind_opacity", String(val)); } catch {}
                          }}
                          min={10}
                          max={100}
                          step={5}
                          className="w-16 cursor-pointer"
                        />
                        <span className="font-mono text-[10px] font-black text-primary min-w-[28px] text-left">
                          {bgBehindOpacity}%
                        </span>
                      </div>

                      {/* Fit mode */}
                      <div className="flex items-center gap-1 bg-background p-0.5 rounded-xl border border-border h-8">
                        <button
                          type="button"
                          onClick={() => {
                            setBgBehindFitMode("exact");
                            try { localStorage.setItem("schedule_bg_behind_fit", "exact"); } catch {}
                          }}
                          className={`px-2 h-6 rounded-lg text-[10px] font-bold transition-all ${
                            bgBehindFitMode === "exact" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="ملء مقاس الشاشة بالضبط (1920×1080)"
                        >
                          ملء الشاشة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBgBehindFitMode("cover");
                            try { localStorage.setItem("schedule_bg_behind_fit", "cover"); } catch {}
                          }}
                          className={`px-2 h-6 rounded-lg text-[10px] font-bold transition-all ${
                            bgBehindFitMode === "cover" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="ملاءمة مع الحفاظ على التناسب الأصلي (Cover)"
                        >
                          تغطية
                        </button>
                      </div>

                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleRemoveBgBehind}
                        className="h-8 rounded-xl text-xs font-bold gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                        title="إزالة صورة خلف الجدول"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف الخلفية</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* ── 2. OVERLAY IMAGE ABOVE TABLE (صورة فوق الجدول 16:9) ── */}
              <div className="p-3.5 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 rounded-2xl border border-purple-500/25 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-foreground">2. صورة فوق الجدول (طبقة التغطية أو الإطار 16:9 — فوق الجدول)</h4>
                      {overlayAboveImage ? (
                        <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          التغطية مفعّلة (فوق الجدول مباشرة)
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">(ارفع أي تصميم أو إطار 16:9 ليوضع كطبقة تغطية فوق الجدول بدقة 4K)</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      توضع صورة التغطية <strong className="text-purple-600 dark:text-purple-400 font-bold">فوق الجدول مباشرة</strong> بكامل مقاس الشاشة (1920×1080)، ويمكنك تعديل شفافيتها لتظهر تفاصيل الجدول من أسفلها.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    onClick={() => overlayAboveInputRef.current?.click()}
                    className="h-8 rounded-xl text-xs font-bold gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xs"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{overlayAboveImage ? "استبدال صورة التغطية (فوق)" : "رفع صورة فوق الجدول"}</span>
                  </Button>

                  {overlayAboveImage && (
                    <>
                      {/* Live Quick Opacity Slider */}
                      <div className="flex items-center gap-2 bg-background/90 px-2.5 py-1 rounded-xl border border-border h-8 min-w-[170px]">
                        <span className="text-[10px] font-bold text-foreground whitespace-nowrap">شفافية التغطية:</span>
                        <Slider
                          value={[overlayAboveOpacity]}
                          onValueChange={([val]) => {
                            setOverlayAboveOpacity(val);
                            try { localStorage.setItem("schedule_overlay_above_opacity", String(val)); } catch {}
                          }}
                          min={10}
                          max={100}
                          step={5}
                          className="w-20 cursor-pointer"
                        />
                        <span className="font-mono text-[10px] font-black text-primary min-w-[28px] text-left">
                          {overlayAboveOpacity}%
                        </span>
                      </div>

                      {/* Image Fit Mode */}
                      <div className="flex items-center gap-1 bg-background p-0.5 rounded-xl border border-border h-8">
                        <button
                          type="button"
                          onClick={() => {
                            setOverlayAboveFitMode("exact");
                            try { localStorage.setItem("schedule_overlay_above_fit", "exact"); } catch {}
                          }}
                          className={`px-2 h-6 rounded-lg text-[10px] font-bold transition-all ${
                            overlayAboveFitMode === "exact" ? "bg-purple-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="ملء مقاس الشاشة بالضبط (1920×1080)"
                        >
                          ملء الشاشة
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOverlayAboveFitMode("cover");
                            try { localStorage.setItem("schedule_overlay_above_fit", "cover"); } catch {}
                          }}
                          className={`px-2 h-6 rounded-lg text-[10px] font-bold transition-all ${
                            overlayAboveFitMode === "cover" ? "bg-purple-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="ملاءمة مع الحفاظ على التناسب الأصلي (Cover)"
                        >
                          تغطية
                        </button>
                      </div>

                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleRemoveOverlayAbove}
                        className="h-8 rounded-xl text-xs font-bold gap-1 border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                        title="إزالة صورة التغطية"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف التغطية</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* ── 3. OPTIONAL TOP BANNER RIBBON (شريط ترويسة علوية بعرض الجدول) ── */}
              <div className="p-2.5 bg-muted/30 rounded-xl border border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-bold text-foreground text-xs">شريط ترويسة رسمي إضافي فوق الجدول (Banner):</span>
                  {topBannerImage ? (
                    <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      مفعل
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-[10px]">(اختياري: شريط بعرض الجدول)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {topBannerImage && (
                    <>
                      <div className="flex items-center gap-1.5 bg-background px-2 py-0.5 rounded-lg border border-border h-7">
                        <span className="text-[10px] text-muted-foreground">عرض:</span>
                        <Switch
                          checked={showTopBannerInWallpaper}
                          onCheckedChange={(checked) => {
                            setShowTopBannerInWallpaper(checked);
                            try { localStorage.setItem("schedule_export_show_top_banner_wallpaper", String(checked)); } catch {}
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border h-7">
                        <button
                          type="button"
                          onClick={() => {
                            setTopBannerHeight("compact");
                            try { localStorage.setItem("schedule_export_top_banner_height", "compact"); } catch {}
                          }}
                          className={`px-1.5 h-5 rounded text-[9px] font-bold ${topBannerHeight === "compact" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                        >
                          مضغوط
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTopBannerHeight("medium");
                            try { localStorage.setItem("schedule_export_top_banner_height", "medium"); } catch {}
                          }}
                          className={`px-1.5 h-5 rounded text-[9px] font-bold ${topBannerHeight === "medium" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                        >
                          متوسط
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTopBannerHeight("tall");
                            try { localStorage.setItem("schedule_export_top_banner_height", "tall"); } catch {}
                          }}
                          className={`px-1.5 h-5 rounded text-[9px] font-bold ${topBannerHeight === "tall" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                        >
                          عريض
                        </button>
                      </div>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => topBannerInputRef.current?.click()}
                    className="h-7 rounded-lg text-[11px] font-bold gap-1 px-2.5"
                  >
                    <Upload className="h-3 w-3" />
                    <span>{topBannerImage ? "تغيير" : "رفع شريط ترويسة"}</span>
                  </Button>
                  {topBannerImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveTopBanner}
                      className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                      title="حذف شريط الترويسة"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Wallpaper Customization Toolbar */}
              <div className="p-3 bg-muted/40 rounded-2xl border border-border/50 space-y-3 text-xs shrink-0">
                {/* Row 0: School, Class, and Academic Year/Term */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-2 border-b border-border/40">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <School className="h-3 w-3 text-primary" />
                      اسم المدرسة:
                    </Label>
                    <Input
                      value={schoolName}
                      onChange={(e) => {
                        setSchoolName(e.target.value);
                        try { localStorage.setItem("schedule_export_school_name", e.target.value); } catch {}
                      }}
                      className="h-8 text-xs font-bold rounded-xl bg-background"
                      placeholder="مدرسة الجش الثانوية"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <User className="h-3 w-3 text-primary" />
                      الصف / الشعبة:
                    </Label>
                    <Input
                      value={className}
                      onChange={(e) => {
                        setClassName(e.target.value);
                        try { localStorage.setItem("schedule_export_class_name", e.target.value); } catch {}
                      }}
                      className="h-8 text-xs font-semibold rounded-xl bg-background"
                      placeholder="ثالث ثانوي موهبة"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 text-primary" />
                      العام والفصل الدراسي:
                    </Label>
                    <Input
                      value={academicTerm}
                      onChange={(e) => {
                        setAcademicTerm(e.target.value);
                        try { localStorage.setItem("schedule_export_academic_term", e.target.value); } catch {}
                      }}
                      className="h-8 text-xs font-semibold rounded-xl bg-background"
                      placeholder="العام الدراسي 1448-1449هـ - الفصل الدراسي الأول"
                    />
                  </div>
                </div>

                {/* Dedicated Card: Font Selection, Scaling & Custom Font Upload */}
                <div className="p-3 bg-background/80 rounded-2xl border border-indigo-500/20 flex flex-col gap-2.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                        <Type className="h-4 w-4 shrink-0" />
                        <span className="font-bold text-xs text-foreground whitespace-nowrap">خط الجدول والشاشة:</span>
                      </div>

                      <select
                        value={selectedFontId}
                        onChange={(e) => {
                          setSelectedFontId(e.target.value);
                          try { localStorage.setItem("schedule_selected_font_id", e.target.value); } catch {}
                        }}
                        className="h-8 rounded-xl border border-border bg-background px-3 font-bold text-xs text-foreground focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-w-[190px]"
                      >
                        <optgroup label="✨ الخطوط المرفوعة (المخصصة)">
                          {customFonts.length === 0 ? (
                            <option disabled value="">(لم ترفع خطوط مخصصة بعد)</option>
                          ) : (
                            customFonts.map((f) => (
                              <option key={f.id} value={f.id}>
                                ✨ {f.name} ({f.format.toUpperCase()})
                              </option>
                            ))
                          )}
                        </optgroup>
                        <optgroup label="الخطوط العربية الأساسية والشهيرة">
                          {PRESET_FONTS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>

                      {/* Scope Switch: All schedule vs Subject names only */}
                      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border h-8">
                        <button
                          type="button"
                          onClick={() => {
                            setFontApplyScope("all");
                            try { localStorage.setItem("schedule_font_apply_scope", "all"); } catch {}
                          }}
                          className={`px-2.5 h-6 rounded-lg text-[10.5px] font-bold transition-all ${
                            fontApplyScope === "all" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="تطبيق الخط المختار على كامل نصوص وبطاقات الجدول"
                        >
                          كامل الجدول
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFontApplyScope("subjects");
                            try { localStorage.setItem("schedule_font_apply_scope", "subjects"); } catch {}
                          }}
                          className={`px-2.5 h-6 rounded-lg text-[10.5px] font-bold transition-all ${
                            fontApplyScope === "subjects" ? "bg-indigo-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                          }`}
                          title="تطبيق الخط على أسماء المواد فقط مع إبقاء نصوص الجدول بالخط الأساسي"
                        >
                          عناوين المواد فقط
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        onClick={() => fontQuickUploadInputRef.current?.click()}
                        className="h-8 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xs"
                        title="رفع خط مخصص من جهازك (TTF / OTF / WOFF / WOFF2)"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>رفع خط مخصص (TTF/OTF)</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFontManagerOpen(true)}
                        className="h-8 rounded-xl text-xs font-bold gap-1.5 border-indigo-500/30 text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20"
                        title="استعراض الخطوط المرفوعة، المعاينة الحية وحذف الخطوط"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>إدارة ومطابقة الخطوط {customFonts.length > 0 && `(${customFonts.length})`}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Font Scaling Controls Row for Wallpaper/Desktop Export */}
                  <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
                        <Scaling className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="font-bold text-[11px] text-foreground whitespace-nowrap">حجم خط المواد:</span>
                        <button
                          type="button"
                          onClick={() => updateSubjectFontScale(subjectFontScale - 5)}
                          className="h-6 w-6 rounded-lg bg-background hover:bg-muted border border-border flex items-center justify-center font-bold text-xs"
                          title="تصغير خط أسماء المواد"
                        >
                          -
                        </button>
                        <Slider
                          value={[subjectFontScale]}
                          onValueChange={([v]) => updateSubjectFontScale(v)}
                          min={60}
                          max={170}
                          step={5}
                          className="w-24 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => updateSubjectFontScale(subjectFontScale + 5)}
                          className="h-6 w-6 rounded-lg bg-background hover:bg-muted border border-border flex items-center justify-center font-bold text-xs"
                          title="تكبير خط أسماء المواد"
                        >
                          +
                        </button>
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 min-w-[38px] text-center">
                          {subjectFontScale}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
                        <Type className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span className="font-bold text-[11px] text-foreground whitespace-nowrap">خط باقي الجدول:</span>
                        <button
                          type="button"
                          onClick={() => updateGeneralFontScale(generalFontScale - 5)}
                          className="h-6 w-6 rounded-lg bg-background hover:bg-muted border border-border flex items-center justify-center font-bold text-xs"
                          title="تصغير خط باقي الجدول"
                        >
                          -
                        </button>
                        <Slider
                          value={[generalFontScale]}
                          onValueChange={([v]) => updateGeneralFontScale(v)}
                          min={70}
                          max={140}
                          step={5}
                          className="w-20 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => updateGeneralFontScale(generalFontScale + 5)}
                          className="h-6 w-6 rounded-lg bg-background hover:bg-muted border border-border flex items-center justify-center font-bold text-xs"
                          title="تكبير خط باقي الجدول"
                        >
                          +
                        </button>
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 min-w-[38px] text-center">
                          {generalFontScale}%
                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60">
                        {[
                          { label: "صغير", subjectVal: 85, genVal: 90 },
                          { label: "افتراضي", subjectVal: 100, genVal: 100 },
                          { label: "كبير", subjectVal: 120, genVal: 110 },
                          { label: "عريض", subjectVal: 140, genVal: 115 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              updateSubjectFontScale(preset.subjectVal);
                              updateGeneralFontScale(preset.genVal);
                            }}
                            className={`px-2 h-6 rounded-lg text-[10.5px] font-bold transition-all ${
                              subjectFontScale === preset.subjectVal && generalFontScale === preset.genVal
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(subjectFontScale !== 100 || generalFontScale !== 100) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetFontScales}
                        className="h-7 text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>إعادة ضبط 100%</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Row 1: Core Layout & Styling Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Palette className="h-3 w-3 text-primary" />
                      النمط اللوني:
                    </Label>
                    <select
                      value={wallpaperTheme}
                      onChange={(e) => setWallpaperTheme(e.target.value as any)}
                      className="w-full h-8 rounded-xl border border-border bg-background px-2 font-bold text-xs text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="light">الوضع الفاتح المعتمد (المدرسي الهادئ)</option>
                      <option value="softLight">الوضع الفاتح الدافئ (Warm Light)</option>
                      <option value="softSlate">فحمي هادئ ومريح (Soft Slate)</option>
                      <option value="marukoChalkboard">السبورة الكحلية الكلاسيكية</option>
                      <option value="sage">أخضر ميرمية مريح للعين (Sage)</option>
                      <option value="arctic">أزرق جليدي هادئ (Arctic Blue)</option>
                      <option value="midnight">منتصف الليل (Midnight Navy)</option>
                      <option value="slate">الفحمي الحديث (Cyber Slate)</option>
                      <option value="amoled">سواد نقي (AMOLED Black)</option>
                      <option value="emerald">الزمردي الداكن (Deep Emerald)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Sliders className="h-3 w-3 text-primary" />
                      إزاحة الجدول لليمين:
                    </Label>
                    <select
                      value={tableRightShift}
                      onChange={(e) => {
                        const val = e.target.value as "standardRight" | "maxRight" | "centered";
                        setTableRightShift(val);
                        try { localStorage.setItem("schedule_wallpaper_table_right_shift", val); } catch {}
                      }}
                      className="w-full h-8 rounded-xl border border-border bg-background px-2 font-bold text-xs text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="standardRight">مائل لليمين أكثر (المطلوب والمثالي)</option>
                      <option value="maxRight">أقصى اليمين (مساحة أكبر لسطح المكتب)</option>
                      <option value="centered">متوسط / متوازن</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Maximize2 className="h-3 w-3 text-primary" />
                      اتساع الجدول (أقل انضغاطاً):
                    </Label>
                    <select
                      value={tableWidthMode}
                      onChange={(e) => {
                        const val = e.target.value as "spacious" | "ultraSpacious" | "compact";
                        setTableWidthMode(val);
                        try { localStorage.setItem("schedule_wallpaper_table_width_mode", val); } catch {}
                      }}
                      className="w-full h-8 rounded-xl border border-border bg-background px-2 font-bold text-xs text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="spacious">موسع ومريح (أقل انضغاطاً)</option>
                      <option value="ultraSpacious">فائق الاتساع (Ultra-Spacious)</option>
                      <option value="compact">مضغوط قياسي</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      تمييز ألوان المواد:
                    </Label>
                    <select
                      value={subjectColorContrast}
                      onChange={(e) => {
                        const val = e.target.value as "highContrast" | "vivid" | "soft";
                        setSubjectColorContrast(val);
                        try { localStorage.setItem("schedule_wallpaper_subject_contrast", val); } catch {}
                      }}
                      className="w-full h-8 rounded-xl border border-border bg-background px-2 font-bold text-xs text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="highContrast">ألوان هادئة ومتناسقة مع تباين واضح</option>
                      <option value="vivid">ألوان متمايزة</option>
                      <option value="soft">درجات ناعمة باستيل</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Tv className="h-3 w-3 text-primary" />
                      دقة التصدير (16:9):
                    </Label>
                    <select
                      value={wallpaperResolution}
                      onChange={(e) => setWallpaperResolution(e.target.value as any)}
                      className="w-full h-8 rounded-xl border border-border bg-background px-2 font-bold text-xs text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                    >
                      <option value="1080p">Full HD (1920 × 1080)</option>
                      <option value="1440p">2K QHD (2560 × 1440)</option>
                      <option value="4k">4K UHD (3840 × 2160) - لشاشات 75 بوصة</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Background Opacity Slider & Physical Education Day Customization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-center pt-1 border-t border-border/40">
                  {/* Background Opacity Slider */}
                  <div className="md:col-span-4 bg-background p-2 rounded-xl border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10.5px] font-bold text-foreground flex items-center gap-1">
                        <Sliders className="h-3 w-3 text-primary" />
                        شفافية الخلفية:
                      </Label>
                      <span className="font-mono text-[10px] font-black text-primary px-1.5 py-0.5 rounded bg-primary/10">
                        {bgBehindOpacity}%
                      </span>
                    </div>
                    <Slider
                      value={[bgBehindOpacity]}
                      onValueChange={([val]) => {
                        setBgBehindOpacity(val);
                        try { localStorage.setItem("schedule_bg_behind_opacity", String(val)); } catch {}
                      }}
                      min={15}
                      max={100}
                      step={5}
                      className="py-1 cursor-pointer"
                    />
                  </div>

                  {/* Physical Education (PE) Day Distinct Highlight & Theme */}
                  <div className="md:col-span-5 bg-background p-2 rounded-xl border border-border flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="sw-pe-highlight"
                        checked={highlightPEDay}
                        onCheckedChange={(checked) => {
                          setHighlightPEDay(checked);
                          try { localStorage.setItem("schedule_wallpaper_highlight_pe", String(checked)); } catch {}
                        }}
                        className="scale-75"
                      />
                      <Label htmlFor="sw-pe-highlight" className="text-[10.5px] font-black cursor-pointer text-foreground flex items-center gap-1">
                        <Dumbbell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        تلوين يوم البدنية بلون مميز
                      </Label>
                    </div>

                    {highlightPEDay && (
                      <select
                        value={peHighlightStyle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPeHighlightStyle(val);
                          try { localStorage.setItem("schedule_wallpaper_pe_style", val); } catch {}
                        }}
                        className="h-7 rounded-lg border border-border bg-muted/50 px-2 font-bold text-[10.5px] text-foreground cursor-pointer focus:ring-1 focus:ring-primary"
                      >
                        {Object.entries(PE_HIGHLIGHT_STYLES).map(([key, item]) => (
                          <option key={key} value={key}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Icon Area Positioning */}
                  <div className="md:col-span-3 flex items-center gap-1 bg-background p-1 rounded-xl border border-border h-11">
                    <button
                      type="button"
                      onClick={() => setTablePosition("left")}
                      className={`flex-1 h-9 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                        tablePosition === "left" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <AlignRight className="h-3 w-3" />
                      <span>الأيقونات يمين</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTablePosition("right")}
                      className={`flex-1 h-9 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                        tablePosition === "right" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <AlignLeft className="h-3 w-3" />
                      <span>الأيقونات يسار</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 16:9 Screen Bezel Live Interactive Preview */}
              <div className="flex-1 overflow-auto p-4 bg-black/90 rounded-2xl border border-border/50 flex flex-col items-center justify-center relative">
                {/* 16:9 Monitor Badge with 75-inch Note */}
                <div className="flex items-center justify-between w-full max-w-5xl mb-2 px-2 text-[11px] text-slate-400 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-200">معاينة مباشرة لشاشة 16:9 (مُحسّنة لشاشات 75 بوصة الكبيرة وسطح المكتب)</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] bg-slate-800/90 px-2.5 py-0.5 rounded-full border border-slate-700 text-slate-300">
                    <Tv className="h-3 w-3 text-indigo-400" />
                    <span>RTL الجدول + الأيقونات باليمين • {wallpaperResolution === "4k" ? "3840×2160 (4K)" : wallpaperResolution === "1440p" ? "2560×1440 (2K)" : "1920×1080 (Full HD)"}</span>
                  </div>
                </div>

                {/* 16:9 Screen Frame with Drag & Drop */}
                <div
                  ref={svgPreviewContainerRef}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result as string;
                        if (result) {
                          setBgBehindImage(result);
                          try {
                            localStorage.setItem("schedule_bg_behind_image", result);
                          } catch {}
                          toast({
                            title: "تم تعيين صورتك كخلفية بنجاح!",
                            description: "تم دمج الصورة المسحوبة كخلفية أصلية للجدول بنسبة 16:9.",
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-950 flex items-center justify-center p-0 transition-all hover:border-pink-500/50 group relative"
                  dangerouslySetInnerHTML={{ __html: generateWallpaperSVG }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Font Upload & Management Dialog */}
      <FontUploadManagerDialog
        open={fontManagerOpen}
        onOpenChange={setFontManagerOpen}
        customFonts={customFonts}
        selectedFontId={selectedFontId}
        onSelectFont={(id) => {
          setSelectedFontId(id);
          try {
            localStorage.setItem("schedule_selected_font_id", id);
          } catch {}
        }}
        onRefreshFonts={refreshCustomFonts}
        applyScope={fontApplyScope}
        onApplyScopeChange={(scope) => {
          setFontApplyScope(scope);
          try {
            localStorage.setItem("schedule_font_apply_scope", scope);
          } catch {}
        }}
      />
    </>
  );
}
