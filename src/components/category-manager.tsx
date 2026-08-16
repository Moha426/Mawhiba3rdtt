import { useState } from "react";
import { Plus, X, Tag, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onSaveCategories: (newCategories: string[]) => void;
  title?: string;
  description?: string;
}

export function CategoryManager({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
  title = "إدارة وتخصيص التصنيفات",
  description = "يمكنك إضافة تصنيفات جديدة لتنظيم المحتوى أو حذف التصنيفات التي لا تحتاجها."
}: CategoryManagerProps) {
  const [cats, setCats] = useState<string[]>(categories);
  const [newCatInput, setNewCatInput] = useState("");

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (cats.includes(trimmed)) return;
    
    const updated = [...cats, trimmed];
    setCats(updated);
    onSaveCategories(updated);
    setNewCatInput("");
  };

  const handleDelete = (catToDelete: string) => {
    const updated = cats.filter(c => c !== catToDelete);
    setCats(updated);
    onSaveCategories(updated);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Add new category form */}
        <form onSubmit={handleAdd} className="flex items-center gap-2 mt-3">
          <Input
            value={newCatInput}
            onChange={(e) => setNewCatInput(e.target.value)}
            placeholder="اكتب اسم التصنيف الجديد..."
            className="rounded-xl h-10 text-xs"
          />
          <Button type="submit" size="sm" className="rounded-xl h-10 px-4 gap-1.5 font-bold shrink-0">
            <Plus className="h-4 w-4" />
            <span>إضافة</span>
          </Button>
        </form>

        {/* Categories list */}
        <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-1">
          <label className="text-xs font-bold text-muted-foreground block mb-2">التصنيفات الحالية ({cats.length}):</label>
          <div className="flex flex-wrap gap-2">
            {cats.map((cat) => (
              <div
                key={cat}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-card text-xs font-semibold text-foreground hover:border-primary/50 transition-colors shadow-xs"
              >
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  className="text-muted-foreground/60 hover:text-rose-500 transition-colors p-0.5 rounded-md"
                  title="حذف هذا التصنيف"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl px-5 font-bold">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
