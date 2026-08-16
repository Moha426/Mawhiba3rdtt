import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, X, Send, ChevronRight, GraduationCap, Sparkles, 
  BrainCircuit, Lightbulb, HelpCircle, CheckCircle2, Calendar, BookOpen
} from "lucide-react";
import { useLocation } from "wouter";
import {
  useListAssignments,
  useListSubjects,
  useListSchedule,
  useGetScheduleConfig,
  useListEvents,
  useListQuizzes,
} from "@workspace/api-client-react";
import { processMessage, type ChatMessage, type AppData } from "@/lib/chatbot-engine";

let _msgId = 0;
function nextId() {
  return String(++_msgId);
}

const GENERAL_SUGGESTIONS = [
  "جدول الغد",
  "المهام القادمة",
  "المواد الدراسية",
  "الاختبارات القادمة",
  "الفعاليات القادمة",
];

const TUTOR_SUGGESTIONS = [
  "حل مسألة قدرات (زمن اللحاق)",
  "اشرح قانون النسبة والتناسب",
  "توليد كويز رياضيات سريع",
  "جدول تنظيم المذاكرة لاختبار قياس",
];

function renderText(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-foreground">
        {p}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [botMode, setBotMode] = useState<"general" | "ai_tutor">("general");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "أهلاً! 👋 أنا مساعدك الذكي وروبوت المعلم الذكي.\n\nاسألني عن جدولك، مهامك، أو اختر (المعلم الذكي) لحل المسائل وتوليد الكويزات!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: assignments = [] } = useListAssignments();
  const { data: subjects = [] } = useListSubjects();
  const { data: schedule = [] } = useListSchedule();
  const { data: scheduleConfig = null } = useGetScheduleConfig();
  const { data: events = [] } = useListEvents();
  const { data: quizzes = [] } = useListQuizzes();

  const appData: AppData = {
    assignments,
    subjects,
    schedule,
    scheduleConfig,
    events,
    quizzes,
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    const handleOpenChatbot = (e: any) => {
      setOpen(true);
      if (e.detail?.mode) {
        setBotMode(e.detail.mode);
      }
    };
    window.addEventListener("open_chatbot", handleOpenChatbot);
    return () => window.removeEventListener("open_chatbot", handleOpenChatbot);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botMode]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        text: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      await new Promise((r) => setTimeout(r, 450));

      if (botMode === "ai_tutor") {
        // Smart Teacher AI Engine Logic inside Robot
        let answerText = "";
        let cards: import("@/lib/chatbot-engine").CardData[] = [];

        if (trimmed.includes("قدرات") || trimmed.includes("اللحاق") || trimmed.includes("سيارة") || trimmed.includes("سرعة")) {
          answerText = "🧠 **المعلم الذكي - تحليل وحل المسألة**:\n\n" +
            "**السؤال:** مسائل زمن اللحاق والسرعة المتناسبة\n\n" +
            "📌 **القانون الذهبي:**\n`زمن اللحاق = (سرعة الجسم الأول × فارق الزمن) ÷ (فارق السرعتين)`\n\n" +
            "1️⃣ مسافة التقدم = 80 كم/س × 2 ساعة = 160 كم.\n" +
            "2️⃣ فارق السرعتين = 100 - 80 = 20 كم/س.\n" +
            "3️⃣ زمن الالتقاء = 160 ÷ 20 = **8 ساعات** من انطلاق الأولى (أو 6 ساعات من الثانية).\n\n" +
            "✨ **تلميحة سريعة:** اسألني في الروبوت مباشرة عن أي مسألة أو كويز!";
          cards = [
            { title: "تجميعات المكتبة التعليمية", subtitle: "ملفات وقوانين القدرات", href: "/library", color: "#059669", tag: "المكتبة" }
          ];
        } else if (trimmed.includes("نسبة") || trimmed.includes("تناسب") || trimmed.includes("%")) {
          answerText = "📐 **المعلم الذكي - شرح قانون النسبة والتناسب**:\n\n" +
            "• **النسبة المئوية:** `(الجزء ÷ الكل) × 100`\n" +
            "• **التناسب الطردي:** إذا زادت الأولى زادت الثانية (مثل: عدد الأقلام والسعر).\n" +
            "• **التناسب العكسي:** إذا زادت الأولى نقصت الثانية (مثل: عدد العمال وزمن إنجاز العمل).\n\n" +
            "💡 **مثال:** إذا كان 20% = 60، فإن 100% = 300، و 50% = **150**.";
        } else if (trimmed.includes("كويز") || trimmed.includes("اختبار")) {
          answerText = "🎯 **المعلم الذكي - كويز قدرات سريع**:\n\n" +
            "**سؤال:** إذا كان سعر 3 كتب يساوي 90 ريالاً، فكم سعر 5 كتب من نفس النوع؟\n\n" +
            "أ) 120 ريال\nب) 130 ريال\nج) 150 ريال ✅ (30 × 5 = 150)\nد) 180 ريال\n\n" +
            "✨ تم توليد كويز قدرات مخصص لك داخل الروبوت!";
          cards = [
            { title: "تجميعات المكتبة التعليمية", subtitle: "ملفات وقوانين القدرات", href: "/library", color: "#059669", tag: "المكتبة" }
          ];
        } else {
          answerText = `🎓 **المعلم الذكي - الإجابة الأكاديمية**:\n\n` +
            `بناءً على سؤالك حول "${trimmed}":\n\n` +
            `1️⃣ نوصي بمراجعة قسم **تجميعات القدرات والتحصيلي** في المكتبة.\n` +
            `2️⃣ يمكنك الاستعانة بمنصة **المفكر** أو **تقدر** للحل التفاعلي.\n` +
            `3️⃣ اسألني عن أي موضوع دراسي وسأقوم بشرحه لك فورا!`;
          cards = [
            { title: "تجميعات المكتبة التعليمية", subtitle: "ملفات وقوانين القدرات", href: "/library", color: "#059669", tag: "المكتبة" }
          ];
        }

        const botMsg: ChatMessage = {
          id: nextId(),
          role: "bot",
          text: answerText,
          cards,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const result = processMessage(trimmed, appData);
        const botMsg: ChatMessage = {
          id: nextId(),
          role: "bot",
          text: result.text,
          cards: result.cards,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      }

      setLoading(false);
    },
    [loading, appData, botMode]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* ── Floating Button ── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 left-4 lg:bottom-6 lg:left-6 z-50 h-10 w-10 rounded-xl bg-primary/90 text-primary-foreground backdrop-blur-sm flex items-center justify-center print:hidden"
            style={{
              boxShadow:
                "0 4px 16px rgba(99,102,241,0.35), 0 1px 4px rgba(0,0,0,0.15)",
            }}
            aria-label="فتح المساعد"
          >
            <Bot className="h-5 w-5" />
            <motion.div
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-background"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* backdrop (mobile) */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] lg:hidden print:hidden"
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="fixed bottom-4 left-4 right-4 lg:bottom-6 lg:left-6 lg:right-auto z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/60 print:hidden"
              style={{
                width: "min(100% - 32px, 380px)",
                height: "min(80vh, 560px)",
                background: "hsl(var(--card))",
              }}
            >
              {/* Header */}
              <div className="relative flex flex-col border-b border-border/50 shrink-0 bg-primary/5">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {botMode === "ai_tutor" ? <GraduationCap className="h-5 w-5 text-primary" /> : <Bot className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight flex items-center gap-1.5">
                      <span>{botMode === "ai_tutor" ? "المعلم الذكي" : "المساعد المدرسي"}</span>
                      {botMode === "ai_tutor" && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold">
                          ذكاء اصطناعي
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs text-muted-foreground">
                        {botMode === "ai_tutor" ? "جاهز لحل المسائل وتوليد الكويزات" : "متاح لخدمتك"}
                      </span>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpen(false)}
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>

                {/* Robot Sub-Tabs */}
                <div className="flex items-center px-2 pb-2 gap-1">
                  <button
                    onClick={() => setBotMode("general")}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      botMode === "general"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>جدولي والمهام</span>
                  </button>

                  <button
                    onClick={() => setBotMode("ai_tutor")}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      botMode === "ai_tutor"
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>المعلم الذكي</span>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} onSuggestion={sendMessage} />
                ))}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 items-end"
                  >
                    <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-muted/60 border border-border/40">
                      <div className="flex gap-1 items-center h-4">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
                            animate={{ y: [0, -4, 0] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.9,
                              delay: i * 0.15,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Suggestions — show whenever last message is from bot and not loading */}
              {!loading && (
                <div className="px-3 pb-2 flex gap-1.5 flex-wrap shrink-0">
                  {(botMode === "ai_tutor" ? TUTOR_SUGGESTIONS : GENERAL_SUGGESTIONS).map((s) => (
                    <motion.button
                      key={s}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-border/60 bg-muted/40 text-muted-foreground hover:bg-primary/8 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 px-3 py-2.5 border-t border-border/50 shrink-0 bg-background/40"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={botMode === "ai_tutor" ? "اكتب مسألة أو قانوناً لشرحه تفصيلياً..." : "اسأل عن جدولك، مهامك..."}
                  className="flex-1 bg-muted/40 border border-border/50 rounded-xl px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground/60 transition-all"
                  dir="rtl"
                  autoComplete="off"
                  disabled={loading}
                />
                <motion.button
                  type="submit"
                  disabled={!input.trim() || loading}
                  whileTap={{ scale: 0.9 }}
                  className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function MessageBubble({
  msg,
  onSuggestion,
}: {
  msg: ChatMessage;
  onSuggestion: (t: string) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex gap-2 items-end ${isUser ? "flex-row-reverse" : ""}`}
    >
      {!isUser && (
        <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mb-0.5">
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}

      <div className={`flex flex-col gap-2 max-w-[82%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
            isUser
              ? "bg-primary text-primary-foreground rounded-bl-sm"
              : "bg-muted/60 border border-border/40 text-foreground rounded-br-sm"
          }`}
        >
          {renderText(msg.text)}
        </div>

        {msg.cards && msg.cards.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {msg.cards.map((card, i) => (
              <CardItem key={i} card={card} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CardItem({ card }: { card: import("@/lib/chatbot-engine").CardData }) {
  const content = (
    <motion.div
      whileHover={{ x: -3 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border/50 bg-background/70 hover:bg-muted/40 transition-colors cursor-default"
    >
      <div
        className="h-7 w-1 rounded-full shrink-0"
        style={{ backgroundColor: card.color || "#6366f1" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-tight truncate">{card.title}</p>
        {card.subtitle && (
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{card.subtitle}</p>
        )}
      </div>
      {card.tag && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium"
          style={{
            backgroundColor: (card.color || "#6366f1") + "20",
            color: card.color || "#6366f1",
          }}
        >
          {card.tag}
        </span>
      )}
      {card.href && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 rotate-180" />}
    </motion.div>
  );

  if (card.href?.startsWith("http")) {
    return (
      <a href={card.href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  if (card.href) {
    return <LinkCard href={card.href}>{content}</LinkCard>;
  }

  return content;
}

function LinkCard({ href, children }: { href: string; children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const handleClick = () => {
    if (href === "/ai-tutor") {
      window.dispatchEvent(new CustomEvent("open_chatbot", { detail: { mode: "ai_tutor" } }));
    } else {
      navigate(href);
    }
  };
  return <div onClick={handleClick} className="cursor-pointer">{children}</div>;
}
