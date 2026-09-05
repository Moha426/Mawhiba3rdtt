import { useState, Fragment, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Grid3X3, Coffee, MapPin, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/loading-state";

const DAYS = [
  { id: 0, name: "الأحد" },
  { id: 1, name: "الاثنين" },
  { id: 2, name: "الثلاثاء" },
  { id: 3, name: "الأربعاء" },
  { id: 4, name: "الخميس" },
];

function displayTeacherName(name: string | null | undefined) {
  if (!name) return "";
  if (name.startsWith("أ.") || name.startsWith("أ ") || name.startsWith("د.") || name.startsWith("د ") || name.startsWith("Mr.")) return name;
  return `أ. ${name}`;
}

interface CellInfo {
  dayOfWeek: number;
  periodNumber: number;
  slotId?: number;
  subjectId?: number;
  room?: string;
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
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [customRoom, setCustomRoom] = useState<string>("");
  const [notes, setNotes] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListScheduleQueryKey() });

  const activeSubject = subjects.find(s => String(s.id) === selectedSubjectId);
  const subjectRooms: string[] = activeSubject
    ? (Array.isArray(activeSubject.rooms) ? activeSubject.rooms : (activeSubject.room ? [activeSubject.room] : []))
    : [];

  // When subject changes in dialog, update room according to requirements
  const handleSubjectChange = (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    const sub = subjects.find(s => String(s.id) === newSubjectId);
    const rooms: string[] = sub
      ? (Array.isArray(sub.rooms) ? sub.rooms : (sub.room ? [sub.room] : []))
      : [];

    if (rooms.length === 1) {
      // Exactly one room: set as default automatically
      setSelectedRoom(rooms[0]);
      setCustomRoom("");
    } else if (rooms.length > 1) {
      // Multiple rooms: keep existing if valid or default to first
      if (!rooms.includes(selectedRoom)) {
        setSelectedRoom(rooms[0]);
      }
      setCustomRoom("");
    } else {
      setSelectedRoom("");
    }
  };

  const openCell = (day: number, period: number) => {
    const slot = slots.find(
      (s) => s.dayOfWeek === day && s.periodNumber === period
    );

    const subIdStr = slot?.subjectId?.toString() ?? "";
    const slotRoom = (slot as any)?.room ?? (slot?.notes || "");
    const sub = subjects.find(s => String(s.id) === subIdStr);
    const rooms: string[] = sub
      ? (Array.isArray(sub.rooms) ? sub.rooms : (sub.room ? [sub.room] : []))
      : [];

    let initialRoom = slotRoom;
    let initialCustom = "";

    if (rooms.length === 1 && !slotRoom) {
      initialRoom = rooms[0];
    } else if (rooms.length > 0 && !rooms.includes(slotRoom) && slotRoom) {
      initialRoom = "__custom__";
      initialCustom = slotRoom;
    } else if (rooms.length > 0 && !slotRoom) {
      initialRoom = rooms[0];
    }

    setCell({
      dayOfWeek: day,
      periodNumber: period,
      slotId: slot?.id,
      subjectId: slot?.subjectId,
      room: slotRoom,
      notes: slot?.notes,
    });
    setSelectedSubjectId(subIdStr);
    setSelectedRoom(initialRoom);
    setCustomRoom(initialCustom);
    setNotes(slot?.notes ?? "");
    setOpen(true);
  };

  const handleSave = () => {
    if (!cell || !selectedSubjectId) return;

    let finalRoom = selectedRoom;
    if (selectedRoom === "__custom__") {
      finalRoom = customRoom.trim();
    } else if (!finalRoom && subjectRooms.length === 1) {
      finalRoom = subjectRooms[0];
    } else if (!finalRoom && subjectRooms.length > 0) {
      finalRoom = subjectRooms[0];
    }

    const data = {
      dayOfWeek: cell.dayOfWeek,
      periodNumber: cell.periodNumber,
      subjectId: parseInt(selectedSubjectId),
      room: finalRoom || undefined,
      notes: notes || undefined,
    };

    if (cell.slotId) {
      updateSlot.mutate({ id: cell.slotId, data }, {
        onSuccess: () => { invalidate(); setOpen(false); toast({ title: "تم تحديث الحصة والقاعة بنجاح" }); },
      });
    } else {
      createSlot.mutate({ data }, {
        onSuccess: () => { invalidate(); setOpen(false); toast({ title: "تمت إضافة الحصة بنجاح" }); },
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
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-xl font-bold">الجدول الدراسي الأسبوعي</h2>
          <p className="text-xs text-muted-foreground mt-0.5">انقر على أي حصة لتعيين المادة، المعلم، والقاعة المناسبة</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border">
          <Grid3X3 className="h-4 w-4 text-primary" />
          <span>انقر على أي خلية للتعديل أو الإضافة</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <div
          className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-sm"
          style={{ minWidth: `${110 + periodsCount * 110 + 48}px` }}
        >
          {/* Header */}
          <div
            className="grid border-b border-border/50 bg-muted/40"
            style={{ gridTemplateColumns: `110px repeat(${periodsCount + (breakAfterPeriod <= periodsCount ? 1 : 0)}, 1fr)` }}
          >
            <div className="p-3 text-center text-xs font-bold text-muted-foreground border-l border-border/30">اليوم</div>
            {PERIODS.map((p) => (
              <Fragment key={p}>
                <div className="p-3 text-center text-xs font-bold text-muted-foreground border-l border-border/30">
                  الحصة {p}
                </div>
                {p === breakAfterPeriod && (
                  <div className="p-3 flex items-center justify-center bg-amber-50/60 dark:bg-amber-900/10 border-l border-border/30">
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
              style={{ gridTemplateColumns: `110px repeat(${periodsCount + (breakAfterPeriod <= periodsCount ? 1 : 0)}, 1fr)` }}
            >
              <div className="p-3 flex items-center justify-center font-bold text-sm border-l border-border/30 bg-muted/15">
                {day.name}
              </div>
              {PERIODS.map((period) => {
                const slot = slots.find(
                  (s) => s.dayOfWeek === day.id && s.periodNumber === period
                );
                const teacher = (slot as any)?.teacherName;
                const room = (slot as any)?.room;

                return (
                  <Fragment key={period}>
                    <button
                      type="button"
                      onClick={() => openCell(day.id, period)}
                      className="p-1.5 border-l border-border/20 min-h-[85px] flex items-center justify-center group transition-colors hover:bg-muted/30 focus:outline-none text-right"
                    >
                      {slot ? (
                        <div
                          className="w-full h-full rounded-xl p-2 flex flex-col items-center justify-center text-center text-xs font-semibold leading-tight shadow-sm border transition-transform group-hover:scale-95 gap-0.5"
                          style={{
                            backgroundColor: `${slot.subjectColor}15`,
                            color: slot.subjectColor,
                            borderColor: `${slot.subjectColor}35`,
                          }}
                        >
                          <span className="font-bold leading-tight text-xs text-foreground">{slot.subjectName}</span>
                          
                          {/* Teacher Name */}
                          {teacher && (
                            <span className="text-[10px] font-medium opacity-85 flex items-center gap-0.5 text-foreground/80">
                              <User className="h-2.5 w-2.5 shrink-0" />
                              {displayTeacherName(teacher)}
                            </span>
                          )}

                          {/* Room Badge */}
                          {room && (
                            <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-card/80 text-foreground/90 border border-border/40 flex items-center gap-0.5 mt-0.5">
                              <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                              {room}
                            </span>
                          )}

                          {slot.notes && !room && (
                            <span className="text-[9px] opacity-70 mt-0.5 font-normal">{slot.notes}</span>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full rounded-xl border-2 border-dashed border-border/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                    {period === breakAfterPeriod && (
                      <div className="border-l border-amber-200/50 dark:border-amber-800/30 min-h-[85px] bg-amber-50/40 dark:bg-amber-900/10 flex items-center justify-center">
                        <span className="text-[10px] text-amber-500 font-medium whitespace-nowrap">استراحة</span>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Summary */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 items-center">
          <span className="text-xs font-semibold text-muted-foreground ml-1">دليل المواد:</span>
          {subjects.map((sub) => {
            const subRooms: string[] = Array.isArray(sub.rooms) ? sub.rooms : (sub.room ? [sub.room] : []);
            return (
              <span
                key={sub.id}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium bg-card"
                style={{ borderColor: `${sub.color}50` }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                <span className="font-semibold text-foreground">{sub.name}</span>
                {sub.teacherName && (
                  <span className="text-[10px] text-muted-foreground">({displayTeacherName(sub.teacherName)})</span>
                )}
                {subRooms.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                    📍 {subRooms.join("، ")}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Cell Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {cell?.slotId ? "تعديل الحصة الدراسية" : "إضافة حصة دراسية"}
              {" — "}
              <span className="text-muted-foreground text-sm font-normal">
                {dayOfWeekLabel} / الحصة {cell?.periodNumber}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">المادة الدراسية <span className="text-destructive">*</span></label>
              <Select value={selectedSubjectId} onValueChange={handleSubjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المادة الدراسية..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {subjects.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: sub.color }}
                        />
                        <span className="font-medium">{sub.name}</span>
                        {sub.teacherName && (
                          <span className="text-xs text-muted-foreground">({displayTeacherName(sub.teacherName)})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Preview */}
            {activeSubject?.teacherName && (
              <div className="flex items-center gap-2 text-xs bg-muted/40 p-2.5 rounded-xl border">
                <User className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground">المعلم:</span>
                <span className="font-bold text-foreground">{displayTeacherName(activeSubject.teacherName)}</span>
                {(activeSubject as any).teacherPhone && (
                  <span className="mr-auto text-[11px] text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
                    💬 {(activeSubject as any).teacherPhone}
                  </span>
                )}
              </div>
            )}

            {/* Classroom / Room Switching */}
            {selectedSubjectId && (
              <div className="space-y-2 p-3 rounded-xl bg-muted/30 border">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    القاعة المخصصة لهذه الحصة
                  </span>
                  {subjectRooms.length === 1 && (
                    <span className="text-[11px] text-primary font-normal">قاعة افتراضية تلقائية</span>
                  )}
                  {subjectRooms.length > 1 && (
                    <span className="text-[11px] text-muted-foreground font-normal">يمكنك تبديل القاعة لهذه الحصة</span>
                  )}
                </label>

                {subjectRooms.length > 1 ? (
                  <div className="space-y-2">
                    <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القاعة..." />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {subjectRooms.map((room) => (
                          <SelectItem key={room} value={room}>
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {room}
                            </span>
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          <span className="text-muted-foreground">قاعة مخصصة أخرى...</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {selectedRoom === "__custom__" && (
                      <Input
                        value={customRoom}
                        onChange={(e) => setCustomRoom(e.target.value)}
                        placeholder="اكتب اسم القاعة المخصصة..."
                        className="text-xs"
                      />
                    )}
                  </div>
                ) : subjectRooms.length === 1 ? (
                  <div className="flex items-center justify-between bg-card p-2 rounded-lg border text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{subjectRooms[0]}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">(القاعة الافتراضية للمادة)</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Input
                      value={selectedRoom === "__custom__" ? customRoom : selectedRoom}
                      onChange={(e) => {
                        setSelectedRoom("__custom__");
                        setCustomRoom(e.target.value);
                      }}
                      placeholder="مثال: قاعة 101 أو مختبر الحاسب (اختياري)..."
                      className="text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">لم تُربط قاعات بهذه المادة من تبويب المواد، يمكنك كتابة القاعة يدوياً هنا.</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات إضافية (اختياري)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: إحضار الأدوات الهندسية أو كتاب التمارين..."
                rows={2}
                className="resize-none text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse pt-2">
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
              {cell?.slotId ? "حفظ التعديلات" : "إضافة الحصة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

