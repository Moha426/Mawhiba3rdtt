import React, { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Printer, Download, Monitor, FileText, Sparkles, MapPin, 
  User, Clock, Coffee, Image as ImageIcon, School, CheckCircle2,
  Check, Layout, AlignRight, AlignLeft, ShieldCheck, BookOpen, Tv, Ratio,
  Maximize2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const DAYS_ORDER = [
  { id: 0, name: "الأحد", short: "أحد" },
  { id: 1, name: "الاثنين", short: "اثنين" },
  { id: 2, name: "الثلاثاء", short: "ثلاثاء" },
  { id: 3, name: "الأربعاء", short: "أربعاء" },
  { id: 4, name: "الخميس", short: "خميس" },
];

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
  
  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const [schoolName, setSchoolName] = useState(defaultSchoolName);
  const [className, setClassName] = useState("الصف الدراسي");
  const [academicTerm, setAcademicTerm] = useState("العام الدراسي 1447هـ - الفصل الدراسي الحالي");
  const [teacherNameMode, setTeacherNameMode] = useState<"short" | "full">("short");
  const [showRooms, setShowRooms] = useState(true);
  const [showTeachers, setShowTeachers] = useState(true);
  const [showTimes, setShowTimes] = useState(true);
  const [showTeacherDirectory, setShowTeacherDirectory] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);

  // 16:9 Wallpaper Theme and Layout customization
  const [wallpaperTheme, setWallpaperTheme] = useState<"midnight" | "slate" | "amoled" | "emerald" | "light" | "softLight">("light");
  const [tablePosition, setTablePosition] = useState<"left" | "right">("right"); // Default: Table on the Right, clean and compact
  const [showDesktopGridZone, setShowDesktopGridZone] = useState(true);
  const [desktopCustomNote, setDesktopCustomNote] = useState("مساحة تطبيقات ويندوز والملفات");
  const [bottomCardTitle, setBottomCardTitle] = useState("ملاحظات وتنبيهات الأسبوع");
  const [bottomCardLine1, setBottomCardLine1] = useState("• الالتزام بالحضور الصباحي والتواجد قبل بداية الحصة الأولى");
  const [bottomCardLine2, setBottomCardLine2] = useState("• إحضار الكتب والواجبات المدرسية والمحافظة على النظام الصفي");
  const [wallpaperResolution, setWallpaperResolution] = useState<"1080p" | "1440p" | "4k">("4k");
  const [targetScreenSize, setTargetScreenSize] = useState<"75inch" | "65inch" | "55inch" | "desktop">("75inch");

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
        description: "يتم تحضير ملف PDF بتنسيق A4 عرضي عالي الدقة.",
      });

      const element = printAreaRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
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
        description: "تم تحميل جدول الحصص بحجم A4 عرضي جاهز للطباعة.",
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
    // Theme palette definitions
    const themes = {
      midnight: {
        bg1: "#060913",
        bg2: "#0c152e",
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
        bg1: "#080c14",
        bg2: "#111827",
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
        bg1: "#000000",
        bg2: "#0a0a0a",
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
        bg1: "#02120e",
        bg2: "#07261f",
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
      light: {
        bg1: "#f1f5f9",
        bg2: "#e2e8f0",
        glassBg: "#ffffff",
        cardBg: "#f8fafc",
        cellBg: "#f1f5f9",
        border: "#cbd5e1",
        borderSubtle: "#e2e8f0",
        accent: "#0284c7",
        glow: "#bae6fd",
        highlight: "#0369a1",
        textPrimary: "#0f172a",
        textMuted: "#64748b",
        dayBg: "#e0f2fe",
        gold: "#d97706",
      },
      softLight: {
        bg1: "#fdfbf7",
        bg2: "#f5f0e6",
        glassBg: "#ffffff",
        cardBg: "#fffdf9",
        cellBg: "#f9f6ef",
        border: "#e7dec7",
        borderSubtle: "#f0eadb",
        accent: "#2563eb",
        glow: "#dbeafe",
        highlight: "#1d4ed8",
        textPrimary: "#1e293b",
        textMuted: "#64748b",
        dayBg: "#eff6ff",
        gold: "#b45309",
      },
    };

    const t = themes[wallpaperTheme] || themes.light;

    // 16:9 Canvas Dimensions: 1920 (W) x 1080 (H)
    const isTableLeft = tablePosition === "left";
    
    // Smaller, neater, and more compact table positioned on the right or left side
    const tableW = 1040;
    const tableH = 820;
    const tableY = 130;
    const tableX = isTableLeft ? 120 : 760;

    const daysCount = DAYS_ORDER.length;
    const tableHeaderHeight = 85;
    const periodsHeaderHeight = 44;
    const footerHeight = 35;
    const gridY = tableY + tableHeaderHeight + periodsHeaderHeight + 16;
    const availableGridH = tableH - (tableHeaderHeight + periodsHeaderHeight + footerHeight + 32);
    const rowHeight = availableGridH / daysCount;

    // Inside the table, it is 100% RTL (Right-to-Left):
    // Rightmost column = Day Name (الأحد، الاثنين...)
    // Then going LEFT: Period 1, Period 2, Period 3, (Break Column), Period 4...
    const paddingInside = 24;
    const usableTableW = tableW - (paddingInside * 2);
    const dayColWidth = 115;
    const breakColWidth = hasBreak ? 46 : 0;
    const periodsTotalW = usableTableW - dayColWidth - breakColWidth - (displayCount * 6);
    const periodColWidth = periodsTotalW / displayCount;

    // Start from inner right
    const innerRightX = tableX + tableW - paddingInside;
    const dayColX = innerRightX - dayColWidth;

    // Compute period X coordinates from RIGHT to LEFT
    const periodPositions: { period: number; x: number; w: number; isBreakBefore: boolean; breakX?: number }[] = [];
    let curX = dayColX;

    for (let idx = 0; idx < PERIODS.length; idx++) {
      const p = PERIODS[idx];
      let isBreakBefore = false;
      let breakX: number | undefined;

      // If previous period was breakAfterPeriod, insert break column before current period
      if (idx > 0 && PERIODS[idx - 1] === breakAfterPeriod && hasBreak) {
        curX -= 6; // gap
        curX -= breakColWidth;
        isBreakBefore = true;
        breakX = curX;
      }

      curX -= 6; // gap
      curX -= periodColWidth;
      periodPositions.push({
        period: p,
        x: curX,
        w: periodColWidth,
        isBreakBefore,
        breakX,
      });
    }

    // Top Periods Header (RTL)
    const periodsHeadersSvg = periodPositions.map((pos, idx) => {
      const pTime = periodTimes[idx];
      let breakSvg = "";

      if (pos.isBreakBefore && pos.breakX !== undefined) {
        breakSvg = `
          <g>
            <!-- Break column header -->
            <rect x="${pos.breakX}" y="${tableY + tableHeaderHeight + 8}" width="${breakColWidth}" height="${periodsHeaderHeight}" rx="10" fill="#f59e0b" fill-opacity="0.15" stroke="#f59e0b" stroke-opacity="0.3" stroke-width="1"/>
            <path d="M${pos.breakX + breakColWidth / 2 - 6} ${tableY + tableHeaderHeight + 14} h12 v5 a3 3 0 0 1-3 3 h-6 a3 3 0 0 1-3-3 v-5 z" fill="#f59e0b" fill-opacity="0.9"/>
            <text x="${pos.breakX + breakColWidth / 2}" y="${tableY + tableHeaderHeight + 38}" fill="#fbbf24" font-size="10.5" font-weight="700" text-anchor="middle">فسحة</text>
            
            <!-- Break column body extending down all days -->
            <rect x="${pos.breakX}" y="${gridY}" width="${breakColWidth}" height="${availableGridH}" rx="12" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-opacity="0.25" stroke-width="1"/>
            <g transform="translate(${pos.breakX + breakColWidth / 2}, ${gridY + availableGridH / 2}) rotate(-90)">
              <text x="0" y="4" fill="#fbbf24" font-size="12" font-weight="700" text-anchor="middle">استراحة (${breakDuration}د)</text>
            </g>
          </g>
        `;
      }

      return `
        ${breakSvg}
        <g>
          <rect x="${pos.x}" y="${tableY + tableHeaderHeight + 8}" width="${pos.w}" height="${periodsHeaderHeight}" rx="12" fill="${t.cardBg}" fill-opacity="0.9" stroke="${t.border}" stroke-width="1.2"/>
          <text x="${pos.x + pos.w / 2}" y="${tableY + tableHeaderHeight + 26}" fill="${t.textPrimary}" font-size="12.5" font-weight="800" text-anchor="middle">الحصة ${pos.period}</text>
          <text x="${pos.x + pos.w / 2}" y="${tableY + tableHeaderHeight + 41}" fill="${t.textMuted}" font-size="10" font-weight="600" text-anchor="middle" class="mono-num">${pTime?.start || ""} - ${pTime?.end || ""}</text>
        </g>
      `;
    }).join("");

    // Days Rows & Subject Slot Cards (RTL) - Balanced vertical distribution with no awkward dead gaps
    const cardH = rowHeight - 8;

    const daysRowsSvg = DAYS_ORDER.map((day, dIdx) => {
      const rowY = gridY + dIdx * rowHeight;

      const slotsSvg = periodPositions.map((pos) => {
        const slot = slots.find((s) => s.dayOfWeek === day.id && s.periodNumber === pos.period);

        if (!slot) {
          return `
            <g>
              <rect x="${pos.x}" y="${rowY}" width="${pos.w}" height="${cardH}" rx="14" fill="${t.cellBg}" fill-opacity="0.3" stroke="${t.borderSubtle}" stroke-width="1" stroke-dasharray="4,4"/>
              <text x="${pos.x + pos.w / 2}" y="${rowY + cardH / 2 + 5}" fill="${t.textMuted}" font-size="12" font-weight="600" opacity="0.3" text-anchor="middle">شاغرة</text>
            </g>
          `;
        }

        const rawColor = slot.subjectColor || t.accent;
        const teacherName = showTeachers && slot.teacherName ? shortenTeacherName(slot.teacherName, teacherNameMode) : "";
        const roomName = showRooms && slot.room ? slot.room : "";

        // Text sizing logic to prevent overflow with adaptive font sizing
        const subName = slot.subjectName.trim();
        let subFontSize = 15;
        if (subName.length > 20) subFontSize = 9.5;
        else if (subName.length > 15) subFontSize = 11;
        else if (subName.length > 11) subFontSize = 12.5;
        else if (subName.length > 7) subFontSize = 14;
        const roomTagW = Math.min(pos.w - 16, 80);
        const roomTagX = pos.x + (pos.w - roomTagW) / 2;

        // Balanced vertical positions based on content density (Eliminating awkward gaps)
        let subjectY = rowY + cardH / 2 + 5;
        let teacherY = 0;
        let roomTagY = 0;

        if (teacherName && roomName) {
          subjectY = rowY + cardH * 0.30;
          teacherY = rowY + cardH * 0.58;
          roomTagY = rowY + cardH * 0.74;
        } else if (teacherName) {
          subjectY = rowY + cardH * 0.38;
          teacherY = rowY + cardH * 0.68;
        } else if (roomName) {
          subjectY = rowY + cardH * 0.38;
          roomTagY = rowY + cardH * 0.66;
        }

        const clipId = `card-clip-${dIdx}-${pos.period}`;

        return `
          <g>
            <clipPath id="${clipId}">
              <rect x="${pos.x}" y="${rowY}" width="${pos.w}" height="${cardH}" rx="14" />
            </clipPath>
            <g clip-path="url(#${clipId})">
              <!-- Slot Card Background -->
              <rect x="${pos.x}" y="${rowY}" width="${pos.w}" height="${cardH}" fill="${t.cardBg}" fill-opacity="0.95" stroke="${rawColor}" stroke-opacity="0.55" stroke-width="1.5"/>
              <!-- Top color accent stripe -->
              <rect x="${pos.x}" y="${rowY}" width="${pos.w}" height="7" fill="${rawColor}" />
            </g>
            
            <!-- Subject Name (Centered) -->
            <text x="${pos.x + pos.w / 2}" y="${subjectY}" fill="${t.textPrimary}" font-size="${subFontSize}" font-weight="800" text-anchor="middle">${subName}</text>
            
            <!-- Teacher Info Badge (Centered) -->
            ${teacherName ? `
              <g>
                <text x="${pos.x + pos.w / 2}" y="${teacherY}" fill="${t.textMuted}" font-size="11.5" font-weight="600" text-anchor="middle">${teacherName}</text>
              </g>
            ` : ""}
            
            <!-- Room Info Tag (Centered) -->
            ${roomName ? `
              <g>
                <rect x="${roomTagX}" y="${roomTagY}" width="${roomTagW}" height="20" rx="6" fill="${t.cellBg}" stroke="${t.border}" stroke-width="0.8"/>
                <text x="${pos.x + pos.w / 2}" y="${roomTagY + 14}" fill="${t.highlight}" font-size="10" font-weight="700" text-anchor="middle">${roomName}</text>
              </g>
            ` : ""}
          </g>
        `;
      }).join("");

      return `
        <g>
          <!-- RTL Day Name Column (On the Far Right of the Table) -->
          <g>
            <rect x="${dayColX}" y="${rowY}" width="${dayColWidth}" height="${cardH}" rx="14" fill="${t.dayBg}" stroke="${t.border}" stroke-width="1.5"/>
            <!-- Subtle Accent on Day Card -->
            <line x1="${dayColX + dayColWidth - 4}" y1="${rowY + 12}" x2="${dayColX + dayColWidth - 4}" y2="${rowY + cardH - 12}" stroke="${t.accent}" stroke-width="3" stroke-linecap="round"/>
            <text x="${dayColX + dayColWidth / 2}" y="${rowY + cardH / 2 + 5}" fill="${t.textPrimary}" font-size="15" font-weight="800" text-anchor="middle">${day.name}</text>
          </g>
          <!-- RTL Period Slots for this day -->
          ${slotsSvg}
        </g>
      `;
    }).join("");

    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
  <defs>
    <!-- Embed IBM Plex Sans Arabic Web Font directly in SVG -->
    <style>
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800;900&amp;family=IBM+Plex+Sans:wght@400;500;600;700&amp;display=swap');
      
      * {
        font-family: 'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', sans-serif;
      }
      text {
        font-family: 'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .mono-num {
        font-family: 'IBM Plex Sans', monospace, sans-serif;
      }
    </style>

    <!-- Premium Deep Background Gradients for 16:9 Screen -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.bg1}" />
      <stop offset="100%" stop-color="${t.bg2}" />
    </linearGradient>
    
    <radialGradient id="glowTopRight" cx="85%" cy="20%" r="45%">
      <stop offset="0%" stop-color="${t.glow}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${t.bg1}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowBottomLeft" cx="15%" cy="85%" r="45%">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="0.18" />
      <stop offset="100%" stop-color="${t.bg1}" stop-opacity="0" />
    </radialGradient>

    <!-- Subtle Geometric Dot Grid for High-End Workspace Look -->
    <pattern id="desktopDots" width="36" height="36" patternUnits="userSpaceOnUse">
      <circle cx="18" cy="18" r="1.1" fill="${t.border}" fill-opacity="0.35"/>
    </pattern>

    <!-- Refined Multi-Layer Drop Shadow -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="${wallpaperTheme === 'light' || wallpaperTheme === 'softLight' ? '0.08' : '0.55'}" />
    </filter>
  </defs>

  <!-- 1. Deep 16:9 Dark Backdrop (1920x1080 Standard 16:9) -->
  <rect width="1920" height="1080" fill="url(#bgGrad)" />
  <rect width="1920" height="1080" fill="url(#glowTopRight)" />
  <rect width="1920" height="1080" fill="url(#glowBottomLeft)" />
  <rect width="1920" height="1080" fill="url(#desktopDots)" />

  <!-- ── 2. SCHEDULE TABLE (RTL FROM RIGHT TO LEFT) ── -->
  <g filter="url(#cardShadow)">
    <!-- Outer Card -->
    <rect x="${tableX}" y="${tableY}" width="${tableW}" height="${tableH}" rx="28" fill="${t.glassBg}" fill-opacity="0.94" stroke="${t.border}" stroke-width="1.8" />
    
    <!-- Table Top School Header (RTL: School Brand on Right, Quick Specs on Left) -->
    <!-- School Logo Vector Crest -->
    <rect x="${tableX + tableW - paddingInside - 52}" y="${tableY + 18}" width="52" height="52" rx="16" fill="${t.accent}" fill-opacity="0.14" stroke="${t.accent}" stroke-opacity="0.35" stroke-width="1.2"/>
    <path d="M14 4L2 10.5l12 6.5 10-5.4V19h2V10.5L14 4z M6 15v4.5L14 24l8-4.5V15l-8 4.5L6 15z" fill="${t.accent}" transform="translate(${tableX + tableW - paddingInside - 40}, ${tableY + 30}) scale(0.9)"/>

    <!-- School & Class Title (Right-Anchored, extending leftwards safely) -->
    <text x="${tableX + tableW - paddingInside - 64}" y="${tableY + 40}" fill="${t.textPrimary}" font-size="21" font-weight="800" text-anchor="end">${schoolName}</text>
    <text x="${tableX + tableW - paddingInside - 64}" y="${tableY + 60}" fill="${t.textMuted}" font-size="12.5" font-weight="600" text-anchor="end">الجدول الدراسي الأسبوعي • ${className} • ${academicTerm}</text>

    <!-- Timing & Details Badge (Left-Aligned in Table Header) -->
    <rect x="${tableX + paddingInside}" y="${tableY + 24}" width="250" height="40" rx="13" fill="${t.cardBg}" stroke="${t.border}" stroke-width="1.2"/>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="${t.highlight}" transform="translate(${tableX + paddingInside + 12}, ${tableY + 35}) scale(0.8)"/>
    <text x="${tableX + paddingInside + 135}" y="${tableY + 49}" fill="${t.highlight}" font-size="12" font-weight="700" text-anchor="middle">بداية اليوم: ${startTime} | ${periodsCount} حصص</text>

    <!-- Header Divider Line -->
    <line x1="${tableX + paddingInside}" y1="${tableY + tableHeaderHeight}" x2="${tableX + tableW - paddingInside}" y2="${tableY + tableHeaderHeight}" stroke="${t.border}" stroke-width="1.2" stroke-opacity="0.6"/>

    <!-- RTL Days Column Header (On the Right) -->
    <rect x="${dayColX}" y="${tableY + tableHeaderHeight + 8}" width="${dayColWidth}" height="${periodsHeaderHeight}" rx="12" fill="${t.dayBg}" stroke="${t.border}" stroke-width="1.2"/>
    <text x="${dayColX + dayColWidth / 2}" y="${tableY + tableHeaderHeight + 35}" fill="${t.textPrimary}" font-size="13" font-weight="800" text-anchor="middle">اليوم / الحصة</text>

    <!-- RTL Periods Headers (From Right to Left) -->
    ${periodsHeadersSvg}

    <!-- RTL Days Rows & Subject Slots -->
    ${daysRowsSvg}

    <!-- Table Bottom Footer -->
    <text x="${tableX + tableW - paddingInside}" y="${tableY + tableH - 18}" fill="${t.textMuted}" font-size="11.5" font-weight="600" text-anchor="end">${schoolName} — جدول الحصص الأسبوعي</text>
    <text x="${tableX + paddingInside}" y="${tableY + tableH - 18}" fill="${t.textMuted}" font-size="11" font-weight="500">${academicTerm}</text>
  </g>
</svg>
    `.trim();
  }, [
    wallpaperTheme,
    tablePosition,
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
        description: "يتم تصيير رسم الفيكتور إلى صورة فائقة النقاء مناسبة لشاشة 75 بوصة وسطح المكتب.",
      });

      const svgBlob = new Blob([generateWallpaperSVG], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
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
        }
      };
      img.onerror = () => {
        setIsExportingImage(false);
        URL.revokeObjectURL(url);
        toast({
          title: "فشل التحويل إلى PNG",
          description: "يرجى تحميل ملف SVG مباشرة حيث يدعم كافة الشاشات والمتصفحات.",
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
        description: "يتم تحضير ملف PDF عالي الدقة بمقاس 16:9.",
      });

      const svgBlob = new Blob([generateWallpaperSVG], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const imgData = canvas.toDataURL("image/png");

          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [297, 167.06],
          });

          pdf.addImage(imgData, "PNG", 0, 0, 297, 167.06, undefined, "FAST");
          pdf.save(`خلفية_جدول_${schoolName.replace(/\s+/g, "_")}_${wallpaperResolution}.pdf`);

          toast({
            title: `تم تصدير خلفية PDF بنجاح (${wallpaperResolution.toUpperCase()})`,
            description: "تم تحميل ملف PDF للخلفية بنجاح.",
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
                  <span>خلفية شاشة 16:9 (للشاشات 75 بوصة وسطح المكتب)</span>
                </TabsTrigger>
              </TabsList>

              {/* Action Buttons Header */}
              {activeTab === "print" ? (
                <div className="flex items-center gap-2 flex-wrap">
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
                  <Button
                    onClick={handleExportWallpaperPDF}
                    disabled={isExportingWallpaperPDF}
                    className="rounded-xl h-9 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    {isExportingWallpaperPDF ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    <span>تحميل الخلفية كـ PDF</span>
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
              {/* Customization Controls Bar */}
              <div className="p-3 bg-muted/40 rounded-2xl border border-border/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs shrink-0">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">اسم المدرسة / الجهة:</Label>
                  <Input
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="h-8 text-xs font-bold rounded-xl bg-background"
                    placeholder="مدرسة الجش الثانوية"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">الصف / الفصل:</Label>
                  <Input
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="h-8 text-xs font-semibold rounded-xl bg-background"
                    placeholder="الصف الثالث الثانوي - شعبة 1"
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
                      fontFamily: "'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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

                    {/* Table Grid (RTL: Days as Rows, Periods 1..N starting from Right to Left) */}
                    <div className="border border-slate-400 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-center border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                            <th className="p-2 border-l border-slate-300 w-24 bg-slate-200/80">اليوم</th>
                            {PERIODS.map((period, idx) => (
                              <React.Fragment key={period}>
                                <th className="p-2 border-l border-slate-300 font-extrabold text-[12px]">
                                  <div>الحصة {period}</div>
                                  {showTimes && (
                                    <div className="text-[10px] font-mono font-normal text-slate-500 mt-0.5" dir="ltr">
                                      {periodTimes[idx]?.start} - {periodTimes[idx]?.end}
                                    </div>
                                  )}
                                </th>
                                {period === breakAfterPeriod && hasBreak && (
                                  <th className="p-1 border-l border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-bold w-12" rowSpan={1}>
                                    <div className="flex flex-col items-center justify-center">
                                      <Coffee className="h-3.5 w-3.5 text-amber-600 mb-0.5" />
                                      <span style={{ writingMode: "vertical-rl" }}>فسحة</span>
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
                              <td className="p-2.5 font-bold text-slate-900 border-l border-slate-300 bg-slate-100/70 text-sm">
                                {day.name}
                              </td>

                              {PERIODS.map((period) => {
                                const slot = slots.find((s) => s.dayOfWeek === day.id && s.periodNumber === period);
                                const teacherName = showTeachers && slot?.teacherName ? shortenTeacherName(slot.teacherName, teacherNameMode) : "";
                                const room = showRooms && slot?.room ? slot.room : "";

                                return (
                                  <React.Fragment key={period}>
                                    <td className="p-2 border-l border-slate-300 align-middle h-20 min-w-[100px]">
                                      {slot ? (
                                        <div
                                          className="p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 h-full"
                                          style={{
                                            backgroundColor: `${slot.subjectColor || "#3b82f6"}12`,
                                            borderColor: `${slot.subjectColor || "#3b82f6"}40`,
                                          }}
                                        >
                                          <span className="font-extrabold text-[13px] text-slate-900 leading-tight">
                                            {slot.subjectName}
                                          </span>
                                          {teacherName && (
                                            <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700 leading-tight">
                                              <User className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                                              <span>{teacherName}</span>
                                            </div>
                                          )}
                                          {room && (
                                            <div className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-white text-slate-800 border border-slate-300 shadow-2xs mt-0.5">
                                              <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                                              <span>{room}</span>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="h-full rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                                          —
                                        </div>
                                      )}
                                    </td>

                                    {period === breakAfterPeriod && hasBreak && dayIdx === 0 && (
                                      <td
                                        rowSpan={DAYS_ORDER.length}
                                        className="border-l border-amber-300 bg-amber-50/60 p-1 text-center align-middle font-bold text-amber-800 text-[11px]"
                                      >
                                        <div className="flex flex-col items-center justify-center gap-1">
                                          <Coffee className="h-4 w-4 text-amber-600" />
                                          <span style={{ writingMode: "vertical-rl" }}>استراحة ({breakDuration} دقيقة)</span>
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
              {/* Wallpaper Customization Toolbar */}
              <div className="p-3 bg-muted/40 rounded-2xl border border-border/50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs shrink-0">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">النمط اللوني (فاتح / داكن):</Label>
                  <select
                    value={wallpaperTheme}
                    onChange={(e) => setWallpaperTheme(e.target.value as any)}
                    className="w-full h-8 rounded-xl border border-border bg-background px-2.5 font-bold text-xs text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="light">الوضع الفاتح النقي (Clean Light)</option>
                    <option value="softLight">الوضع الفاتح الدافئ (Warm Light)</option>
                    <option value="midnight">منتصف الليل (Midnight Navy)</option>
                    <option value="slate">الفحمي الحديث (Cyber Slate)</option>
                    <option value="amoled">سواد نقي (AMOLED Black)</option>
                    <option value="emerald">الزمردي الداكن (Deep Emerald)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">دقة التصدير (16:9):</Label>
                  <select
                    value={wallpaperResolution}
                    onChange={(e) => setWallpaperResolution(e.target.value as any)}
                    className="w-full h-8 rounded-xl border border-border bg-background px-2.5 font-bold text-xs text-foreground focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="1080p">Full HD (1920 × 1080)</option>
                    <option value="1440p">2K QHD (2560 × 1440)</option>
                    <option value="4k">4K UHD (3840 × 2160) - لشاشات 75 بوصة</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">موضع مساحة أيقونات ويندوز:</Label>
                  <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border h-8">
                    <button
                      type="button"
                      onClick={() => setTablePosition("left")}
                      className={`flex-1 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                        tablePosition === "left" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <AlignRight className="h-3 w-3" />
                      <span>الأيقونات في اليمين</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTablePosition("right")}
                      className={`flex-1 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                        tablePosition === "right" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <AlignLeft className="h-3 w-3" />
                      <span>الأيقونات في اليسار</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">عنوان مساحة التطبيقات:</Label>
                  <Input
                    value={desktopCustomNote}
                    onChange={(e) => setDesktopCustomNote(e.target.value)}
                    className="h-8 text-xs font-semibold rounded-xl bg-background"
                    placeholder="مساحة تطبيقات ويندوز والملفات"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end">
                  <div className="flex items-center gap-2 h-8 bg-background px-3 rounded-xl border border-border">
                    <Switch id="sw-grid" checked={showDesktopGridZone} onCheckedChange={setShowDesktopGridZone} className="scale-75" />
                    <Label htmlFor="sw-grid" className="text-[11px] font-semibold cursor-pointer">إطار شبكة الأيقونات</Label>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2 md:col-span-2">
                  <Label className="text-[11px] font-bold text-foreground">عنوان صندوق التنبيهات:</Label>
                  <Input
                    value={bottomCardTitle}
                    onChange={(e) => setBottomCardTitle(e.target.value)}
                    className="h-8 text-xs font-semibold rounded-xl bg-background"
                    placeholder="ملاحظات وتنبيهات الأسبوع"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2 md:col-span-3">
                  <Label className="text-[11px] font-bold text-foreground">نص التنبيه اليومي / الملاحظة:</Label>
                  <Input
                    value={bottomCardLine1}
                    onChange={(e) => setBottomCardLine1(e.target.value)}
                    className="h-8 text-xs font-semibold rounded-xl bg-background"
                    placeholder="• الالتزام بالحضور الصباحي والتواجد قبل بداية الحصة الأولى"
                  />
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

                {/* 16:9 Screen Frame */}
                <div
                  ref={svgPreviewContainerRef}
                  className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-950 flex items-center justify-center p-0"
                  dangerouslySetInnerHTML={{ __html: generateWallpaperSVG }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
