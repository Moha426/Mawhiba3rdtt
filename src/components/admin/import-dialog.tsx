import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCreateAssignment, useCreateSubject, useListSubjects, getListAssignmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportData {
  exportedAt?: string;
  subjects?: Array<{ id: number; name: string; color: string; teacherName?: string | null }>;
  assignments?: Array<{
    id: number;
    title: string;
    subjectId: number;
    type: string;
    description?: string | null;
    priority: string;
    assignedDate: string;
    dueDate: string;
    attachmentLinks?: string[];
    examType?: string | null;
    pageNumber?: string | null;
  }>;
}

interface ImportSummary {
  subjectsToImport: number;
  assignmentsToImport: number;
  exportedAt?: string;
}

type ImportStatus = "idle" | "parsed" | "importing" | "done" | "error";

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: existingSubjects } = useListSubjects();
  const createSubject = useCreateSubject();
  const createAssignment = useCreateAssignment();

  const [status, setStatus] = useState<ImportStatus>("idle");
  const [parsedData, setParsedData] = useState<ExportData | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [results, setResults] = useState({ subjects: 0, assignments: 0, skipped: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text) as ExportData;
        if (!data.subjects && !data.assignments) {
          throw new Error("الملف لا يحتوي على بيانات مواد أو مهام");
        }
        setParsedData(data);
        setSummary({
          subjectsToImport: data.subjects?.length ?? 0,
          assignmentsToImport: data.assignments?.length ?? 0,
          exportedAt: data.exportedAt,
        });
        setStatus("parsed");
        setErrorMsg("");
      } catch (err: any) {
        setErrorMsg(err.message || "تعذّر قراءة الملف");
        setStatus("error");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsedData) return;
    setStatus("importing");
    setProgress({ done: 0, total: 0, label: "جاري الاستيراد..." });

    const subjectIdMap: Record<number, number> = {};
    let importedSubjects = 0;
    let importedAssignments = 0;
    let skipped = 0;

    const existingByName: Record<string, number> = {};
    existingSubjects?.forEach(s => { existingByName[s.name] = s.id; });

    const subjectsToImport = parsedData.subjects ?? [];
    const assignmentsToImport = parsedData.assignments ?? [];
    const total = subjectsToImport.length + assignmentsToImport.length;

    setProgress({ done: 0, total, label: "استيراد المواد..." });

    for (const sub of subjectsToImport) {
      if (existingByName[sub.name]) {
        subjectIdMap[sub.id] = existingByName[sub.name];
        skipped++;
      } else {
        try {
          const created = await new Promise<{ id: number }>((resolve, reject) => {
            createSubject.mutate(
              { data: { name: sub.name, color: sub.color, teacherName: sub.teacherName ?? undefined } } as any,
              { onSuccess: (d) => resolve(d as any), onError: reject }
            );
          });
          subjectIdMap[sub.id] = created.id;
          existingByName[sub.name] = created.id;
          importedSubjects++;
        } catch {
          skipped++;
        }
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    setProgress(prev => ({ ...prev, label: "استيراد المهام..." }));

    for (const asgn of assignmentsToImport) {
      const newSubjectId = subjectIdMap[asgn.subjectId];
      if (!newSubjectId) {
        skipped++;
        setProgress(p => ({ ...p, done: p.done + 1 }));
        continue;
      }
      try {
        await new Promise<void>((resolve, reject) => {
          createAssignment.mutate(
            {
              data: {
                title: asgn.title,
                subjectId: newSubjectId,
                type: asgn.type,
                description: asgn.description ?? undefined,
                priority: asgn.priority,
                assignedDate: asgn.assignedDate,
                dueDate: asgn.dueDate,
                attachmentLinks: asgn.attachmentLinks,
                examType: asgn.examType ?? undefined,
                pageNumber: asgn.pageNumber ?? undefined,
              },
            } as any,
            { onSuccess: () => resolve(), onError: reject }
          );
        });
        importedAssignments++;
      } catch {
        skipped++;
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
    setResults({ subjects: importedSubjects, assignments: importedAssignments, skipped });
    setStatus("done");
    toast({ title: `تم الاستيراد: ${importedSubjects} مادة، ${importedAssignments} مهمة` });
  };

  const handleReset = () => {
    setStatus("idle");
    setParsedData(null);
    setSummary(null);
    setErrorMsg("");
    setResults({ subjects: 0, assignments: 0, skipped: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) handleReset(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>استيراد البيانات</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {status === "idle" && (
            <>
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <span>
                  استورد ملف JSON الصادر من "تصدير البيانات". سيتم إضافة المواد الجديدة تلقائياً، والمواد الموجودة مسبقاً ستُستخدم دون تكرار.
                </span>
              </div>
              <label
                htmlFor="import-file-input"
                className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <FileJson className="h-10 w-10 text-muted-foreground opacity-50" />
                <div className="text-center">
                  <p className="text-sm font-medium">اضغط لاختيار ملف JSON</p>
                  <p className="text-xs text-muted-foreground mt-1">ملف التصدير فقط</p>
                </div>
              </label>
              <input
                id="import-file-input"
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={handleFileChange}
              />
            </>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {status === "parsed" && summary && (
            <div className="space-y-3">
              <div className="bg-muted/30 rounded-xl border p-4 space-y-2">
                <p className="text-sm font-semibold">محتوى الملف:</p>
                <div className="flex gap-6 text-sm">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary">{summary.subjectsToImport}</span>
                    <span className="text-xs text-muted-foreground">مادة</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-primary">{summary.assignmentsToImport}</span>
                    <span className="text-xs text-muted-foreground">مهمة</span>
                  </div>
                </div>
                {summary.exportedAt && (
                  <p className="text-xs text-muted-foreground">
                    تاريخ التصدير: {new Date(summary.exportedAt).toLocaleDateString("ar-SA")}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                المواد الموجودة مسبقاً لن تُضاف مجدداً.
              </p>
            </div>
          )}

          {status === "importing" && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">{progress.label}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%" }}
                />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {progress.done} / {progress.total}
              </p>
            </div>
          )}

          {status === "done" && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">اكتمل الاستيراد!</span>
              </div>
              <div className="bg-muted/30 rounded-xl border p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مواد جديدة:</span>
                  <span className="font-bold text-primary">{results.subjects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مهام مضافة:</span>
                  <span className="font-bold text-primary">{results.assignments}</span>
                </div>
                {results.skipped > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تخطّي (مكرر/خطأ):</span>
                    <span className="font-bold text-muted-foreground">{results.skipped}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {status === "done" || status === "error" ? (
            <Button variant="outline" onClick={handleReset} className="rounded-xl">
              استيراد آخر
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => { onOpenChange(false); handleReset(); }} className="rounded-xl">
            إغلاق
          </Button>
          {status === "parsed" && (
            <Button onClick={handleImport} className="rounded-xl gap-2">
              <Upload className="h-4 w-4" />
              بدء الاستيراد
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
