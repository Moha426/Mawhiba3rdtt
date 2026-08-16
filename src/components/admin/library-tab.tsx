import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Plus, Trash2, Edit, Search, Tag, ExternalLink,
  CheckCircle2, Download, Eye, UploadCloud, RotateCcw, Star,
  BookOpen, Layers, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CategoryManager } from "@/components/category-manager";
import {
  getStudyFiles,
  addStudyFile,
  updateStudyFile,
  deleteStudyFile,
  getLibraryCategories,
  saveLibraryCategories,
  type StudyFile
} from "@/lib/cloud-sync";
import { useToast } from "@/hooks/use-toast";

export function LibraryTab() {
  const { toast } = useToast();
  const [files, setFiles] = useState<StudyFile[]>([]);
  const [categories, setCategories] = useState<string[]>(() => getLibraryCategories());
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFile, setEditingFile] = useState<StudyFile | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [previewFile, setPreviewFile] = useState<StudyFile | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("قدرات كمي");
  const [formSubject, setFormSubject] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTags, setFormTags] = useState("");
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    const data = await getStudyFiles();
    setFiles(data);
    setLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingFile(null);
    setFormTitle("");
    setFormCategory(categories[0] || "قدرات كمي");
    setFormSubject("");
    setFormUrl("");
    setFormDesc("");
    setFormTags("");
    setSelectedFileObj(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (item: StudyFile) => {
    setEditingFile(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormSubject(item.subject || "");
    setFormUrl(item.url);
    setFormDesc(item.description || "");
    setFormTags(item.tags ? item.tags.join(", ") : "");
    setSelectedFileObj(null);
    setShowAddModal(true);
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileObj(file);
      if (!formTitle) {
        setFormTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى كتابة عنوان التجميعة / الملف",
        variant: "destructive"
      });
      return;
    }

    const tagList = formTags
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    if (editingFile) {
      const updated = await updateStudyFile(editingFile.id, {
        title: formTitle.trim(),
        category: formCategory,
        subject: formSubject.trim() || formCategory,
        url: formUrl.trim() || editingFile.url,
        description: formDesc.trim() || editingFile.description,
        tags: tagList.length > 0 ? tagList : [formCategory]
      });

      if (updated) {
        setFiles(prev => prev.map(f => f.id === editingFile.id ? { ...f, ...updated } : f));
        toast({ title: "تم تحديث الملف بنجاح ✏️" });
      }
    } else {
      const created = await addStudyFile({
        title: formTitle.trim(),
        category: formCategory,
        subject: formSubject.trim() || formCategory,
        url: formUrl.trim() || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        size: selectedFileObj ? `${(selectedFileObj.size / (1024 * 1024)).toFixed(1)} MB` : "مرفق دراسي",
        description: formDesc.trim() || "ملف ومصدر دراسي للمذاكرة والتفوق.",
        tags: tagList.length > 0 ? tagList : [formCategory]
      });

      setFiles(prev => [created, ...prev]);
      toast({ title: "تمت إضافة التجميعة إلى المكتبة 📚" });
    }

    setShowAddModal(false);
  };

  const handleDeleteFile = async (id: string) => {
    await deleteStudyFile(id);
    setFiles(prev => prev.filter(f => String(f.id) !== String(id)));
    toast({ title: "تم حذف الملف من المكتبة" });
  };

  const filtered = files.filter(f => {
    const matchCat = selectedCategory === "الكل" || f.category === selectedCategory;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      f.title.toLowerCase().includes(q) ||
      (f.subject && f.subject.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.tags && f.tags.some(t => t.toLowerCase().includes(q)));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/50 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>إدارة مكتبة التجميعات والملخصات</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            رفع وإضافة وتعديل وحذف شيتات القوانين ونماذج وتجميعات القدرات والتحصيلي للطلاب.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleOpenAdd} className="rounded-xl gap-1.5 font-bold h-10 px-4">
            <Plus className="h-4 w-4" />
            <span>إضافة تجميعة / ملف</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowCategoryManager(true)}
            className="rounded-xl gap-1.5 font-bold h-10 px-4"
          >
            <Tag className="h-4 w-4 text-primary" />
            <span>إدارة التصنيفات</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("الكل")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === "الكل"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({files.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالعنوان، المادة، أو الوسم..."
            className="pr-9 h-9 rounded-xl bg-card border-border text-xs"
          />
        </div>
      </div>

      {/* Grid of files */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border p-6">
          <BookOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-foreground">لا توجد ملفات متطابقة</h4>
          <p className="text-xs text-muted-foreground mt-1">اضغط على زر إضافة ملف لرفع مصادر جديدة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <Card
              key={item.id}
              className="p-5 rounded-2xl border-border/60 bg-card hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <Badge variant="secondary" className="text-[11px] font-bold rounded-lg px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                    {item.category}
                  </Badge>

                  {item.size && (
                    <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                      {item.size}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-foreground line-clamp-2 mb-1">
                  {item.title}
                </h3>
                {item.subject && (
                  <p className="text-xs font-semibold text-primary/80 mb-2">
                    {item.subject}
                  </p>
                )}
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                    {item.description}
                  </p>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewFile(item)}
                    className="rounded-xl h-8 px-2.5 text-xs font-bold gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>معاينة</span>
                  </Button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={item.title}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl h-8 px-2.5 text-xs font-bold gap-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>تحميل</span>
                    </Button>
                  </a>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(item)}
                    className="rounded-xl h-8 w-8 p-0"
                    title="تعديل بيانات الملف"
                  >
                    <Edit className="h-3.5 w-3.5 text-primary" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFile(item.id)}
                    className="rounded-xl h-8 w-8 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                    title="حذف الملف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {editingFile ? <Edit className="h-5 w-5 text-primary" /> : <UploadCloud className="h-5 w-5 text-primary" />}
              <span>{editingFile ? "تعديل تفاصيل الملف" : "إضافة تجميعة أو ملف للمكتبة"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              يمكنك رفع ملف PDF جديد أو إدخال رابط خارجي وتحديد المادة والتصنيف.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFileSubmit} className="space-y-3.5 mt-2">
            {!editingFile && (
              <div className="border-2 border-dashed border-border rounded-2xl p-4 text-center hover:border-primary/50 transition-colors bg-muted/20 relative">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileUploadChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center gap-1 pointer-events-none">
                  <FileText className="h-7 w-7 text-primary/70" />
                  <p className="text-xs font-bold text-foreground">
                    {selectedFileObj ? selectedFileObj.name : "اضغط لاختيار ملف من جهازك"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">يدعم PDF والمستندات</p>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">عنوان الملف / التجميعة *</label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="مثال: تجميعات المحوسب النموذجية"
                className="rounded-xl text-xs h-10"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">رابط خارجي (اختياري)</label>
              <Input
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="أدخل رابط الملف أو المقطع إذا لم تقم برفع ملف"
                className="rounded-xl text-xs h-10"
                type="url"
                dir="ltr"
              />
            </div>


            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">التصنيف</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-background border border-input text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">المادة / الموضوع</label>
                <Input
                  value={formSubject}
                  onChange={e => setFormSubject(e.target.value)}
                  placeholder="مثال: الهندسة، الجبر"
                  className="rounded-xl text-xs h-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">رابط الملف المباشر (اختياري)</label>
              <Input
                value={formUrl}
                onChange={e => setFormUrl(e.target.value)}
                placeholder="https://example.com/file.pdf"
                dir="ltr"
                className="rounded-xl text-xs h-10 text-left font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">الوصف</label>
              <Input
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="وصف محتوى الملف..."
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">الوسوم (مفصولة بفواصل)</label>
              <Input
                value={formTags}
                onChange={e => setFormTags(e.target.value)}
                placeholder="مثال: قدرات، كمي، تجميعات"
                className="rounded-xl text-xs h-10"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl text-xs font-bold"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={!formTitle.trim()}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{editingFile ? "حفظ التعديلات" : "إضافة للمكتبة"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Manager */}
      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        categories={categories}
        onSaveCategories={newCats => {
          setCategories(newCats);
          saveLibraryCategories(newCats);
          toast({ title: "تم تحديث تصنيفات المكتبة 🏷️" });
        }}
        title="إدارة وتخصيص تصنيفات المكتبة"
      />

      {/* Document Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={open => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-6 rounded-3xl" dir="rtl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
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
                  <span>تحميل الملف</span>
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
    </div>
  );
}
