import React from "react";
import {
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  BookOpen,
  Languages,
  Compass,
  Laptop,
  Dumbbell,
  Palette,
  Sparkles,
  Trophy,
  Scroll,
  Globe,
  LucideIcon,
  Award,
  Feather,
  Cpu,
  PenTool,
  Search,
  Microscope,
  Mountain,
  Layers,
  FileText,
} from "lucide-react";

/**
 * Convert 24-hour time string ("07:30" or "13:15") to 12-hour Arabic format ("7:30 ص" or "1:15 م")
 */
export function formatTime12h(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return timeStr;

  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  const period = h >= 12 ? "م" : "ص";
  h = h % 12;
  if (h === 0) h = 12;

  const mm = m.toString().padStart(2, "0");
  return `${h}:${mm} ${period}`;
}

/**
 * Format time range in guaranteed Right-to-Left Arabic order.
 * Example: start="07:30", end="08:15" -> "من 7:30 ص إلى 8:15 ص"
 * Using explicit Arabic words "من ... إلى ..." to eliminate any BiDi inversion.
 */
export function formatTimeRangeRTL(
  startStr: string | null | undefined,
  endStr: string | null | undefined,
  mode: "full" | "stacked" | "compact" = "full"
): string {
  if (!startStr || !endStr) return "";
  const s12 = formatTime12h(startStr);
  const e12 = formatTime12h(endStr);

  if (mode === "stacked") {
    return `من ${s12}\nإلى ${e12}`;
  }
  if (mode === "compact") {
    return `من ${s12} إلى ${e12}`;
  }
  return `من ${s12} إلى ${e12}`;
}

export interface SubjectDecoration {
  icon: LucideIcon;
  iconName: string;
  categoryTag: string; // Non-redundant category tag (does not repeat subject name)
  badgeEmoji: string;
  baseColor: string;
  lightBg: string;
  darkBg: string;
  borderColor: string;
  textColor: string;
  getSvgWatermark: (color: string) => string;
  getSideOrnamentSvg: (color: string) => string;
  marukoDoodle: (color: string) => string;
}

/**
 * Maruko (ماروكو الصغيرة) classic unisex school artwork & doodles
 * Designed in tasteful monochrome line-art (warm amber/slate/charcoal, NEVER pink!)
 */
export const MARUKO_ART = {
  // Classic Maruko face silhouette with iconic zigzag bangs and joyful chibi smile
  chibiHead: (color: string) => `
    <g stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- Head outline -->
      <path d="M10 24 C8 16 12 8 20 8 C28 8 32 16 30 24 C29 30 25 34 20 34 C15 34 11 30 10 24 Z" />
      <!-- Maruko signature zigzag bangs (الغرة المتعرجة الشهيرة) -->
      <path d="M11 16 L14 20 L17 15 L20 20 L23 15 L26 20 L29 16" stroke-width="1.8" />
      <!-- Cheerful chibi eyes -->
      <path d="M15 22 Q17 20 18 22" stroke-width="2" />
      <path d="M22 22 Q23 20 25 22" stroke-width="2" />
      <!-- Shy smile -->
      <path d="M18 27 Q20 29 22 27" stroke-width="1.6" />
      <!-- School shirt collar -->
      <path d="M16 34 L20 31 L24 34" stroke-width="1.6" />
      <!-- Cute star accent -->
      <polygon points="34,10 35.5,13.5 39,14 36.5,16.5 37,20 34,18 31,20 31.5,16.5 29,14 32.5,13.5" fill="${color}" fill-opacity="0.3" stroke="none" />
    </g>
  `,
  // Maruko iconic yellow/ochre school round brim hat (قبعة ماروكو المدرسية الشهيرة كزخرفة ركنية عتيقة)
  schoolHat: (color: string) => `
    <g stroke="${color}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- Ornate corner vine tendrils -->
      <path d="M4 28 C8 18 16 12 28 8" stroke-dasharray="1 3" stroke-width="1.2"/>
      <path d="M6 34 C12 26 22 20 36 18" opacity="0.6"/>
      <!-- Classical curved ribbon / hat silhouette -->
      <path d="M14 20 C14 12 18 8 22 8 C26 8 30 12 30 20" />
      <ellipse cx="22" cy="20" rx="14" ry="4" fill="${color}" fill-opacity="0.16" />
      <path d="M14 18 C17 16 27 16 30 18" stroke-width="1.6" />
      <!-- Delicate decorative flourish curls & blossom buds -->
      <path d="M28 20 Q33 26 36 32" stroke-width="1.2" />
      <circle cx="28" cy="6" r="1.5" fill="${color}" fill-opacity="0.7"/>
      <circle cx="8" cy="22" r="1.2" fill="${color}" fill-opacity="0.5"/>
    </g>
  `,
  // School backpack (حقيبة راندوسيرو المدرسية الكلاسيكية كحِلية زخرفية ناعمة)
  backpack: (color: string) => `
    <g stroke="${color}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- Corner baroque flourish scroll -->
      <path d="M6 32 C6 18 18 6 32 6" stroke-dasharray="2 3" opacity="0.5"/>
      <path d="M10 32 C10 22 22 10 32 10" opacity="0.7"/>
      <!-- Ornate satchel body with curved flap -->
      <rect x="13" y="11" width="16" height="20" rx="3.5" fill="${color}" fill-opacity="0.14" />
      <path d="M13 16 C16 18 26 18 29 16" stroke-width="1.6" />
      <rect x="19" y="23" width="4" height="4" rx="1" fill="${color}" fill-opacity="0.4" stroke-width="1" />
      <!-- Floral / lace tendril accents -->
      <circle cx="34" cy="8" r="1.8" fill="${color}" fill-opacity="0.7" />
      <circle cx="8" cy="34" r="1.8" fill="${color}" fill-opacity="0.7" />
    </g>
  `,
  // School desk with notebook and pencil (مكتب ماروكو والدفتر والقلم كزخرفة قرطاسية تراثية)
  studyDesk: (color: string) => `
    <g stroke="${color}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- Corner stationery flourish lace -->
      <path d="M8 8 C16 6 26 10 34 16" stroke-dasharray="2 2" opacity="0.6"/>
      <!-- Open notebook parchment with graceful curve -->
      <path d="M10 16 C15 14 19 15 22 17 C25 15 29 14 34 16 L34 27 C29 25 25 26 22 28 C19 26 15 25 10 27 Z" fill="${color}" fill-opacity="0.14" />
      <line x1="22" y1="17" x2="22" y2="28" stroke-width="1.3" />
      <!-- Feather quill flourish -->
      <path d="M26 10 C30 14 34 18 35 22" stroke-width="1.5" />
      <path d="M29 9 L32 12" stroke-width="1.2" />
      <!-- Sparkle flourish -->
      <circle cx="12" cy="10" r="1.5" fill="${color}" fill-opacity="0.8"/>
    </g>
  `,
};

// High-contrast, distinct school palettes with solid distinguishable tints (not washed out, not overly light)
const CALM_PALETTES = [
  { baseColor: "#0284c7", textColor: "#0369a1", lightBg: "#e0f2fe", darkBg: "#0c4a6e", icon: Calculator, badgeEmoji: "📐", categoryTag: "مادة أساسية" },
  { baseColor: "#7c3aed", textColor: "#5b21b6", lightBg: "#ede9fe", darkBg: "#2e1065", icon: Atom, badgeEmoji: "⚛️", categoryTag: "مادة علمية" },
  { baseColor: "#e11d48", textColor: "#9f1239", lightBg: "#ffe4e6", darkBg: "#4c0519", icon: FlaskConical, badgeEmoji: "🧪", categoryTag: "مادة تجريبية" },
  { baseColor: "#16a34a", textColor: "#15803d", lightBg: "#dcfce7", darkBg: "#052e16", icon: Dna, badgeEmoji: "🧬", categoryTag: "علوم طبيعية" },
  { baseColor: "#d97706", textColor: "#92400e", lightBg: "#fef3c7", darkBg: "#451a03", icon: Feather, badgeEmoji: "🖋️", categoryTag: "علوم لغوية" },
  { baseColor: "#4f46e5", textColor: "#3730a3", lightBg: "#e0e7ff", darkBg: "#1e1b4b", icon: Languages, badgeEmoji: "🌐", categoryTag: "لغات عالمية" },
  { baseColor: "#0d9488", textColor: "#115e59", lightBg: "#ccfbf1", darkBg: "#042f2e", icon: Scroll, badgeEmoji: "🕌", categoryTag: "علوم شرعية" },
  { baseColor: "#ea580c", textColor: "#9a3412", lightBg: "#ffedd5", darkBg: "#431407", icon: Compass, badgeEmoji: "🌍", categoryTag: "علوم اجتماعية" },
  { baseColor: "#2563eb", textColor: "#1e40af", lightBg: "#dbeafe", darkBg: "#172554", icon: Laptop, badgeEmoji: "💻", categoryTag: "علوم حاسوبية" },
  { baseColor: "#65a30d", textColor: "#3f6212", lightBg: "#ecfccb", darkBg: "#1a2e05", icon: Trophy, badgeEmoji: "🏆", categoryTag: "لياقة وحركة" },
  { baseColor: "#9333ea", textColor: "#6b21a8", lightBg: "#f3e8ff", darkBg: "#3b0764", icon: Palette, badgeEmoji: "🎨", categoryTag: "فنون وإبداع" },
  { baseColor: "#475569", textColor: "#1e293b", lightBg: "#e2e8f0", darkBg: "#0f172a", icon: PenTool, badgeEmoji: "✍️", categoryTag: "كتابة وتعبير" },
  { baseColor: "#0891b2", textColor: "#155e75", lightBg: "#cffafe", darkBg: "#083344", icon: Microscope, badgeEmoji: "🔬", categoryTag: "بحوث علمية" },
  { baseColor: "#b45309", textColor: "#7c2d12", lightBg: "#fed7aa", darkBg: "#351a08", icon: Mountain, badgeEmoji: "🪨", categoryTag: "جيولوجيا" },
];

function hashNameToColor(str: string): typeof CALM_PALETTES[0] {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CALM_PALETTES.length;
  return CALM_PALETTES[index];
}

/**
 * Maps subject name to Lucide Icon, Arabic category tag (NO REPEATED NAME),
 * calm non-garish palette colors, and tasteful Maruko-inspired watermarks.
 */
export function getSubjectDecoration(subjectName: string | null | undefined, customColor?: string): SubjectDecoration {
  const name = (subjectName || "").trim().toLowerCase();

  // 0. School Activity / Class Activity / Free Period (نشاط يعني حصص أنشطة صفية وريادة)
  if (
    name.includes("نشاط") ||
    name.includes("انشطة") ||
    name.includes("أنشطة") ||
    name.includes("فراغ") ||
    name.includes("ريادة") ||
    name.includes("توجيه") ||
    name.includes("حر") ||
    name.includes("activity")
  ) {
    const baseColor = "#ca8a04"; // Warm Sunshine Gold
    return {
      icon: Sparkles,
      iconName: "Sparkles",
      categoryTag: "أنشطة صفية",
      badgeEmoji: "✨",
      baseColor,
      lightBg: "#fef9c3",
      darkBg: "#422006",
      borderColor: "#facc15",
      textColor: "#854d0e",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 L22 14 L30 16 L22 18 L20 26 L18 18 L10 16 L18 14 Z" fill="${col}" fill-opacity="0.25"/>
          <circle cx="30" cy="8" r="2" fill="${col}"/>
          <circle cx="10" cy="24" r="1.5" fill="${col}"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Sparkle 4-point starburst cluster & creative celebration star -->
          <path d="M16 4 L18 12 L26 14 L18 16 L16 24 L14 16 L6 14 L14 12 Z" fill="${col}" fill-opacity="0.35"/>
          <circle cx="26" cy="6" r="2" fill="${col}"/>
          <circle cx="7" cy="22" r="1.5" fill="${col}"/>
          <path d="M23 20 L24 23 L27 24 L24 25 L23 28 L22 25 L19 24 L22 23 Z" fill="${col}" fill-opacity="0.5"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.schoolHat,
    };
  }

  // 1. Functional & Creative Writing (كتابة وظيفية وإبداعية / إنشاء وتعبير)
  if (
    name.includes("كتابة") ||
    name.includes("وظيفية") ||
    name.includes("إبداعية") ||
    name.includes("ابداعية") ||
    name.includes("تعبير") ||
    name.includes("إنشاء") ||
    name.includes("انشاء") ||
    name.includes("خط") ||
    name.includes("writing")
  ) {
    const baseColor = "#475569"; // Clean cool silver / slate steel
    return {
      icon: PenTool,
      iconName: "PenTool",
      categoryTag: "كتابة وظيفية وإبداعية",
      badgeEmoji: "✍️",
      baseColor,
      lightBg: "#f1f5f9",
      darkBg: "#0f172a",
      borderColor: "#94a3b8",
      textColor: "#1e293b",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 6 L30 14 L16 28 L8 30 L10 22 Z" stroke-width="2"/>
          <line x1="22" y1="6" x2="26" y2="10" stroke-width="1.5"/>
          <line x1="8" y1="30" x2="14" y2="24" stroke-width="1.5"/>
          <path d="M6 34 C12 32 18 34 24 32" stroke-width="1.5" stroke-dasharray="2 2"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Calligraphic fountain pen quill & fluid manuscript wave -->
          <path d="M28 4 C24 4 12 14 8 26 L12 28 L16 22 C19 19 28 10 28 4 Z" fill="${col}" fill-opacity="0.25"/>
          <line x1="16" y1="22" x2="24" y2="14" stroke-width="1.4"/>
          <path d="M6 28 L8 26 L10 29 Z" fill="${col}"/>
          <path d="M4 31 C8 29 12 33 16 30 C20 27 24 31 28 29" stroke-width="1.5"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.studyDesk,
    };
  }

  // 2. Research & Sources - Method of Research (بحث ومصادر - مادة عن طريقة البحث)
  if (
    name.includes("بحث") ||
    name.includes("بحوث") ||
    name.includes("مصادر") ||
    name.includes("مصادر التعلم") ||
    name.includes("مصادر المعلومات") ||
    name.includes("مهارات البحث") ||
    name.includes("استقصاء") ||
    name.includes("research")
  ) {
    const baseColor = "#0891b2"; // Deep Aqua Cyan
    return {
      icon: Microscope,
      iconName: "Microscope",
      categoryTag: "بحث ومصادر",
      badgeEmoji: "🔬",
      baseColor,
      lightBg: "#cffafe",
      darkBg: "#083344",
      borderColor: "#22d3ee",
      textColor: "#0e7490",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="16" cy="16" r="10" stroke-width="2"/>
          <line x1="23" y1="23" x2="33" y2="33" stroke-width="3"/>
          <circle cx="16" cy="16" r="4" fill="${col}" fill-opacity="0.2"/>
          <path d="M12 16 L20 16 M16 12 L16 20" stroke-width="1.5"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Open Reference Research Book & Magnifying Search Glass -->
          <path d="M4 22 C9 20 14 21 16 23 C18 21 23 20 28 22 L28 29 C23 27 18 28 16 30 C14 28 9 27 4 29 Z" fill="${col}" fill-opacity="0.18"/>
          <line x1="16" y1="23" x2="16" y2="30"/>
          <circle cx="15" cy="11" r="6.5" fill="${col}" fill-opacity="0.15"/>
          <line x1="19.8" y1="15.8" x2="27" y2="23" stroke-width="2.6"/>
          <circle cx="13" cy="9" r="1.2" fill="${col}"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.backpack,
    };
  }

  // 3. Earth Science / Geology (علم الأرض - جيولوجيا وصخور)
  if (
    name.includes("أرض") ||
    name.includes("الأرض") ||
    name.includes("جيولوجيا") ||
    name.includes("صخور") ||
    name.includes("طبقات") ||
    name.includes("geology") ||
    name.includes("earth")
  ) {
    const baseColor = "#b45309"; // Warm Terracotta Sandstone
    return {
      icon: Mountain,
      iconName: "Mountain",
      categoryTag: "علم الأرض",
      badgeEmoji: "🪨",
      baseColor,
      lightBg: "#ffedd5",
      darkBg: "#351a08",
      borderColor: "#f97316",
      textColor: "#7c2d12",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 32 L16 12 L26 32 Z" stroke-width="2"/>
          <path d="M20 32 L27 18 L34 32 Z" stroke-width="1.8"/>
          <path d="M11 22 L21 22" stroke-width="1.4"/>
          <path d="M14 16 L18 16" stroke-width="1.2"/>
          <path d="M6 34 L34 34" stroke-width="2"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Geological mountain peaks, rock strata layers & mineral crystal -->
          <path d="M4 28 L14 10 L24 28 Z" fill="${col}" fill-opacity="0.2"/>
          <path d="M17 28 L23 16 L29 28 Z" />
          <path d="M8 20 L20 20" stroke-width="1.4" stroke-dasharray="2 1.5"/>
          <path d="M6 24 L22 24" stroke-width="1.4"/>
          <path d="M4 28 L29 28" stroke-width="2"/>
          <polygon points="26,6 30,10 26,14 22,10" fill="${col}" fill-opacity="0.4" stroke-width="1.2"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.backpack,
    };
  }

  // 4. Mathematics (رياضيات وحساب وجبر)
  if (
    name.includes("رياضيات") ||
    name.includes("ريض") ||
    name.includes("حساب") ||
    name.includes("جبر") ||
    name.includes("هندسة") ||
    name.includes("تفاضل") ||
    name.includes("إحصاء") ||
    name.includes("احصاء") ||
    name.includes("math")
  ) {
    const baseColor = "#0284c7";
    return {
      icon: Calculator,
      iconName: "Calculator",
      categoryTag: "رياضيات",
      badgeEmoji: "📐",
      baseColor,
      lightBg: "#e0f2fe",
      darkBg: "#0c4a6e",
      borderColor: "#38bdf8",
      textColor: "#0369a1",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="20" cy="20" r="16" stroke="${col}" stroke-width="1" stroke-dasharray="3 3" opacity="0.35"/>
          <path d="M8 28 L20 6 L32 28 Z" stroke-width="2"/>
          <line x1="14" y1="21" x2="26" y2="21" stroke-width="1.5"/>
          <circle cx="20" cy="6" r="2.5" fill="${col}"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Geometry Set-Square, Compass & Pi / Sigma math symbols -->
          <path d="M6 28 L16 6 L26 28" />
          <path d="M10 20 Q16 22 22 20" stroke-width="1.4"/>
          <circle cx="16" cy="6" r="2.2" fill="${col}"/>
          <path d="M21 9 L29 9 M23 9 L23 17 M27 9 L28 17" stroke-width="1.6"/>
          <circle cx="6" cy="28" r="1.4" fill="${col}"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.schoolHat,
    };
  }

  // 5. Physics (فيزياء وميكانيكا وطاقة)
  if (name.includes("فيزياء") || name.includes("فيز") || name.includes("ميكانيكا") || name.includes("physics")) {
    const baseColor = "#7c3aed";
    return {
      icon: Atom,
      iconName: "Atom",
      categoryTag: "فيزياء",
      badgeEmoji: "⚛️",
      baseColor,
      lightBg: "#f5f3ff",
      darkBg: "#2e1065",
      borderColor: "#a78bfa",
      textColor: "#5b21b6",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.6" fill="none">
          <circle cx="20" cy="20" r="3.5" fill="${col}"/>
          <ellipse cx="20" cy="20" rx="17" ry="6" transform="rotate(0 20 20)"/>
          <ellipse cx="20" cy="20" rx="17" ry="6" transform="rotate(60 20 20)"/>
          <ellipse cx="20" cy="20" rx="17" ry="6" transform="rotate(120 20 20)"/>
          <circle cx="33" cy="20" r="1.5" fill="${col}"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.6" fill="none" stroke-linecap="round">
          <!-- Atomic Orbital Rings with central nucleus & electron particles -->
          <circle cx="16" cy="16" r="3.2" fill="${col}"/>
          <ellipse cx="16" cy="16" rx="14" ry="5.5" transform="rotate(0 16 16)"/>
          <ellipse cx="16" cy="16" rx="14" ry="5.5" transform="rotate(60 16 16)"/>
          <ellipse cx="16" cy="16" rx="14" ry="5.5" transform="rotate(120 16 16)"/>
          <circle cx="28" cy="16" r="1.4" fill="${col}"/>
          <circle cx="10" cy="7" r="1.4" fill="${col}"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.schoolHat,
    };
  }

  // 6. Chemistry (كيمياء ومختبر)
  if (name.includes("كيمياء") || name.includes("كيم") || name.includes("مختبر") || name.includes("chemistry")) {
    const baseColor = "#e11d48";
    return {
      icon: FlaskConical,
      iconName: "FlaskConical",
      categoryTag: "كيمياء",
      badgeEmoji: "🧪",
      baseColor,
      lightBg: "#fff1f2",
      darkBg: "#4c0519",
      borderColor: "#fb7185",
      textColor: "#be123c",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4 L24 4 M20 4 L20 12 L30 32 C31 34 29.5 36 27 36 L13 36 C10.5 36 9 34 10 32 L20 12" stroke-width="2"/>
          <path d="M13 28 Q20 26 27 28" stroke-width="1.5"/>
          <circle cx="17" cy="23" r="1.5" fill="${col}"/>
          <circle cx="23" cy="21" r="2" fill="${col}"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Erlenmeyer Laboratory Flask with bubbling fluid reaction -->
          <path d="M12 4 L20 4 M16 4 L16 11 L26 27 C27 28.5 25.8 30 24 30 L8 30 C6.2 30 5 28.5 6 27 L16 11" />
          <path d="M9 24 Q16 22 23 24" fill="${col}" fill-opacity="0.3"/>
          <circle cx="13" cy="20" r="1.5" fill="${col}"/>
          <circle cx="19" cy="17" r="1.8" fill="${col}"/>
          <circle cx="15" cy="13" r="1.2" fill="${col}"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.studyDesk,
    };
  }

  // 7. Biology & Natural Science (أحياء وعلوم وبيئة)
  if (name.includes("أحياء") || name.includes("احياء") || name.includes("علوم") || name.includes("بيولوجي") || name.includes("بيئة") || name.includes("biology") || name.includes("science")) {
    const baseColor = "#16a34a";
    return {
      icon: Dna,
      iconName: "Dna",
      categoryTag: "أحياء",
      badgeEmoji: "🧬",
      baseColor,
      lightBg: "#f0fdf4",
      darkBg: "#052e16",
      borderColor: "#4ade80",
      textColor: "#15803d",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round">
          <path d="M6 34 C14 26 14 14 6 6 M34 34 C26 26 26 14 34 6" stroke-width="2"/>
          <line x1="10" y1="10" x2="30" y2="10" stroke-width="1.5"/>
          <line x1="15" y1="18" x2="25" y2="18" stroke-width="1.5"/>
          <line x1="15" y1="24" x2="25" y2="24" stroke-width="1.5"/>
          <line x1="10" y1="30" x2="30" y2="30" stroke-width="1.5"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round">
          <!-- DNA Double Helix & Botanical Leaf Motif -->
          <path d="M6 28 C12 22 12 12 6 6 M26 28 C20 22 20 12 26 6" stroke-width="1.8"/>
          <line x1="9" y1="10" x2="23" y2="10" stroke-width="1.4"/>
          <line x1="13" y1="17" x2="19" y2="17" stroke-width="1.4"/>
          <line x1="9" y1="24" x2="23" y2="24" stroke-width="1.4"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.schoolHat,
    };
  }

  // 8. Arabic Language (لغة عربية وكفايات وبلاغة)
  if (name.includes("عربي") || name.includes("لغتي") || name.includes("بلاغة") || name.includes("أدب") || name.includes("نحو") || name.includes("قراءة") || name.includes("كفايات")) {
    const baseColor = "#d97706";
    return {
      icon: Feather,
      iconName: "Feather",
      categoryTag: "لغة عربية",
      badgeEmoji: "🖋️",
      baseColor,
      lightBg: "#fef3c7",
      darkBg: "#451a03",
      borderColor: "#d97706",
      textColor: "#92400e",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M34 6 C28 6 12 16 8 32 L14 34 L18 26 C22 22 34 12 34 6 Z" stroke-width="2"/>
          <line x1="18" y1="26" x2="28" y2="16" stroke-width="1.5"/>
          <path d="M6 34 L8 32 L11 35 Z" fill="${col}"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M26 4 C22 4 10 12 6 24 L10 26 L14 20 C18 16 26 8 26 4 Z" fill="${col}" fill-opacity="0.25"/>
          <line x1="14" y1="20" x2="22" y2="12" stroke-width="1.3"/>
          <path d="M4 26 L6 24 L8 27 Z" fill="${col}"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.studyDesk,
    };
  }

  // 9. English Language (اللغة الإنجليزية)
  if (
    name.includes("إنجليزي") ||
    name.includes("انجليزي") ||
    name.includes("انقلش") ||
    name.includes("english") ||
    name.includes("mega goal") ||
    name.includes("step")
  ) {
    const baseColor = "#4f46e5";
    return {
      icon: Languages,
      iconName: "Languages",
      categoryTag: "اللغة الإنجليزية",
      badgeEmoji: "🌐",
      baseColor,
      lightBg: "#e0e7ff",
      darkBg: "#1e1b4b",
      borderColor: "#4f46e5",
      textColor: "#3730a3",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="20" cy="20" r="15" stroke-width="2"/>
          <line x1="5" y1="20" x2="35" y2="20"/>
          <ellipse cx="20" cy="20" rx="8" ry="15"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Global Meridian Grid & Typographic EN English Language Emblem -->
          <circle cx="16" cy="16" r="12" fill="${col}" fill-opacity="0.12"/>
          <line x1="4" y1="16" x2="28" y2="16"/>
          <ellipse cx="16" cy="16" rx="6" ry="12"/>
          <rect x="18" y="16" width="12" height="12" rx="3.5" fill="${col}" stroke="none"/>
          <text x="24" y="25" fill="#ffffff" font-size="8.5" font-weight="900" text-anchor="middle" font-family="sans-serif">EN</text>
        </g>
      `,
      marukoDoodle: MARUKO_ART.backpack,
    };
  }

  // 10. Digital Technology & Computing (التقنية الرقمية والحاسب والبرمجة)
  if (
    name.includes("تقنية") ||
    name.includes("التقنية الرقمية") ||
    name.includes("رقمية") ||
    name.includes("حاسب") ||
    name.includes("حاسوب") ||
    name.includes("برمجة") ||
    name.includes("ذكاء") ||
    name.includes("computer") ||
    name.includes("it")
  ) {
    const baseColor = "#6366f1";
    return {
      icon: Laptop,
      iconName: "Laptop",
      categoryTag: "التقنية الرقمية",
      badgeEmoji: "💻",
      baseColor,
      lightBg: "#eef2ff",
      darkBg: "#1e1b4b",
      borderColor: "#818cf8",
      textColor: "#4338ca",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="10" y="10" width="20" height="20" rx="3" stroke-width="2"/>
          <rect x="15" y="15" width="10" height="10" fill="${col}" fill-opacity="0.25"/>
          <line x1="14" y1="5" x2="14" y2="10"/>
          <line x1="26" y1="5" x2="26" y2="10"/>
          <line x1="14" y1="30" x2="14" y2="35"/>
          <line x1="26" y1="30" x2="26" y2="35"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Silicon Microchip CPU with motherboard circuit bus tracks -->
          <rect x="8" y="8" width="16" height="16" rx="3.5" fill="${col}" fill-opacity="0.22"/>
          <line x1="12" y1="3" x2="12" y2="8"/>
          <line x1="20" y1="3" x2="20" y2="8"/>
          <line x1="12" y1="24" x2="12" y2="29"/>
          <line x1="20" y1="24" x2="20" y2="29"/>
          <line x1="3" y1="12" x2="8" y2="12"/>
          <line x1="3" y1="20" x2="8" y2="20"/>
          <line x1="24" y1="12" x2="29" y2="12"/>
          <line x1="24" y1="20" x2="29" y2="20"/>
          <rect x="12" y="12" width="8" height="8" rx="1.5" fill="${col}"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.studyDesk,
    };
  }

  // 11. Physical Education / Sports (بدنية يعني رياضة ولياقة)
  if (
    name.includes("بدنية") ||
    name.includes("رياضة") ||
    name.includes("لياقة") ||
    name.includes("تربية بدنية") ||
    name.includes("pe") ||
    name.includes("sport")
  ) {
    const baseColor = "#65a30d";
    return {
      icon: Trophy,
      iconName: "Trophy",
      categoryTag: "بدنية ورياضة",
      badgeEmoji: "🏆",
      baseColor,
      lightBg: "#f7fee7",
      darkBg: "#1a2e05",
      borderColor: "#a3e635",
      textColor: "#4d7c0f",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8 L28 8 L28 18 C28 23 23 26 20 26 C17 26 12 23 12 18 Z" stroke-width="2"/>
          <path d="M12 12 L7 12 C5.5 12 4.5 13 4.5 14.5 C4.5 17 6.5 19 9 19 L12 19"/>
          <path d="M28 12 L33 12 C34.5 12 35.5 13 35.5 14.5 C35.5 17 33.5 19 31 19 L28 19"/>
          <line x1="20" y1="26" x2="20" y2="32" stroke-width="2"/>
          <rect x="13" y="32" width="14" height="4" rx="1.5" fill="${col}"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- Championship Trophy Cup with victory handles & star -->
          <path d="M9 7 L23 7 L23 15 C23 19 19 22 16 22 C13 22 9 19 9 15 Z" fill="${col}" fill-opacity="0.25"/>
          <path d="M9 10 L5 10 C3.5 10 3 12 3 13.5 C3 16 5 17.5 9 17.5" />
          <path d="M23 10 L27 10 C28.5 10 29 12 29 13.5 C29 16 27 17.5 23 17.5" />
          <line x1="16" y1="22" x2="16" y2="26" stroke-width="2.2"/>
          <rect x="10" y="26" width="12" height="4" rx="1.5" fill="${col}"/>
          <circle cx="16" cy="13" r="2" fill="${col}"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.schoolHat,
    };
  }

  // 12. Islamic Studies (دراسات إسلامية وقرآن وتفسير)
  if (
    name.includes("قرآن") ||
    name.includes("قران") ||
    name.includes("تفسير") ||
    name.includes("توحيد") ||
    name.includes("فقه") ||
    name.includes("حديث") ||
    name.includes("إسلامية") ||
    name.includes("اسلامية") ||
    /(^|\s)دين(\s|$)/.test(name) ||
    name.includes("تربية دينية") ||
    name.includes("دراسات إسلامية")
  ) {
    const baseColor = "#0d9488";
    return {
      icon: Scroll,
      iconName: "Scroll",
      categoryTag: "علوم شرعية",
      badgeEmoji: "🕌",
      baseColor,
      lightBg: "#ccfbf1",
      darkBg: "#042f2e",
      borderColor: "#0d9488",
      textColor: "#115e59",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="10" y="10" width="20" height="20" rx="2" stroke-width="1.8"/>
          <rect x="10" y="10" width="20" height="20" rx="2" transform="rotate(45 20 20)" stroke-width="1.8"/>
          <circle cx="20" cy="20" r="4" fill="${col}" fill-opacity="0.3"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="8" y="8" width="16" height="16" rx="2" stroke-width="1.5"/>
          <rect x="8" y="8" width="16" height="16" rx="2" transform="rotate(45 16 16)" stroke-width="1.5"/>
          <circle cx="16" cy="16" r="3.2" fill="${col}" fill-opacity="0.35"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.schoolHat,
    };
  }

  // 13. Social Studies & History (اجتماعيات وتاريخ وجغرافيا)
  if (name.includes("اجتماعيات") || name.includes("تاريخ") || name.includes("جغرافيا") || name.includes("دراسات") || name.includes("وطنية") || name.includes("social")) {
    const baseColor = "#ea580c";
    return {
      icon: Compass,
      iconName: "Compass",
      categoryTag: "علوم اجتماعية",
      badgeEmoji: "🌍",
      baseColor,
      lightBg: "#fff7ed",
      darkBg: "#431407",
      borderColor: "#fb923c",
      textColor: "#c2410c",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="20" cy="20" r="15" stroke-width="2"/>
          <polygon points="20,7 23,17 33,20 23,23 20,33 17,23 7,20 17,17" fill="${col}" fill-opacity="0.3"/>
          <circle cx="20" cy="20" r="2.5" fill="${col}"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="16" cy="16" r="12" stroke-width="1.6"/>
          <polygon points="16,6 18,14 26,16 18,18 16,26 14,18 6,16 14,14" fill="${col}" fill-opacity="0.35"/>
          <circle cx="16" cy="16" r="2" fill="${col}"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.backpack,
    };
  }

  // 14. Art (تربية فنية ورسم وتصميم)
  if (name.includes("فنية") || name.includes("رسم") || name.includes("تصميم") || name.includes("art")) {
    const baseColor = "#c026d3";
    return {
      icon: Palette,
      iconName: "Palette",
      categoryTag: "تربية فنية",
      badgeEmoji: "🎨",
      baseColor,
      lightBg: "#fae8ff",
      darkBg: "#4a044e",
      borderColor: "#e879f9",
      textColor: "#a21caf",
      getSvgWatermark: (col: string) => `
        <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 C28 6 36 12 36 20 C36 25 32 29 27 29 C24 29 23 27 21 27 C19 27 18 29 18 31 C18 33 17 35 14 35 C8 35 4 28 4 20 C4 12 11 6 20 6 Z" stroke-width="2"/>
          <circle cx="12" cy="15" r="2" fill="${col}"/>
          <circle cx="20" cy="12" r="2" fill="${col}"/>
          <circle cx="28" cy="16" r="2" fill="${col}"/>
        </g>
      `,
      getSideOrnamentSvg: (col: string) => `
        <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4 C23 4 29 9 29 16 C29 20 26 23 22 23 C19 23 18 21 17 21 C15 21 14 23 14 25 C14 27 13 28 11 28 C6 28 3 22 3 16 C3 9 9 4 16 4 Z" fill="${col}" fill-opacity="0.25"/>
          <circle cx="10" cy="12" r="1.6" fill="${col}"/>
          <circle cx="16" cy="9" r="1.6" fill="${col}"/>
          <circle cx="22" cy="13" r="1.6" fill="${col}"/>
        </g>
      `,
      marukoDoodle: MARUKO_ART.studyDesk,
    };
  }

  // Fallback for any other subject
  const palette = hashNameToColor(subjectName || "مادة");
  const baseColor = (customColor && customColor !== "#3b82f6" && customColor !== "#4f46e5") ? customColor : palette.baseColor;

  return {
    icon: palette.icon,
    iconName: "BookOpen",
    categoryTag: palette.categoryTag,
    badgeEmoji: palette.badgeEmoji,
    baseColor,
    lightBg: palette.lightBg,
    darkBg: palette.darkBg,
    borderColor: baseColor,
    textColor: palette.textColor,
    getSvgWatermark: (col: string) => `
      <g stroke="${col}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 10 C12 8 18 10 20 12 C22 10 28 8 34 10 L34 28 C28 26 22 28 20 30 C18 28 12 26 6 28 Z" stroke-width="2"/>
        <line x1="20" y1="12" x2="20" y2="30" stroke-width="2"/>
      </g>
    `,
    getSideOrnamentSvg: (col: string) => `
      <g stroke="${col}" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 8 C9 6 14 8 16 10 C18 8 23 6 28 8 L28 24 C23 22 18 24 16 26 C14 24 9 22 4 24 Z" fill="${col}" fill-opacity="0.2"/>
        <line x1="16" y1="10" x2="16" y2="26" stroke-width="1.6"/>
      </g>
    `,
    marukoDoodle: MARUKO_ART.chibiHead,
  };
}
