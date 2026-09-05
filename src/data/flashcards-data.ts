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

export const DEFAULT_FLASHCARDS: Flashcard[] = [
  // Unit 1: Two Is Better Than One (Added from User Image & Cloud Sync)
  {
    id: "fc-u1-1",
    word: "Aggression",
    phonetic: "/əˈɡreʃ.ən/",
    partOfSpeech: "noun",
    meaningAr: "عدوان / عنف",
    exampleEn: "Animals sometimes show aggression when protecting their territory.",
    exampleAr: "تظهر الحيوانات أحياناً عدواناً عند حماية مناطقها.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-2",
    word: "Companions",
    phonetic: "/kəmˈpæn.jənz/",
    partOfSpeech: "noun",
    meaningAr: "الأصدقاء / الرفاق",
    exampleEn: "Good companions make the long journey much more enjoyable.",
    exampleAr: "الرفاق الجيدون يجعلون الرحلة الطويلة أكثر متعة بكثير.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-3",
    word: "Contentment",
    phonetic: "/kənˈtent.mənt/",
    partOfSpeech: "noun",
    meaningAr: "القناعة والرضا",
    exampleEn: "True contentment comes from appreciation rather than wealth.",
    exampleAr: "القناعة الحقيقية تنبع من التقدير وليس من الثروة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-4",
    word: "Fiber deficiencies",
    phonetic: "/ˈfaɪ.bər dɪˈfɪʃ.ən.siz/",
    partOfSpeech: "noun",
    meaningAr: "نقص الألياف",
    exampleEn: "A balanced diet helps prevent fiber deficiencies and digestive issues.",
    exampleAr: "النظام الغذائي المتوازن يساعد في منع نقص الألياف ومشاكل الهضم.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-5",
    word: "Elements",
    phonetic: "/ˈel.ɪ.mənts/",
    partOfSpeech: "noun",
    meaningAr: "عناصر",
    exampleEn: "The periodic table lists all known chemical elements.",
    exampleAr: "الجدول الدوري يسرد جميع العناصر الكيميائية المعروفة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-6",
    word: "Grief",
    phonetic: "/ɡriːf/",
    partOfSpeech: "noun",
    meaningAr: "حزن عميق",
    exampleEn: "She experienced deep grief after losing her beloved pet.",
    exampleAr: "عانت من حزن عميق بعد فقدان حيوانها الأليف المحبوب.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-7",
    word: "Intellect",
    phonetic: "/ˈɪn.təl.ekt/",
    partOfSpeech: "noun",
    meaningAr: "العقل / القدرة الفكرية",
    exampleEn: "Solving complex riddles requires sharp intellect and focus.",
    exampleAr: "حل الألغاز المعقدة يتطلب عقلاً حاداً وتركيزاً.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-8",
    word: "Leftovers",
    phonetic: "/ˈleftˌoʊ.vərz/",
    partOfSpeech: "noun",
    meaningAr: "بقايا الطعام",
    exampleEn: "We stored the dinner leftovers in the refrigerator for tomorrow.",
    exampleAr: "حفظنا بقايا طعام العشاء في الثلاجة لليوم التالي.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-9",
    word: "Operation",
    phonetic: "/ˌɒp.ərˈeɪ.ʃən/",
    partOfSpeech: "noun",
    meaningAr: "عملية (جراحية أو تقنية)",
    exampleEn: "The surgical operation was successfully completed by the specialist.",
    exampleAr: "تمت العملية الجراحية بنجاح تام من قبل الأخصائي.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-10",
    word: "Pediatric surgeon",
    phonetic: "/ˌpiː.diˈæt.rɪk ˈsɜː.dʒən/",
    partOfSpeech: "noun",
    meaningAr: "طبيب جراحة أطفال",
    exampleEn: "The pediatric surgeon performed a delicate procedure on the newborn.",
    exampleAr: "أجرى طبيب جراحة الأطفال عملية دقيقة للمولود الجديد.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-11",
    word: "Predators",
    phonetic: "/ˈpred.ə.tərz/",
    partOfSpeech: "noun",
    meaningAr: "حيوانات مفترسة",
    exampleEn: "Lions and wolves are apex predators in their natural habitats.",
    exampleAr: "الأسود والذئاب حيوانات مفترسة قمة في بيئاتها الطبيعية.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-12",
    word: "Radioactivity",
    phonetic: "/ˌreɪ.di.oʊ.ækˈtɪv.ə.ti/",
    partOfSpeech: "noun",
    meaningAr: "نشاط إشعاعي",
    exampleEn: "Scientists measure radioactivity levels near nuclear facilities.",
    exampleAr: "يقيس العلماء مستويات النشاط الإشعاعي بالقرب من المرافق النووية.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-13",
    word: "Struggle",
    phonetic: "/ˈstrʌɡ.əl/",
    partOfSpeech: "noun",
    meaningAr: "صراع / كفاح ونزاع",
    exampleEn: "Every great achievement involves a long struggle and persistence.",
    exampleAr: "كل إنجاز عظيم ينطوي على صراع طويل ومثابرة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-14",
    word: "Symbiosis",
    phonetic: "/ˌsɪm.baɪˈoʊ.sɪs/",
    partOfSpeech: "noun",
    meaningAr: "تكافل حيوي",
    exampleEn: "The relationship between bees and flowers is a classic symbiosis.",
    exampleAr: "العلاقة بين النحل والزهور هي حالة تكافل كلاسيكية.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-15",
    word: "Tentacles",
    phonetic: "/ˈten.tə.kəlz/",
    partOfSpeech: "noun",
    meaningAr: "مخالب أو لوامس بحرية",
    exampleEn: "Octopuses use their tentacles to catch food and move around.",
    exampleAr: "تستستخدم الأخطبوطات لوامسها للإمساك بالطعام والتحرك.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-16",
    word: "Unification",
    phonetic: "/ˌjuː.nɪ.fɪˈkeɪ.ʃən/",
    partOfSpeech: "noun",
    meaningAr: "توحيد ودمج",
    exampleEn: "The unification of the country brought peace and stability.",
    exampleAr: "أدى توحيد البلاد إلى السلام والاستقرار.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-17",
    word: "Chuckle",
    phonetic: "/ˈtʃʌk.əl/",
    partOfSpeech: "verb",
    meaningAr: "يضحك بشكل خفيف",
    exampleEn: "He let out a quiet chuckle while reading the funny story.",
    exampleAr: "أطلق ضحكة خفيفة أثناء قراءة القصة المضحكة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-18",
    word: "Compensate",
    phonetic: "/ˈkɒm.pən.seɪt/",
    partOfSpeech: "verb",
    meaningAr: "يعوض",
    exampleEn: "Hard work can compensate for lack of initial experience.",
    exampleAr: "العمل الجاد يمكن أن يعوض نقص الخبرة الأولية.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-19",
    word: "Employ",
    phonetic: "/ɪmˈplɔɪ/",
    partOfSpeech: "verb",
    meaningAr: "يوظف أو يستعمل",
    exampleEn: "The company plans to employ twenty new engineers this year.",
    exampleAr: "تخطط الشركة توظيف عشرين مهندساً جديداً هذا العام.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-20",
    word: "Exile",
    phonetic: "/ˈek.saɪl/",
    partOfSpeech: "verb",
    meaningAr: "ينفي أو يبعد قسراً",
    exampleEn: "The corrupt leader was forced to exile from his homeland.",
    exampleAr: "أُجبر القائد الفاسد على النفي من وطنه.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-21",
    word: "Flee",
    phonetic: "/fliː/",
    partOfSpeech: "verb",
    meaningAr: "يهرب ويفر",
    exampleEn: "Villagers had to flee their homes as the storm approached.",
    exampleAr: "اضطر القرويون للهرب من منازلهم مع اقتراب العاصفة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-22",
    word: "Honor",
    phonetic: "/ˈɒn.ər/",
    partOfSpeech: "verb",
    meaningAr: "يكرم ويجل",
    exampleEn: "The school principal will honor top-performing students.",
    exampleAr: "سيكرم مدير المدرسة الطلاب المتفوقين.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-23",
    word: "Reject",
    phonetic: "/rɪˈdʒekt/",
    partOfSpeech: "verb",
    meaningAr: "يرفض",
    exampleEn: "The committee decided to reject the flawed proposal.",
    exampleAr: "قررت اللجنة رفض المقترح المعيب.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-24",
    word: "Swoop",
    phonetic: "/swuːp/",
    partOfSpeech: "verb",
    meaningAr: "ينقض بسرعة",
    exampleEn: "The eagle began to swoop down toward the river.",
    exampleAr: "بدأ النسر في الانقضاض نحو النهر.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-25",
    word: "Acute",
    phonetic: "/əˈkjuːt/",
    partOfSpeech: "adjective",
    meaningAr: "حاد أو شديد",
    exampleEn: "He felt acute pain in his shoulder after the workout.",
    exampleAr: "شعر بألم حاد في كتفه بعد التمارين الرياضية.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-26",
    word: "Conjoined",
    phonetic: "/kənˈdʒɔɪnd/",
    partOfSpeech: "adjective",
    meaningAr: "ملتصق أو متصل",
    exampleEn: "Conjoined twins share vital organs and require specialized care.",
    exampleAr: "التوأمان الملتصقان يتشاركان أعضاء حيوية ويحتاجان رعاية متخصصة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-27",
    word: "Devoted",
    phonetic: "/dɪˈvoʊ.tɪd/",
    partOfSpeech: "adjective",
    meaningAr: "مخلص ومتفانٍ",
    exampleEn: "She is a devoted teacher who cares deeply for her students.",
    exampleAr: "هي معلمة متفانية تهتم بعمق بطلابها.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-28",
    word: "Fearsome",
    phonetic: "/ˈfɪə.səm/",
    partOfSpeech: "adjective",
    meaningAr: "مخيف ومرعب",
    exampleEn: "The medieval knight faced a fearsome dragon in the cave.",
    exampleAr: "واجه فارس العصور الوسطى تنيناً مخيفاً في الكهف.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-29",
    word: "Flustered",
    phonetic: "/ˈflʌs.tərd/",
    partOfSpeech: "adjective",
    meaningAr: "مضطرب أو مرتبك",
    exampleEn: "He became flustered when asked unexpected questions.",
    exampleAr: "أصبح مرتبكاً عندما سُئل أسئلة غير متوقعة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-30",
    word: "Grieving",
    phonetic: "/ˈɡriː.vɪŋ/",
    partOfSpeech: "adjective",
    meaningAr: "حزين ومتألم",
    exampleEn: "Friends gathered to support the grieving family.",
    exampleAr: "تجمع الأصدقاء لدعم العائلة الحزينة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-31",
    word: "Invaluable",
    phonetic: "/ɪnˈvæl.ju.ə.bəl/",
    partOfSpeech: "adjective",
    meaningAr: "لا يقدر بثمن / قيّم للغاية",
    exampleEn: "Your advice and guidance were invaluable to my research.",
    exampleAr: "كانت نصيحتك وتوجيهاتك لا تقدر بثمن لبحثي.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-32",
    word: "Legendary",
    phonetic: "/ˈledʒ.ən.der.i/",
    partOfSpeech: "adjective",
    meaningAr: "أسطوري وشهير",
    exampleEn: "His legendary wisdom was known throughout the kingdom.",
    exampleAr: "حكمته الأسطورية كانت معروفة في جميع أنحاء المملكة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-33",
    word: "Pregnant",
    phonetic: "/ˈpreɡ.nənt/",
    partOfSpeech: "adjective",
    meaningAr: "حامل",
    exampleEn: "She received special health care during her pregnancy months.",
    exampleAr: "تلقت رعاية صحية خاصّة خلال أشهر حملها.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-34",
    word: "Symbiotic",
    phonetic: "/ˌsɪm.baɪˈɒt.ɪk/",
    partOfSpeech: "adjective",
    meaningAr: "تعاوني تكافلي",
    exampleEn: "They formed a symbiotic partnership to grow their business.",
    exampleAr: "شكلا شراكة تكافلية لتنمية أعمالهما.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-35",
    word: "Unified",
    phonetic: "/ˈjuː.nɪ.faɪd/",
    partOfSpeech: "adjective",
    meaningAr: "موحد ومتكاتف",
    exampleEn: "A unified team can overcome any difficult obstacle.",
    exampleAr: "الفريق الموحد يستطيع التغلب على أي عقبة صعبة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-36",
    word: "How about if I... and you...?",
    phonetic: "/haʊ əˈbaʊt ɪf aɪ... ənd juː...?/",
    partOfSpeech: "phrase",
    meaningAr: "ما رأيك لو أنا قمت بـ... وأنت تقوم بـ...؟ (للتفاوض)",
    exampleEn: "How about if I write the report and you prepare the slides?",
    exampleAr: "ما رأيك لو أنا أكتب التقرير وأنت تجهز العرض التقديمي؟",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-37",
    word: "I think it would be fair if...",
    phonetic: "/aɪ θɪŋk ɪt wʊd biː feər ɪf.../",
    partOfSpeech: "phrase",
    meaningAr: "أعتقد أنه من الإنصاف أن...",
    exampleEn: "I think it would be fair if we share the tasks equally.",
    exampleAr: "أعتقد أنه من الإنصاف أن نتشارك المهام بالتساوي.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-38",
    word: "I'm sure we can work this out",
    phonetic: "/aɪm ʃʊər wiː kæn wɜːk ðɪs aʊt/",
    partOfSpeech: "phrase",
    meaningAr: "أنا متأكد من أنه يمكننا تسوية هذا الأمر",
    exampleEn: "Don't worry about the disagreement; I'm sure we can work this out.",
    exampleAr: "لا تقلق بشأن الخلاف؛ أنا متأكد من أنه يمكننا تسوية هذا الأمر.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متقدم"
  },
  {
    id: "fc-u1-39",
    word: "OK, I'll agree to... if you will...",
    phonetic: "/oʊˈkeɪ aɪl əˈɡriː tuː... ɪf juː wɪl.../",
    partOfSpeech: "phrase",
    meaningAr: "حسناً، سأوافق على... إذا وافقت أنت على...",
    exampleEn: "OK, I'll agree to finish early if you will review my notes.",
    exampleAr: "حسناً، سأوافق على الانهاء مبكراً إذا قمت بمراجعة ملاحظاتي.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-40",
    word: "Would you be willing to... if I...?",
    phonetic: "/wʊd juː biː ˈwɪl.ɪŋ tuː... ɪf aɪ...?/",
    partOfSpeech: "phrase",
    meaningAr: "هل ترغب في الاستعداد لـ... إذا قمت أنا بـ...؟",
    exampleEn: "Would you be willing to help me if I finish my assignment?",
    exampleAr: "هل تكون مستعداً لمساعدتي إذا أنجزت واجبي؟",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  },
  {
    id: "fc-u1-41",
    word: "No sweat",
    phonetic: "/noʊ swet/",
    partOfSpeech: "phrase",
    meaningAr: "لا مشكلة / بكل سهولة (تعبير عامي)",
    exampleEn: "Can you help me carry these books? - No sweat!",
    exampleAr: "هل يمكنك مساعدتي في حمل هذه الكتب؟ - لا مشكلة!",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-42",
    word: "Not my cup of tea",
    phonetic: "/nɒt maɪ kʌp ɒv tiː/",
    partOfSpeech: "phrase",
    meaningAr: "ليست من اهتماماتي / لا تفضلاتي",
    exampleEn: "Science fiction movies are not really my cup of tea.",
    exampleAr: "أفلام الخيال العلمي ليست حقاً من اهتماماتي المفضلة.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "سهل"
  },
  {
    id: "fc-u1-43",
    word: "On the same wavelength",
    phonetic: "/ɒn ðə seɪm ˈweɪv.len.θ/",
    partOfSpeech: "phrase",
    meaningAr: "نتفق في التفكير ونفس الموجة",
    exampleEn: "We quickly realized we were on the same wavelength regarding the project.",
    exampleAr: "أدركنا بسرعة أننا نتفق في التفكير ونفس الموجة بخصوص المشروع.",
    category: "Unit 1: Two Is Better Than One",
    difficulty: "متوسط"
  }
];

