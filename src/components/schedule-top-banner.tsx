import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  ImagePlus,
  Trash2,
  Eye,
  EyeOff,
  Maximize2,
  Sliders,
  Upload,
  Check,
  RotateCcw,
  Sparkles,
  MoveVertical,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";

export interface TopBannerConfig {
  height: "compact" | "medium" | "tall" | "auto";
  objectFit: "cover" | "contain" | "fill";
  visible: boolean;
  opacity: number; // 20 to 100
  rounded: "sm" | "md" | "lg" | "full" | "none";
  showOverlayText: boolean;
  overlayTitle?: string;
  overlaySubtitle?: string;
  shadow: boolean;
}

export const DEFAULT_TOP_BANNER_CONFIG: TopBannerConfig = {
  height: "medium",
  objectFit: "cover",
  visible: true,
  opacity: 100,
  rounded: "lg",
  showOverlayText: false,
  overlayTitle: "",
  overlaySubtitle: "",
  shadow: true,
};

const STORAGE_IMG_KEY = "schedule_top_banner_image";
const STORAGE_CONFIG_KEY = "schedule_top_banner_config";

/**
 * Compresses an image file to a safe base64 string for localStorage
 */
async function compressImageFile(file: File, maxWidth = 1920, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG or PNG depending on transparency
        const isPng = file.type === "image/png" || file.type === "image/webp";
        const compressedBase64 = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error("فشل تحميل الصورة"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("فشل قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

interface ScheduleTopBannerProps {
  className?: string;
  onImageChange?: (imageData: string | null) => void;
}

export const ScheduleTopBanner: React.FC<ScheduleTopBannerProps> = ({
  className = "",
  onImageChange,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_IMG_KEY) || null;
    } catch {
      return null;
    }
  });

  const [config, setConfig] = useState<TopBannerConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONFIG_KEY);
      return saved ? { ...DEFAULT_TOP_BANNER_CONFIG, ...JSON.parse(saved) } : DEFAULT_TOP_BANNER_CONFIG;
    } catch {
      return DEFAULT_TOP_BANNER_CONFIG;
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Notify parent on mount / change if needed
  useEffect(() => {
    if (onImageChange) {
      onImageChange(imageUrl);
    }
  }, [imageUrl, onImageChange]);

  const saveConfig = (newConfig: TopBannerConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(newConfig));
    } catch (err) {
      console.error("Failed to save banner config", err);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "نوع الملف غير مدعوم",
        description: "يرجى اختيار صورة بصيغة JPG أو PNG أو WebP أو SVG.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast({
        title: "حجم الصورة كبير جداً",
        description: "يرجى اختيار صورة بحجم أقل من 12 ميغابايت.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await compressImageFile(file);
      try {
        localStorage.setItem(STORAGE_IMG_KEY, base64);
      } catch (err) {
        console.warn("Storage full, trying higher compression", err);
        const smaller = await compressImageFile(file, 1200, 0.75);
        localStorage.setItem(STORAGE_IMG_KEY, smaller);
      }

      setImageUrl(base64);
      saveConfig({ ...config, visible: true });
      toast({
        title: "تم رفع صورة الجدول بنجاح",
        description: "تم تثبيت الصورة كترويسة علوية فوق الجدول الدراسي.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "حدث خطأ أثناء رفع الصورة",
        description: "تعذر معالجة الصورة، يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = () => {
    setImageUrl(null);
    try {
      localStorage.removeItem(STORAGE_IMG_KEY);
    } catch {}
    toast({
      title: "تم حذف الصورة",
      description: "تمت إزالة الصورة العلوية من فوق الجدول.",
    });
  };

  const toggleVisibility = () => {
    saveConfig({ ...config, visible: !config.visible });
  };

  const getHeightClass = () => {
    switch (config.height) {
      case "compact":
        return "h-24 sm:h-28";
      case "medium":
        return "h-36 sm:h-44 md:h-52";
      case "tall":
        return "h-52 sm:h-64 md:h-72";
      case "auto":
        return "h-auto max-h-[380px]";
      default:
        return "h-36 sm:h-44 md:h-52";
    }
  };

  const getRoundedClass = () => {
    switch (config.rounded) {
      case "none":
        return "rounded-none";
      case "sm":
        return "rounded-lg";
      case "md":
        return "rounded-xl";
      case "lg":
        return "rounded-2xl";
      case "full":
        return "rounded-3xl";
      default:
        return "rounded-2xl";
    }
  };

  // If no image is uploaded, render the sleek compact upload banner trigger
  if (!imageUrl) {
    return (
      <div className={`w-full ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative overflow-hidden border-2 border-dashed transition-all duration-200 cursor-pointer rounded-2xl p-4 sm:p-6 text-center ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border/60 hover:border-primary/50 bg-card/60 hover:bg-card/90"
          }`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3.5 text-right w-full sm:w-auto">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {isUploading ? (
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-foreground">
                    إضافة صورة / ترويسة فوق الجدول
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-normal py-0 px-2 rounded-full border-primary/30 text-primary bg-primary/5">
                    شعار المدرسة / ترويسة الفصل
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  انقر لاختيار صورة، أو اسحب وأفلت الصورة هنا (PNG, JPG, WebP)
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-2 font-bold text-xs h-8 px-3 border-primary/30 text-primary hover:bg-primary/10 shrink-0 w-full sm:w-auto"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>رفع صورة</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If image is uploaded:
  return (
    <div className={`w-full space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Banner Container */}
      <div className="relative group">
        {/* The Display Banner */}
        <AnimatePresence>
          {config.visible ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`relative overflow-hidden w-full border border-border/60 ${getRoundedClass()} ${
                config.shadow ? "shadow-sm" : ""
              } bg-muted/30 ${getHeightClass()}`}
            >
              <img
                src={imageUrl}
                alt="ترويسة الجدول الدراسي"
                className={`w-full h-full ${
                  config.objectFit === "contain"
                    ? "object-contain bg-slate-950/5 dark:bg-slate-950/40 p-1"
                    : config.objectFit === "fill"
                    ? "object-fill"
                    : "object-cover"
                } transition-all duration-300`}
                style={{ opacity: config.opacity / 100 }}
              />

              {/* Optional Text Overlay */}
              {config.showOverlayText && (config.overlayTitle || config.overlaySubtitle) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white text-right">
                  {config.overlayTitle && (
                    <h3 className="text-lg sm:text-2xl font-black drop-shadow-md">
                      {config.overlayTitle}
                    </h3>
                  )}
                  {config.overlaySubtitle && (
                    <p className="text-xs sm:text-sm font-semibold opacity-90 drop-shadow-sm mt-0.5">
                      {config.overlaySubtitle}
                    </p>
                  )}
                </div>
              )}

              {/* Quick Hover Controls Overlay (Desktop) */}
              <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 p-1.5 rounded-2xl bg-background/90 backdrop-blur-md border border-border/80 shadow-lg z-20">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-xl text-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => setIsSettingsOpen(true)}
                  title="تخصيص أبعاد ومظهر الصورة"
                >
                  <Sliders className="h-3.5 w-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-xl text-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => fileInputRef.current?.click()}
                  title="تغيير الصورة"
                >
                  <Upload className="h-3.5 w-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-xl text-foreground hover:text-primary hover:bg-primary/10"
                  onClick={toggleVisibility}
                  title="إخفاء مؤقت"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-xl text-destructive hover:bg-destructive/10"
                  onClick={handleRemove}
                  title="حذف الصورة"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="p-2.5 rounded-2xl border border-dashed border-border/80 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span>تم إخفاء صورة الترويسة مؤقتاً</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleVisibility}
                  className="h-7 text-xs rounded-xl px-2.5 font-semibold gap-1"
                >
                  <Eye className="h-3 w-3" />
                  <span>إظهار</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  className="h-7 text-xs rounded-xl px-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Floating Mobile/Tablet Toolbar under banner */}
        {config.visible && (
          <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <ImageIcon className="h-3 w-3 text-primary" />
              <span>ترويسة الجدول المخصصة</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-muted font-semibold text-foreground/80 hover:text-foreground transition-colors"
              >
                <Sliders className="h-3 w-3 text-primary" />
                <span>تخصيص المظهر</span>
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-muted font-semibold text-foreground/80 hover:text-foreground transition-colors"
              >
                <Upload className="h-3 w-3" />
                <span>تغيير</span>
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleRemove}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-destructive/10 text-destructive font-semibold transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                <span>حذف</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Sliders className="h-4 w-4 text-primary" />
              <span>تخصيص صورة ترويسة الجدول</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              اضبط طريقة عرض وارتفاع وشفافية الصورة العلوية فوق الجدول الدراسي
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Height Control */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center justify-between">
                <span>ارتفاع الصورة:</span>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {config.height === "compact" && "مدمج (صغير)"}
                  {config.height === "medium" && "متوسط (افتراضي)"}
                  {config.height === "tall" && "كبير (بانر عريض)"}
                  {config.height === "auto" && "ارتفاع تلقائي"}
                </Badge>
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "compact", label: "مدمج" },
                  { id: "medium", label: "متوسط" },
                  { id: "tall", label: "كبير" },
                  { id: "auto", label: "تلقائي" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => saveConfig({ ...config, height: opt.id as any })}
                    className={`py-2 px-2 rounded-xl border text-center font-bold transition-all ${
                      config.height === opt.id
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border/60 bg-muted/30 hover:border-primary/40 text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fit Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">طريقة ملاءمة الصورة (Fit Mode):</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "cover", label: "تغطية كاملة (Cover)" },
                  { id: "contain", label: "احتواء كامل (Contain)" },
                  { id: "fill", label: "تمديد (Fill)" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => saveConfig({ ...config, objectFit: opt.id as any })}
                    className={`py-2 px-2 rounded-xl border text-center font-bold text-[11px] transition-all ${
                      config.objectFit === opt.id
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border/60 bg-muted/30 hover:border-primary/40 text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Corner Radii */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">انحناء الزوايا:</Label>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { id: "none", label: "حادة" },
                  { id: "sm", label: "خفيفة" },
                  { id: "md", label: "متوسطة" },
                  { id: "lg", label: "دائرية" },
                  { id: "full", label: "فائقة" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => saveConfig({ ...config, rounded: opt.id as any })}
                    className={`py-1.5 px-1 rounded-xl border text-center font-semibold text-[10.5px] transition-all ${
                      config.rounded === opt.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-muted/30 text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-2 bg-muted/30 p-3 rounded-2xl border border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">درجة الشفافية:</Label>
                <span className="font-mono font-bold text-primary">{config.opacity}%</span>
              </div>
              <Slider
                value={[config.opacity]}
                min={20}
                max={100}
                step={5}
                onValueChange={([val]) => saveConfig({ ...config, opacity: val })}
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                saveConfig(DEFAULT_TOP_BANNER_CONFIG);
              }}
              className="rounded-xl text-xs gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>إعادة ضبط</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsSettingsOpen(false)}
              className="rounded-xl text-xs font-bold px-4"
            >
              <span>تم وحفظ</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
