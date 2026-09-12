import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Type, Upload, Trash2, CheckCircle2, FileCode, Check, 
  Sparkles, Layers, Info, RefreshCw
} from "lucide-react";
import { 
  CustomFont, 
  PRESET_FONTS, 
  parseUploadedFont, 
  saveCustomFont, 
  deleteCustomFont 
} from "@/lib/custom-fonts";

interface FontUploadManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customFonts: CustomFont[];
  selectedFontId: string;
  onSelectFont: (fontId: string) => void;
  onRefreshFonts: () => Promise<void>;
  applyScope: "all" | "subjects";
  onApplyScopeChange: (scope: "all" | "subjects") => void;
}

export function FontUploadManagerDialog({
  open,
  onOpenChange,
  customFonts,
  selectedFontId,
  onSelectFont,
  onRefreshFonts,
  applyScope,
  onApplyScopeChange,
}: FontUploadManagerDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customFontLabel, setCustomFontLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["ttf", "otf", "woff", "woff2"].includes(ext || "")) {
      toast({
        title: "صيغة غير مدعومة",
        description: "يرجى رفع ملف خط بصيغة TTF أو OTF أو WOFF أو WOFF2.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "الحد الأقصى لحجم ملف الخط هو 15 ميجابايت.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const parsed = await parseUploadedFont(file, customFontLabel || undefined);
      await saveCustomFont(parsed);
      await onRefreshFonts();
      onSelectFont(parsed.id);
      setCustomFontLabel("");
      
      toast({
        title: "تم رفع الخط وتفعيله بنجاح 🎉",
        description: `تم تثبيت الخط "${parsed.name}" وتطبيقه على الجدول المدرسي فوراً.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "فشل رفع الخط",
        description: "حدث خطأ أثناء معالجة ملف الخط، يرجى التأكد من سلامة الملف.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDeleteFont = async (font: CustomFont, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteCustomFont(font.id);
      await onRefreshFonts();
      if (selectedFontId === font.id) {
        onSelectFont("ibm-plex");
      }
      toast({
        title: "تم حذف الخط",
        description: `تم حذف الخط "${font.name}" بنجاح.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "خطأ في الحذف",
        description: "تعذر حذف الخط المحدد.",
        variant: "destructive",
      });
    }
  };

  const sampleText = "الرياضيات • لغتي الجميلة • فيزياء • كيمياء 1448هـ";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl border-border bg-background shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Type className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                  <span>إدارة الخطوط ورفع الخطوط المخصصة</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    TTF / OTF / WOFF
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  ارفع خطوط مدرستك أو خطوطك المفضلة لتطبيقها مباشرة على جدول الحصص والتصدير بدقة 4K.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Upload Dropzone Area */}
          <div className="bg-gradient-to-br from-primary/5 via-background to-blue-500/5 p-4 rounded-2xl border border-primary/20 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-primary" />
                رفع ملف خط جديد:
              </span>
              <div className="text-[11px] text-muted-foreground">
                الصيغ المدعومة: <span className="font-mono font-bold text-foreground">.ttf, .otf, .woff, .woff2</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="اسم اختياري للخط (مثال: خط المدرسة، خط سلطان...)"
                value={customFontLabel}
                onChange={(e) => setCustomFontLabel(e.target.value)}
                className="h-9 text-xs rounded-xl bg-background"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".ttf, .otf, .woff, .woff2, font/ttf, font/otf, font/woff, font/woff2"
                className="hidden"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-9 rounded-xl text-xs font-bold gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>جاري التثبيت...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>اختر ملف الخط</span>
                  </>
                )}
              </Button>
            </div>

            {/* Drag & Drop Visual Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-1.5 ${
                dragOver 
                  ? "border-primary bg-primary/10" 
                  : "border-border/80 hover:border-primary/50 bg-background/60"
              }`}
            >
              <FileCode className="h-6 w-6 text-primary/70" />
              <p className="text-xs font-bold text-foreground">
                اسحب وأفلت ملف الخط هنا، أو انقر للاستعراض من جهازك
              </p>
              <p className="text-[10px] text-muted-foreground">
                يتم تضمين الخط مباشرة بتقنية Base64 داخل ملفات التصميم وSVG ليعمل بدون إنترنت
              </p>
            </div>
          </div>

          {/* 2. Scope Configuration (Where the font is applied) */}
          <div className="p-3 bg-muted/40 rounded-2xl border border-border flex items-center justify-between flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span className="font-bold text-foreground">نطاق تطبيق الخط المختار:</span>
            </div>
            <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => onApplyScopeChange("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  applyScope === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                كامل الجدول والنصوص
              </button>
              <button
                type="button"
                onClick={() => onApplyScopeChange("subjects")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  applyScope === "subjects"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                أسماء المواد فقط
              </button>
            </div>
          </div>

          {/* 3. Uploaded Custom Fonts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>الخطوط المخصصة المرفوعة</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono font-bold">
                  {customFonts.length}
                </span>
              </h4>
            </div>

            {customFonts.length === 0 ? (
              <div className="p-6 text-center rounded-2xl border border-dashed border-border/70 bg-muted/10 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  لم تقم برفع أي خط مخصص بعد.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  يمكنك رفع أي خط عربي أو إنجليزي لتمييز جدولك المطبوع أو خلفيات الشاشات الذكية.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {customFonts.map((font) => {
                  const isSelected = selectedFontId === font.id;
                  const sizeKb = Math.round(font.fileSize / 1024);
                  return (
                    <div
                      key={font.id}
                      onClick={() => onSelectFont(font.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-foreground">
                              {font.name}
                            </span>
                            {isSelected && (
                              <span className="bg-primary text-primary-foreground text-[9px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                                <Check className="h-2.5 w-2.5" />
                                مفعل الآن
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {font.fileName} • {sizeKb} كيلوبايت • {font.format.toUpperCase()}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          type="button"
                          onClick={(e) => handleDeleteFont(font, e)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
                          title="حذف هذا الخط"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Live text specimen */}
                      <div
                        className="p-2 rounded-xl bg-background border border-border/60 text-center font-bold text-sm tracking-wide text-foreground truncate"
                        style={{ fontFamily: font.family }}
                      >
                        {sampleText}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Built-in Arabic Preset Fonts */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <h4 className="text-xs font-black text-foreground flex items-center gap-1.5">
              <Type className="h-3.5 w-3.5 text-primary" />
              <span>الخطوط العربية المدمجة المعتمدة</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {PRESET_FONTS.map((font) => {
                const isSelected = selectedFontId === font.id;
                return (
                  <div
                    key={font.id}
                    onClick={() => onSelectFont(font.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "border-border bg-card hover:border-primary/40 hover:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground truncate">
                        {font.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </div>
                    <div
                      className="text-xs font-bold text-muted-foreground truncate"
                      style={{ fontFamily: font.family }}
                    >
                      مادة الرياضيات • 1448
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-primary" />
            <span>الخط المختار سيتم حفظه تلقائياً وتضمينه في كافة ملفات التصدير A4 و 16:9.</span>
          </div>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-5 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
          >
            حفظ وإغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
