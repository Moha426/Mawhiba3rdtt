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
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Tag, MapPin, X, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";

const SUBJECT_COLORS = [
  "#2563eb", // أزرق هادئ (Slate Blue)
  "#5b21b6", // بنفسجي رصين (Deep Violet)
  "#991b1b", // قرمزي دافئ (Warm Crimson)
  "#166534", // أخضر صنوبري هادئ (Forest Pine)
  "#b45309", // عنبري ذهبي (Golden Amber)
  "#0284c7", // سماوي بحري (Maritime Blue)
  "#0f766e", // تيل فارسي (Persian Teal)
  "#9a3412", // فخاري أرضي (Warm Terracotta)
  "#3730a3", // نيلي تقني هادئ (Tech Slate Indigo)
  "#3f6212", // زيتوني وقور (Deep Olive)
  "#701a75", // برقوقي غامق (Muted Plum - غير وردي)
  "#334155", // فحمي هادئ (Slate Charcoal - كتابة وتعبير)
  "#0e7490", // تيل علمي (Scientific Teal - بحوث علمية)
  "#78350f", // حجري أرضي (Mineral Stone - جيولوجيا)
];

function randomSubjectColor() {
  return SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)];
}

function displayTeacherName(name: string | null | undefined) {
  if (!name) return null;
  if (name.startsWith("أ.") || name.startsWith("أ ") || name.startsWith("د.") || name.startsWith("د ") || name.startsWith("Mr.")) return name;
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
  const [rooms, setRooms] = useState<string[]>([]);
  const [newRoomInput, setNewRoomInput] = useState("");

  const handleOpenNew = () => {
    setEditingId(null);
    setName("");
    setColor(randomSubjectColor());
    setTeacherName("");
    setTeacherPhone("");
    setRooms([]);
    setNewRoomInput("");
    setIsOpen(true);
  };

  const handleOpenEdit = (subject: any) => {
    setEditingId(subject.id);
    setName(subject.name);
    setColor(subject.color || "#4f46e5");
    setTeacherName(subject.teacherName ?? "");
    setTeacherPhone(subject.teacherPhone ?? "");
    setRooms(Array.isArray(subject.rooms) ? [...subject.rooms] : (subject.room ? [subject.room] : []));
    setNewRoomInput("");
    setIsOpen(true);
  };

  const handleAddRoom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newRoomInput.trim();
    if (trimmed && !rooms.includes(trimmed)) {
      setRooms([...rooms, trimmed]);
      setNewRoomInput("");
    }
  };

  const handleRemoveRoom = (roomToRemove: string) => {
    setRooms(rooms.filter(r => r !== roomToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    // If user typed a room in the input without pressing Enter, add it
    const finalRooms = [...rooms];
    if (newRoomInput.trim() && !finalRooms.includes(newRoomInput.trim())) {
      finalRooms.push(newRoomInput.trim());
    }

    const data = {
      name,
      color,
      teacherName: teacherName || undefined,
      teacherPhone: teacherPhone || undefined,
      rooms: finalRooms,
    };

    if (editingId) {
      updateSubject.mutate({ id: editingId, data } as any, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          setIsOpen(false);
          toast({ title: "تم تحديث المادة والقاعات بنجاح ✨" });
        }
      });
    } else {
      createSubject.mutate({ data } as any, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
          setIsOpen(false);
          toast({ title: "تمت إضافة المادة بنجاح ✨" });
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteSubject.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
        toast({ title: "تم حذف المادة بنجاح 🗑️" });
      },
      onError: (err: any) => {
        toast({ title: "فشل الحذف", description: err?.message ?? "خطأ غير معروف", variant: "destructive" });
      }
    });
  };

  if (isLoading) return <div className="py-12 flex justify-center"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">المواد الدراسية والقاعات</h2>
          <p className="text-xs text-muted-foreground mt-0.5">إدارة المواد، أسماء المعلمين، أرقام التواصل، والقاعات المرتبطة بكل مادة</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenNew} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة مادة وقاعات
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل المادة والقاعات" : "إضافة مادة جديدة"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم المادة <span className="text-destructive">*</span></label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="مثال: الرياضيات" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  اسم المعلم/المعلمة
                </label>
                <Input
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  placeholder="مثال: محمد العتيبي"
                />
                {teacherName && (
                  <p className="text-xs text-muted-foreground">سيظهر في الجدول كـ: <span className="font-medium text-foreground">{displayTeacherName(teacherName)}</span></p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <span>💬</span>
                  رقم جوال / واتساب المعلم (اختياري)
                </label>
                <Input
                  value={teacherPhone}
                  onChange={e => setTeacherPhone(e.target.value)}
                  placeholder="مثال: 0501234567 أو 966501234567"
                  type="tel"
                  dir="ltr"
                />
                {teacherPhone && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                    واتساب: wa.me/{teacherPhone.replace(/\D/g, "")}
                  </p>
                )}
              </div>

              {/* Multiple Rooms Management */}
              <div className="space-y-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                <label className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  القاعات المرتبطة بالمادة
                </label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  يمكنك ربط أكثر من قاعة لنفس المادة (مثال: قاعة 101، معمل الحاسب)، واختيار القاعة المناسبة في كل حصة بالجدول. وإذا كانت قاعة واحدة فقط ستُعين تلقائياً كافتراضية.
                </p>

                <div className="flex gap-2">
                  <Input
                    value={newRoomInput}
                    onChange={e => setNewRoomInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddRoom();
                      }
                    }}
                    placeholder="اكتب اسم القاعة واضغط إضافة (مثال: قاعة 101)..."
                    className="text-xs"
                  />
                  <Button type="button" size="sm" onClick={() => handleAddRoom()} variant="secondary" className="shrink-0 text-xs">
                    <Plus className="h-3.5 w-3.5 ml-1" /> إضافة
                  </Button>
                </div>

                {rooms.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rooms.map((room, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1.5 py-1 px-2.5 bg-card text-xs font-normal border-primary/30">
                        <MapPin className="h-3 w-3 text-primary" />
                        <span>{room}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRoom(room)}
                          className="hover:text-destructive text-muted-foreground mr-0.5"
                          title="حذف القاعة"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">لم تتم إضافة أي قاعات بعد (اختياري).</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">اللون المميز</label>
                <div className="flex gap-2 items-center">
                  <Input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 h-10 p-1 cursor-pointer shrink-0" />
                  <Input type="text" value={color} onChange={e => setColor(e.target.value)} dir="ltr" className="flex-1 font-mono text-xs" />
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

              <DialogFooter className="pt-2">
                <Button type="submit" disabled={createSubject.isPending || updateSubject.isPending} className="w-full sm:w-auto">
                  حفظ التغييرات
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects?.map(subject => {
          const subjectRooms: string[] = Array.isArray(subject.rooms)
            ? subject.rooms
            : (subject.room ? [subject.room] : []);

          return (
            <Card key={subject.id} className="overflow-hidden border-r-4 hover:shadow-md transition-shadow" style={{ borderRightColor: subject.color }}>
              <CardHeader className="p-4 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-bold">
                    <Tag className="h-4 w-4 shrink-0" style={{ color: subject.color }} />
                    {subject.name}
                  </CardTitle>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                </div>

                {/* Teacher Info */}
                {subject.teacherName ? (
                  <div className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium bg-muted/30 px-2 py-1 rounded-lg">
                    <User className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{displayTeacherName(subject.teacherName)}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground italic">لم يحدد معلم</div>
                )}

                {/* WhatsApp */}
                {(subject as any).teacherPhone && (
                  <a
                    href={`https://wa.me/${(subject as any).teacherPhone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-mono"
                    dir="ltr"
                  >
                    <span>💬</span>
                    {(subject as any).teacherPhone}
                  </a>
                )}

                {/* Rooms List */}
                <div className="pt-1">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mb-1">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <span>القاعات ({subjectRooms.length}):</span>
                  </div>
                  {subjectRooms.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {subjectRooms.map((r, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/50 font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">لا توجد قاعات محددة</span>
                  )}
                </div>
              </CardHeader>

              <CardFooter className="p-3 pt-2 flex gap-2 border-t bg-muted/10">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleOpenEdit(subject)}>
                  <Edit className="h-3.5 w-3.5 ml-1.5" /> تعديل
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(subject.id)}>
                  <Trash2 className="h-3.5 w-3.5 ml-1.5" /> حذف
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {subjects?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
            لا توجد مواد دراسية حتى الآن.
          </div>
        )}
      </div>
    </div>
  );
}

