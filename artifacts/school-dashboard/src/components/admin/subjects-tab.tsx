import { useState } from "react";
import { 
  useListSubjects, 
  useCreateSubject, 
  useUpdateSubject, 
  useDeleteSubject,
  getListSubjectsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Tag, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";

const SUBJECT_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#ef4444",
  "#06b6d4", "#a855f7", "#22c55e", "#f59e0b", "#ec4899",
  "#14b8a6", "#6366f1", "#e11d48", "#0ea5e9", "#d97706",
  "#7c3aed", "#16a34a", "#dc2626", "#2563eb", "#059669",
];

function randomSubjectColor() {
  return SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)];
}

function displayTeacherName(name: string | null | undefined) {
  if (!name) return null;
  if (name.startsWith("أ.") || name.startsWith("أ ")) return name;
  return `أ. ${name}`;
}

export function SubjectsTab() {
  const { data: subjects, isLoading } = useListSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#4f46e5");
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");

  const handleOpenNew = () => {
    setEditingId(null);
    setName("");
    setColor(randomSubjectColor());
    setTeacherName("");
    setTeacherPhone("");
    setIsOpen(true);
  };

  const handleOpenEdit = (subject: any) => {
    setEditingId(subject.id);
    setName(subject.name);
    setColor(subject.color || "#4f46e5");
    setTeacherName(subject.teacherName ?? "");
    setTeacherPhone(subject.teacherPhone ?? "");
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const data = {
      name,
      color,
      teacherName: teacherName || undefined,
      teacherPhone: teacherPhone || undefined,
    };

    if (editingId) {
      updateSubject.mutate({ id: editingId, data } as any, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          setIsOpen(false);
          toast({ title: "تم التحديث بنجاح" });
        }
      });
    } else {
      createSubject.mutate({ data } as any, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          setIsOpen(false);
          toast({ title: "تمت الإضافة بنجاح" });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذه المادة؟ سيتم حذف جميع المهام المرتبطة بها.")) {
      deleteSubject.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          toast({ title: "تم الحذف بنجاح" });
        }
      });
    }
  };

  if (isLoading) return <div className="py-12 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">المواد الدراسية</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة مادة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل المادة" : "إضافة مادة جديدة"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم المادة</label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="مثال: الرياضيات" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم المعلم/المعلمة</label>
                <Input
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  placeholder="مثال: محمد العتيبي"
                />
                {teacherName && (
                  <p className="text-xs text-muted-foreground">سيظهر كـ: <span className="font-medium text-foreground">{displayTeacherName(teacherName)}</span></p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <span>💬</span>
                  رقم واتساب المعلم/المعلمة (اختياري)
                </label>
                <Input
                  value={teacherPhone}
                  onChange={e => setTeacherPhone(e.target.value)}
                  placeholder="مثال: 966501234567"
                  type="tel"
                  dir="ltr"
                />
                {teacherPhone && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    💬 wa.me/{teacherPhone.replace(/\D/g, "")}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">اللون المميز</label>
                <div className="flex gap-2 items-center">
                  <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 h-10 p-1 cursor-pointer shrink-0" />
                  <Input type="text" value={color} onChange={e => setColor(e.target.value)} dir="ltr" className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setColor(randomSubjectColor())}
                    className="shrink-0 text-xs"
                  >
                    عشوائي
                  </Button>
                </div>
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {SUBJECT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: c,
                        borderColor: color === c ? "#000" : "transparent",
                      }}
                    />
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createSubject.isPending || updateSubject.isPending}>
                  حفظ
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects?.map(subject => (
          <Card key={subject.id} className="overflow-hidden border-r-4" style={{ borderRightColor: subject.color }}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tag className="h-4 w-4 shrink-0" style={{ color: subject.color }} />
                {subject.name}
              </CardTitle>
              {subject.teacherName && (
                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                  {displayTeacherName(subject.teacherName)}
                </p>
              )}
              {(subject as any).teacherPhone && (
                <a
                  href={`https://wa.me/${(subject as any).teacherPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors mt-0.5 w-fit"
                  dir="ltr"
                >
                  <span>💬</span>
                  واتساب المعلم
                </a>
              )}
            </CardHeader>
            <CardFooter className="p-4 pt-4 flex gap-2 border-t mt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenEdit(subject)}>
                <Edit className="h-4 w-4 ml-2" /> تعديل
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(subject.id)}>
                <Trash2 className="h-4 w-4 ml-2" /> حذف
              </Button>
            </CardFooter>
          </Card>
        ))}
        {subjects?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
            لا توجد مواد دراسية حتى الآن.
          </div>
        )}
      </div>
    </div>
  );
}
