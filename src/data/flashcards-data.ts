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
  {
    id: "fc-1",
    word: "Achievement",
    phonetic: "/əˈtʃiːv.mənt/",
    partOfSpeech: "noun",
    meaningAr: "إنجاز / إحراز / نجاح",
    exampleEn: "Passing the STEP exam with high marks was a great achievement.",
    exampleAr: "كان اجتياز اختبار STEP بدرجات عالية إنجازاً عظيماً.",
    category: "أكاديمي وSTEP",
    difficulty: "سهل"
  },
  {
    id: "fc-2",
    word: "Analyze",
    phonetic: "/ˈæn.əl.aɪz/",
    partOfSpeech: "verb",
    meaningAr: "يطالع ويحلل / يفحص بالتفصيل",
    exampleEn: "Students need to analyze the graph before answering the question.",
    exampleAr: "يحتاج الطلاب إلى تحليل الرسم البياني قبل الإجابة على السؤال.",
    category: "أكاديمي وSTEP",
    difficulty: "متوسط"
  },
  {
    id: "fc-3",
    word: "Collaborate",
    phonetic: "/kəˈlæb.ə.reɪt/",
    partOfSpeech: "verb",
    meaningAr: "يتعاون / يعمل مع فريق",
    exampleEn: "We collaborated on the final physics project to achieve the best result.",
    exampleAr: "تعاونا في مشروع الفيزياء النهائي لتحقيق أفضل نتيجة.",
    category: "مصطلحات اليومية",
    difficulty: "متوسط"
  },
  {
    id: "fc-4",
    word: "Perseverance",
    phonetic: "/ˌpɜː.sɪˈvɪə.rəns/",
    partOfSpeech: "noun",
    meaningAr: "المواظبة / المثابرة والتحمل",
    exampleEn: "Success in competitive exams requires dedication and perseverance.",
    exampleAr: "النجاح في الاختبارات التنافسية يتطلب التفاني والمثابرة.",
    category: "مفردات الموهبة",
    difficulty: "متقدم"
  },
  {
    id: "fc-5",
    word: "Comprehensive",
    phonetic: "/ˌkɒm.prɪˈhen.sɪv/",
    partOfSpeech: "adjective",
    meaningAr: "شامل / مستوفٍ لكافة التفاصيل",
    exampleEn: "The library provides a comprehensive study guide for high school students.",
    exampleAr: "توفر المكتبة دليلاً دراسياً شاملاً لطلاب المرحلة الثانوية.",
    category: "أكاديمي وSTEP",
    difficulty: "متقدم"
  },
  {
    id: "fc-6",
    word: "Hypothesis",
    phonetic: "/haɪˈpɒθ.ə.sɪs/",
    partOfSpeech: "noun",
    meaningAr: "فرضية علمية / افتراض مبدئي",
    exampleEn: "The scientist formulated a hypothesis to test in the laboratory.",
    exampleAr: "صاغ العالم فرضية لاختبارها في المختبر.",
    category: "مفردات العلوم",
    difficulty: "متوسط"
  },
  {
    id: "fc-7",
    word: "Fluently",
    phonetic: "/ˈfluː.ənt.li/",
    partOfSpeech: "adverb",
    meaningAr: "بطلاقة / بأسلوب سلس",
    exampleEn: "She speaks English fluently after practicing every day.",
    exampleAr: "هي تتحدث الإنجليزية بطلاقة بعد التمرن يومياً.",
    category: "كلمات متكررة",
    difficulty: "سهل"
  },
  {
    id: "fc-8",
    word: "Curiosity",
    phonetic: "/ˌkjʊə.riˈɒs.ə.ti/",
    partOfSpeech: "noun",
    meaningAr: "الشغف وحب الاستطلاع / الفضول العلمي",
    exampleEn: "Intellectual curiosity drive gifted students to explore advanced topics.",
    exampleAr: "الشغف المعرفي يدفع الطلاب الموهوبين لاستكشاف مواضيع متقدمة.",
    category: "مفردات الموهبة",
    difficulty: "سهل"
  },
  {
    id: "fc-9",
    word: "Implement",
    phonetic: "/ˈɪm.plɪ.ment/",
    partOfSpeech: "verb",
    meaningAr: "يطبق / ينفذ خطة أو قرار",
    exampleEn: "The school will implement new study schedules next semester.",
    exampleAr: "ستطبق المدرسة جداول دراسية جديدة الفصل القادم.",
    category: "أكاديمي وSTEP",
    difficulty: "متوسط"
  },
  {
    id: "fc-10",
    word: "Phenomenon",
    phonetic: "/fəˈnɒm.ɪ.nən/",
    partOfSpeech: "noun",
    meaningAr: "ظاهرة طبيعية أو علمية",
    exampleEn: "Aurora borealis is a natural phenomenon visible in polar regions.",
    exampleAr: "الشفق قطبي هو ظاهرة طبيعية تُشاهد في المناطق القطبية.",
    category: "مفردات العلوم",
    difficulty: "متقدم"
  },
  {
    id: "fc-11",
    word: "Efficient",
    phonetic: "/ɪˈfɪʃ.ənt/",
    partOfSpeech: "adjective",
    meaningAr: "كفؤ / فعال ويقتصد الوقت",
    exampleEn: "Using a Pomodoro timer is an efficient way to manage study time.",
    exampleAr: "استخدام مؤقت البومودورو طريقة فعالة لإدارة وقت المذاكرة.",
    category: "كلمات متكررة",
    difficulty: "سهل"
  },
  {
    id: "fc-12",
    word: "Innovative",
    phonetic: "/ˈɪn.ə.və.tɪv/",
    partOfSpeech: "adjective",
    meaningAr: "ابتكاري / إبداعي وغير تقليدي",
    exampleEn: "The student presented an innovative solution to the energy problem.",
    exampleAr: "قدّم الطالب حلاً إبداعياً لمشكلة الطاقة.",
    category: "مفردات الموهبة",
    difficulty: "متوسط"
  },
  {
    id: "fc-13",
    word: "Evaluate",
    phonetic: "/ɪˈvæl.ju.eɪt/",
    partOfSpeech: "verb",
    meaningAr: "يقيم / يقدر القيمة أو المستوى",
    exampleEn: "Teachers evaluate progress through periodic quizzes and assignments.",
    exampleAr: "يقيّم المعلمون التقدم من خلال الكويزات والواجبات الدورية.",
    category: "أكاديمي وSTEP",
    difficulty: "متوسط"
  },
  {
    id: "fc-14",
    word: "Equilibrium",
    phonetic: "/ˌiː.kwɪˈlɪb.ri.əm/",
    partOfSpeech: "noun",
    meaningAr: "توازن / حالة التعادل الفيزياء والكيمياء",
    exampleEn: "Chemical equilibrium occurs when forward and reverse reactions match.",
    exampleAr: "يحدث الاتزان الكيميائي عندما تتساوى التفاعلات الأمامية والعكسية.",
    category: "مفردات العلوم",
    difficulty: "متقدم"
  },
  {
    id: "fc-15",
    word: "Perspective",
    phonetic: "/pəˈspek.tɪv/",
    partOfSpeech: "noun",
    meaningAr: "منظور / وجهة نظر / زاوية رؤية",
    exampleEn: "Reading different books broadens your perspective on life.",
    exampleAr: "قراءة الكتب المختلفة توسع منظورك تجاه الحياة.",
    category: "كلمات متكررة",
    difficulty: "متوسط"
  }
];
