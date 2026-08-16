import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Tag, 
  Folder, 
  Filter, 
  ExternalLink, 
  BookOpen, 
  Sparkles,
  Star,
  Share2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  subscribeToStudyFiles,
  toggleStudyFileFavorite,
  getLibraryCategories,
  type StudyFile 
} from "@/lib/cloud-sync";
import { StudentSuggestDialog } from "@/components/student-suggest-dialog";
import { useToast } from "@/hooks/use-toast";

export default function LibraryPage() {
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [categories, setCategories] = useState<string[]>(() => getLibraryCategories());
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<StudyFile | null>(null);
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToStudyFiles((updatedFiles) => {
      setFiles(updatedFiles);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = toggleStudyFileFavorite(id);
    setFiles(prev => prev.map(f => f.id === id ? { ...f, isFavorite: isFav } : f));
    toast({
      title: isFav ? "تمت الإضافة إلى المفضلة ⭐" : "تمت الإزالة من المفضلة",
    });
  };

  const filteredFiles = files.filter(f => {
    if (onlyFavorites && !f.isFavorite) return false;
    const matchesCategory = selectedCategory === "الكل" || f.category === selectedCategory;
    const matchesSearch = 
      f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.tags && f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (f.subject && f.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* ─── Hero / Header ─── */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 border border-border/50 bg-card shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              <span>مكتبة التجميعات والملخصات المعتمدة</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              حقيبة الطالب للتفوق في القدرات والتحصيلي 📚
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              تصفّح وحمّل أحدث تجميعات 1445-1446، خرائط المفاهيم، وشيتات القوانين المعتمدة للقدرات والتحصيلي.
            </p>
          </div>

          {/* Student Suggestion Action */}
          <div className="shrink-0">
            <Button
              onClick={() => setShowSuggestDialog(true)}
              className="rounded-2xl h-11 px-5 font-bold text-xs gap-2 bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>اقترح إضافة ملف أو تجميعة 💡</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Controls: Search & Category Chips ─── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم التجميعة، المادة، أو الوسم..."
            className="pr-10 rounded-2xl border-border/60 bg-card/60 h-11 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Count */}
        <div className="text-xs font-semibold text-muted-foreground px-1 self-center sm:self-auto">
          إجمالي المصادر المعروضة: <span className="text-foreground font-bold">{filteredFiles.length}</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => { setSelectedCategory("الكل"); setOnlyFavorites(false); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
            selectedCategory === "الكل" && !onlyFavorites
              ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
              : "bg-card/70 text-muted-foreground hover:text-foreground border-border/50 hover:bg-muted/50"
          }`}
        >
          الكل ({files.length})
        </button>

        <button
          onClick={() => setOnlyFavorites(!onlyFavorites)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border flex items-center gap-1.5 ${
            onlyFavorites
              ? "bg-amber-500 text-white border-amber-500 shadow-sm scale-[1.02]"
              : "bg-card/70 text-muted-foreground hover:text-foreground border-border/50 hover:bg-muted/50"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${onlyFavorites ? "fill-white" : "text-amber-500"}`} />
          <span>المفضلة</span>
        </button>

        {categories.map((cat) => {
          const isActive = selectedCategory === cat && !onlyFavorites;
          return (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setOnlyFavorites(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                  : "bg-card/70 text-muted-foreground hover:text-foreground border-border/50 hover:bg-muted/50"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ─── Files Grid ─── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-16 text-center rounded-3xl border border-dashed border-border/60 bg-card/30 flex flex-col items-center justify-center gap-3">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          <h3 className="font-bold text-base text-foreground">لا توجد ملفات تطابق بحثك</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            جرب البحث بكلمات أخرى أو تصفح التصنيفات الأخرى.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("الكل"); setOnlyFavorites(false); }} className="rounded-xl mt-2 font-bold text-xs">
            إعادة تعيين الفلاتر
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredFiles.map((file) => (
              <motion.div
                key={file.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="group relative flex flex-col justify-between rounded-2xl p-5 border border-border/60 bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-300"
              >
                <div>
                  {/* Category badge, size & custom actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge variant="secondary" className="text-[11px] font-bold rounded-lg px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                      {file.category}
                    </Badge>
                    
                    <div className="flex items-center gap-1">
                      {file.size && (
                        <span className="text-[11px] font-semibold text-muted-foreground ml-1">
                          {file.size}
                        </span>
                      )}

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(file.id, e)}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                          file.isFavorite ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground/50 hover:text-amber-500 hover:bg-muted"
                        }`}
                        title={file.isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                      >
                        <Star className={`h-3.5 w-3.5 ${file.isFavorite ? "fill-amber-500" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Title & Subject */}
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                    {file.title}
                  </h3>
                  {file.subject && (
                    <p className="text-xs text-primary/80 font-medium mt-1">
                      {file.subject}
                    </p>
                  )}

                  {/* Description */}
                  {file.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                      {file.description}
                    </p>
                  )}


                  {/* Tags */}
                  {file.tags && file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {file.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                      {file.tags.length > 3 && (
                        <span className="text-[10px] font-medium text-muted-foreground self-center">
                          +{file.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 pt-4 mt-4 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewFile(file)}
                    className="flex-1 rounded-xl h-9 text-xs font-bold gap-1 hover:bg-primary/5 hover:text-primary"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>معاينة</span>
                  </Button>

                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={file.title}
                    className="flex-1"
                  >
                    <Button
                      size="sm"
                      className="w-full rounded-xl h-9 text-xs font-bold gap-1 shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>تحميل</span>
                    </Button>
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Document Preview Modal ─── */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-6 rounded-3xl" dir="rtl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {previewFile?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {previewFile?.subject} • {previewFile?.category}
              </DialogDescription>
            </div>
            {previewFile && (
              <a
                href={previewFile.url}
                target="_blank"
                rel="noopener noreferrer"
                download={previewFile.title}
              >
                <Button size="sm" className="rounded-xl gap-2 font-bold text-xs">
                  <Download className="h-3.5 w-3.5" />
                  <span>تحميل الملف الأصلي</span>
                </Button>
              </a>
            )}
          </DialogHeader>

          <div className="flex-1 rounded-2xl overflow-hidden bg-muted/20 border border-border/50 relative mt-3 flex items-center justify-center">
            {previewFile?.url.startsWith("data:image") ? (
              <img
                src={previewFile.url}
                alt={previewFile.title}
                className="max-h-full max-w-full object-contain"
              />
            ) : previewFile?.url.includes(".pdf") || previewFile?.url.startsWith("data:application/pdf") ? (
              <iframe
                src={`${previewFile.url}#toolbar=0`}
                className="w-full h-full border-0 rounded-2xl"
                title={previewFile.title}
              />
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileText className="h-16 w-16 text-primary/40 mx-auto" />
                <h4 className="font-bold text-base text-foreground">معاينة الملف المباشر</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  يمكنك فتح الملف أو تحميله مباشرة للاطلاع على المحتوى كاملاً.
                </p>
                <a
                  href={previewFile?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>فتح في تبويب جديد</span>
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Suggestion Dialog */}
      <StudentSuggestDialog
        isOpen={showSuggestDialog}
        onClose={() => setShowSuggestDialog(false)}
        defaultType="file"
        defaultCategory={selectedCategory === "الكل" ? "تجميعات" : selectedCategory}
      />
    </div>
  );
}
