import { useState, useEffect } from "react";
import { useGetScheduleConfig, useUpdateScheduleConfig } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/loading-state";
import { useToast } from "@/hooks/use-toast";
import { SlidersHorizontal, Clock, Coffee, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function calcSchedule(
  startTime: string,
  periodsCount: number,
  periodDuration: number,
  breakAfterPeriod: number,
  breakDuration: number
) {
  const schedule: { period: number; start: string; end: string; isBreakAfter: boolean }[] = [];
  let cursor = startTime;
  for (let i = 1; i <= periodsCount; i++) {
    const start = cursor;
    const end = addMinutes(cursor, periodDuration);
    const isBreakAfter = i === breakAfterPeriod;
    schedule.push({ period: i, start, end, isBreakAfter });
    cursor = end;
    if (isBreakAfter) cursor = addMinutes(cursor, breakDuration);
  }
  return schedule;
}

export function ScheduleConfigTab() {
  const { data: config, isLoading } = useGetScheduleConfig();
  const { toast } = useToast();
  const updateConfig = useUpdateScheduleConfig();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    periodsCount: 7,
    breakAfterPeriod: 3,
    periodDuration: 45,
    breakDuration: 20,
    startTime: "07:30",
  });

  useEffect(() => {
    if (config) {
      setForm({
        periodsCount: config.periodsCount,
        breakAfterPeriod: config.breakAfterPeriod,
        periodDuration: config.periodDuration,
        breakDuration: config.breakDuration,
        startTime: config.startTime,
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.breakAfterPeriod >= form.periodsCount) {
      toast({
        title: "خطأ",
        description: "يجب أن تكون الاستراحة قبل آخر حصة",
        variant: "destructive",
      });
      return;
    }

    updateConfig.mutate(
      { data: form },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
          toast({ title: "تم تحديث إعدادات الجدول بنجاح" });
        },
        onError: () => {
          toast({ title: "خطأ", description: "لم يتم التحديث", variant: "destructive" });
        },
      }
    );
  };

  const preview = calcSchedule(
    form.startTime,
    Math.min(form.periodsCount, 10),
    form.periodDuration,
    form.breakAfterPeriod,
    form.breakDuration
  );

  if (isLoading)
    return (
      <div className="py-16 flex justify-center">
        <LoadingSpinner />
      </div>
    );

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">إعدادات الجدول</h2>
          <p className="text-sm text-muted-foreground">ضبط أوقات الحصص والاستراحة</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Settings form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periods-count">عدد الحصص اليومية</Label>
              <Input
                id="periods-count"
                type="number"
                min={3}
                max={10}
                value={form.periodsCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodsCount: parseInt(e.target.value) || 7 }))
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="break-after">الاستراحة بعد الحصة رقم</Label>
              <Input
                id="break-after"
                type="number"
                min={1}
                max={form.periodsCount - 1}
                value={form.breakAfterPeriod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, breakAfterPeriod: parseInt(e.target.value) || 3 }))
                }
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-dur" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                مدة الحصة (دقيقة)
              </Label>
              <Input
                id="period-dur"
                type="number"
                min={20}
                max={90}
                value={form.periodDuration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodDuration: parseInt(e.target.value) || 45 }))
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="break-dur" className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5 text-amber-500" />
                مدة الاستراحة (دقيقة)
              </Label>
              <Input
                id="break-dur"
                type="number"
                min={5}
                max={60}
                value={form.breakDuration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, breakDuration: parseInt(e.target.value) || 20 }))
                }
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-time" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              وقت بداية اليوم الدراسي
            </Label>
            <Input
              id="start-time"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              className="rounded-xl w-40"
              dir="ltr"
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl h-11 gap-2"
            disabled={updateConfig.isPending}
          >
            {updateConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="h-4 w-4" />
            ) : null}
            {saved ? "تم الحفظ!" : "حفظ الإعدادات"}
          </Button>
        </form>

        {/* Preview */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            معاينة توقيتات الجدول
          </h3>
          <div className="border border-border/50 rounded-2xl overflow-hidden bg-card">
            {preview.map(({ period, start, end, isBreakAfter }) => (
              <div key={period}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {period}
                    </span>
                    <span className="text-sm font-medium">الحصة {period}</span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground" dir="ltr">
                    {start} — {end}
                  </span>
                </div>
                {isBreakAfter && (
                  <div className="flex items-center justify-between px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-800/30">
                    <div className="flex items-center gap-3">
                      <Coffee className="h-4 w-4 text-amber-500 mr-1.5" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        الاستراحة
                      </span>
                    </div>
                    <span className="text-sm font-mono text-amber-600 dark:text-amber-400" dir="ltr">
                      {end} — {addMinutes(end, form.breakDuration)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
