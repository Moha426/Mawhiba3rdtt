// Custom Font Storage and Management Engine
// Supports TTF, OTF, WOFF, and WOFF2 fonts with IndexedDB persistence & FontFace API injection

export interface CustomFont {
  id: string;
  name: string;
  family: string;
  format: "truetype" | "opentype" | "woff" | "woff2";
  dataUrl: string;
  fileName: string;
  fileSize: number;
  uploadedAt: number;
}

export interface FontOption {
  id: string;
  name: string;
  family: string;
  category: "preset" | "custom";
  description?: string;
}

export const PRESET_FONTS: FontOption[] = [
  {
    id: "ibm-plex",
    name: "IBM Plex Sans Arabic",
    family: "'IBM Plex Sans Arabic', 'Cairo', sans-serif",
    category: "preset",
    description: "الخط الرسمي الافتراضي - متوازن وواضح جداً",
  },
  {
    id: "graphik",
    name: "Graphik Arabic (جرافيك)",
    family: "'Graphik Arabic Black', 'Graphik Arabic', 'IBM Plex Sans Arabic', sans-serif",
    category: "preset",
    description: "خط إعلاني بارز وعريض للشاشات الكبيرة",
  },
  {
    id: "cairo",
    name: "Cairo (كايرو)",
    family: "'Cairo', 'IBM Plex Sans Arabic', sans-serif",
    category: "preset",
    description: "خط هندسي عصري بوضوح فائق",
  },
  {
    id: "tajawal",
    name: "Tajawal (تجوال)",
    family: "'Tajawal', 'IBM Plex Sans Arabic', sans-serif",
    category: "preset",
    description: "خط سلس وأنيق للقراءة والمواد المدرسية",
  },
  {
    id: "almarai",
    name: "Almarai (المراعي)",
    family: "'Almarai', 'IBM Plex Sans Arabic', sans-serif",
    category: "preset",
    description: "خط ناعم وانسيابي معتمد في المطبوعات الرسمية",
  },
  {
    id: "alexandria",
    name: "Alexandria (الإسكندرية)",
    family: "'Alexandria', 'IBM Plex Sans Arabic', sans-serif",
    category: "preset",
    description: "خط حديث بأوزان عريضة ممتاز للعناوين",
  },
  {
    id: "readex-pro",
    name: "Readex Pro (ريديكس)",
    family: "'Readex Pro', 'IBM Plex Sans Arabic', sans-serif",
    category: "preset",
    description: "خط عالي التباين مناسب للشاشات الذكية",
  },
  {
    id: "amiri",
    name: "Amiri (أميري)",
    family: "'Amiri', 'IBM Plex Sans Arabic', serif",
    category: "preset",
    description: "خط كلاسيكي نسخي أصيل",
  },
];

const DB_NAME = "school_custom_fonts_db";
const STORE_NAME = "fonts";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load all custom fonts from IndexedDB
 */
export async function loadCustomFonts(): Promise<CustomFont[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const fonts = (request.result || []) as CustomFont[];
        // Also register them in the browser FontFaceSet
        fonts.forEach((font) => registerFontInBrowser(font));
        resolve(fonts);
      };

      request.onerror = () => {
        console.warn("Failed to load fonts from IndexedDB");
        resolve([]);
      };
    });
  } catch (err) {
    console.warn("IndexedDB error:", err);
    return [];
  }
}

/**
 * Save a custom font into IndexedDB and register it immediately in the DOM
 */
export async function saveCustomFont(font: CustomFont): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(font);

    request.onsuccess = () => {
      registerFontInBrowser(font);
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a custom font from IndexedDB
 */
export async function deleteCustomFont(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Inject the custom font into document.fonts using the modern FontFace API
 * with a fallback <style> tag injection
 */
export function registerFontInBrowser(font: CustomFont): void {
  if (typeof window === "undefined" || !font.dataUrl) return;

  const fontStyleId = `custom-font-style-${font.id}`;
  let styleEl = document.getElementById(fontStyleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = fontStyleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    @font-face {
      font-family: '${font.family}';
      src: url('${font.dataUrl}') format('${font.format}');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
  `;

  // Also register via window.FontFace if supported for synchronous canvas/SVG readiness
  if ("FontFace" in window) {
    try {
      const fontFace = new FontFace(font.family, `url(${font.dataUrl})`, {
        weight: "100 900",
        style: "normal",
      });
      fontFace.load().then((loadedFace) => {
        document.fonts.add(loadedFace);
      }).catch((e) => {
        console.warn(`Could not load font face ${font.family}:`, e);
      });
    } catch {
      // Ignored, style tag covers it
    }
  }
}

/**
 * Parse an uploaded font file (TTF, OTF, WOFF, WOFF2) into a CustomFont object
 */
export async function parseUploadedFont(file: File, customName?: string): Promise<CustomFont> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  let format: CustomFont["format"] = "truetype";

  if (ext === "otf") {
    format = "opentype";
  } else if (ext === "woff") {
    format = "woff";
  } else if (ext === "woff2") {
    format = "woff2";
  } else {
    format = "truetype";
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const rawCleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
  const cleanName = customName?.trim() || rawCleanName;
  const uniqueId = `cf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  // CSS Font family name safe identifier
  const safeFamily = `CustomFont_${uniqueId}`;

  return {
    id: uniqueId,
    name: cleanName,
    family: safeFamily,
    format,
    dataUrl,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: Date.now(),
  };
}

/**
 * Generates SVG @import and @font-face CSS blocks including any active custom fonts
 */
export function generateSvgFontDefinitions(customFonts: CustomFont[] = []): string {
  const customFaces = customFonts
    .map(
      (font) => `
      @font-face {
        font-family: '${font.family}';
        src: url('${font.dataUrl}') format('${font.format}');
        font-weight: 100 900;
        font-style: normal;
      }
    `
    )
    .join("\n");

  return `
    @import url('https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;700;800;900&family=Almarai:wght@400;700;800&family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700;800;900&family=Noto+Naskh+Arabic:wght@400;600;700&family=Readex+Pro:wght@400;600;700&family=Tajawal:wght@400;500;700;800;900&display=swap');
    
    @font-face {
      font-family: 'Graphik Arabic';
      src: url('https://res.cloudinary.com/dgplafutp/raw/upload/v1776185741/GRAPHIK_ARABIC_BLACK_a3gvnc.OTF') format('opentype');
      font-weight: 900;
      font-style: normal;
    }
    @font-face {
      font-family: 'Graphik Arabic';
      src: url('https://res.cloudinary.com/dgplafutp/raw/upload/v1776185740/GRAPHIK_ARABIC_BOLD_rpodpi.OTF') format('opentype');
      font-weight: 700;
      font-style: normal;
    }
    @font-face {
      font-family: 'Graphik Arabic Black';
      src: url('https://res.cloudinary.com/dgplafutp/raw/upload/v1776185741/GRAPHIK_ARABIC_BLACK_a3gvnc.OTF') format('opentype');
      font-weight: 900;
      font-style: normal;
    }

    ${customFaces}
  `;
}
