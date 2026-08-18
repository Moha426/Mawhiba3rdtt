import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, X, Send, ChevronRight, GraduationCap, Sparkles, 
  BrainCircuit, Lightbulb, HelpCircle, CheckCircle2, Calendar, BookOpen,
  Image as ImageIcon, Trash2
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

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
  "جدول تنظيم المذاكرة لااختبار قياس",
];

function formatSuperscripts(text: string, keyPrefix: string) {
  const parts = text.split(/\^([0-9a-zA-Z+-]+)/g);
  return parts.map((part, index) => {
    const isSuper = index % 2 === 1;
    if (isSuper) {
      return <sup key={`${keyPrefix}-super-${index}`} className="text-[10px] font-bold">{part}</sup>;
    }
    return <span key={`${keyPrefix}-sub-${index}`}>{part}</span>;
  });
}

function renderLineWithMarkdown(text: string, lineIndex: number) {
  if (!text) return [];

  interface Token {
    type: "text" | "math" | "code" | "bold" | "italic";
    content: string;
  }
  
  let tokens: Token[] = [{ type: "text", content: text }];
  
  // 1. Parse inline math \( ... \)
  tokens = tokens.flatMap(t => {
    if (t.type !== "text") return [t];
    const subParts = t.content.split(/\\\((.*?)\\\)/g);
    return subParts.map((sub, idx) => ({
      type: idx % 2 === 1 ? ("math" as const) : ("text" as const),
      content: sub,
    }));
  });
  
  // 2. Parse inline math $ ... $
  tokens = tokens.flatMap(t => {
    if (t.type !== "text") return [t];
    const subParts = t.content.split(/\$([^\$]+)\$/g);
    return subParts.map((sub, idx) => ({
      type: idx % 2 === 1 ? ("math" as const) : ("text" as const),
      content: sub,
    }));
  });

  // 3. Parse inline code ` ... `
  tokens = tokens.flatMap(t => {
    if (t.type !== "text") return [t];
    const subParts = t.content.split(/`([^`]+)`/g);
    return subParts.map((sub, idx) => ({
      type: idx % 2 === 1 ? ("code" as const) : ("text" as const),
      content: sub,
    }));
  });

  // 4. Parse bold ** ... **
  tokens = tokens.flatMap(t => {
    if (t.type !== "text") return [t];
    const subParts = t.content.split(/\*\*(.*?)\*\*/g);
    return subParts.map((sub, idx) => ({
      type: idx % 2 === 1 ? ("bold" as const) : ("text" as const),
      content: sub,
    }));
  });

  // 5. Parse italic * ... *
  tokens = tokens.flatMap(t => {
    if (t.type !== "text") return [t];
    const subParts = t.content.split(/\*(.*?)\*/g);
    return subParts.map((sub, idx) => ({
      type: idx % 2 === 1 ? ("italic" as const) : ("text" as const),
      content: sub,
    }));
  });

  return tokens.map((t, idx) => {
    const key = `line-${lineIndex}-tok-${idx}`;
    if (t.type === "math") {
      return (
        <code key={key} dir="ltr" className="inline-block bg-primary/5 text-primary px-1.5 py-0.5 rounded-md text-[11px] font-mono mx-1 border border-primary/20 select-all font-black align-middle">
          {formatSuperscripts(t.content, key)}
        </code>
      );
    }
    if (t.type === "code") {
      return (
        <code key={key} dir="ltr" className="inline-block bg-muted/80 text-foreground px-1.5 py-0.5 rounded-md text-[11px] font-mono mx-1 border border-border/50 select-all font-bold align-middle">
          {formatSuperscripts(t.content, key)}
        </code>
      );
    }
    if (t.type === "bold") {
      return (
        <strong key={key} className="font-extrabold text-foreground bg-primary/5 px-1 rounded-sm">
          {t.content}
        </strong>
      );
    }
    if (t.type === "italic") {
      return (
        <em key={key} className="italic text-foreground/90 font-semibold px-0.5">
          {t.content}
        </em>
      );
    }
    return <span key={key}>{t.content}</span>;
  });
}

interface MarkdownBlock {
  type: "header" | "subheader" | "subsubheader" | "list_item" | "ordered_list_item" | "paragraph" | "code_block" | "math_block";
  text: string;
  level?: number;
  number?: string;
}

function parseMarkdownToBlocks(text: string): MarkdownBlock[] {
  if (!text) return [];
  const blocks: MarkdownBlock[] = [];
  const lines = text.split("\n");
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({
          type: "code_block",
          text: codeBlockContent.join("\n"),
        });
        inCodeBlock = false;
        codeBlockContent = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
      blocks.push({
        type: "math_block",
        text: trimmed.slice(2, -2).trim(),
      });
      continue;
    }
    
    if (!trimmed) {
      blocks.push({ type: "paragraph", text: "" });
      continue;
    }
    
    if (trimmed.startsWith("###")) {
      blocks.push({
        type: "subsubheader",
        text: trimmed.replace(/^###\s*/, ""),
      });
    } else if (trimmed.startsWith("##") || trimmed.startsWith("#")) {
      blocks.push({
        type: "subheader",
        text: trimmed.replace(/^##?\s*/, ""),
      });
    } else if (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•")) {
      blocks.push({
        type: "list_item",
        text: trimmed.replace(/^[-*•]\s*/, ""),
      });
    } else {
      const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
      if (numMatch) {
        blocks.push({
          type: "ordered_list_item",
          text: numMatch[2],
          number: numMatch[1],
        });
      } else {
        blocks.push({
          type: "paragraph",
          text: trimmed,
        });
      }
    }
  }
  
  if (inCodeBlock && codeBlockContent.length > 0) {
    blocks.push({
      type: "code_block",
      text: codeBlockContent.join("\n"),
    });
  }
  
  return blocks;
}

function renderText(text: string) {
  if (!text) return null;
  const blocks = parseMarkdownToBlocks(text);
  return (
    <div className="space-y-2 text-right leading-relaxed" dir="rtl">
      {blocks.map((block, idx) => {
        const key = `block-${idx}`;
        if (block.type === "code_block") {
          return (
            <pre key={key} dir="ltr" className="bg-muted p-2.5 rounded-lg overflow-x-auto text-[10px] font-mono border border-border/50 text-left my-1.5 font-semibold select-all">
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.type === "math_block") {
          return (
            <div key={key} dir="ltr" className="bg-muted/60 p-3 rounded-lg text-center text-xs font-mono border border-border/40 my-2 select-all text-primary font-bold">
              {formatSuperscripts(block.text, key)}
            </div>
          );
        }
        if (block.type === "paragraph" && !block.text) {
          return <div key={key} className="h-1" />;
        }
        if (block.type === "subheader") {
          return (
            <h3 key={key} className="text-sm font-black text-foreground mt-3 border-b border-border/30 pb-0.5">
              {renderLineWithMarkdown(block.text, idx)}
            </h3>
          );
        }
        if (block.type === "subsubheader") {
          return (
            <h4 key={key} className="text-xs font-black text-primary mt-2 border-b border-border/30 pb-0.5">
              {renderLineWithMarkdown(block.text, idx)}
            </h4>
          );
        }
        if (block.type === "list_item") {
          return (
            <div key={key} className="flex items-start gap-1.5 pr-1.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
              <p className="text-xs text-foreground/95 flex-1 leading-relaxed">{renderLineWithMarkdown(block.text, idx)}</p>
            </div>
          );
        }
        if (block.type === "ordered_list_item") {
          return (
            <div key={key} className="flex items-start gap-1.5 pr-1 py-0.5">
              <span className="text-[10px] font-black text-primary shrink-0 bg-primary/10 rounded-sm w-4.5 h-4.5 flex items-center justify-center mt-0.5">{block.number}</span>
              <p className="text-xs text-foreground/95 flex-1 leading-relaxed">{renderLineWithMarkdown(block.text, idx)}</p>
            </div>
          );
        }
        return (
          <p key={key} className="text-xs text-foreground/95 leading-relaxed">
            {renderLineWithMarkdown(block.text, idx)}
          </p>
        );
      })}
    </div>
  );
}

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [botMode, setBotMode] = useState<"general" | "ai_tutor">("general");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("student_chatbot_messages_v3");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seenIds = new Set<string>();
          return parsed.map((m: any) => {
            let id = m.id;
            if (!id || seenIds.has(id)) {
              id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            }
            seenIds.add(id);
            return {
              ...m,
              id,
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            };
          });
        }
      }
    } catch (e) {
      console.warn("Failed to load chatbot messages from localStorage:", e);
    }
    return [
      {
        id: "welcome",
        role: "bot",
        text: "أهلاً! 👋 أنا مساعدك الذكي وروبوت المعلم الذكي.\n\nاسألني عن جدولك ومهامك، أو ارفع صور المسائل وحلها مباشرة مع الـ AI!",
        timestamp: new Date(),
      },
    ];
  });
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClearHistory = useCallback(() => {
    if (confirm("هل تريد مسح سجل المحادثة بالكامل؟")) {
      const welcomeMsg: ChatMessage = {
        id: "welcome",
        role: "bot",
        text: "أهلاً! 👋 أنا مساعدك الذكي وروبوت المعلم الذكي.\n\nاسألني عن جدولك ومهامك، أو ارفع صور المسائل وحلها مباشرة مع الـ AI!",
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    }
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    try {
      localStorage.setItem("student_chatbot_messages_v3", JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to save chatbot messages to localStorage:", e);
    }
  }, [messages]);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      const currentImage = imagePreview;
      if (!trimmed && !currentImage) return;
      if (loading) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        text: trimmed || "📷 مسألة/صورة مرفقة للتحليل والحل",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setImagePreview(null);
      setLoading(true);

      await new Promise((r) => setTimeout(r, 300));

      // Try calling live Gemini AI Server API first
      try {
        const res = await fetch("/api/ai-tutor/solve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: trimmed || "حل واشرح المسألة الموجودة في الصورة المرفقة",
            subject: botMode === "ai_tutor" ? "القدرات والتحصيلي والمعرفة العامة" : "general_tasks",
            imageBase64: currentImage || undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.answer) {
            let answerText = data.answer;

            const cards: import("@/lib/chatbot-engine").CardData[] = [];
            if (botMode === "ai_tutor") {
              cards.push({
                title: "فتح الشارح والمفسر الكامل",
                subtitle: "صفحة المعلم الذكي والحل بالصور",
                href: "/ai-tutor",
                color: "#6366f1",
                tag: "المعلم الذكي 🤖"
              });
            }

            const botMsg: ChatMessage = {
              id: nextId(),
              role: "bot",
              text: answerText.trim(),
              cards,
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMsg]);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Live Gemini API call failed inside Chatbot, falling back to local engine:", err);
      }

      // Fallback Engine
      if (botMode === "ai_tutor") {
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
    [loading, appData, botMode, imagePreview]
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
                  {messages.length > 1 && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleClearHistory}
                      className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="مسح سجل المحادثة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </motion.button>
                  )}
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

              {/* Image Preview thumbnail if selected */}
              {imagePreview && (
                <div className="px-3 py-1.5 flex items-center gap-2 bg-primary/5 border-t border-border/40 shrink-0">
                  <div className="relative group">
                    <img src={imagePreview} alt="Attached" className="h-12 w-12 object-cover rounded-lg border border-primary/30" />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow hover:scale-110 transition-transform"
                      title="حذف الصورة"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    تم إرفاق صورة للمسألة 📷
                  </div>
                </div>
              )}

              {/* Input */}
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-1.5 px-3 py-2.5 border-t border-border/50 shrink-0 bg-background/40"
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="h-9 w-9 rounded-xl border border-border/60 bg-muted/30 text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors"
                  title="إرفاق صورة للمسألة"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>

                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={botMode === "ai_tutor" ? "اكتب مسألة أو ارفع صورتها..." : "اسأل عن جدولك، مهامك..."}
                  className="flex-1 min-w-0 bg-muted/40 border border-border/50 rounded-xl px-3 py-2 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 placeholder:text-muted-foreground/60 transition-all"
                  dir="rtl"
                  autoComplete="off"
                  disabled={loading}
                />
                <motion.button
                  type="submit"
                  disabled={(!input.trim() && !imagePreview) || loading}
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
