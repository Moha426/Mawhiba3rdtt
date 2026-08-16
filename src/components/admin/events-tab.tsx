import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  getListEventsQueryKey,
  OFFICIAL_ACADEMIC_CALENDAR_1448,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit, CalendarDays, Palmtree, Star, Sun, Flag, Cake } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";

const EVENT_TYPES = [
  { value: "holiday", label: "إجازة رسمية", icon: Palmtree, color: "#ef4444" },
  { value: "event", label: "مناسبة مدرسية", icon: Star, color: "#8b5cf6" },
  { value: "exam_period", label: "فترة اختبارات", icon: Flag, color: "#f59e0b" },
  { value: "ceremony", label: "حفل / تكريم", icon: Cake, color: "#ec4899" },
  { value: "other", label: "أخرى", icon: Sun, color: "#6366f1" },
  { value: "custom", label: "مخصص...", icon: Sun, color: "#6366f1" },
];

const KNOWN_TYPE_VALUES = new Set(["holiday", "event", "exam_period", "ceremony", "other"]);

const PRESET_COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#6366f1", "#8b5cf6", "#ec4899",
  "#3b82f6", "#14b8a6", "#f97316", "#84cc16",
];

type EventForm = {
  title: string;
  date: string;
  endDate: string;
  color: string;
  type: string;
  description: string;
};

const emptyForm = (): EventForm => ({
  title: "",
  date: new Date().toISOString().split("T")[0],
  endDate: "",
  color: "#ef4444",
  type: "holiday",
  description: "",
});

export function EventsTab() {
  const { data: events = [], isLoading } = useListEvents({});
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [customTypeText, setCustomTypeText] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListEventsQueryKey({}) });
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setCustomTypeText("");
    setOpen(true);
  };

  const openEdit = (ev: any) => {
    setEditId(ev.id);
    const isCustom = !KNOWN_TYPE_VALUES.has(ev.type);
    setCustomTypeText(isCustom ? ev.type : "");
    setForm({
      title: ev.title,
      date: ev.date,
      endDate: ev.endDate ?? "",
      color: ev.color,
      type: isCustom ? "custom" : ev.type,
      description: ev.description ?? "",
    });
    setOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteEvent.mutate({ id }, {
      onSuccess: () => {
        invalidate();
        toast({ title: "تم الحذف بنجاح" });
      },
    });
  };

  const handleSubmit = () => {
    if (!form.title || !form.date) {
      toast({ title: "العنوان والتاريخ مطلوبان", variant: "destructive" });
      return;
    }

    const resolvedType = form.type === "custom"
      ? (customTypeText.trim() || "أخرى")
      : form.type;

    const data = {
      title: form.title,
      date: form.date,
      endDate: form.endDate || undefined,
      color: form.color,
      type: resolvedType,
      description: form.description || undefined,
    };

    const cb = {
      onSuccess: () => {
        invalidate();
        setOpen(false);
        toast({ title: editId ? "تم التحديث بنجاح" : "تم إضافة الحدث بنجاح" });
      },
    };

    if (editId) {
      updateEvent.mutate({ id: editId, data }, cb);
    } else {
      createEvent.mutate({ data }, cb);
    }
  };

  const typeInfo = (type: string) => {
    const known = EVENT_TYPES.find((t) => t.value === type);
    if (known && known.value !== "custom") return known;
    return { value: type, label: type, icon: Sun, color: "#6366f1" };
  };

  const grouped = (() => {
    const map: Record<string, typeof events> = {};
    const now = new Date();
    const upcoming: typeof events = [];
    const past: typeof events = [];
    for (const ev of [...events].sort((a, b) => a.date.localeCompare(b.date))) {
      if (ev.date >= now.toISOString().split("T")[0]) upcoming.push(ev);
      else past.push(ev);
    }
    if (upcoming.length) map["القادمة"] = upcoming;
    if (past.length) map["المنتهية"] = past;
    return map;
  })();

  const handleSyncOfficialCalendar = () => {
    try {
      localStorage.setItem("app_data_events", JSON.stringify(OFFICIAL_ACADEMIC_CALENDAR_1448));
      window.dispatchEvent(new CustomEvent("app_data_change", { detail: { key: "events", value: OFFICIAL_ACADEMIC_CALENDAR_1448 } }));
      invalidate();
      toast({
        title: "تم استيراد التقويم الدراسي 🇸🇦",
        description: "تم تحديث جميع مواعيد الدراسة والإجازات الرسمية للعام 1448-1449هـ بنجاح.",
      });
    } catch {
      toast({ title: "حدث خطأ أثناء الاستيراد", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="text-xl font-bold">الإجازات والمناسبات والتقويم الدراسي</h2>
          <p className="text-xs text-muted-foreground">التقويم المعتمد 1448/1449 هـ ومناسبات المدرسة</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSyncOfficialCalendar}
            className="gap-1.5 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Palmtree className="h-4 w-4" />
            استيراد التقويم المعتمد 1448هـ
          </Button>
          <Button onClick={openNew} className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" />
            إضافة حدث
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground bg-muted/30 rounded-2xl border border-dashed flex flex-col items-center gap-3">
          <CalendarDays className="h-10 w-10 opacity-30" />
          <p>لا توجد إجازات أو مناسبات مضافة. أضف أول حدث!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([groupLabel, items]) => (
          <div key={groupLabel} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-1">{groupLabel}</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <AnimatePresence>
                {items.map((ev) => {
                  const ti = typeInfo(ev.type);
                  const Icon = ti.icon;
                  const isPast = ev.date < new Date().toISOString().split("T")[0];
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={`rounded-2xl border p-4 flex items-start gap-3 ${isPast ? "opacity-60" : ""}`}
                      style={{ borderRightColor: ev.color, borderRightWidth: 4 }}
                    >
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: ev.color + "20" }}
                      >
                        <Icon className="h-4 w-4" style={{ color: ev.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight">{ev.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(parseISO(ev.date), "EEEE، d MMMM yyyy", { locale: ar })}
                          {ev.endDate && ev.endDate !== ev.date && (
                            <> ← {format(parseISO(ev.endDate), "d MMMM", { locale: ar })}</>
                          )}
                        </p>
                        <span
                          className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: ev.color + "18", color: ev.color }}
                        >
                          {ti.label}
                        </span>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ev.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openEdit(ev)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(ev.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "تعديل الحدث" : "إضافة إجازة أو مناسبة"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">العنوان *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثال: إجازة اليوم الوطني"
                dir="rtl"
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ البداية *</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ النهاية</label>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  placeholder="اتركه فارغاً ليوم واحد"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">النوع</label>
              <Select
                value={form.type}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, type: v }));
                  if (v !== "custom") setCustomTypeText("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.type === "custom" && (
                <Input
                  value={customTypeText}
                  onChange={(e) => setCustomTypeText(e.target.value)}
                  placeholder="مثال: رحلة ميدانية، يوم مفتوح، لقاء أولياء..."
                  dir="rtl"
                  autoFocus
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">اللون</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? "#000" : "transparent",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-7 w-7 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  title="لون مخصص"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات (اختياري)</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="تفاصيل إضافية..."
                className="resize-none h-20"
                dir="rtl"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">إلغاء</Button>
            <Button
              onClick={handleSubmit}
              disabled={createEvent.isPending || updateEvent.isPending}
              className="rounded-xl gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              {createEvent.isPending || updateEvent.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
