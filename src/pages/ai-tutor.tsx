import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Sparkles, 
  BrainCircuit, 
  Calculator, 
  HelpCircle, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw, 
  Send, 
  Lightbulb, 
  FileQuestion,
  GraduationCap,
  Copy,
  Check,
  AlertCircle,
  UserCheck,
  ThumbsUp,
  MessageSquare,
  User,
  Star,
  Layers,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Paperclip,
  Zap,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStudentProfile } from "@/lib/use-student-profile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { usePersistentState } from "@/lib/api-client-react";

type Mode = "solver" | "quiz_gen" | "planner" | "my_questions";

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface StudentEscalatedQ {
  id: number;
  studentName: string;
  studentGrade?: string;
  subject: string;
  question: string;
  imageUrl?: string;
  aiAnswer?: string;
  studentFeedback?: string;
  status: "pending" | "answered" | "resolved";
  teacherReply?: string;
  teacherName?: string;
  createdAt: string;
}

const PRESET_PROBLEMS = [
  "انطلقت سيارة بسرعة 80 كم/س وبعد ساعتين انطلقت سيارة أخرى بسرعة 100 كم/س، متى تلتقي السيارتان؟",
  "إذا كان 20% من عدد يساوي 60، فما هو 50% من نفس العدد؟",
  "ما العلاقة بين: (سيف : غمد) وما هو الخيار المماثل لها؟",
  "احسب مساحة مثلث متطابق الأضلاع طول ضلعه 6 سم.",
];

export default function AITutorPage() {
  const [mode, setMode] = useState<Mode>("solver");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useStudentProfile();

  // Problem Solver State
  const [problemInput, setProblemInput] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [solverSubject, setSolverSubject] = useState("القدرات (كمي)");
  const [solverLoading, setSolverLoading] = useState(false);
  const [solverResult, setSolverResult] = useState<{
    answer: string;
    steps: string[];
    rule: string;
    shortcut: string;
  } | null>(null);
  const [hasBenefited, setHasBenefited] = useState<boolean | null>(null);

  // Escalation Dialog State
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [studentName, setStudentName] = useState("طالب موهبة");
  const [escalateFeedback, setEscalateFeedback] = useState("");
  const [escalating, setEscalating] = useState(false);

  useEffect(() => {
    if (profile?.displayName) {
      setStudentName(profile.displayName);
    }
  }, [profile?.displayName]);

  // Escalated Questions List (Real-time Firestore Sync)
  const [allEscalatedQuestions, setAllEscalatedQuestions] = usePersistentState<StudentEscalatedQ[]>("escalated_questions", []);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Filter questions for the current student
  const myQuestions = allEscalatedQuestions.filter(
    (q) =>
      q.studentName === studentName ||
      q.studentName === "طالب موهبة" ||
      !q.studentName ||
      (profile?.displayName && q.studentName === profile.displayName)
  );

  // Quiz Generator State
  const [quizTopic, setQuizTopic] = useState("الهندسة وحساب المساحات (قدرات كمي)");
  const [quizDetails, setQuizDetails] = useState("");
  const [quizCount, setQuizCount] = useState<number>(5);
  const [quizLoading, setQuizLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showQuizResult, setShowQuizResult] = useState(false);

  // Planner State
  const [examDate, setExamDate] = useState("بعد 30 يوماً");
  const [dailyHours, setDailyHours] = useState("3 ساعات");
  const [targetScore, setTargetScore] = useState("+90");
  const [planLoading, setPlanLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<{
    phase1: { title: string; desc: string; days: string };
    phase2: { title: string; desc: string; days: string };
    phase3: { title: string; desc: string; days: string };
    dailyRoutine: string[];
    tips: string[];
  } | null>(null);

  const fetchMyQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await fetch("/api/escalated-questions");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAllEscalatedQuestions((prev) => {
            const map = new Map<number, StudentEscalatedQ>();
            prev.forEach((q) => map.set(q.id, q));
            data.forEach((q: StudentEscalatedQ) => map.set(q.id, q));
            return Array.from(map.values());
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch escalated questions:", err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    fetchMyQuestions();
  }, []);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "صيغة غير مدعومة",
        description: "يرجى اختيار صورة صالحة (PNG, JPG, WebP)",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "حجم الصورة كبير",
        description: "يرجى رفع صورة بحجم أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setUploadedImageName(file.name);
      toast({
        title: "تم إرفاق الصورة بنجاح",
        description: `تم تجهيز (${file.name}) للتحليل الذكي`,
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Handle Solver
  const handleSolve = async (textToSolve?: string) => {
    const text = textToSolve !== undefined ? textToSolve : problemInput;
    if (!text.trim() && !uploadedImage) {
      toast({
        title: "يرجى كتابة نص أو إرفاق صورة",
        description: "اكتب المسألة أو التناظر أو ارفع صورة السؤال للشرح والحل",
      });
      return;
    }

    setSolverLoading(true);
    setSolverResult(null);
    setHasBenefited(null);

    // Call server Gemini Tutor API
    try {
      const res = await fetch("/api/ai-tutor/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: text.trim() || "حل وتفسير المسألة المعروضة في الصورة المرفقة",
          subject: solverSubject,
          imageBase64: uploadedImage || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.answer) {
          setSolverResult(data);
          setSolverLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Falling back to client solver engine:", err);
    }

    // Local fallback
    setTimeout(() => {
      let result = {
        answer: "الجواب النهائي: 8 ساعات من بداية انطلاق السيارة الأولى (أو بعد 6 ساعات من انطلاق الثانية)",
        rule: "قانون زمن اللحاق = (سرعة الجسم الأول × فارق الزمن) ÷ (فارق السرعتين)",
        steps: [
          "1. حساب المسافة التي قطعتها السيارة الأولى قبل انطلاق الثانية: 80 كم/س × 2 = 160 كم.",
          "2. حساب فارق السرعتين بين السيارتين: 100 - 80 = 20 كم/س.",
          "3. قسمة المسافة المقطوعة على فارق السرعتين: 160 ÷ 20 = 8 ساعات من انطلاق السيارة الأولى.",
          "4. المسافة المشتركة عند الالتقاء ستكون: 100 × 6 = 600 كم."
        ],
        shortcut: "طريقة سريعة: اضرب سرعة البطيء في ساعات التقدم (80 × 2 = 160)، ثم اقسم على الفرق (20) لتحصل على زمن اللحاق مباشرة!"
      };

      if (text.includes("20%") || text.includes("60")) {
        result = {
          answer: "العدد الأصلي هو 300، ونسبة 50% منه تساوي 150",
          rule: "التناسب الطردي السريع: النسبة ÷ النسبة المقابلة",
          steps: [
            "1. إذا كانت 20% = 60، فإن 10% = 30 (بالقسمة على 2).",
            "2. لإيجاد 50%: نضرب قيمة الـ 10% في 5 -> 30 × 5 = 150.",
            "3. للتحقق من العدد الكامل (100%): 30 × 10 = 300، ونصفه 150."
          ],
          shortcut: "طريقة التدرج المنتظم توفر أكثر من نصف دقيقة مقارنة بالمعادلات التقليدية."
        };
      } else if (text.includes("سيف") || text.includes("غمد")) {
        result = {
          answer: "العلاقة: السيف يستقر بداخل الغمد (علاقة مكانية واحتواء). الخيار المماثل: (كتاب : حقيبة) أو (حسام : قراب)",
          rule: "استراتيجية التناظر اللفظي: صياغة جملة دقيقة (أ يوضع بداخل ب)",
          steps: [
            "1. تحديد وظيفة الكلمتين: الغمد هو البيت أو الغطاء الحافظ للسيف.",
            "2. بناء جملة قياسية: (السيف مكانه الطبيعي داخل الغمد).",
            "3. مقارنة الخيارات بنفس الترتيب والاتجاه (من اليمين لليسار)."
          ],
          shortcut: "احذر من عكس الاتجاه في خيارات التناظر اللفظي (مثلاً غمد : سيف يعتبر خياراً خاطئاً)."
        };
      } else if (text.includes("مثلث") || text.includes("أضلاع")) {
        result = {
          answer: "مساحة المثلث المتطابق الأضلاع = 9√3 سم² ≈ 15.58 سم²",
          rule: "قانون مساحة المثلث متطابق الأضلاع = (√3 ÷ 4) × ل²",
          steps: [
            "1. طول الضلع ل = 6 سم.",
            "2. مربع طول الضلع ل² = 6² = 36.",
            "3. ضرب 36 في (√3 ÷ 4) = (36 ÷ 4) × √3 = 9√3 سم²."
          ],
          shortcut: "في اختبار القدرات يتم ترك الجواب غالباً بدلالة الجذر 9√3."
        };
      } else {
        result = {
          answer: `تحليل واستنتاج مسألة: ${text.slice(0, 45)}...`,
          rule: "تطبيق استراتيجية الحل السريع واستخراج المعطيات والمجاهيل",
          steps: [
            "1. استخراج المعطيات الأساسية من نص المسألة.",
            "2. تحديد القانون الرياضي أو العلاقة المنطقية المناسبة.",
            "3. التعويض المباشر والتبسيط الحسابي للوصول لأدق ناتج."
          ],
          shortcut: "قم باستبعاد الخيارات المستحيلة أو البعيدة جداً قبل البدء بالعمليات الحسابية الطويلة."
        };
      }

      setSolverResult(result);
      setSolverLoading(false);
    }, 700);
  };

  const handleBenefitSuccess = () => {
    setHasBenefited(true);
    toast({
      title: "أحسنت! تم احتساب النقاط",
      description: "تمت إضافة +15 نقطة إلى رصيد تميزك الدراسي",
    });
  };

  const handleEscalateToTeacher = async () => {
    if (!problemInput.trim() && !solverResult && !uploadedImage) return;
    setEscalating(true);

    const newQuestion: StudentEscalatedQ = {
      id: Date.now(),
      studentName: studentName.trim() || profile?.displayName || "طالب موهبة",
      studentGrade: "ثالث ثانوي - موهبة",
      subject: solverSubject,
      question: problemInput.trim() || "استفسار ومسألة من المعلم الذكي مع صورة مرفقة",
      imageUrl: uploadedImage || undefined,
      aiAnswer: solverResult?.answer ? `${solverResult.answer}\nالقانون: ${solverResult.rule}` : "تم استشارة المعلم الذكي",
      studentFeedback: escalateFeedback.trim() || "يحتاج الطالب توضيحاً إضافياً ومثالاً نموذجياً من المعلم",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setAllEscalatedQuestions((prev) => [newQuestion, ...prev]);

    try {
      await fetch("/api/escalated-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuestion),
      });
    } catch {}

    setHasBenefited(false);
    setIsEscalateOpen(false);
    setEscalateFeedback("");
    toast({
      title: "تم رفع السؤال للمعلم بنجاح",
      description: "وصل سؤالك الآن إلى لوحة تحكم المعلمين وسيتم وضع توضيح مفصل في أقرب وقت.",
    });
    setEscalating(false);
  };

  // Handle Quiz Generator
  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    setShowQuizResult(false);
    setSelectedAnswers({});
    setCurrentQIndex(0);

    try {
      const res = await fetch("/api/ai-tutor/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: quizTopic,
          count: quizCount,
          details: quizDetails
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setGeneratedQuiz(data);
          setQuizLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Quiz generation error:", err);
    }

    // Fallback
    setTimeout(() => {
      const mockQuestions: GeneratedQuestion[] = [
        {
          question: "دائرة محيطها 20 ط، ما هي مساحتها؟",
          options: ["50 ط", "100 ط", "400 ط", "25 ط"],
          correctIndex: 1,
          explanation: "المحيط = 2 × نق × ط = 20 ط => نق = 10. المساحة = ط × نق² = ط × 10² = 100 ط."
        }
      ];
      setGeneratedQuiz(mockQuestions.slice(0, quizCount));
      setQuizLoading(false);
    }, 600);
  };

  // Handle Plan Generator
  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    try {
      const res = await fetch("/api/ai-tutor/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examDate, dailyHours, targetScore })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.phase1) {
          setGeneratedPlan(data);
          setPlanLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Plan generation error:", err);
    }

    // Fallback
    setTimeout(() => {
      setGeneratedPlan({
        phase1: {
          title: "المرحلة الأولى: التأسيس وفهم القوانين",
          days: "الأيام 1 إلى 10",
          desc: "دراسة أساسيات الجبر، الهندسة، النسب والتناسب، والتناظر اللفظي واستيعاب المقروء."
        },
        phase2: {
          title: "المرحلة الثانية: حل التجميعات الحديثة",
          days: "الأيام 11 إلى 22",
          desc: "حل تجميعات 1445-1446 وتطبيق استراتيجيات الحل السريع والتدرب على قياس الوقت."
        },
        phase3: {
          title: "المرحلة الثالثة: الاختبارات التجريبية الشاملة",
          days: "الأيام 23 إلى 30",
          desc: "أداء اختبارين محاكاة يومياً ومراجعة شيتات الأخطاء ونقاط الضعف."
        },
        dailyRoutine: [
          "جلسة 45 دقيقة: مراجعة القوانين والشروحات الذهبية.",
          "استراحة 10 دقائق (Pomodoro).",
          "جلسة 50 دقيقة: حل 30 سؤال تجميعات مع التوقيت.",
          "جلسة 25 دقيقة: تدوين الأسئلة الصعبة في دفتر الملاحظات."
        ],
        tips: [
          "ركز على استراتيجية الاستبعاد للخيارات غير المنطقية أولاً.",
          "قسّم وقتك بحيث لا يتجاوز حل أي سؤال كمي أكثر من 60 ثانية.",
          "حافظ على نوم منتظم وشرب الماء قبل جلسات المذاكرة."
        ]
      });
      setPlanLoading(false);
    }, 700);
  };

  const answeredQuestionsCount = myQuestions.filter(q => q.status === "answered").length;

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 border border-border/50 bg-card shadow-sm">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-500/20">
              <Bot className="h-3.5 w-3.5" />
              <span>مساعد ثالث موهبة الذكي (AI Smart Tutor)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span>معلمك الذكي لحل المسائل وتوليد الاختبارات</span>
              <Sparkles className="h-6 w-6 text-purple-500 shrink-0" />
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              احصل على شرح تفصيلي خطوة بخطوة عبر كتابة السؤال أو رفع صورته، ولّد كويزات تدريبية مخصصة فوراً، وإذا استعصت عليك مسألة يمكنك تصعيدها مباشرة لمعلم المادة في لوحة التحكم.
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setMode("solver")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 ${
              mode === "solver"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card/70 text-muted-foreground hover:text-foreground border-border/50"
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>شارح ومفسر المسائل</span>
          </button>

          <button
            onClick={() => { setMode("my_questions"); fetchMyQuestions(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 relative ${
              mode === "my_questions"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card/70 text-muted-foreground hover:text-foreground border-border/50"
            }`}
          >
            <UserCheck className="h-4 w-4 text-emerald-500" />
            <span>ردود المعلمين على أسئلتي</span>
            {answeredQuestionsCount > 0 && (
              <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-bold">
                {answeredQuestionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMode("quiz_gen")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 ${
              mode === "quiz_gen"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card/70 text-muted-foreground hover:text-foreground border-border/50"
            }`}
          >
            <FileQuestion className="h-4 w-4" />
            <span>صانع الاختبارات الذكي</span>
          </button>

          <button
            onClick={() => setMode("planner")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 ${
              mode === "planner"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card/70 text-muted-foreground hover:text-foreground border-border/50"
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>مخطط المذاكرة المخصص</span>
          </button>
        </div>
      </div>

      {/* ─── Mode 1: Problem Solver ─── */}
      {mode === "solver" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-3xl border border-border/60 bg-card shadow-sm space-y-4" onPaste={handlePaste}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span>اكتب أو ارفع صورة المسألة</span>
                </h3>

                <select
                  value={solverSubject}
                  onChange={(e) => setSolverSubject(e.target.value)}
                  className="h-8 rounded-xl bg-background border border-input px-2.5 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="القدرات (كمي)">القدرات (كمي)</option>
                  <option value="القدرات (لفظي)">القدرات (لفظي)</option>
                  <option value="التحصيلي (رياضيات)">التحصيلي (رياضيات)</option>
                  <option value="التحصيلي (فيزياء)">التحصيلي (فيزياء)</option>
                  <option value="التحصيلي (كيمياء)">التحصيلي (كيمياء)</option>
                  <option value="التحصيلي (أحياء)">التحصيلي (أحياء)</option>
                  <option value="الرياضيات">الرياضيات</option>
                  <option value="الفيزياء">الفيزياء</option>
                  <option value="الكيمياء">الكيمياء</option>
                  <option value="الأحياء">الأحياء</option>
                  <option value="علوم الحاسب والمشاريع">علوم الحاسب والمشاريع</option>
                  <option value="اللغة الإنجليزية">اللغة الإنجليزية</option>
                  <option value="اللغة العربية">اللغة العربية</option>
                  <option value="عام / أخرى">عام / أخرى</option>
                  <option value="مادة مضمنة: كفايات لغوية">مادة مضمنة: كفايات لغوية</option>
                  <option value="مادة مضمنة: دراسات اجتماعية">مادة مضمنة: دراسات اجتماعية</option>
                  <option value="مادة مضمنة: ثقافة إسلامية">مادة مضمنة: ثقافة إسلامية</option>
                </select>
              </div>

              <Textarea
                value={problemInput}
                onChange={(e) => setProblemInput(e.target.value)}
                placeholder="اكتب نص المسألة الرياضية أو سؤال التناظر، أو الصق لقطة الشاشة (Ctrl+V)..."
                className="rounded-2xl min-h-[120px] text-sm resize-none border-border/60"
              />

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                }}
              />

              {/* Image Upload / Preview section */}
              {uploadedImage ? (
                <div className="relative rounded-2xl border border-primary/30 bg-primary/5 p-3 flex items-center gap-3">
                  <img
                    src={uploadedImage}
                    alt="Uploaded question"
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 object-cover rounded-xl border border-border shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{uploadedImageName || "صورة المسألة المرفقة"}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>جاهزة للتحليل البصري والحل الذكي</span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadedImage(null);
                      setUploadedImageName(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="h-8 w-8 p-0 rounded-lg text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 transition-all rounded-2xl p-3.5 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <UploadCloud className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">ارفع صورة للمسألة أو اسحبها هنا (أو الصق بـ Ctrl+V)</span>
                </div>
              )}

              <Button
                onClick={() => handleSolve()}
                disabled={solverLoading || (!problemInput.trim() && !uploadedImage)}
                className="w-full h-11 rounded-2xl font-bold gap-2 shadow-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              >
                {solverLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري التفكير والتحليل الذكي...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>حل وشرح المسألة بالذكاء الاصطناعي</span>
                  </>
                )}
              </Button>

              {/* Presets */}
              <div className="pt-2">
                <p className="text-xs font-bold text-muted-foreground mb-2">أو جرب أحد النماذج السريعة:</p>
                <div className="space-y-2">
                  {PRESET_PROBLEMS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setProblemInput(p);
                        handleSolve(p);
                      }}
                      className="w-full text-right p-2.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/50 text-xs text-muted-foreground hover:text-foreground transition-colors line-clamp-1 flex items-center gap-2"
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{p}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="p-5 rounded-3xl border border-border/60 bg-card shadow-sm h-full flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  <span>الشرح والحل النموذجي</span>
                </h3>

                {solverLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                    <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-xs font-semibold">يقوم المعلم الذكي باستخراج القوانين وتبسيط الخطوات...</p>
                  </div>
                ) : solverResult ? (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Final Answer */}
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <p className="text-xs font-bold mb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>النتيجة النهائية:</span>
                      </p>
                      <p className="text-sm font-black">{solverResult.answer}</p>
                    </div>

                    {/* Applied Rule */}
                    <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span>{solverResult.rule}</span>
                    </div>

                    {/* Steps */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-foreground">خطوات الحل والتوضيح:</p>
                      {solverResult.steps.map((step, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-muted/40 text-xs text-muted-foreground leading-relaxed">
                          {step}
                        </div>
                      ))}
                    </div>

                    {/* Shortcut trick */}
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2">
                      <Zap className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <strong>تريك الحل السريع:</strong> {solverResult.shortcut}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-center">
                    <Bot className="h-10 w-10 opacity-30" />
                    <p className="text-xs">اكتب مسألتك أو ارفع صورتها لعرض الشرح الفوري والخطوات الرياضية هنا.</p>
                  </div>
                )}
              </div>

              {/* ─── Student Feedback / Escalation Buttons ─── */}
              {solverResult && !solverLoading && (
                <div className="pt-5 mt-5 border-t border-border/50">
                  <div className="text-xs font-bold text-foreground mb-2 flex items-center justify-between">
                    <span>هل كان الشرح كافياً ومفهوماً؟</span>
                    {hasBenefited === true && (
                      <Badge className="bg-emerald-500 text-white text-[10px] flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        <span>تم احتساب الفائدة</span>
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant={hasBenefited === true ? "default" : "outline"}
                      onClick={handleBenefitSuccess}
                      className="h-10 rounded-xl font-bold gap-2 text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>فهمت الحل (+15 نقطة)</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsEscalateOpen(true)}
                      className="h-10 rounded-xl font-bold gap-2 text-xs border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>لم أستفد / إرسال للمعلم</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Mode 4: My Escalated Questions & Teacher Replies ─── */}
      {mode === "my_questions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-card/60 p-4 rounded-2xl border border-border/60">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-500" />
                <span>الأسئلة المستعصية المحولة للمعلمين</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                تتبع حالة المسائل التي أرسلتها للمعلمين واقرأ التوضيحات والشروحات النموذجية.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMyQuestions}
              className="rounded-xl h-9 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingQuestions ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </Button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {myQuestions.map((q) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-3xl border bg-card shadow-sm transition-all ${
                    q.status === "answered"
                      ? "border-emerald-500/40 ring-1 ring-emerald-500/20"
                      : "border-border/70"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{q.subject}</Badge>
                      <span className="text-xs font-bold text-foreground">{q.studentName}</span>
                    </div>

                    <Badge
                      className={`text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-sm border-none ${
                        (q.teacherReply || q.status === "answered")
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {(q.teacherReply || q.status === "answered") ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>تم رد المعلم وتوضيح الإجابة ✅</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          <span>بانتظار المعلم في لوحة التحكم ⏳</span>
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="py-3 space-y-2.5">
                    <div>
                      <span className="text-[11px] font-bold text-muted-foreground block mb-0.5">مسألتك:</span>
                      <p className="text-sm font-bold text-foreground">{q.question}</p>
                    </div>

                    {q.imageUrl && (
                      <div className="mt-2">
                        <span className="text-[11px] font-bold text-muted-foreground block mb-1">الصورة المرفقة:</span>
                        <img
                          src={q.imageUrl}
                          alt="Question attachment"
                          referrerPolicy="no-referrer"
                          className="max-h-48 rounded-xl border border-border/70 object-contain bg-background"
                        />
                      </div>
                    )}

                    {q.studentFeedback && (
                      <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-xl">
                        <strong>ملاحظتك:</strong> {q.studentFeedback}
                      </div>
                    )}

                    {q.teacherReply ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-xs space-y-1.5 mt-2">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                          <UserCheck className="h-4 w-4 text-emerald-600" />
                          <span>رد المعلم ({q.teacherName || "المعلم المشرف"}):</span>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line">
                          {q.teacherReply}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-muted/40 p-3 rounded-xl text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>السؤال معروض حالياً في لوحة تحكم المعلمين وسيصلك الرد التوضيحي هنا فور اعتماده.</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {myQuestions.length === 0 && (
              <div className="text-center py-16 bg-card/40 rounded-3xl border border-dashed border-border/80">
                <HelpCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h4 className="font-bold text-foreground">لم تقم بإرسال أي أسئلة مستعصية بعد</h4>
                <p className="text-xs text-muted-foreground mt-1">عندما تسأل المعلم الذكي ولا تستفيد من الشرح، اضغط على (لم أستفد / إرسال للمعلم) ليظهر هنا رد المعلم.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Mode 2: Quiz Generator ─── */}
      {mode === "quiz_gen" && (
        <div className="space-y-6">
          {generatedQuiz.length === 0 ? (
            <div className="p-6 md:p-8 rounded-3xl border border-border/60 bg-card shadow-sm max-w-2xl mx-auto space-y-5">
              <div className="text-center space-y-1">
                <FileQuestion className="h-10 w-10 text-primary mx-auto" />
                <h3 className="text-lg font-bold text-foreground">إنشاء اختبار ذكي فوري</h3>
                <p className="text-xs text-muted-foreground">اختر الموضوع أو المهارة وسيقوم الذكاء الاصطناعي ببناء كويز تفاعلي مع تصحيح فوري.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">موضوع الاختبار</label>
                  <select
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                    className="w-full h-11 px-3 rounded-2xl border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="الهندسة وحساب المساحات (قدرات كمي)">الهندسة وحساب المساحات (قدرات كمي)</option>
                    <option value="الجبر والمعادلات السريعة (قدرات كمي)">الجبر والمعادلات السريعة (قدرات كمي)</option>
                    <option value="التناظر اللفظي والمفردة الشاذة (قدرات لفظي)">التناظر اللفظي والمفردة الشاذة (قدرات لفظي)</option>
                    <option value="استيعاب المقروء وإكمال الجمل (قدرات لفظي)">استيعاب المقروء وإكمال الجمل (قدرات لفظي)</option>
                    <option value="الفيزياء: الميكانيكا والكهرباء (تحصيلي)">الفيزياء: الميكانيكا والكهرباء (تحصيلي)</option>
                    <option value="الكيمياء: الكيمياء العضوية والجدول الدوري (تحصيلي)">الكيمياء: الكيمياء العضوية والجدول الدوري (تحصيلي)</option>
                    <option value="موضوع مخصص (اكتبه في التفاصيل)">موضوع مخصص (اكتبه في التفاصيل)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">تفاصيل إضافية (اختياري)</label>
                  <Textarea
                    placeholder="مثال: ركز على القوانين الفيزيائية المعقدة، أو أضف أسئلة من تجميعات 1445..."
                    className="rounded-xl min-h-[80px] text-xs resize-none"
                    value={quizDetails}
                    onChange={(e) => setQuizDetails(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">عدد الأسئلة</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuizCount(num)}
                        className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                          quizCount === num
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/30 text-muted-foreground border-border/50"
                        }`}
                      >
                        {num} أسئلة
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerateQuiz}
                disabled={quizLoading}
                className="w-full h-12 rounded-2xl font-bold gap-2 text-sm bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              >
                {quizLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري توليد الأسئلة وتجهيز الخيارات...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>توليد وبدء الكويز الآن</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="p-6 md:p-8 rounded-3xl border border-border/60 bg-card shadow-sm max-w-3xl mx-auto space-y-6">
              {!showQuizResult ? (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-border/50">
                    <span className="text-xs font-bold text-muted-foreground">
                      السؤال {currentQIndex + 1} من {generatedQuiz.length}
                    </span>
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                      {quizTopic}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                      {generatedQuiz[currentQIndex].question}
                    </h3>

                    <div className="grid grid-cols-1 gap-2.5">
                      {generatedQuiz[currentQIndex].options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedAnswers(prev => ({ ...prev, [currentQIndex]: idx }))}
                          className={`p-3.5 rounded-2xl text-right text-xs sm:text-sm font-semibold transition-all border ${
                            selectedAnswers[currentQIndex] === idx
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/30 hover:bg-muted/60 text-foreground border-border/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <Button
                      variant="outline"
                      disabled={currentQIndex === 0}
                      onClick={() => setCurrentQIndex(prev => prev - 1)}
                      className="rounded-xl text-xs"
                    >
                      السابق
                    </Button>

                    {currentQIndex < generatedQuiz.length - 1 ? (
                      <Button
                        onClick={() => setCurrentQIndex(prev => prev + 1)}
                        className="rounded-xl text-xs font-bold bg-primary text-primary-foreground"
                      >
                        التالي
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowQuizResult(true)}
                        className="rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        إنهاء الاختبار وعرض النتيجة
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="p-6 rounded-3xl bg-primary/10 border border-primary/20 space-y-2">
                    <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                    <h3 className="text-xl font-black text-foreground">نتيجة الاختبار</h3>
                    <p className="text-3xl font-black text-primary">
                      {Object.keys(selectedAnswers).filter(k => selectedAnswers[Number(k)] === generatedQuiz[Number(k)].correctIndex).length} / {generatedQuiz.length}
                    </p>
                  </div>

                  <Button
                    onClick={() => { setGeneratedQuiz([]); setShowQuizResult(false); }}
                    className="rounded-2xl font-bold bg-primary text-primary-foreground"
                  >
                    توليد اختبار آخر
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Mode 3: Planner ─── */}
      {mode === "planner" && (
        <div className="space-y-6">
          {!generatedPlan ? (
            <div className="p-6 md:p-8 rounded-3xl border border-border/60 bg-card shadow-sm max-w-2xl mx-auto space-y-5">
              <div className="text-center space-y-1">
                <Calendar className="h-10 w-10 text-primary mx-auto" />
                <h3 className="text-lg font-bold text-foreground">تصميم خطة مذاكرة مخصصة</h3>
                <p className="text-xs text-muted-foreground">أدخل وقتك المتاح والهدف وسيقوم الذكاء الاصطناعي ببناء خطة محكمة مقسمة على مراحل.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">موعد الاختبار</label>
                  <Input
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    placeholder="بعد 30 يوماً"
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">ساعات المذاكرة يومياً</label>
                  <Input
                    value={dailyHours}
                    onChange={(e) => setDailyHours(e.target.value)}
                    placeholder="3 ساعات"
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">الدرجة المستهدفة</label>
                  <Input
                    value={targetScore}
                    onChange={(e) => setTargetScore(e.target.value)}
                    placeholder="+95"
                    className="rounded-xl h-10 text-xs"
                  />
                </div>
              </div>

              <Button
                onClick={handleGeneratePlan}
                disabled={planLoading}
                className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
              >
                {planLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري توليد الخطة وجدولة المراحل...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>توليد الخطة الذكية</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[generatedPlan.phase1, generatedPlan.phase2, generatedPlan.phase3].map((p, idx) => (
                  <div key={idx} className="p-5 rounded-3xl bg-card border border-border/60 shadow-sm space-y-2">
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">{p.days}</span>
                    <h4 className="font-bold text-sm text-foreground">{p.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                ))}
              </div>

              <div className="p-5 rounded-3xl bg-card border border-border/60 shadow-sm space-y-3">
                <h4 className="font-bold text-sm text-foreground">الروتين اليومي المقترح:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {generatedPlan.dailyRoutine.map((r, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-muted/40 text-xs font-semibold text-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-border/50">
                <Button
                  variant="outline"
                  onClick={() => setGeneratedPlan(null)}
                  className="rounded-2xl text-xs font-bold w-full sm:w-auto"
                >
                  إعادة ضبط الخطة
                </Button>
                <Button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const content = `
                        <div dir="rtl" style="font-family: sans-serif; padding: 40px; line-height: 1.6;">
                          <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">خطة المذاكرة المخصصة - ثالث موهبة</h1>
                          <p><strong>الهدف:</strong> ${targetScore} | <strong>الوقت اليومي:</strong> ${dailyHours} | <strong>موعد الاختبار:</strong> ${examDate}</p>
                          
                          <h2 style="color: #4b5563;">المراحل الرئيسية:</h2>
                          <div style="display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 20px;">
                            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 10px;">
                              <h3>${generatedPlan.phase1.title}</h3>
                              <p>(${generatedPlan.phase1.days})</p>
                              <p>${generatedPlan.phase1.desc}</p>
                            </div>
                            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 10px;">
                              <h3>${generatedPlan.phase2.title}</h3>
                              <p>(${generatedPlan.phase2.days})</p>
                              <p>${generatedPlan.phase2.desc}</p>
                            </div>
                            <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 10px;">
                              <h3>${generatedPlan.phase3.title}</h3>
                              <p>(${generatedPlan.phase3.days})</p>
                              <p>${generatedPlan.phase3.desc}</p>
                            </div>
                          </div>

                          <h2 style="color: #4b5563; margin-top: 30px;">الروتين اليومي المقترح:</h2>
                          <ul>
                            ${generatedPlan.dailyRoutine.map(r => `<li>${r}</li>`).join('')}
                          </ul>

                          <h2 style="color: #4b5563; margin-top: 30px;">نصائح الخبراء:</h2>
                          <ul>
                            ${generatedPlan.tips.map(t => `<li>${t}</li>`).join('')}
                          </ul>
                        </div>
                      `;
                      printWindow.document.write(content);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="rounded-2xl text-xs font-bold gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>تنزيل / طباعة الخطة</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Escalation Dialog to Teacher ─── */}
      <Dialog open={isEscalateOpen} onOpenChange={setIsEscalateOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border/80" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <span>إرسال المسألة إلى المعلم في لوحة التحكم</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              سيصل استفسارك مباشرة لصندوق أسئلة الطلاب لدى معلمي المادة ليتم وضع شرح مفصل ونموذجي لك.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">اسم الطالب *</label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="اسمك الثلاثي"
                className="rounded-xl h-10 text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">المادة / المسار</label>
              <Input
                value={solverSubject}
                readOnly
                className="rounded-xl h-10 text-xs bg-muted/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">نص المسألة</label>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs font-semibold max-h-24 overflow-y-auto">
                {problemInput || (uploadedImage ? "مسألة مصورة مرفقة" : "المسألة الحالية في الشارح")}
              </div>
            </div>

            {uploadedImage && (
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">الصورة المرفقة</label>
                <img
                  src={uploadedImage}
                  alt="Attached problem"
                  referrerPolicy="no-referrer"
                  className="h-20 rounded-xl border border-border object-contain"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">لماذا لم تستفد من الشرح؟ (ملاحظتك للمعلم)</label>
              <Textarea
                value={escalateFeedback}
                onChange={(e) => setEscalateFeedback(e.target.value)}
                placeholder="مثال: لم أفهم كيفية حساب الخطوة 2، أو أحتاج مسألة تطبيقية مشابهة من تجميعات قياس..."
                rows={3}
                className="rounded-xl text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => setIsEscalateOpen(false)} className="rounded-xl text-xs">
              إلغاء
            </Button>
            <Button
              onClick={handleEscalateToTeacher}
              disabled={escalating}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2 shadow-md"
            >
              {escalating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>إرسال لمعلم المادة الآن</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
