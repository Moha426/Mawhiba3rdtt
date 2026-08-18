import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, Layers, CalendarRange, Users, Shield, SlidersHorizontal, AlertCircle, Clock, Trophy, Download, Upload, CalendarDays, Settings2, Globe, FileText, RefreshCw, CheckCircle2, Languages, Lightbulb } from "lucide-react";
import { ImportDialog } from "@/components/admin/import-dialog";
import { AssignmentsTab } from "@/components/admin/assignments-tab";
import { SubjectsTab } from "@/components/admin/subjects-tab";
import { ScheduleTab } from "@/components/admin/schedule-tab";
import { StudentsTab } from "@/components/admin/students-tab";
import { CredentialsTab } from "@/components/admin/credentials-tab";
import { ScheduleConfigTab } from "@/components/admin/schedule-config-tab";
import { QuizzesTab } from "@/components/admin/quizzes-tab";
import { EventsTab } from "@/components/admin/events-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { PlatformsTab } from "@/components/admin/platforms-tab";
import { LibraryTab } from "@/components/admin/library-tab";
import { ChannelsTab } from "@/components/admin/channels-tab";
import { FlashcardsTab } from "@/components/admin/flashcards-tab";
import { PollsTab } from "@/components/admin/polls-tab";
import { EscalationsTab } from "@/components/admin/escalations-tab";
import { motion } from "framer-motion";
import { useGetDashboardStats, useListStudents, useListQuizzes, exportAllAppData, pushAllLocalDataToCloud } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const triggerClass =
  "rounded-xl text-xs h-9 px-3 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [importOpen, setImportOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  const { data: stats } = useGetDashboardStats();
  const { data: students = [] } = useListStudents();
  const { data: quizzes = [] } = useListQuizzes();

  useEffect(() => {
    if (!isAdmin) setLocation("/admin");
  }, [isAdmin, setLocation]);

  if (!isAdmin) return null;

  const urgentCount = Number(stats?.byPriority.find((p) => p.label === "عاجل")?.count) || 0;

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    setLocation("/");
  };

  const handleSyncCloud = async () => {
    setSyncing(true);
    try {
      const res = await pushAllLocalDataToCloud();
      if (res.success) {
        toast({
          title: "تمت المزامنة السحابية بنجاح",
          description: `تمت مزامنة ${res.count} قسم بنجاح ورفع كل البيانات المخزنة محلياً لقاعدة البيانات.`,
        });
      } else {
        toast({ title: "حدث خطأ أثناء المزامنة", variant: "destructive" });
      }
    } catch {
      toast({ title: "تعذر الاتصال بالسحابة", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      const bundle = await exportAllAppData();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `talented-school-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "تم تصدير نسخة احتياطية لكافة بيانات المنصة" });
    } catch {
      toast({ title: "حدث خطأ أثناء التصدير", variant: "destructive" });
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-border/50">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">لوحة التحكم</h1>
          <p className="text-muted-foreground mt-1 text-sm">إدارة المهام والمواد والجدول والطلاب متصلة بالسحابة</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="default"
            onClick={handleSyncCloud}
            disabled={syncing}
            className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "جاري المزامنة..." : "مزامنة سحابية"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-2 rounded-xl"
          >
            <Upload className="h-4 w-4" />
            استيراد بيانات
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="gap-2 rounded-xl"
          >
            <Download className="h-4 w-4" />
            تصدير البيانات
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 gap-2 rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "إجمالي المهام",
            value: stats?.total ?? "—",
            icon: BookOpen,
            color: "text-primary",
            bg: "bg-primary/8",
          },
          {
            label: "مهام عاجلة",
            value: urgentCount,
            icon: AlertCircle,
            color: "text-rose-600 dark:text-rose-400",
            bg: "bg-rose-50 dark:bg-rose-900/20",
          },
          {
            label: "تُسلَّم هذا الأسبوع",
            value: stats?.upcoming ?? "—",
            icon: Clock,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
          {
            label: "الطلاب المسجلون",
            value: students.length,
            icon: Users,
            color: "text-teal-600 dark:text-teal-400",
            bg: "bg-teal-50 dark:bg-teal-900/20",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex items-center gap-3 rounded-2xl border border-border/40 px-4 py-3 ${s.bg}`}
          >
            <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
            <div>
              <p className={`text-2xl font-bold leading-none ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="assignments" className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="mb-6 h-11 rounded-2xl gap-1 p-1 inline-flex min-w-max">
            <TabsTrigger value="assignments" className={triggerClass}>
              <BookOpen className="h-3.5 w-3.5" />
              المهام
            </TabsTrigger>
            <TabsTrigger value="quizzes" className={triggerClass}>
              <Trophy className="h-3.5 w-3.5" />
              الاختبارات
            </TabsTrigger>
            <TabsTrigger value="subjects" className={triggerClass}>
              <Layers className="h-3.5 w-3.5" />
              المواد
            </TabsTrigger>
            <TabsTrigger value="schedule" className={triggerClass}>
              <CalendarRange className="h-3.5 w-3.5" />
              الجدول
            </TabsTrigger>
            <TabsTrigger value="schedule-config" className={triggerClass}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              إعدادات الجدول
            </TabsTrigger>
            <TabsTrigger value="students" className={triggerClass}>
              <Users className="h-3.5 w-3.5" />
              الطلاب
            </TabsTrigger>
            <TabsTrigger value="platforms" className={triggerClass}>
              <Globe className="h-3.5 w-3.5" />
              المنصات
            </TabsTrigger>
            <TabsTrigger value="channels" className={triggerClass}>
              <Layers className="h-3.5 w-3.5" />
              القنوات والمجتمعات
            </TabsTrigger>
            <TabsTrigger value="library" className={triggerClass}>
              <FileText className="h-3.5 w-3.5" />
              المكتبة والتجميعات
            </TabsTrigger>
            <TabsTrigger value="flashcards" className={triggerClass}>
              <Languages className="h-3.5 w-3.5" />
              بطاقات الإنجليزية
            </TabsTrigger>
            <TabsTrigger value="polls" className={triggerClass}>
              <Users className="h-3.5 w-3.5 text-purple-500" />
              استطلاعات الرأي والتصويت
            </TabsTrigger>
            <TabsTrigger value="escalations" className={triggerClass}>
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              اعتراضات وتصحيح الـ AI
            </TabsTrigger>
            <TabsTrigger value="events" className={triggerClass}>
              <CalendarDays className="h-3.5 w-3.5" />
              الإجازات
            </TabsTrigger>
            <TabsTrigger value="credentials" className={triggerClass}>
              <Shield className="h-3.5 w-3.5" />
              بيانات الإدارة
            </TabsTrigger>
            <TabsTrigger value="site-settings" className={triggerClass}>
              <Settings2 className="h-3.5 w-3.5" />
              إعدادات الموقع
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="assignments" className="m-0">
          <AssignmentsTab />
        </TabsContent>
        <TabsContent value="quizzes" className="m-0">
          <QuizzesTab />
        </TabsContent>
        <TabsContent value="subjects" className="m-0">
          <SubjectsTab />
        </TabsContent>
        <TabsContent value="schedule" className="m-0">
          <ScheduleTab />
        </TabsContent>
        <TabsContent value="schedule-config" className="m-0">
          <ScheduleConfigTab />
        </TabsContent>
        <TabsContent value="students" className="m-0">
          <StudentsTab />
        </TabsContent>
        <TabsContent value="platforms" className="m-0">
          <PlatformsTab />
        </TabsContent>
        <TabsContent value="channels" className="m-0">
          <ChannelsTab />
        </TabsContent>
        <TabsContent value="library" className="m-0">
          <LibraryTab />
        </TabsContent>
        <TabsContent value="flashcards" className="m-0">
          <FlashcardsTab />
        </TabsContent>
        <TabsContent value="polls" className="m-0">
          <PollsTab />
        </TabsContent>
        <TabsContent value="escalations" className="m-0">
          <EscalationsTab />
        </TabsContent>
        <TabsContent value="events" className="m-0">
          <EventsTab />
        </TabsContent>
        <TabsContent value="credentials" className="m-0">
          <CredentialsTab />
        </TabsContent>
        <TabsContent value="site-settings" className="m-0">
          <SettingsTab />
        </TabsContent>
      </Tabs>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </motion.div>
  );
}
