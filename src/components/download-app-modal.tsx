import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Smartphone,
  Apple,
  Laptop,
  CheckCircle2,
  Share2,
  PlusSquare,
  ExternalLink,
  Sparkles,
  Info,
  QrCode,
  Copy,
  Check,
  Globe
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function DownloadAppModal({ isOpen, onClose }: Props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop" | "shortcut">("android");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast({
        title: "تم تثبيت التطبيق بنجاح! 🚀🎉",
        description: "أصبح تطبيق منصة ثالث موهبة مثبتاً الآن على جهازك",
      });
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [toast]);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn("Install prompt error:", err);
      }
    } else {
      toast({
        title: "تعليمات التثبيت السريع",
        description: "اضغط على زر الخيارات (⋮) في متصفحك ثم اختر 'تثبيت التطبيق' أو 'إضافة إلى الشاشة الرئيسية'.",
      });
    }
  };

  const handleDownloadShortcut = () => {
    try {
      const url = window.location.origin;
      const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=${url}">
  <title>منصة ثالث موهبة</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; text-align: center; }
    a { color: #38bdf8; font-size: 20px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div>
    <h2>جاري تحويلك إلى منصة ثالث موهبة...</h2>
    <p><a href="${url}">اضغط هنا إذا لم يتم التحويل تلقائياً</a></p>
  </div>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: "text/html" });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = "منصة-ثالث-موهبة.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: "تم تنزيل اختصار المنصة بنجاح 📥",
        description: "يمكنك وضع الملف على سطح المكتب أو هاتفك لفتح المنصة بنقرة واحدة.",
      });
    } catch {
      toast({ title: "تعذر تنزيل الملف", variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      toast({
        title: "تم نسخ رابط المنصة",
        description: "يمكنك مشاركته أو حفظه في مفضلتك",
      });
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg sm:max-w-xl rounded-3xl p-6 border-border/80" dir="rtl">
        <DialogHeader className="text-right space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-foreground">
                تنزيل وتثبيت تطبيق ثالث موهبة
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                تطبيق PWA سريع وخفيف يعمل على كافة الأجهزة والهواتف مع إمكانية التصفح السريع
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isInstalled && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 p-3.5 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="text-xs font-semibold leading-relaxed">
              التطبيق مثبت بالفعل على جهازك! يمكنك تشغيله مباشرة من قائمة التطبيقات أو الشاشة الرئيسية.
            </div>
          </div>
        )}

        {/* Quick Native Install Button if browser supports it */}
        {deferredPrompt && (
          <Button
            onClick={handleNativeInstall}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Download className="h-5 w-5" />
            <span>تثبيت التطبيق بنقرة واحدة الآن (PWA)</span>
          </Button>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-4 rounded-2xl p-1 bg-muted/70 h-11">
            <TabsTrigger value="android" className="rounded-xl text-xs font-bold gap-1">
              <Smartphone className="h-3.5 w-3.5" />
              <span>أندرويد</span>
            </TabsTrigger>
            <TabsTrigger value="ios" className="rounded-xl text-xs font-bold gap-1">
              <Apple className="h-3.5 w-3.5" />
              <span>آيفون / iPad</span>
            </TabsTrigger>
            <TabsTrigger value="desktop" className="rounded-xl text-xs font-bold gap-1">
              <Laptop className="h-3.5 w-3.5" />
              <span>كمبيوتر</span>
            </TabsTrigger>
            <TabsTrigger value="shortcut" className="rounded-xl text-xs font-bold gap-1">
              <Download className="h-3.5 w-3.5" />
              <span>اختصار سريع</span>
            </TabsTrigger>
          </TabsList>

          {/* Android Tab */}
          <TabsContent value="android" className="space-y-4 pt-3">
            <div className="bg-card p-4 rounded-2xl border border-border/70 space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xs">1</span>
                طريقة التثبيت على هواتف أندرويد (Google Chrome):
              </h4>
              <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed pr-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>افتح المنصة من متصفح <b>Chrome</b> على هاتفك.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>اضغط على زر القائمة <b>(النقاط الثلاث ⋮)</b> بأعلى يسار الشاشة.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>اختر <b>"تثبيت التطبيق"</b> أو <b>"إضافة إلى الشاشة الرئيسية" (Install App)</b>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>سيظهر التطبيق كأيقونة مستقلة في قائمة تطبيقاتك مع شاشة كاملة وسرعة فائقة.</span>
                </li>
              </ul>

              <div className="pt-2 flex gap-2">
                <Button
                  onClick={handleNativeInstall}
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <Download className="h-4 w-4" />
                  <span>بدء التثبيت المباشر</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* iOS Tab */}
          <TabsContent value="ios" className="space-y-4 pt-3">
            <div className="bg-card p-4 rounded-2xl border border-border/70 space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
                طريقة التثبيت على آيفون وآيباد (Safari):
              </h4>
              <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed pr-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>افتح المنصة من متصفح <b>Safari</b> الرسمي.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>اضغط على زر <b>المشاركة <Share2 className="h-3 w-3 inline text-primary" /> (Share)</b> بأسفل الشاشة.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>مرر للأسفل واختر <b>"إضافة إلى الشاشة الرئيسية" <PlusSquare className="h-3 w-3 inline text-primary" /> (Add to Home Screen)</b>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>اضغط على <b>"إضافة" (Add)</b> بأعلى الزاوية. سيتحول الموقع لتطبيق مستقل بكامل الشاشة!</span>
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* Desktop Tab */}
          <TabsContent value="desktop" className="space-y-4 pt-3">
            <div className="bg-card p-4 rounded-2xl border border-border/70 space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-xs">3</span>
                التثبيت على الحاسب الآلي (Windows & Mac):
              </h4>
              <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed pr-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>في متصفح <b>Chrome</b> أو <b>Edge</b>، ستجد أيقونة التثبيت <Download className="h-3 w-3 inline text-primary" /> في شريط العناوين بالأعلى.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>اضغط عليها ثم اختر <b>"تثبيت" (Install)</b> ليعمل في نافذة مخصصة خالية من أشرطة المتصفح.</span>
                </li>
              </ul>

              <Button
                onClick={handleNativeInstall}
                variant="outline"
                className="w-full rounded-xl text-xs font-bold gap-2"
              >
                <Laptop className="h-4 w-4 text-primary" />
                <span>محاولة التثبيت الفوري على الحاسب</span>
              </Button>
            </div>
          </TabsContent>

          {/* Shortcut Tab */}
          <TabsContent value="shortcut" className="space-y-4 pt-3">
            <div className="bg-card p-4 rounded-2xl border border-border/70 space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                تنزيل ملف الاختصار المباشر للمنصة
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                قم بتنزيل ملف تشغيل خفيف (HTML Launcher) يفتح المنصة مباشرة بنقرة واحدة من سطح المكتب أو مجلد التنزيلات.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button
                  onClick={handleDownloadShortcut}
                  className="flex-1 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground"
                >
                  <Download className="h-4 w-4" />
                  <span>تنزيل ملف الاختصار الآن</span>
                </Button>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="rounded-xl text-xs font-bold gap-2"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedLink ? "تم النسخ" : "نسخ رابط المنصة"}</span>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
