import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useListQuizzes, useListSubjects, Quiz, QuizSummary } from "@workspace/api-client-react";
import { LoadingPage } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, ChevronLeft, Trophy, HelpCircle, Sparkles, Search, X, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentSuggestDialog } from "@/components/student-suggest-dialog";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

export default function QuizzesPage() {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: quizzes, isLoading } = useListQuizzes(
    selectedSubject ? { subjectId: selectedSubject } : {},
  );
  const { data: subjects } = useListSubjects();

  if (isLoading) return <LoadingPage />;

  const q = debouncedSearch.toLowerCase();
  const filtered = (quizzes ?? []).filter(
    (quiz) => !q || quiz.title.toLowerCase().includes(q) || (quiz.description ?? "").toLowerCase().includes(q),
  );

  const grouped = filtered.reduce<Record<number, { subject: any; quizzes: QuizSummary[] }>>(
    (acc, quiz) => {
      if (!acc[quiz.subjectId]) {
        acc[quiz.subjectId] = {
          subject: { id: quiz.subjectId, name: quiz.subjectName, color: quiz.subjectColor },
          quizzes: [],
        };
      }
      acc[quiz.subjectId].quizzes.push(quiz);
      return acc;
    },
    {},
  );

  const totalQuizzes = (quizzes ?? []).length;

  return (
    <motion.div className="space-y-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          icon={Trophy}
          title="الاختبارات التفاعلية"
          subtitle={totalQuizzes > 0 ? `${totalQuizzes} اختبار متاح` : "اختبر معلوماتك في جميع المواد"}
        />
        <Button
          onClick={() => setShowSuggestDialog(true)}
          className="rounded-2xl h-11 px-5 font-bold text-xs gap-2 bg-primary text-primary-foreground shadow-md hover:scale-[1.02] transition-all shrink-0 self-start sm:self-center"
        >
          <Sparkles className="h-4 w-4" />
          <span>اقترح إضافة اختبار جديد 💡</span>
        </Button>
      </div>

      {/* ── Search bar ── */}
      <div className="relative">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="ابحث عن اختبار..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-11 pr-10 pl-10 rounded-2xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          dir="rtl"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Subject filter chips ── */}
      {subjects && subjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          <button
            onClick={() => setSelectedSubject(null)}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              selectedSubject === null
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            جميع المواد
          </button>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSubject(selectedSubject === s.id ? null : s.id)}
              className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all"
              style={
                selectedSubject === s.id
                  ? { backgroundColor: s.color, color: "#fff", borderColor: s.color }
                  : { backgroundColor: `${s.color}12`, color: s.color, borderColor: `${s.color}30` }
              }
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        {Object.values(grouped).length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border/50 bg-muted/20"
          >
            <div className="relative mb-4">
              <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/15 to-secondary/10 flex items-center justify-center">
                <Trophy className="h-10 w-10 text-primary/40" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-primary/60" />
              </div>
            </div>
            <p className="font-bold text-foreground mb-1">
              {selectedSubject ? "لا توجد اختبارات لهذه المادة" : "لا توجد اختبارات حتى الآن"}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {selectedSubject ? "جرب اختيار مادة أخرى" : "سيتم إضافة اختبارات قريباً"}
            </p>
          </motion.div>
        ) : (
          <motion.div key="list" className="space-y-7" variants={stagger} initial="hidden" animate="show">
            {Object.values(grouped).map((group) => (
              <motion.div key={group.subject.id} variants={fadeUp} className="space-y-3">
                {/* Subject label */}
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: group.subject.color }} />
                  <h2 className="font-bold text-base">{group.subject.name}</h2>
                  <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full font-medium">
                    {group.quizzes.length} اختبار
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.quizzes.map((quiz, qi) => (
                    <QuizCard key={quiz.id} quiz={quiz} index={qi} subjectColor={group.subject.color} />
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Suggestion Dialog */}
      <StudentSuggestDialog
        isOpen={showSuggestDialog}
        onClose={() => setShowSuggestDialog(false)}
        defaultType="quiz"
        defaultCategory="قدرات"
      />
    </motion.div>
  );
}

function QuizCard({ quiz, index, subjectColor }: { quiz: QuizSummary; index: number; subjectColor: string }) {
  const isExternal = Boolean((quiz as any).externalUrl);

  const cardContent = (
    <div className="glass-float rounded-2xl p-4 cursor-pointer group relative overflow-hidden h-full">
      {/* Color blob */}
      <div
        className="absolute -top-6 -left-6 w-20 h-20 rounded-full opacity-[0.07] pointer-events-none blur-xl"
        style={{ background: subjectColor }}
      />

      <div className="relative flex flex-col gap-3 h-full">
        {/* Icon */}
        <div className="flex items-center justify-between">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${subjectColor}18` }}
          >
            <BookOpen className="h-5 w-5" style={{ color: subjectColor }} />
          </div>
          {isExternal && (
            <Badge variant="outline" className="text-[10px] gap-1 border-primary/30 text-primary bg-primary/5">
              <ExternalLink className="h-2.5 w-2.5" />
              رابط خارجي
            </Badge>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-sm leading-snug line-clamp-2 mb-1">{quiz.title}</h3>
          {quiz.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/40">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <HelpCircle className="h-3 w-3" />
              {quiz.questionCount || (isExternal ? "نموذج" : 0)}
            </span>
            {quiz.timeLimit && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {quiz.timeLimit}د
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-0.5 text-xs font-bold group-hover:gap-1.5 transition-all"
            style={{ color: subjectColor }}
          >
            {isExternal ? "فتح الرابط" : "ابدأ"}
            {isExternal ? <ExternalLink className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {isExternal ? (
        <a href={(quiz as any).externalUrl} target="_blank" rel="noopener noreferrer" className="block h-full">
          {cardContent}
        </a>
      ) : (
        <Link href={`/quiz/${quiz.id}`} className="block h-full">
          {cardContent}
        </Link>
      )}
    </motion.div>
  );
}
