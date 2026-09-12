export interface Flashcard {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase";
  meaningAr: string;
  exampleEn: string;
  exampleAr: string;
  category: string;
  difficulty: "سهل" | "متوسط" | "متقدم";
}

export const FLASHCARDS_VERSION = "unit1_mega_goal_v4";

export const DEFAULT_FLASHCARDS: Flashcard[] = [
  // ================= الأسماء (Nouns) =================
  {
    id: "fc-noun-1",
    word: "aggression",
    phonetic: "/əˈɡreʃ.ən/",
    partOfSpeech: "noun",
    meaningAr: "عدوان / اعتداء",
    exampleEn: "The international treaty aimed to prevent cross-border aggression.",
    exampleAr: "هدفت المعاهدة الدولية إلى منع العدوان والاعتداء عبر الحدود.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-2",
    word: "aviation",
    phonetic: "/ˌeɪ.viˈeɪ.ʃən/",
    partOfSpeech: "noun",
    meaningAr: "الطيران",
    exampleEn: "The Wright brothers made historic contributions to the science of aviation.",
    exampleAr: "قدّم الأخوان رايت إسهامات تاريخية في علم الطيران.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-3",
    word: "contentment",
    phonetic: "/kənˈtent.mənt/",
    partOfSpeech: "noun",
    meaningAr: "الرضا / القناعة",
    exampleEn: "Real contentment comes from appreciating the simple blessings in life.",
    exampleAr: "الرضا والقناعة الحقيقية تنبع من تقدير النعم البسيطة في الحياة.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-4",
    word: "deficiencies",
    phonetic: "/dɪˈfɪʃ.ən.siz/",
    partOfSpeech: "noun",
    meaningAr: "أوجه القصور / النواقص",
    exampleEn: "The medical tests identified key nutritional deficiencies in his diet.",
    exampleAr: "حددت الفحوصات الطبية أوجه القصور والنواقص الغذائية في نظامه الغذائي.",
    category: "الأسماء (Nouns)",
    difficulty: "متقدم"
  },
  {
    id: "fc-noun-5",
    word: "elements",
    phonetic: "/ˈel.ɪ.mənts/",
    partOfSpeech: "noun",
    meaningAr: "عناصر",
    exampleEn: "Trust and mutual respect are essential elements of successful teamwork.",
    exampleAr: "الثقة والاحترام المتبادل هما عنصران أساسيان لنجاح العمل الجماعي.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-6",
    word: "(moral) fiber",
    phonetic: "/ˌmɒr.əl ˈfaɪ.bər/",
    partOfSpeech: "noun",
    meaningAr: "النزاهة الأخلاقية / الخُلُق",
    exampleEn: "A great leader must have the moral fiber to make principled decisions.",
    exampleAr: "يجب أن يتمتع القائد العظيم بالنزاهة الأخلاقية والخُلُق القويم لاتخاذ قرارات مبدئية.",
    category: "الأسماء (Nouns)",
    difficulty: "متقدم"
  },
  {
    id: "fc-noun-7",
    word: "glider",
    phonetic: "/ˈɡlaɪ.dər/",
    partOfSpeech: "noun",
    meaningAr: "طائرة شراعية",
    exampleEn: "He soared peacefully above the green valley in an unpowered glider.",
    exampleAr: "حلّق بسلام فوق الوادي الأخضر على متن طائرة شراعية خفيفة.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-8",
    word: "leftovers",
    phonetic: "/ˈleftˌoʊ.vərz/",
    partOfSpeech: "noun",
    meaningAr: "بقايا الطعام",
    exampleEn: "We packed the dinner leftovers in glass containers for lunch tomorrow.",
    exampleAr: "قمنا بتعبئة بقايا طعام العشاء في أوعية زجاجية لتناولها في الغداء غداً.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-9",
    word: "operation",
    phonetic: "/ˌɒp.ərˈeɪ.ʃən/",
    partOfSpeech: "noun",
    meaningAr: "عملية / إجراء",
    exampleEn: "The emergency rescue operation was carried out with extreme care.",
    exampleAr: "نُفذت عملية الإنقاذ الطارئة وإجراءاتها بأقصى درجات العناية والحرص.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-10",
    word: "pediatric",
    phonetic: "/ˌpiː.diˈæt.rɪk/",
    partOfSpeech: "noun",
    meaningAr: "طب الأطفال",
    exampleEn: "She decided to dedicate her medical career to pediatric healthcare.",
    exampleAr: "قررت تكريس مسيرتها الطبية لمجال طب الأطفال ورعايتهم الصحية.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-11",
    word: "surgeon",
    phonetic: "/ˈsɜː.dʒən/",
    partOfSpeech: "noun",
    meaningAr: "جرّاح",
    exampleEn: "The skilled surgeon successfully performed the complex heart surgery.",
    exampleAr: "أجرى الجرّاح الماهر عملية القلب المعقدة بنجاح تام.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-12",
    word: "pioneer",
    phonetic: "/ˌpaɪəˈnɪər/",
    partOfSpeech: "noun",
    meaningAr: "رائد",
    exampleEn: "Marie Curie was a scientific pioneer in the discovery of radioactivity.",
    exampleAr: "كانت ماري كوري رائدة علمية في اكتشاف النشاط الإشعاعي.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-13",
    word: "predators",
    phonetic: "/ˈpred.ə.tərz/",
    partOfSpeech: "noun",
    meaningAr: "الحيوانات المفترسة",
    exampleEn: "Lions, wolves, and tigers are apex predators in the animal kingdom.",
    exampleAr: "الأسود والذئاب والنمور هي حيوانات مفترسة قمة في المملكة الحيوانية.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-14",
    word: "propeller",
    phonetic: "/prəˈpel.ər/",
    partOfSpeech: "noun",
    meaningAr: "مروحة دافعة",
    exampleEn: "The vintage aircraft is powered by a twin-blade spinning propeller.",
    exampleAr: "تعمل الطائرة الكلاسيكية بواسطة مروحة دافعة دوارة ثنائية الشفرات.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-15",
    word: "radioactivity",
    phonetic: "/ˌreɪ.di.oʊ.ækˈtɪv.ə.ti/",
    partOfSpeech: "noun",
    meaningAr: "النشاط الإشعاعي",
    exampleEn: "Special sensors are placed around the lab to monitor radioactivity levels.",
    exampleAr: "توضع أجهزة استشعار خاصة حول المختبر لمراقبة مستويات النشاط الإشعاعي.",
    category: "الأسماء (Nouns)",
    difficulty: "متقدم"
  },
  {
    id: "fc-noun-16",
    word: "struggle",
    phonetic: "/ˈstrʌɡ.əl/",
    partOfSpeech: "noun",
    meaningAr: "صراع / معاناة",
    exampleEn: "Their prolonged struggle for equal educational opportunities inspired millions.",
    exampleAr: "ألهم صراعهم ومعاناتهم الطويلة من أجل فرص تعليم متكافئة الملايين.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-17",
    word: "symbiosis",
    phonetic: "/ˌsɪm.baɪˈoʊ.sɪs/",
    partOfSpeech: "noun",
    meaningAr: "تعايش تكافلي",
    exampleEn: "The mutual partnership between bees and flowers is a classic symbiosis.",
    exampleAr: "الشراكة المتبادلة بين النحل والزهور هي نموذج كلاسيكي للتعايش التكافلي.",
    category: "الأسماء (Nouns)",
    difficulty: "متقدم"
  },
  {
    id: "fc-noun-18",
    word: "tentacles",
    phonetic: "/ˈten.tə.kəlz/",
    partOfSpeech: "noun",
    meaningAr: "مجسات / لوامس",
    exampleEn: "The giant octopus uses its flexible tentacles to capture food.",
    exampleAr: "يستخدم الأخطبوط العملاق لوامسه ومجساته المرنة للإمساك بطعامه.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },

  // ================= الأفعال (Verbs) =================
  {
    id: "fc-verb-1",
    word: "chuckle",
    phonetic: "/ˈtʃʌk.əl/",
    partOfSpeech: "verb",
    meaningAr: "يضحك ضحكة خفيفة",
    exampleEn: "He began to chuckle softly at his friend's witty remark.",
    exampleAr: "بدأ يضحك ضحكة خفيفة بهدوء على تعليق صديقه الذكي.",
    category: "الأفعال (Verbs)",
    difficulty: "سهل"
  },
  {
    id: "fc-verb-2",
    word: "compensate",
    phonetic: "/ˈkɒm.pən.seɪt/",
    partOfSpeech: "verb",
    meaningAr: "يعوّض",
    exampleEn: "The airline company agreed to compensate passengers for the delayed flight.",
    exampleAr: "وافقت شركة الطيران على تعويض المسافرين عن تأخر الرحلة.",
    category: "الأفعال (Verbs)",
    difficulty: "متوسط"
  },
  {
    id: "fc-verb-3",
    word: "honor",
    phonetic: "/ˈɒn.ər/",
    partOfSpeech: "verb",
    meaningAr: "يكرّم / يحترم",
    exampleEn: "The school will honor top-achieving students at the end-of-year ceremony.",
    exampleAr: "ستكرّم المدرسة وتحتفي بالطلاب المتفوقين في حفل نهاية العام.",
    category: "الأفعال (Verbs)",
    difficulty: "سهل"
  },
  {
    id: "fc-verb-4",
    word: "reject",
    phonetic: "/rɪˈdʒekt/",
    partOfSpeech: "verb",
    meaningAr: "يرفض",
    exampleEn: "The editorial committee decided to reject any unverified research papers.",
    exampleAr: "قررت هيئة التحرير رفض أي أوراق بحثية غير مثبتة وموثقة.",
    category: "الأفعال (Verbs)",
    difficulty: "سهل"
  },
  {
    id: "fc-verb-5",
    word: "swoop",
    phonetic: "/swuːp/",
    partOfSpeech: "verb",
    meaningAr: "ينقضّ / يهوي بسرعة",
    exampleEn: "The falcon began to swoop down swiftly to catch its prey.",
    exampleAr: "بدأ الصقر ينقضّ ويهوي بسرعة خاطفة للإمساك بفريسته.",
    category: "الأفعال (Verbs)",
    difficulty: "متوسط"
  },

  // ================= الصفات (Adjectives) =================
  {
    id: "fc-adj-1",
    word: "acute",
    phonetic: "/əˈkjuːt/",
    partOfSpeech: "adjective",
    meaningAr: "حاد / شديد",
    exampleEn: "The athlete experienced acute pain in his shoulder after the match.",
    exampleAr: "شعر الرياضي بألم حاد وشديد في كتفه بعد المباراة.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-2",
    word: "devoted",
    phonetic: "/dɪˈvoʊ.tɪd/",
    partOfSpeech: "adjective",
    meaningAr: "مخلص / متفانٍ",
    exampleEn: "She is a devoted teacher who puts extra effort into helping every student.",
    exampleAr: "إنها معلمة مخلصة ومتفانية تبذل جهداً إضافياً لمساعدة كل طالب.",
    category: "الصفات (Adjectives)",
    difficulty: "سهل"
  },
  {
    id: "fc-adj-3",
    word: "experimental",
    phonetic: "/ɪkˌsper.ɪˈmen.təl/",
    partOfSpeech: "adjective",
    meaningAr: "تجريبي",
    exampleEn: "The research lab is testing an experimental renewable energy system.",
    exampleAr: "يختبر مختبر الأبحاث نظاماً تجريبياً للطاقة المتجددة.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-4",
    word: "extensive",
    phonetic: "/ɪkˈsten.sɪv/",
    partOfSpeech: "adjective",
    meaningAr: "واسع / شامل",
    exampleEn: "The medical team conducted extensive research before publishing their results.",
    exampleAr: "أجرى الفريق الطبي بحثاً واسعاً وشاملاً قبل نشر نتائجهم.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-5",
    word: "fearsome",
    phonetic: "/ˈfɪə.səm/",
    partOfSpeech: "adjective",
    meaningAr: "مخيف / مرعب",
    exampleEn: "The roaring lion presented a fearsome sight to anyone nearby.",
    exampleAr: "شكّل زئير الأسد مشهداً مخيفاً ومرعباً لأي شخص بالقرب منه.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-6",
    word: "flustered",
    phonetic: "/ˈflʌs.tərd/",
    partOfSpeech: "adjective",
    meaningAr: "مرتبك / مضطرب",
    exampleEn: "The speaker became flustered when he forgot his opening notes.",
    exampleAr: "أصبح المتحدث مرتبكاً ومضطرباً عندما نسي ملاحظاته الافتتاحية.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-7",
    word: "invaluable",
    phonetic: "/ɪnˈvæl.ju.ə.bəl/",
    partOfSpeech: "adjective",
    meaningAr: "لا يُقدّر بثمن / قيّم جدًا",
    exampleEn: "Her experienced advice proved invaluable to the success of our project.",
    exampleAr: "أثبتت نصيحتها الخبيرة أنها لا تُقدّر بثمن وقيّمة جداً لنجاح مشروعنا.",
    category: "الصفات (Adjectives)",
    difficulty: "متقدم"
  },
  {
    id: "fc-adj-8",
    word: "legendary",
    phonetic: "/ˈledʒ.ən.der.i/",
    partOfSpeech: "adjective",
    meaningAr: "أسطوري",
    exampleEn: "King Faisal's legendary leadership left a lasting impact on education.",
    exampleAr: "تركت قيادة الملك فيصل الأسطورية أثراً دائماً على مسيرة التعليم.",
    category: "الصفات (Adjectives)",
    difficulty: "سهل"
  },
  {
    id: "fc-adj-9",
    word: "reliable",
    phonetic: "/rɪˈlaɪ.ə.bəl/",
    partOfSpeech: "adjective",
    meaningAr: "موثوق",
    exampleEn: "A reliable reference book is essential when studying for English exams.",
    exampleAr: "المرجع العلمي الموثوق ضروري جداً عند المذاكرة لاختبارات اللغة الإنجليزية.",
    category: "الصفات (Adjectives)",
    difficulty: "سهل"
  },
  {
    id: "fc-adj-10",
    word: "symbiotic",
    phonetic: "/ˌsɪm.baɪˈɒt.ɪk/",
    partOfSpeech: "adjective",
    meaningAr: "تكافلي",
    exampleEn: "The two organizations established a symbiotic partnership that benefited both.",
    exampleAr: "أسست المنظمتان شراكة تكافلية عادت بالنفع الكبير على كلا الطرفين.",
    category: "الصفات (Adjectives)",
    difficulty: "متقدم"
  },

  // ================= عبارات التفاوض (Negotiating Expressions) =================
  {
    id: "fc-expr-neg-1",
    word: "How about if I... and you...?",
    phonetic: "/haʊ əˈbaʊt ɪf aɪ... ənd juː...?/",
    partOfSpeech: "phrase",
    meaningAr: "ما رأيك أن أفعل... وأنت تفعل...؟",
    exampleEn: "How about if I write the summary and you design the presentation slides?",
    exampleAr: "ما رأيك أن أقوم أنا بكتابة الملخص وأنت تقوم بتصميم شرائح العرض؟",
    category: "التفاوض (Negotiating)",
    difficulty: "متوسط"
  },
  {
    id: "fc-expr-neg-2",
    word: "I think it would be fair if...",
    phonetic: "/aɪ θɪŋk ɪt wʊd biː feər ɪf.../",
    partOfSpeech: "phrase",
    meaningAr: "أعتقد أنه سيكون من العادل أن...",
    exampleEn: "I think it would be fair if we divided the assignment tasks equally.",
    exampleAr: "أعتقد أنه سيكون من العادل والإنصاف أن نقسم مهام الواجب بالتساوي.",
    category: "التفاوض (Negotiating)",
    difficulty: "متوسط"
  },
  {
    id: "fc-expr-neg-3",
    word: "I'm sure we can work this out.",
    phonetic: "/aɪm ʃʊər wiː kæn wɜːk ðɪs aʊt/",
    partOfSpeech: "phrase",
    meaningAr: "أنا متأكد أننا نستطيع حلّ هذا الأمر.",
    exampleEn: "Don't worry about the slight misunderstanding; I'm sure we can work this out.",
    exampleAr: "لا تقلق بشأن سوء التفاهم البسيط؛ أنا متأكد أننا نستطيع حلّ هذا الأمر معاً.",
    category: "التفاوض (Negotiating)",
    difficulty: "متوسط"
  },
  {
    id: "fc-expr-neg-4",
    word: "OK, I'll agree to... if you will...",
    phonetic: "/oʊˈkeɪ aɪl əˈɡriː tuː... ɪf juː wɪl.../",
    partOfSpeech: "phrase",
    meaningAr: "حسنًا، سأوافق على... إذا وافقتَ على...",
    exampleEn: "OK, I'll agree to present first if you will answer the audience questions.",
    exampleAr: "حسنًا، سأوافق على التقديم أولاً إذا وافقتَ على الإجابة على أسئلة الجمهور.",
    category: "التفاوض (Negotiating)",
    difficulty: "متوسط"
  },
  {
    id: "fc-expr-neg-5",
    word: "Would you (be willing to)... if I...?",
    phonetic: "/wʊd juː biː ˈwɪl.ɪŋ tuː... ɪf aɪ...?/",
    partOfSpeech: "phrase",
    meaningAr: "هل ستكون مستعدًا لـ... إذا أنا...؟",
    exampleEn: "Would you be willing to review my essay if I summarize chapter three for you?",
    exampleAr: "هل ستكون مستعدًا لمراجعة مقالي إذا قمتُ أنا بتلخيص الفصل الثالث لك؟",
    category: "التفاوض (Negotiating)",
    difficulty: "متوسط"
  },

  // ================= كلام واقعي / تعبيرات عامية (Real Talk) =================
  {
    id: "fc-expr-rt-1",
    word: "No sweat.",
    phonetic: "/noʊ swet/",
    partOfSpeech: "phrase",
    meaningAr: "لا مشكلة / الأمر سهل.",
    exampleEn: "Thank you so much for helping me study! — No sweat, anytime!",
    exampleAr: "شكراً جزيلاً لك على مساعدتي في المذاكرة! — لا مشكلة، الأمر سهل في أي وقت!",
    category: "كلام واقعي (Real Talk)",
    difficulty: "سهل"
  },
  {
    id: "fc-expr-rt-2",
    word: "Not my cup of tea.",
    phonetic: "/nɒt maɪ kʌp ɒv tiː/",
    partOfSpeech: "phrase",
    meaningAr: "هذا ليس من اهتماماتي / ليس الشيء الذي أحبه.",
    exampleEn: "Watching horror films is definitely not my cup of tea.",
    exampleAr: "مشاهدة أفلام الرعب ليست من اهتماماتي على الإطلاق ولا الشيء الذي أحبه.",
    category: "كلام واقعي (Real Talk)",
    difficulty: "سهل"
  },
  {
    id: "fc-expr-rt-3",
    word: "on the same wavelength",
    phonetic: "/ɒn ðə seɪm ˈweɪv.leŋθ/",
    partOfSpeech: "phrase",
    meaningAr: "متفقان في التفكير / نفكر بالطريقة نفسها.",
    exampleEn: "From our very first discussion, we realized we were on the same wavelength.",
    exampleAr: "منذ أول مناقشة بيننا، أدركنا أننا متفقان في التفكير ونفكر بالطريقة نفسها تماماً.",
    category: "كلام واقعي (Real Talk)",
    difficulty: "متوسط"
  }
];
