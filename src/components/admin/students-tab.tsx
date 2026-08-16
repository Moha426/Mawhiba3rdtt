import { useState } from "react";
import {
  useListStudents,
  useAdminUpdateStudent,
  useDeleteStudent,
  useGenerateRecoveryCode,
  getListStudentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { LoadingSpinner } from "@/components/loading-state";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Student {
  id: number;
  username: string;
  displayName: string;
  profilePicture?: string | null;
  role: string;
}

export function StudentsTab() {
  const { data: students = [], isLoading } = useListStudents();
  const qc = useQueryClient();
  const { toast } = useToast();

  const updateStudent = useAdminUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const generateCode = useGenerateRecoveryCode();

  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", username: "", password: "" });
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<{ student: Student; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });

  const openEdit = (s: Student) => {
    setEditStudent(s);
    setEditForm({ displayName: s.displayName, username: s.username, password: "" });
  };

  const handleEdit = () => {
    if (!editStudent) return;
    const data: { displayName?: string; newUsername?: string; newPassword?: string } = {};
    if (editForm.displayName !== editStudent.displayName) data.displayName = editForm.displayName;
    if (editForm.username !== editStudent.username) data.newUsername = editForm.username;
    if (editForm.password) data.newPassword = editForm.password;

    updateStudent.mutate(
      { id: editStudent.id, data },
      {
        onSuccess: () => {
          invalidate();
          setEditStudent(null);
          toast({ title: "تم تحديث بيانات الطالب" });
        },
        onError: (err: any) => {
          toast({
            title: "خطأ",
            description: err?.response?.data?.error || "حدث خطأ أثناء التحديث",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteStudent.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          invalidate();
          setDeleteTarget(null);
          toast({ title: "تم حذف الطالب" });
        },
        onError: () => {
          toast({ title: "خطأ", description: "لم يتم الحذف", variant: "destructive" });
        },
      }
    );
  };

  const handleGenerateCode = (s: Student) => {
    generateCode.mutate(
      { id: s.id },
      {
        onSuccess: (data: any) => {
          setRecoveryCode({ student: s, code: data.code });
        },
        onError: () => {
          toast({ title: "خطأ", description: "لم يتم توليد الكود", variant: "destructive" });
        },
      }
    );
  };

  const copyCode = () => {
    if (!recoveryCode) return;
    navigator.clipboard.writeText(recoveryCode.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading)
    return (
      <div className="py-16 flex justify-center">
        <LoadingSpinner />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          إدارة الطلاب
        </h2>
        <Badge variant="secondary" className="rounded-full px-3">
          {students.length} طالب
        </Badge>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>لا يوجد طلاب مسجلون حتى الآن</p>
        </div>
      ) : (
        <motion.div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {students.map((s) => (
            <motion.div
              key={s.id}
              layout
              className="bg-card border border-border/50 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                {s.profilePicture ? (
                  <img
                    src={s.profilePicture}
                    alt={s.displayName}
                    className="h-10 w-10 rounded-full object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="font-semibold text-sm truncate">{s.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">
                    @{s.username}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1 border-t border-border/30">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 rounded-xl text-xs h-8"
                  onClick={() => openEdit(s)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 rounded-xl text-xs h-8 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  onClick={() => handleGenerateCode(s)}
                  disabled={generateCode.isPending}
                >
                  {generateCode.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  كود
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10 p-0"
                  onClick={() => setDeleteTarget(s)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(o) => !o && setEditStudent(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الطالب</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                dir="ltr"
                className="text-left rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة مرور جديدة (اتركها فارغة إن لم تُغيّرها)</Label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="6 أحرف على الأقل"
                dir="ltr"
                className="text-left rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)} className="rounded-xl">
              إلغاء
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateStudent.isPending}
              className="rounded-xl"
            >
              {updateStudent.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الطالب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الطالب "{deleteTarget?.displayName}"؟ لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={handleDelete}
            >
              {deleteStudent.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recovery Code Dialog */}
      <Dialog open={!!recoveryCode} onOpenChange={(o) => !o && setRecoveryCode(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              كود الاسترداد
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              كود الاسترداد للطالب <strong>{recoveryCode?.student.displayName}</strong>. صالح لمدة ساعة.
            </p>
            <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-4 py-3">
              <code className="flex-1 font-mono text-xl tracking-widest text-center text-primary font-bold" dir="ltr">
                {recoveryCode?.code}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg shrink-0"
                onClick={copyCode}
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">سلّم هذا الكود للطالب لاستعادة الوصول إلى حسابه.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setRecoveryCode(null)} className="w-full rounded-xl">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
