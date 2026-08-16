import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, FileText, Wand2, ChevronDown, ChevronUp } from "lucide-react";

type QuestionType = "single_choice" | "true_false" | "essay" | "fill_blank";

export type ParsedQuestion = {
  text: string;
  questionType: QuestionType;
  options: { text: string; isCorrect: boolean }[];
};

/* ──────────────────── Parser ──────────────────── */

// الأحرف الفاصلة المقبولة بعد رمز الخيار: ) . ، : - – مسافة
const OPT_SEP = String.raw`[).\u060C:\-\u2013\s]`;
// رموز بداية الخيار: شرطة أو نجمة أو نقطة
const OPT_BULLET = /^[-*•✓✗]/;
// الحرف العربي أو اللاتيني كعلامة خيار
const OPT_LETTER = new RegExp(
  `^[\u0623\u0627\u0625\u0622\u0628\u062a\u062b\u062c\u062d\u062e\u062f\u0630\u0631\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063a\u0641\u0642\u0643\u0644\u0645\u0646\u0647\u0648\u064aABCDEa-e]+${OPT_SEP}`
);

function stripOptionPrefix(line: string): string {
  return line
    .replace(/^[-*•✓✗]\s*/, "")
    .replace(new RegExp(`^[\u0623\u0627\u0625\u0622\u0628\u062a\u062b\u062c\u062d\u062e\u062f\u0630\u0631\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0639\u063a\u0641\u0642\u0643\u0644\u0645\u0646\u0647\u0648\u064aABCDEa-e]+${OPT_SEP}\\s*`), "")
    .replace(/^\*+/, "")           // إزالة * في بداية النص بعد سلخ البادئة
    .replace(/\*+$/, "")           // إزالة * في النهاية
    .replace(/[✓✔]/g, "")
    .replace(/\(صحيح?\)/gi, "")
    .replace(/\[صح\]/gi, "")
    .replace(/#\s*$/, "")
    .trim();
}

function isCorrectOption(line: string): boolean {
  return (
    /^\*/.test(line) ||                          // *خيار
    /\*\s*$/.test(line) ||                        // خيار*
    /[✓✔]/.test(line) ||
    /^[-•]\s*\*/.test(line) ||                    // - *خيار  ← الإصلاح الرئيسي
    /^[^\u0600-\u06FFa-zA-Z\-*]*\*/.test(line) || // أي رمز بادئ ثم *
    /\(صحيح?\)/i.test(line) ||
    /\[صح\]/i.test(line) ||
    /#\s*$/.test(line)
  );
}

function parseBulkText(raw: string): { questions: ParsedQuestion[]; errors: string[] } {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];

  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  blocks.forEach((block, blockIdx) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;

    // إزالة بادئة رقم السؤال: "س1:" أو "1." أو "١-"
    const questionText = lines[0]
      .replace(/^[سق]\s*\d+\s*[:.)-]\s*/, "")
      .replace(/^\d+\s*[:.)-]\s*/, "")
      .replace(/^[\u0660-\u0669]+\s*[:.)-]\s*/, "")
      .trim();
    if (!questionText) { errors.push(`كتلة ${blockIdx + 1}: نص السؤال فارغ`); return; }

    const rest = lines.slice(1);

    // ── صح/خطأ ──────────────────────────────────────────────────────
    const trueFalseLine = rest.find((l) =>
      /^(صح\s*[/\\/]\s*خطأ|صواب\s*[/\\/]\s*خطأ)\s*[:：]/i.test(l) ||
      /^(الإجابة|الجواب)\s*[:：]\s*(صح|صواب|خطأ)\s*$/i.test(l)
    );
    if (trueFalseLine) {
      const answer = trueFalseLine.split(/[:：]/).slice(1).join(":").trim();
      const isTrue = /^(صح|صواب|true|yes|نعم)$/i.test(answer);
      questions.push({
        text: questionText,
        questionType: "true_false",
        options: [
          { text: "صح", isCorrect: isTrue },
          { text: "خطأ", isCorrect: !isTrue },
        ],
      });
      return;
    }

    // ── مقالي ────────────────────────────────────────────────────────
    if (rest.some((l) => /^(مقالي|essay|مقال)$/i.test(l))) {
      questions.push({ text: questionText, questionType: "essay", options: [] });
      return;
    }

    // ── أكمل الفراغ ──────────────────────────────────────────────────
    const blankLine = rest.find((l) => /^(فراغ|الإجابة|الجواب|answer)\s*[:：]/i.test(l));
    if (blankLine) {
      questions.push({ text: questionText, questionType: "fill_blank", options: [] });
      return;
    }

    // ── اختيار من متعدد ──────────────────────────────────────────────
    const optionLines = rest.filter((l) => OPT_BULLET.test(l) || OPT_LETTER.test(l));

    if (optionLines.length >= 2) {
      const options = optionLines.map((l) => ({
        text: stripOptionPrefix(l),
        isCorrect: isCorrectOption(l),
      }));

      if (!options.some((o) => o.isCorrect)) {
        const preview = questionText.slice(0, 25);
        errors.push(`سؤال ${blockIdx + 1} "${preview}...": لم يُحدَّد الخيار الصحيح — ضع * قبل الإجابة الصحيحة (مثال: - *الإجابة)`);
      }

      questions.push({ text: questionText, questionType: "single_choice", options });
      return;
    }

    // ── احتياطي: مقالي ───────────────────────────────────────────────
    questions.push({ text: questionText, questionType: "essay", options: [] });
  });

  return { questions, errors };
}

/* ──────────────────── Template ──────────────────── */

const TEMPLATE = `ما هو ناتج 2 + 2؟
- 3
- *4
- 5
- 6

كم عدد أيام الأسبوع؟
أ- 5
ب- 6
ج- *7
د- 8

هل الأرض تدور حول الشمس؟
صح/خطأ: صح

اذكر ثلاثة فوائد للماء.
مقالي

عاصمة المملكة العربية السعودية هي ___.
فراغ: الرياض`;

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "اختيار من متعدد",
  true_false: "صح أو خطأ",
  essay: "مقالي",
  fill_blank: "أكمل الفراغ",
};

/* ──────────────────── Component ──────────────────── */

interface BulkQuizImportProps {
  onImport: (questions: ParsedQuestion[], mode: "replace" | "append") => void;
}

export function BulkQuizImport({ onImport }: BulkQuizImportProps) {
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<{ questions: ParsedQuestion[]; errors: string[] } | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);

  const handleParse = () => {
    const result = parseBulkText(raw);
    setPreview(result);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Instructions */}
      <div className="rounded-xl bg-muted/40 border border-border/50 p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground mb-1">قالب الكتابة:</p>
        <ul className="space-y-0.5 list-none">
          <li>• <span className="text-foreground font-medium">اختيار من متعدد:</span> كل خيار في سطر يبدأ بـ <code className="bg-muted px-1 rounded">-</code> أو <code className="bg-muted px-1 rounded">أ-</code> أو <code className="bg-muted px-1 rounded">أ)</code> — ضع <code className="bg-muted px-1 rounded">*</code> قبل الإجابة الصحيحة: <code className="bg-muted px-1 rounded">- *الإجابة</code> أو <code className="bg-muted px-1 rounded">ج- *الإجابة</code></li>
          <li>• <span className="text-foreground font-medium">صح/خطأ:</span> اكتب <code className="bg-muted px-1 rounded">صح/خطأ: صح</code> أو <code className="bg-muted px-1 rounded">صح/خطأ: خطأ</code></li>
          <li>• <span className="text-foreground font-medium">مقالي:</span> اكتب <code className="bg-muted px-1 rounded">مقالي</code> في سطر منفصل</li>
          <li>• <span className="text-foreground font-medium">أكمل الفراغ:</span> اكتب <code className="bg-muted px-1 rounded">فراغ: الإجابة</code></li>
          <li>• <span className="font-semibold text-amber-600">⚠ افصل بين كل سؤال والتالي بسطر فارغ</span></li>
        </ul>
        <button
          type="button"
          onClick={() => setShowTemplate(!showTemplate)}
          className="flex items-center gap-1 text-primary hover:underline mt-1"
        >
          <FileText className="h-3 w-3" />
          {showTemplate ? "إخفاء" : "عرض"} مثال
          {showTemplate ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showTemplate && (
          <pre className="mt-2 p-2 rounded bg-muted text-[11px] font-mono whitespace-pre-wrap text-foreground/80 border border-border/50 leading-relaxed">{TEMPLATE}</pre>
        )}
      </div>

      {/* Text area */}
      <div className="space-y-2">
        <label className="text-sm font-medium">الأسئلة:</label>
        <Textarea
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setPreview(null); }}
          placeholder={TEMPLATE}
          className="h-52 font-mono text-xs resize-none"
          dir="rtl"
        />
      </div>

      <Button
        type="button"
        onClick={handleParse}
        disabled={!raw.trim()}
        variant="outline"
        className="w-full gap-2 rounded-xl"
      >
        <Wand2 className="h-4 w-4" />
        تحليل الأسئلة
      </Button>

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          {preview.errors.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">تحذيرات ({preview.errors.length}):</p>
              {preview.errors.map((e, i) => (
                <p key={i} className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1">
                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{e}
                </p>
              ))}
            </div>
          )}

          {preview.questions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                تم تحليل {preview.questions.length} سؤال بنجاح
              </p>
              <div className="max-h-52 overflow-y-auto space-y-2 rounded-xl border border-border/50 p-2">
                {preview.questions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
                    <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight">{q.text}</p>
                      <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[q.questionType]}</span>
                      {q.questionType === "single_choice" && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {q.options.map((o, oi) => (
                            <span
                              key={oi}
                              className={`text-[10px] px-1.5 py-0.5 rounded ${o.isCorrect ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold" : "bg-muted text-muted-foreground"}`}
                            >
                              {o.text || "—"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => onImport(preview.questions, "replace")}
                  className="flex-1 rounded-xl text-sm gap-1.5"
                >
                  استبدال الأسئلة الحالية
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onImport(preview.questions, "append")}
                  className="flex-1 rounded-xl text-sm gap-1.5"
                >
                  إضافة إلى الأسئلة الحالية
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
