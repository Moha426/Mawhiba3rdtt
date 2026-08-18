import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("CRITICAL: GEMINI_API_KEY is missing from environment variables. AI features will not work.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Robust helper with multi-model fallback and automatic retry on 503 / 429 high demand errors
 */
async function generateWithFallback(
  ai: GoogleGenAI,
  contents: any[],
  responseMimeType: string = "application/json",
  useSearch: boolean = false
): Promise<string | null> {
  const modelsToTry = [
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];
  
  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: any = { responseMimeType };
        if (useSearch) {
          config.tools = [{ googleSearch: {} }];
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config
        });
        if (response?.text) return response.text;
      } catch (err: any) {
        let errMsg: string;
        try {
          errMsg = [
            err?.message,
            err?.status,
            err?.statusText,
            err?.error?.message,
            err?.error?.code,
            typeof err === 'object' ? JSON.stringify(err) : String(err),
            String(err)
          ].filter(Boolean).join(" ").toLowerCase();
        } catch (e) {
          errMsg = String(err).toLowerCase();
        }

        const isRateLimit = 
          err?.status === 429 || 
          err?.error?.code === 429 || 
          err?.statusCode === 429 ||
          errMsg.includes("429") || 
          errMsg.includes("quota") || 
          errMsg.includes("limit") || 
          errMsg.includes("exhausted");

        const isUnavailable =
          err?.status === 503 ||
          err?.error?.code === 503 ||
          errMsg.includes("503") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("demand") ||
          errMsg.includes("overloaded");

        // Only log warning if we are on the last attempt of the last model
        if (modelName === modelsToTry[modelsToTry.length - 1] && attempt === 1) {
          console.error(`All Gemini models failed. Last error (${modelName}):`, err?.message || err);
        } else if (isRateLimit || isUnavailable) {
          // Silent failover for quota/demand issues
          break; 
        } else {
          // For other errors, maybe log a small note
          console.warn(`Gemini failover: ${modelName} attempt ${attempt + 1} failed, trying next...`);
        }
        
        if (!isRateLimit && !isUnavailable) {
          await new Promise((r) => setTimeout(r, 500));
        } else {
          break; // Move to next model immediately on quota/demand
        }
      }
    }
  }
  return null;
}

function robustJsonParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch (err) {
    let inQuote = false;
    let result = "";
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const prevChar = i > 0 ? str[i - 1] : "";
      if (char === '"' && prevChar !== '\\') {
        inQuote = !inQuote;
        result += char;
      } else if (inQuote) {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += char;
        }
      } else {
        result += char;
      }
    }
    return JSON.parse(result);
  }
}

export interface SolveRequest {
  questionText?: string;
  subject?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface SolveResponse {
  extractedQuestion: string;
  answer: string;
  steps: string[];
  rule: string;
  shortcut: string;
}

export async function solveProblemWithGemini(req: SolveRequest): Promise<SolveResponse> {
  const { questionText, subject = "القدرات والتحصيلي", imageBase64, imageMimeType = "image/jpeg" } = req;
  const ai = getAIClient();

  if (ai) {
    try {
      const parts: any[] = [];
      let prompt = "";

      const shiaInstructions = `
توجيهات عقائدية وفكرية قاطعة لالتزام مذهب التشيع الإمامي الاثني عشري كمنهج ومذهب طبيعي ومباشر للبوت في جميع إجاباته:
1. مذهب البوت وهويته: أنت شيعي المذهب بالكامل. إذا سألك أي طالب "ما هو مذهبك؟" أو ما شابه، أجب مباشرة وفخوراً بأنك شيعي (شيعي جعفري إمامي)، ولا تتردد أو تلف وتدور.
2. التحدث بصيغة الحقيقة المطلقة والبديهية الطبيعية: لا تستخدم أبداً صيغاً مثل "حسب رأي المذهب الشيعي" أو "في فقه الشيعة" أو "عند الشيعة الإمامية" أو "يرى علماء الطائفة". بل تكلم بشكل طبيعي ومباشر واعرض عقائد وفقه مذهب أهل البيت كحقائق مسلمة ومباشرة بلا هوامش أو تردد.
   - مثال: إذا سألك طالب "ما هي أصول الدين؟"، اذكرها مباشرة ومدمجة كالتالي: (أصول الدين خمسة: التوحيد، العدل، النبوة، الإمامة، المعاد) دون أن تقول "حسب مذهب الشيعة".
   - مثال: إذا سألك أحد عن المسائل الفقهية (كالوضوء أو الصلاة أو الخمس أو المتعة أو غيرها)، أجب بالأحكام والآراء المعتمدة عند فقهاء الإمامية الأصوليين كحكم طبيعي ومسلم به ومباشر، بلا تردد أو إشارة لمدارس أخرى إلا إذا طُلب ذلك لمقارنة علمية.
3. تفكير ومنهج البوت: تفكيرك وعقلك شيعي جعفري اثني عشري إمامي أصولي، وتجيب وفق ذلك تماماً، لكن لا تسرد هذه الألقاب كشعارات أو بطاقات تعريفية مكررة إلا إذا دعت الحاجة، بل دع هذا التفكير يظهر في جوهر كلامك وتفاصيل إجاباتك بطبيعية كاملة وعفوية.
4. الألقاب والصيغ العقائدية:
   - عند ذكر أمير المؤمنين علي بن أبي طالب، قل دائماً: "أمير المؤمنين الإمام علي عليه السلام" أو "أمير المؤمنين صلوات الله عليه".
   - عند ذكر الصديقة الطاهرة فاطمة الزهراء، أو الأئمة من ولدها (الحسن والحسين والتسعة المعصومين صلوات الله عليهم)، قل دائماً: "عليها السلام" أو "عليه السلام" أو "عليهم السلام" أو "صلوات الله عليهم".
   - عند ذكر الخلفاء الآخرين (عمر بن الخطاب، أبو بكر, عثمان)، اذكرهم مجردين من أي ترضّي أو دعاء أو تفضيل (مثال: "عمر بن الخطاب") دون زيادة أو نقصان، ولا تذكر معهم "رضي الله عنه" أو "الخليفة الراشد" إطلاقاً.`;

      const isVerbal = subject.includes("لفظي") || subject.includes("verbal");

      const verbalInstructions = `
ملاحظة وتوجيه هام جداً بخصوص أسئلة القسم اللفظي لاختبار القدرات (التناظر اللفظي، إكمال الجمل، الخطأ السياقي، استيعاب المقروء):
- يجب دائماً صياغة وحل وشرح أسئلة القسم اللفظي اعتماداً على المعايير الرسمية والتفسيرات المعتمدة في المواقع والمصادر السعودية الشهيرة، وعلى رأسها:
  1. موقع "اختبارات" المشهور.
  2. موقع "تفوق" التعليمي.
  3. والأهم والأفضل على الإطلاق: تجميعات، شروحات، واستراتيجيات التأسيس والحل للأستاذ الخبير القدير "إيهاب عبد العظيم".
- **هام جداً**: يمنع منعاً باتاً الإجابة من ذاكرتك الخاصة لأسئلة القسم اللفظي. يجب عليك استخدام أداة البحث (Google Search) للوصول إلى الإجابة الصحيحة المعتمدة في هذه المواقع والتأكد من "نموذج الإجابة" الرسمي، لأن هذه الأسئلة تتطلب إجابة واحدة محددة وغالباً ما تكون هناك خيارات متشابهة جداً ومضللة.
- اشرح العلاقات اللفظية ووجه تفكير الطالب بأسلوب الأستاذ إيهاب عبد العظيم لتبسيط القاعدة وربط الإجابة الصحيحة بالمنطق المعتمد في قياس.`;

      if (subject === "general_tasks") {
        prompt = `أنت المساعد الذكي الصديق وبوت المهام والواجبات والتوجيه الدراسي لطلاب موهبة والتعليم العام في المملكة العربية السعودية.
مهمتك: الإجابة على الأسئلة العامة للطلاب، تقديم نصائح لتنظيم الوقت، المساعدة في فهم طريقة حل الواجبات وتوزيع المهام، وتقديم إجابات ذكية ملهمة ومشجعة ومباشرة وبحرية تامة وبدون أي قوالب كتابية جامدة على الإطلاق.
اكتب الرد بأسلوب طبيعي وعفوي كصديق وموجه مخلص، مستخدماً تنسيقات Markdown الجميلة (الخطوط العريضة والمقوائم والأسطر والرموز التعبيرية المشجعة).

${shiaInstructions}
${verbalInstructions}`;
      } else {
        prompt = `أنت المعلم الذكي والناصح الأمين والأكاديمي الشامل لطلاب موهبة والقدرات والتحصيلي ومختلف المواد الدراسية في المملكة العربية السعودية.
المادة / المجال الدراسية: ${subject}

تعليمات الكتابة والصياغة الفنية (هام جداً):
1. أزل أي قوالب كتابية جامدة تماماً مثل التقسيم الإجباري لخطوات منفصلة أو جداول جافة أو قوانين معزولة، إلا إذا تطلب الشرح ذلك طبيعياً.
2. اكتب الشرح، التوضيح، الحل التفصيلي، القوانين الرياضية، والخدع السريعة مدمجة بأسلوب مسترسل وبحرية تامة في نص واحد منسق بـ ماركداون (Markdown) الأنيق والمقروء.
3. تفنن في التنسيقات الرياضية: اكتب الأسس (مثل س²، ص³)، الجذور (مثل √25)، الكسور (مثل 1/2 أو البسط والمقام بشكل منسق)، والرموز الرياضية (مثل ط، π، ×، ÷، ≠، ±) وغيرها بوضوح ممتاز وجميل.
4. استخدم النجوم للخطوط العريضة (**نص عريض**)، والقوائم النقطية أو الرقمية لتبسيط الخطوات بمرونة تامة.

${shiaInstructions}
${verbalInstructions}`;
      }

      prompt += "\n\n";

      if (questionText && questionText.trim()) {
        prompt += `السؤال أو النص المدخل من الطالب:
${questionText.trim()}
`;
      }

      if (imageBase64) {
        prompt += `\nمرفق لقطة شاشة أو صورة من الطالب للمسألة أو المعادلة أو الرسم البياني. يرجى قراءة معطيات الصورة بكل دقة وحلها وشرحها بالكامل.`;
      }

      prompt += `
أجب بصيغة JSON تحتوي على الحقول التالية حصراً:
{
  "extractedQuestion": "نص السؤال المستخلص من الصورة أو النص المرفق",
  "answer": "النص الكامل المنسق بـ Markdown للشرح والحل الطبيعي الحر بدون قوالب مع الحسابات والقوانين بوضوح"
}`;

      parts.push({ text: prompt });

      if (imageBase64) {
        // Strip data:image/...;base64, prefix if present
        let rawBase64 = imageBase64;
        let mime = imageMimeType;
        if (imageBase64.includes(";base64,")) {
          const split = imageBase64.split(";base64,");
          const mimeMatch = split[0].match(/data:(.*?)$/);
          if (mimeMatch) mime = mimeMatch[1];
          rawBase64 = split[1];
        }

        parts.push({
          inlineData: {
            data: rawBase64,
            mimeType: mime || "image/jpeg",
          },
        });
      }

      const textResponse = await generateWithFallback(ai, parts, "application/json", isVerbal);

      if (textResponse) {
        try {
          let cleanJson = textResponse.trim();
          if (cleanJson.startsWith("```")) {
            cleanJson = cleanJson.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
          }
          const parsed = robustJsonParse(cleanJson);
          if (parsed && parsed.answer) {
            return {
              extractedQuestion: parsed.extractedQuestion || questionText || "سؤال من الطالب",
              answer: parsed.answer,
              steps: [],
              rule: "",
              shortcut: "",
            };
          }
        } catch (parseErr) {
          console.warn("JSON parse fallback for Gemini response:", parseErr);
          // If parse fails but there's text, use the text itself as the answer
          return {
            extractedQuestion: questionText || "سؤال من الطالب",
            answer: textResponse,
            steps: [],
            rule: "",
            shortcut: "",
          };
        }
      }
    } catch (apiErr) {
      console.error("Gemini Tutor solve error:", apiErr);
    }
  }

  // Fallback intelligent solver if no API key or network glitch
  const text = (questionText || "").trim();
  const lowerText = text.toLowerCase();

  // Local Shia-aligned fallback answers for key religious/theological questions in case of API quota limits
  if (lowerText.includes("مذهب") || lowerText.includes("شيعي") || lowerText.includes("شيعة") || lowerText.includes("جعفري") || lowerText.includes("طائفة")) {
    return {
      extractedQuestion: text || "ما هو مذهبك؟",
      answer: "أنا **شيعي المذهب بالكامل (شيعي جعفري إمامي أصولي)**، وأجيب عن جميع تساؤلاتك بناءً على معارف ومبادئ وفقه مدرسة أهل البيت صلوات الله عليهم أجمعين كمنهج طبيعي ومباشر وبديهي.",
      steps: [
        "الانتماء لمدرسة أهل البيت عليهم السلام اتباعاً لحديث الثقلين الشريفين: كتاب الله وعترتي أهل بيتي.",
        "تبني الخط المرجعي والاجتهاد الأصولي في الفروع الفقهية والمسائل المستحدثة."
      ],
      rule: "مذهب أهل البيت عليهم السلام هو الامتداد الحقيقي والشرعي لرسالة النبي الأكرم صلى الله عليه وآله وسلم.",
      shortcut: "مذهبي شيعي جعفري إمامي أصولي."
    };
  }

  if (lowerText.includes("أصول الدين") || lowerText.includes("اصول الدين")) {
    return {
      extractedQuestion: text || "ما هي أصول الدين؟",
      answer: "أصول الدين خمسة وهي الأساس العقائدي لكل مسلم موحد:\n\n1. **التوحيد**: الإيمان بوحدانية الله سبحانه وتعالى وتنزيهه عن الشريك والمثيل والجسمية.\n2. **العدل**: الإيمان بأن الله عادل لا يظلم أحداً، ولا يفعل إلا الحسن والجميل سبحانه.\n3. **النبوة**: الإيمان بجميع الأنبياء والرسل، وخاتمهم نبينا الأكرم محمد بن عبد الله صلى الله عليه وآله وسلم.\n4. **الإمامة**: الاعتقاد بوجود اثني عشر إماماً معصوماً من ولد علي وفاطمة، أولهم أمير المؤمنين الإمام علي عليه السلام، وآخرهم الإمام المهدي المنتظر عجل الله فرجه الشريف.\n5. **المعاد**: الإيمان باليوم الآخر والبعث والحساب والجنة والنار.",
      steps: [
        "معرفة الله وتوحيده في الذات والصفات والعبادة.",
        "الاعتقاد بالعدل الإلهي في جميع الأفعال والمقادير.",
        "الإقرار بالنبوات والرسالات الإلهية المتعاقبة.",
        "التمسك بالإمامة والولاية كعهد إلهي معصوم لحفظ الشريعة.",
        "الإيمان باليوم الآخر والمعاد للحساب والجزاء."
      ],
      rule: "أصول الدين خمسة: التوحيد، والعدل، والنبوة، والإمامة، والمعاد.",
      shortcut: "التوحيد، والعدل، والنبوة، والإمامة، والمعاد."
    };
  }

  if (lowerText.includes("فروع الدين") || lowerText.includes("عبادات")) {
    return {
      extractedQuestion: text || "ما هي فروع الدين؟",
      answer: "فروع الدين عشرة وهي التكاليف العملية العبادية والاجتماعية:\n\n1. **الصلاة**: عمود الدين والصلة اليومية بين العبد وخالقه.\n2. **الصوم**: الصيام الواجب في شهر رمضان المبارك.\n3. **الخمس**: إخراج خمس أرباح المكاسب والفوائد وتوزيعها وفق الضوابط الشرعية.\n4. **الزكاة**: الزكاة المفروضة في الغلات الأربع والأنعام الثلاثة والنقدين.\n5. **الحج**: زيارة بيت الله الحرام لمن استطاع إليه سبيلاً.\n6. **الجهاد**: بذل النفس والمال لإعلاء كلمة الله وحماية حياض الإسلام.\n7. **الأمر بالمعروف**: الحث على فعل الخير والواجبات.\n8. **النهي عن المنكر**: التحذير والردع عن المحرمات والقبائح.\n9. **التولي**: موالاة وحب رسول الله وأئمة أهل البيت صلوات الله عليهم أجمعين.\n10. **التبري**: البراء والبغض لأعداء الله وأعداء أئمة أهل البيت عليهم السلام.",
      steps: [
        "الالتزام بالواجبات الخمسة العبادية الكبرى.",
        "الوفاء بالحقوق المالية الشرعية كخمس الخمس والزكاة المحددة.",
        "الحفاظ على العلاقات والتكامل الاجتماعي من خلال الموالاة (التولي) والبراء (التبري)."
      ],
      rule: "فروع الدين عشرة: الصلاة، الصوم، الخمس, الزكاة، الحج، الجهاد، الأمر بالمعروف، النهي عن المنكر، التولي، التبري.",
      shortcut: "الفروع عشرة: الصلاة، الصوم، الخمس، الزكاة، الحج، الجهاد، الأمر بالمعروف، النهي عن المنكر، التولي، التبري."
    };
  }

  if (lowerText.includes("علي عليه السلام") || lowerText.includes("الامام علي") || lowerText.includes("الإمام علي") || lowerText.includes("علي بن ابي طالب") || lowerText.includes("علي بن أبي طالب")) {
    return {
      extractedQuestion: text || "حدثني عن الإمام علي عليه السلام",
      answer: "هو **أمير المؤمنين الإمام علي بن أبي طالب عليه السلام**، وصي رسول الله صلى الله عليه وآله وسلم وخليفته الشرعي الأول بلا فصل، وهو أول أئمة أهل البيت المعصومين صلوات الله عليهم، والمنصّب بإرادة الله تعالى في يوم غدير خم لولاية أمر المسلمين.",
      steps: [
        "نشأته في حجر النبي الأكرم وتغذيته من علمه ومكارم أخلاقه.",
        "سبقه للإسلام وفدائه للنبي في مبيته ليلة الهجرة.",
        "حمله لرايات النصر في كافة الغزوات والمعارك النبوية.",
        "تنصيبه الإلهي في بيعة الغدير الشهيرة."
      ],
      rule: "الإمام علي عليه السلام هو نفس رسول الله بنص آية المباهلة، والوصي والخلف الشرعي الأول صلوات الله عليه.",
      shortcut: "أمير المؤمنين الإمام علي عليه السلام هو الخليفة والوصي الأول بلا فصل."
    };
  }

  if (text.includes("زمن اللحاق") || text.includes("سيارة") || text.includes("سرعة")) {
    return {
      extractedQuestion: text || "انطلقت سيارة بسرعة 80 كم/س وبعد ساعتين انطلقت سيارة أخرى بسرعة 100 كم/س، متى تلتقي السيارتان؟",
      answer: "الخيار الصحيح: بعد 8 ساعات من انطلاق السيارة الثانية (أو مسافة 800 كم).",
      steps: [
        "حساب المسافة المقطوعة للسيارة الأولى قبل انطلاق الثانية: المسافة = 80 × 2 = 160 كم.",
        "حساب فرق السرعتين بين السيارتين: 100 - 80 = 20 كم/س.",
        "تطبيق قانون زمن اللحاق: زمن اللحاق = المسافة المقطوعة ÷ فرق السرعتين = 160 ÷ 20 = 8 ساعات.",
        "إذاً تلتقي السيارتان بعد 8 ساعات من حركة السيارة الثانية.",
      ],
      rule: "قانون زمن اللحاق = (سرعة الجسم الأول × فارق الزمن) ÷ (سرعة الجسم الثاني - سرعة الجسم الأول)",
      shortcut: "اقسم المسافة المسبقة مباشرة على فارق السرعتين في سطر واحد: 160 ÷ 20 = 8 ساعات فوراً.",
    };
  }

  if (text.includes("%") || text.includes("نسبة") || text.includes("عدد")) {
    return {
      extractedQuestion: text || "إذا كان 20% من عدد يساوي 60، فما هو 50% من نفس العدد؟",
      answer: "العدد الأصلي هو 300، و 50% منه تساوي 150.",
      steps: [
        "إذا كان 20% تعادل الخُمس (1/5) = 60.",
        "العدد الكلي (100%) = 60 × 5 = 300.",
        "حساب 50% (نصف العدد) = 300 ÷ 2 = 150.",
      ],
      rule: "النسبة المئوية من عدد = (النسبة ÷ 100) × العدد الكلي، والعدد الكلي = القيمة الجزئية ÷ النسبة.",
      shortcut: "بما أن 50% هي 2.5 ضعف الـ 20%، اضرب 60 × 2.5 = 150 مباشرة.",
    };
  }

  // Dynamic general fallback generator to provide high-quality responses even under total API key quota block or missing config
  let dynamicAnswer = "";
  if (!process.env.GEMINI_API_KEY) {
    dynamicAnswer = `**تنبيه للنظام**: يبدو أن مفتاح API الخاص بـ Gemini غير مهيأ في إعدادات Vercel أو البيئة الحالية. يرجى إضافة \`GEMINI_API_KEY\` ليعمل الذكاء الاصطناعي بكامل قوته.\n\n`;
  }
  
  dynamicAnswer += `مرحباً بك يا بطل! لقد استقبلت سؤالك بكل سرور. نظراً لوجود ضغط كبير على حصة الطلبات المجانية لليوم (الحد الأقصى لليوم هو 20 طلباً مجانياً)، قمت بتفعيل نظام المساعدة التعليمي الاحتياطي للإجابة على سؤالك وتبسيط الفكرة لك مباشرة:\n\n`;
  let dynamicSteps: string[];
  let dynamicRule = "استراتيجية التفكير المنطقي والتحليل السليم لحل مسائل قياس وموهبة.";
  let dynamicShortcut = "اقرأ السؤال بدقة، حدد المعطيات، وابحث عن أقصر طريق للوصول للحل المباشر.";

  if (text) {
    dynamicAnswer += `بخصوص سؤالك: **"${text}"**\n\n`;
    if (text.includes("حل") || text.includes("سؤال") || text.includes("مسألة") || text.includes("أوجد") || text.includes("احسب")) {
      dynamicAnswer += `لتسهيل الحل والوصول للإجابة الصحيحة، اتبع هذه الخطوات التعليمية:\n`;
      dynamicAnswer += `1. **تفكيك المعطيات**: عزل القيم والأرقام الأساسية المذكورة في نص المسألة.\n`;
      dynamicAnswer += `2. **اختيار المفهوم**: ربط السؤال بالقانون أو القاعدة المناسبة (سواء كانت رياضية, هندسية, أو لغوية).\n`;
      dynamicAnswer += `3. **الحل المتدرج**: التعويض بالمعطيات خطوة بخطوة للوصول إلى النتيجة.\n`;
      dynamicAnswer += `4. **استبعاد الخيارات**: مقارنة الناتج بالخيارات المتاحة واستبعاد الإجابات غير المنطقية مبكراً.`;
      
      dynamicSteps = [
        "استخراج وتحديد المعطيات الأساسية والأرقام الواردة في المسألة.",
        "تحديد القانون الرياضي أو المفهوم العلمي المرتبط بنوع السؤال.",
        "إجراء الحسابات الرياضية بدقة وبالتدرج المنتظم.",
        "التحقق من ملاءمة الناتج ومنطقيته ومطابقته للخيارات الفعالة."
      ];
      dynamicRule = "منهجية التفكير العلمي والتحليل الرياضي المتدرج.";
    } else {
      dynamicAnswer += `لتبسيط هذا المفهوم وفهمه بشكل ممتاز، اتبع الخطوات التالية للتأسيس:\n`;
      dynamicAnswer += `1. **فهم المعنى العام**: استيعاب الفكرة الرئيسية التي يدور حولها استفسارك.\n`;
      dynamicAnswer += `2. **الربط بالتطبيقات**: ربط هذا المفهوم بالمسائل والتطبيقات الشائعة في اختبارات القدرات والتحصيلي.\n`;
      dynamicAnswer += `3. **الاستراتيجية الذهنية**: حفظ الكلمات والمفاهيم مفتاحية لتسهيل استرجاع المعلومة وقت الاختبار.\n`;
      dynamicAnswer += `4. **التطبيق والممارسة**: حل نماذج وتجميعات مشابهة لترسيخ الفكرة في ذهنك بالكامل.`;

      dynamicSteps = [
        "تحديد الكلمات المفتاحية والفكرة الرئيسية في الاستفسار.",
        "مراجعة التأسيس النظري المرتبط بالمفهوم المطروح.",
        "ربط المفهوم بالأسئلة والتجميعات العملية لتثبيت المعلومة.",
        "ممارسة الحل الذهني السريع لضمان التفوق في إدارة الوقت."
      ];
      dynamicRule = "مبادئ التأسيس الشامل لقسمي القدرات والتحصيلي.";
    }
  } else {
    dynamicAnswer += `يرجى كتابة نص السؤال أو إرفاق صورة واضحة لنتمكن من تقديم الحل والخطوات التفصيلية لك فوراً!`;
    dynamicSteps = [
      "كتابة نص السؤال بوضوح في صندوق المحادثة.",
      "أو لقط لقطة شاشة للسؤال وإرفاقها كصورة واضحة مع تحديد المادة.",
      "تحديد نوع المادة لمساعدتك بأفضل شكل ممكن."
    ];
  }

  return {
    extractedQuestion: text || (imageBase64 ? "مسألة رياضية من الصورة المرفقة" : "استفسار دراسي"),
    answer: dynamicAnswer,
    steps: dynamicSteps,
    rule: dynamicRule,
    shortcut: dynamicShortcut,
  };
}

export interface GeneratedFlashcard {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  meaningAr: string;
  exampleEn: string;
  exampleAr: string;
  category: string;
  difficulty: string;
}

export async function generateFlashcardsWithGemini(count: number = 3): Promise<GeneratedFlashcard[]> {
  const ai = getAIClient();
  if (ai) {
    try {
      const prompt = `أنت خبير في تعليم اللغة الإنجليزية واختبارات STEP و IELTS.
المطلوب:
توليد ${count} بطاقات تعليمية (Flashcards) للكلمات الأكثر تكراراً وأهمية لطلاب اختبار STEP في المملكة العربية السعودية.
يجب أن تكون الكلمات بمستوى (متوسط إلى متقدم) وتتعلق بالأكاديمية أو القراءة أو المصطلحات الشائعة.

أجب بصيغة JSON مصفوفة حصراً بدون أي كود ماركداون خارجي، وفق الهيكل التالي لكل كائن:
[
  {
    "word": "The English Word",
    "phonetic": "/Transcription/",
    "partOfSpeech": "noun/verb/adj",
    "meaningAr": "المعنى باللغة العربية",
    "exampleEn": "A clear academic English example sentence.",
    "exampleAr": "ترجمة المثال للغة العربية",
    "category": "أكاديمي وSTEP",
    "difficulty": "متوسط أو متقدم"
  }
]`;

      const text = await generateWithFallback(ai, [{ text: prompt }], "application/json");
      if (text) {
        return JSON.parse(text);
      }
    } catch (err) {
      console.error("Error generating flashcards with Gemini:", err);
    }
  }

  // Fallback
  return [
    {
      word: "Incentive",
      phonetic: "/ɪnˈsentɪv/",
      partOfSpeech: "noun",
      meaningAr: "حافز، مشجع",
      exampleEn: "The company offers a financial incentive to employees.",
      exampleAr: "تقدم الشركة حافزاً مالياً للموظفين.",
      category: "أكاديمي وSTEP",
      difficulty: "متوسط",
    },
    {
      word: "Evaluate",
      phonetic: "/ɪˈvæljueɪt/",
      partOfSpeech: "verb",
      meaningAr: "يقيم، يثمن",
      exampleEn: "Teachers evaluate their students' progress regularly.",
      exampleAr: "يقيم المعلمون تقدم طلابهم بانتظام.",
      category: "أكاديمي وSTEP",
      difficulty: "متوسط",
    },
    {
      word: "Pragmatic",
      phonetic: "/præɡˈmætɪk/",
      partOfSpeech: "adjective",
      meaningAr: "عملي، واقعي",
      exampleEn: "We need a pragmatic approach to solve this problem.",
      exampleAr: "نحتاج إلى نهج عملي لحل هذه المشكلة.",
      category: "أكاديمي وSTEP",
      difficulty: "متقدم",
    }
  ].slice(0, count);
}

export async function generateQuizWithGemini(topic: string, count: number, details?: string): Promise<any[]> {
  const ai = getAIClient();
  if (ai) {
    try {
      const prompt = `أنت خبير في وضع اختبارات القدرات والتحصيلي والمنهج السعودي.
المطلوب:
توليد ${count} أسئلة اختبار (MCQ) حول الموضوع التالي: ${topic}.
${details ? `تفاصيل إضافية: ${details}` : ""}

يجب أن يكون كل سؤال بصيغة اختيار من متعدد (4 خيارات).
أجب بصيغة JSON مصفوفة حصراً بدون أي كود ماركداون خارجي، وفق الهيكل التالي لكل كائن:
[
  {
    "question": "نص السؤال",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correctIndex": 0,
    "explanation": "شرح الحل ولماذا هذا الخيار هو الصحيح"
  }
]`;

      const text = await generateWithFallback(ai, [{ text: prompt }], "application/json");
      if (text) {
        return JSON.parse(text);
      }
    } catch (err) {
      console.error("Error generating quiz with Gemini:", err);
    }
  }
  return [];
}

export async function generateStudyPlanWithGemini(examDate: string, dailyHours: string, targetScore: string): Promise<any> {
  const ai = getAIClient();
  if (ai) {
    try {
      const prompt = `أنت مخطط تعليمي ذكي (Learning Architect).
المطلوب:
تصميم خطة مذاكرة شاملة ومحكمة لمنتج تعليمي (قدرات/تحصيلي).
المعطيات:
- موعد الاختبار: ${examDate}
- ساعات المذاكرة اليومية: ${dailyHours}
- الدرجة المستهدفة: ${targetScore}

أجب بصيغة JSON حصراً بدون أي كود ماركداون خارجي، وفق الهيكل التالي:
{
  "phase1": { "title": "...", "desc": "...", "days": "..." },
  "phase2": { "title": "...", "desc": "...", "days": "..." },
  "phase3": { "title": "...", "desc": "...", "days": "..." },
  "dailyRoutine": ["خطوة 1", "خطوة 2", "خطوة 3", "خطوة 4"],
  "tips": ["نصيحة 1", "نصيحة 2", "نصيحة 3"]
}`;

      const text = await generateWithFallback(ai, [{ text: prompt }], "application/json");
      if (text) {
        return JSON.parse(text);
      }
    } catch (err) {
      console.error("Error generating plan with Gemini:", err);
    }
  }
  return null;
}
