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

  const handleDownloadApk = () => {
    try {
      const link = document.createElement("a");
      link.href = "/download/talented-app.apk";
      link.download = "talented-app.apk";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "جاري تنزيل ملف APK 📲",
        description: "بدأ تنزيل ملف تطبيق الأندرويد (talented-app.apk). افضغ للفتح والتثبيت على هاتفك.",
      });
    } catch {
      window.location.href = "/download/talented-app.apk";
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
  <link rel="icon" type="image/png" href="${url}/app-icon.png">
  <link rel="apple-touch-icon" href="${url}/app-icon.png">
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

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30">
            <img
              src="/app-icon.png"
              alt="أيقونة التطبيق الرسمية"
              className="h-12 w-12 rounded-2xl object-cover shadow-md border border-orange-500/40 shrink-0"
            />
            <div>
              <div className="text-xs font-bold text-foreground">أيقونة التطبيق الرسمية (منصة ثالث موهبة)</div>
              <div className="text-[11px] text-muted-foreground">تظهر كأيقونة تطبيق برتقالية مميزة عند تثبيته على الشاشة الرئيسية</div>
            </div>
          </div>

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
            <TabsTrigger value="android" className="rounded-xl text-xs font-black gap-1 text-emerald-600 dark:text-emerald-400">
              <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
              <span>أندرويد Android</span>
            </TabsTrigger>
            <TabsTrigger value="ios" className="rounded-xl text-xs font-bold gap-1">
              <Apple className="h-3.5 w-3.5" />
              <span>آيفون iOS</span>
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
            <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-card p-4 rounded-2xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-emerald-500" />
                  تثبيت تطبيق أندرويد (Android Web App / APK):
                </h4>
                <Badge className="bg-emerald-500/20 text-emerald-600 border-0 text-[10px] font-black">
                  موصى به للأندرويد 🤖
                </Badge>
              </div>

              <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed pr-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>افتح المنصة من متصفح <b>Chrome</b> على هاتفك الأندرويد.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>اضغط على زر القائمة <b>(النقاط الثلاث ⋮)</b> أعلى يسار المتصفح.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>اختر <b>"تثبيت التطبيق" (Install App)</b> أو <b>"إضافة إلى الشاشة الرئيسية"</b>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">•</span>
                  <span>سيتم تنزيل أيقونة التطبيق فوراً بملف تطبيق كامل وسريع على شاشة هاتفك الرئيسية.</span>
                </li>
              </ul>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleDownloadApk}
                  className="flex-1 rounded-xl text-xs font-black gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/25 h-11"
                >
                  <Download className="h-4 w-4" />
                  <span>تحميل ملف APK المباشر (talented-app.apk)</span>
                </Button>

                <Button
                  onClick={handleNativeInstall}
                  variant="outline"
                  className="rounded-xl text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 h-11"
                >
                  <Smartphone className="h-4 w-4 text-emerald-500" />
                  <span>تثبيت PWA بنقرة واحدة</span>
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
