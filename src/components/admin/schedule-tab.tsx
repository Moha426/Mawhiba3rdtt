import { useState, Fragment } from "react";
import {
  useListSchedule,
  useCreateScheduleSlot,
  useUpdateScheduleSlot,
  useDeleteScheduleSlot,
  useListSubjects,
  useGetScheduleConfig,
  getListScheduleQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Grid3X3, Coffee } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";

const DAYS = [
  { id: 0, name: "الأحد" },
  { id: 1, name: "الاثنين" },
  { id: 2, name: "الثلاثاء" },
  { id: 3, name: "الأربعاء" },
  { id: 4, name: "الخميس" },
];

interface CellInfo {
  dayOfWeek: number;
  periodNumber: number;
  slotId?: number;
  subjectId?: number;
  notes?: string | null;
}

export function ScheduleTab() {
  const { data: slots = [], isLoading: slotsLoading } = useListSchedule();
  const { data: subjects = [], isLoading: subjectsLoading } = useListSubjects();
  const { data: config, isLoading: configLoading } = useGetScheduleConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const periodsCount = config?.periodsCount ?? 7;
  const breakAfterPeriod = config?.breakAfterPeriod ?? 3;
  const PERIODS = Array.from({ length: periodsCount }, (_, i) => i + 1);

  const createSlot = useCreateScheduleSlot();
  const updateSlot = useUpdateScheduleSlot();
  const deleteSlot = useDeleteScheduleSlot();

  const [open, setOpen] = useState(false);
  const [cell, setCell] = useState<CellInfo | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListScheduleQueryKey() });

  const openCell = (day: number, period: number) => {
    const slot = slots.find(
      (s) => s.dayOfWeek === day && s.periodNumber === period
    );
    setCell({
      dayOfWeek: day,
      periodNumber: period,
      slotId: slot?.id,
      subjectId: slot?.subjectId,
      notes: slot?.notes,
    });
    setSelectedSubjectId(slot?.subjectId?.toString() ?? "");
    setNotes(slot?.notes ?? "");
    setOpen(true);
  };

  const handleSave = () => {
    if (!cell || !selectedSubjectId) return;
    const data = {
      dayOfWeek: cell.dayOfWeek,
      periodNumber: cell.periodNumber,
      subjectId: parseInt(selectedSubjectId),
      notes: notes || undefined,
    };

    if (cell.slotId) {
      updateSlot.mutate({ id: cell.slotId, data }, {
        onSuccess: () => { invalidate(); setOpen(false); toast({ title: "تم تحديث الحصة" }); },
      });
    } else {
      createSlot.mutate({ data }, {
        onSuccess: () => { invalidate(); setOpen(false); toast({ title: "تمت إضافة الحصة" }); },
      });
    }
  };

  const handleDelete = () => {
    if (!cell?.slotId) return;
    deleteSlot.mutate({ id: cell.slotId }, {
      onSuccess: () => { invalidate(); setOpen(false); toast({ title: "تم حذف الحصة" }); },
    });
  };

  const isPending = createSlot.isPending || updateSlot.isPending || deleteSlot.isPending;

  if (slotsLoading || subjectsLoading || configLoading)
    return <div className="py-16 flex justify-center"><LoadingSpinner /></div>;

  const dayOfWeekLabel = cell
    ? DAYS.find((d) => d.id === cell.dayOfWeek)?.name
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">الجدول الدراسي الأسبوعي</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Grid3X3 className="h-4 w-4" />
          انقر على أي خلية للتعديل
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm"
          style={{ minWidth: `${100 + periodsCount * 90 + 48}px` }}
        >
          {/* Header */}
          <div
            className="grid border-b border-border/50 bg-muted/30"
            style={{ gridTemplateColumns: `100px repeat(${periodsCount + 1}, 1fr)` }}
          >
            <div className="p-3 text-center text-xs font-bold text-muted-foreground">اليوم</div>
            {PERIODS.map((p) => (
              <Fragment key={p}>
                <div className="p-3 text-center text-xs font-bold text-muted-foreground border-r border-border/30">
                  ح {p}
                </div>
                {p === breakAfterPeriod && (
                  <div className="p-3 flex items-center justify-center bg-amber-50/60 dark:bg-amber-900/10 border-r border-border/30">
                    <Coffee className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {/* Rows */}
          {DAYS.map((day) => (
            <div
              key={day.id}
              className="grid border-b border-border/30 last:border-0"
              style={{ gridTemplateColumns: `100px repeat(${periodsCount + 1}, 1fr)` }}
            >
              <div className="p-3 flex items-center justify-center font-bold text-sm border-r border-border/30 bg-muted/10">
                {day.name}
              </div>
              {PERIODS.map((period) => {
                const slot = slots.find(
                  (s) => s.dayOfWeek === day.id && s.periodNumber === period
                );
                return (
                  <Fragment key={period}>
                    <button
                      type="button"
                      onClick={() => openCell(day.id, period)}
                      className="p-1.5 border-r border-border/20 min-h-[68px] flex items-center justify-center group transition-colors hover:bg-muted/30 focus:outline-none"
                    >
                      {slot ? (
                        <div
                          className="w-full h-full rounded-xl p-2 flex flex-col items-center justify-center text-center text-xs font-semibold leading-tight shadow-sm border transition-transform group-hover:scale-95"
                          style={{
                            backgroundColor: `${slot.subjectColor}18`,
                            color: slot.subjectColor,
                            borderColor: `${slot.subjectColor}40`,
                          }}
                        >
                          <span className="font-bold leading-tight">{slot.subjectName}</span>
                          {slot.notes && (
                            <span className="text-[10px] opacity-70 mt-0.5 font-normal">{slot.notes}</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-xl border-2 border-dashed border-border/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                    {period === breakAfterPeriod && (
                      <div className="border-r border-amber-200/50 dark:border-amber-800/30 min-h-[68px] bg-amber-50/40 dark:bg-amber-900/10 flex items-center justify-center">
                        <span className="text-[10px] text-amber-500 font-medium rotate-90 whitespace-nowrap">استراحة</span>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {subjects.map((sub) => (
            <span
              key={sub.id}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium"
              style={{ backgroundColor: `${sub.color}15`, color: sub.color, borderColor: `${sub.color}40` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sub.color }} />
              {sub.name}
            </span>
          ))}
        </div>
      )}

      {/* Cell Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {cell?.slotId ? "تعديل الحصة" : "إضافة حصة"}
              {" — "}
              <span className="text-muted-foreground text-base font-normal">
                {dayOfWeekLabel} / حصة {cell?.periodNumber}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">المادة</label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المادة..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {subjects.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id.toString()}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 inline-block"
                          style={{ backgroundColor: sub.color }}
                        />
                        {sub.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات (اختياري)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: قاعة 205"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
            {cell?.slotId && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="gap-1"
              >
                {deleteSlot.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                حذف
              </Button>
            )}
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending || !selectedSubjectId}
              className="flex-1"
            >
              {(createSlot.isPending || updateSlot.isPending) ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {cell?.slotId ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
