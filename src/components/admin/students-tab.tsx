import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Edit,
  Trash2,
  KeyRound,
  UserCircle,
  Loader2,
  Copy,
  Check,
  UserPlus,
  Mail,
  Lock,
  Search,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  subscribeToStudents, 
  registerOrUpdateStudent, 
  deleteStudentRecord, 
  type StudentRecord 
} from "@/lib/students-manager";

export function StudentsTab() {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add Student Dialog State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ displayName: "", email: "", password: "", username: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Edit Student Dialog State
  const [editStudent, setEditStudent] = useState<StudentRecord | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", email: "", password: "", username: "" });

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);

  // Show password toggle
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const unsub = subscribeToStudents((list) => {
      setStudents(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreateStudent = async () => {
    if (!addForm.displayName.trim()) {
      toast({ title: "تنبيه", description: "يرجى كتابة اسم الطالب", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const cleanEmail = addForm.email.trim() || `${addForm.displayName.replace(/\s+/g, "_")}@student.talented.app`;
      const cleanPass = addForm.password.trim() || "123456";
      const cleanUser = addForm.username.trim() || cleanEmail.split("@")[0];

      await registerOrUpdateStudent({
        displayName: addForm.displayName.trim(),
        email: cleanEmail,
        password: cleanPass,
        username: cleanUser,
      });

      toast({
        title: "تم إضافة الطالب بنجاح 🎉",
        description: `تم إنشاء حساب الطالب (${addForm.displayName}) وتسجيله في النظام.`,
      });

      setAddForm({ displayName: "", email: "", password: "", username: "" });
      setIsAddOpen(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: "فشل حفظ بيانات الطالب", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStudent = async () => {
    if (!editStudent) return;
    setIsSaving(true);
    try {
      await registerOrUpdateStudent({
        id: editStudent.id,
        displayName: editForm.displayName.trim() || editStudent.displayName,
        email: editForm.email.trim() || editStudent.email,
        password: editForm.password.trim() || editStudent.password,
        username: editForm.username.trim() || editStudent.username,
      });

      toast({ title: "تم تحديث بيانات الطالب بنجاح" });
      setEditStudent(null);
    } catch {
      toast({ title: "خطأ", description: "فشل تحديث البيانات", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStudentRecord(deleteTarget.id);
      toast({ title: "تم حذف الطالب من النظام" });
      setDeleteTarget(null);
    } catch {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  const toggleShowPassword = (id: number) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 rounded-3xl border border-primary/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-0 font-bold px-3 py-1 text-xs">
              نظام التسجيل الذكي
            </Badge>
            <span className="text-xs text-muted-foreground font-semibold">تزامن سحابي مباشر ⚡</span>
          </div>
          <h2 className="text-2xl font-black flex items-center gap-2.5 text-foreground">
            <Users className="h-6 w-6 text-primary" />
            سجل الطلاب والاشتراكات ({students.length})
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            يتم تسجيل كافة الطلاب عبر البريد وكلمة المرور تلقائياً هنا مع إمكانية إضافة وإدارة الحسابات.
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="h-11 px-5 rounded-2xl font-extrabold bg-primary text-primary-foreground shadow-lg shadow-primary/20 gap-2 shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>إضافة طالب جديد</span>
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم، البريد أو اسم المستخدم..."
          className="pr-10 h-11 rounded-2xl bg-card border-border/60"
        />
      </div>

      {/* Students List Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-xs text-muted-foreground font-semibold">جاري تحضير قائمة الطلاب المزامنة...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-16 bg-card/40 border border-dashed border-border rounded-3xl p-8">
          <UserCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-bold text-lg">لا يوجد طلاب مسجلون حالياً</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            سيظهر أي طالب يقوم بإنشاء حساب في المنصة فوراً هنا، أو يمكنك إضافة طالب جديد يدوياً الآن.
          </p>
          <Button onClick={() => setIsAddOpen(true)} className="mt-4 rounded-xl font-bold gap-2">
            <UserPlus className="h-4 w-4" />
            إضافة حساب طالب
          </Button>
        </div>
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence>
            {filteredStudents.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card border border-border/60 hover:border-primary/40 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shrink-0 text-primary font-black text-lg shadow-inner">
                    {s.displayName ? s.displayName.charAt(0) : "ط"}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="font-bold text-base truncate text-foreground">{s.displayName}</h3>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 rounded-md font-mono shrink-0">
                        #{s.id}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                        <span className="truncate" dir="ltr">{s.email || `${s.username}@talented.app`}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-500/80 shrink-0" />
                        <span className="font-mono text-[11px]">
                          {showPasswordMap[s.id] ? (s.password || "123456") : "••••••••"}
                        </span>
                        <button
                          onClick={() => toggleShowPassword(s.id)}
                          className="text-[10px] text-primary underline hover:text-primary/80 mr-auto"
                        >
                          {showPasswordMap[s.id] ? "إخفاء" : "إظهار"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-3 border-t border-border/40 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <strong className="text-foreground">{s.points || 350}</strong> نقطة
                  </span>
                  <span className="text-[11px]">
                    {new Date(s.createdAt).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 rounded-xl text-xs h-9 font-bold"
                    onClick={() => {
                      setEditStudent(s);
                      setEditForm({
                        displayName: s.displayName,
                        email: s.email || "",
                        password: s.password || "",
                        username: s.username || "",
                      });
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                    تعديل
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 p-0"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add Student Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              تسجيل طالب جديد في المنصة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">اسم الطالب الكامل *</Label>
              <Input
                value={addForm.displayName}
                onChange={(e) => setAddForm(f => ({ ...f, displayName: e.target.value }))}
                placeholder="مثال: محمد علي الغامدي"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">البريد الإلكتروني (اختياري)</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))}
                placeholder="student@example.com"
                dir="ltr"
                className="rounded-xl h-11 text-left"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">كلمة المرور (اختياري)</Label>
              <Input
                type="text"
                value={addForm.password}
                onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))}
                placeholder="مثال: 123456"
                dir="ltr"
                className="rounded-xl h-11 text-left"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleCreateStudent}
              disabled={isSaving}
              className="rounded-xl font-bold bg-primary text-primary-foreground shadow-md"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ وتأكيد الحساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(o) => !o && setEditStudent(null)}>
        <DialogContent className="max-w-md rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              تعديل بيانات الطالب #{editStudent?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">اسم الطالب</Label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">البريد الإلكتروني</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                dir="ltr"
                className="rounded-xl h-11 text-left"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">كلمة المرور الجديدة</Label>
              <Input
                type="text"
                value={editForm.password}
                onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))}
                placeholder="اتركها كما هي للحفاظ عليها"
                dir="ltr"
                className="rounded-xl h-11 text-left"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditStudent(null)} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleEditStudent}
              disabled={isSaving}
              className="rounded-xl font-bold bg-primary text-primary-foreground shadow-md"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl" className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">حذف حساب الطالب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف حساب الطالب "{deleteTarget?.displayName}"؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
              onClick={handleDelete}
            >
              حذف الحساب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
