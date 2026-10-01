export interface Flashcard {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase";
  meaningAr: string;
  definitionEn?: string;
  exampleEn: string;
  exampleAr: string;
  category: string;
  difficulty: "سهل" | "متوسط" | "متقدم";
}

export const FLASHCARDS_VERSION = "unit1_mega_goal_v6";

export const DEFAULT_FLASHCARDS: Flashcard[] = [
  // ================= الأسماء (Nouns) =================
  {
    id: "fc-noun-1",
    word: "aggression",
    phonetic: "/əˈɡreʃ.ən/",
    partOfSpeech: "noun",
    meaningAr: "عدوان / اعتداء",
    definitionEn: "Angry or violent behavior toward others.",
    exampleEn: "Fighting is a form of aggression.",
    exampleAr: "القتال هو شكل من أشكال العدوان.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-2",
    word: "aviation",
    phonetic: "/ˌeɪ.viˈeɪ.ʃən/",
    partOfSpeech: "noun",
    meaningAr: "الطيران",
    definitionEn: "Making and flying airplanes.",
    exampleEn: "Aviation makes world travel fast and easy.",
    exampleAr: "الطيران يجعل السفر حول العالم سريعاً وسهلاً.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-3",
    word: "contentment",
    phonetic: "/kənˈtent.mənt/",
    partOfSpeech: "noun",
    meaningAr: "الرضا / القناعة",
    definitionEn: "A feeling of quiet happiness and satisfaction.",
    exampleEn: "He smiled with contentment after finishing his work.",
    exampleAr: "ابتسم برضا وقناعة بعد إنهاء عمله.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-4",
    word: "deficiencies",
    phonetic: "/dɪˈfɪʃ.ən.siz/",
    partOfSpeech: "noun",
    meaningAr: "أوجه القصور / النواقص",
    definitionEn: "A lack of something that is needed.",
    exampleEn: "Poor food can cause vitamin deficiencies.",
    exampleAr: "الطعام غير الصحي قد يسبب نقصاً في الفيتامينات.",
    category: "الأسماء (Nouns)",
    difficulty: "متقدم"
  },
  {
    id: "fc-noun-5",
    word: "elements",
    phonetic: "/ˈel.ɪ.mənts/",
    partOfSpeech: "noun",
    meaningAr: "عناصر",
    definitionEn: "Basic parts of something.",
    exampleEn: "Honesty and trust are key elements of friendship.",
    exampleAr: "الصدق والثقة هما عنصران أساسيان للصداقة.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-6",
    word: "(moral) fiber",
    phonetic: "/ˌmɒr.əl ˈfaɪ.bər/",
    partOfSpeech: "noun",
    meaningAr: "النزاهة الأخلاقية / الخُلُق",
    definitionEn: "Inner strength to do what is right.",
    exampleEn: "A good leader has strong moral fiber.",
    exampleAr: "القائد الجيد يتمتع بنزاهة أخلاقية قوية.",
    category: "الأسماء (Nouns)",
    difficulty: "متقدم"
  },
  {
    id: "fc-noun-7",
    word: "glider",
    phonetic: "/ˈɡlaɪ.dər/",
    partOfSpeech: "noun",
    meaningAr: "طائرة شراعية",
    definitionEn: "A light plane that flies without an engine.",
    exampleEn: "The glider flew quietly in the sky.",
    exampleAr: "حلّقت الطائرة الشراعية بهدوء في السماء.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-8",
    word: "leftovers",
    phonetic: "/ˈleftˌoʊ.vərz/",
    partOfSpeech: "noun",
    meaningAr: "بقايا الطعام",
    definitionEn: "Food remaining uneaten after a meal.",
    exampleEn: "We ate the dinner leftovers for lunch.",
    exampleAr: "تناولنا بقايا طعام العشاء في وجبة الغداء.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-9",
    word: "operation",
    phonetic: "/ˌɒp.ərˈeɪ.ʃən/",
    partOfSpeech: "noun",
    meaningAr: "عملية / إجراء",
    definitionEn: "A planned action or medical surgery.",
    exampleEn: "The doctor performed a successful operation.",
    exampleAr: "أجرى الطبيب عملية ناجحة.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-10",
    word: "pediatric",
    phonetic: "/ˌpiː.diˈæt.rɪk/",
    partOfSpeech: "noun",
    meaningAr: "طب الأطفال",
    definitionEn: "Medical care for babies and children.",
    exampleEn: "She works in a pediatric hospital.",
    exampleAr: "هي تعمل في مستشفى لطب الأطفال.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-11",
    word: "surgeon",
    phonetic: "/ˈsɜː.dʒən/",
    partOfSpeech: "noun",
    meaningAr: "جرّاح",
    definitionEn: "A doctor who performs medical operations.",
    exampleEn: "The surgeon saved the patient's life.",
    exampleAr: "أنقذ الجرّاح حياة المريض.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-12",
    word: "pioneer",
    phonetic: "/ˌpaɪəˈnɪər/",
    partOfSpeech: "noun",
    meaningAr: "رائد",
    definitionEn: "The first person to explore or do something new.",
    exampleEn: "Marie Curie was a pioneer in science.",
    exampleAr: "كانت ماري كوري رائدة في مجال العلوم.",
    category: "الأسماء (Nouns)",
    difficulty: "سهل"
  },
  {
    id: "fc-noun-13",
    word: "predators",
    phonetic: "/ˈpred.ə.tərz/",
    partOfSpeech: "noun",
    meaningAr: "الحيوانات المفترسة",
    definitionEn: "Animals that hunt and eat other animals.",
    exampleEn: "Lions and sharks are strong predators.",
    exampleAr: "الأسود وأسماك القرش حيوانات مفترسة قوية.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-14",
    word: "propeller",
    phonetic: "/prəˈpel.ər/",
    partOfSpeech: "noun",
    meaningAr: "مروحة دافعة",
    definitionEn: "Spinning blades that push a plane or boat.",
    exampleEn: "The plane's propeller spins very fast.",
    exampleAr: "مروحة الطائرة الدافعة تدور بسرعة كبيرة.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-15",
    word: "radioactivity",
    phonetic: "/ˌreɪ.di.oʊ.ækˈtɪv.ə.ti/",
    partOfSpeech: "noun",
    meaningAr: "النشاط الإشعاعي",
    definitionEn: "Energy and rays given off by certain atoms.",
    exampleEn: "High radioactivity is dangerous to health.",
    exampleAr: "النشاط الإشعاعي المرتفع خطير على الصحة.",
    category: "الأسماء (Nouns)",
    difficulty: "متقدم"
  },
  {
    id: "fc-noun-16",
    word: "struggle",
    phonetic: "/ˈstrʌɡ.əl/",
    partOfSpeech: "noun",
    meaningAr: "صراع / معاناة",
    definitionEn: "A very hard fight or effort to do something.",
    exampleEn: "Success often comes after a long struggle.",
    exampleAr: "النجاح غالباً ما يأتي بعد كفاح وصراع طويل.",
    category: "الأسماء (Nouns)",
    difficulty: "متوسط"
  },
  {
    id: "fc-noun-17",
    word: "symbiosis",
    phonetic: "/ˌsɪm.baɪˈoʊ.sɪs/",
    partOfSpeech: "noun",
    meaningAr: "تعايش تكافلي",
    definitionEn: "Two different living things helping each other live.",
    exampleEn: "Bees and flowers live in symbiosis.",
    exampleAr: "النحل والأزهار يعيشون في تعايش تكافلي.",
    category: "الأسماء (Nouns)",
    difficulty: "متقدم"
  },
  {
    id: "fc-noun-18",
    word: "tentacles",
    phonetic: "/ˈten.tə.kəlz/",
    partOfSpeech: "noun",
    meaningAr: "مجسات / لوامس",
    definitionEn: "Long, flexible arms of sea animals like an octopus.",
    exampleEn: "An octopus has eight long tentacles.",
    exampleAr: "يمتلك الأخطبوط ثمانية مجسات طويلة.",
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
    definitionEn: "To laugh quietly.",
    exampleEn: "The funny story made him chuckle.",
    exampleAr: "القصة الطريفة جعلته يضحك ضحكة خفيفة.",
    category: "الأفعال (Verbs)",
    difficulty: "سهل"
  },
  {
    id: "fc-verb-2",
    word: "compensate",
    phonetic: "/ˈkɒm.pən.seɪt/",
    partOfSpeech: "verb",
    meaningAr: "يعوّض",
    definitionEn: "To make up for a loss or damage.",
    exampleEn: "The company will compensate him for the damage.",
    exampleAr: "ستعوّضه الشركة عن الضرر.",
    category: "الأفعال (Verbs)",
    difficulty: "متوسط"
  },
  {
    id: "fc-verb-3",
    word: "honor",
    phonetic: "/ˈɒn.ər/",
    partOfSpeech: "verb",
    meaningAr: "يكرّم / يحترم",
    definitionEn: "To show great respect for someone.",
    exampleEn: "The school will honor the best students.",
    exampleAr: "ستكرّم المدرسة أفضل الطلاب.",
    category: "الأفعال (Verbs)",
    difficulty: "سهل"
  },
  {
    id: "fc-verb-4",
    word: "reject",
    phonetic: "/rɪˈdʒekt/",
    partOfSpeech: "verb",
    meaningAr: "يرفض",
    definitionEn: "To say no to something or refuse to accept it.",
    exampleEn: "He decided to reject the offer.",
    exampleAr: "قرر أن يرفض العرض.",
    category: "الأفعال (Verbs)",
    difficulty: "سهل"
  },
  {
    id: "fc-verb-5",
    word: "swoop",
    phonetic: "/swuːp/",
    partOfSpeech: "verb",
    meaningAr: "ينقضّ / يهوي بسرعة",
    definitionEn: "To fly down quickly to catch something.",
    exampleEn: "Eagles swoop down to catch fish.",
    exampleAr: "تنقضّ النسور بسرعة للإمساك بالأسماك.",
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
    definitionEn: "Very strong, sharp, or serious.",
    exampleEn: "Dogs have an acute sense of smell.",
    exampleAr: "تمتلك الكلاب حاسة شمّ حادة وقوية.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-2",
    word: "devoted",
    phonetic: "/dɪˈvoʊ.tɪd/",
    partOfSpeech: "adjective",
    meaningAr: "مخلص / متفانٍ",
    definitionEn: "Very loving, loyal, and caring.",
    exampleEn: "He is a devoted friend who always helps.",
    exampleAr: "إنه صديق مخلص ومتفانٍ يساعد دائماً.",
    category: "الصفات (Adjectives)",
    difficulty: "سهل"
  },
  {
    id: "fc-adj-3",
    word: "experimental",
    phonetic: "/ɪkˌsper.ɪˈmen.təl/",
    partOfSpeech: "adjective",
    meaningAr: "تجريبي",
    definitionEn: "New and still being tested.",
    exampleEn: "Doctors are testing an experimental medicine.",
    exampleAr: "يختبر الأطباء دواءً تجريبياً جديداً.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-4",
    word: "extensive",
    phonetic: "/ɪkˈsten.sɪv/",
    partOfSpeech: "adjective",
    meaningAr: "واسع / شامل",
    definitionEn: "Large in size, amount, or range.",
    exampleEn: "She has extensive knowledge of English.",
    exampleAr: "لديها معرفة واسعة وشاملة باللغة الإنجليزية.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-5",
    word: "fearsome",
    phonetic: "/ˈfɪə.səm/",
    partOfSpeech: "adjective",
    meaningAr: "مخيف / مرعب",
    definitionEn: "Very scary or frightening.",
    exampleEn: "The lion is a fearsome animal.",
    exampleAr: "الأسد حيوان مخيف ومرعب.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-6",
    word: "flustered",
    phonetic: "/ˈflʌs.tərd/",
    partOfSpeech: "adjective",
    meaningAr: "مرتبك / مضطرب",
    definitionEn: "Nervous, confused, and upset.",
    exampleEn: "He felt flustered when he forgot his keys.",
    exampleAr: "شعر بالارتباك والاضطراب عندما نسي مفاتيحه.",
    category: "الصفات (Adjectives)",
    difficulty: "متوسط"
  },
  {
    id: "fc-adj-7",
    word: "invaluable",
    phonetic: "/ɪnˈvæl.ju.ə.bəl/",
    partOfSpeech: "adjective",
    meaningAr: "لا يُقدّر بثمن / قيّم جدًا",
    definitionEn: "Extremely useful and valuable.",
    exampleEn: "Good health is an invaluable blessing.",
    exampleAr: "الصحة الجيدة نعمة قيّمة لا تُقدّر بثمن.",
    category: "الصفات (Adjectives)",
    difficulty: "متقدم"
  },
  {
    id: "fc-adj-8",
    word: "legendary",
    phonetic: "/ˈledʒ.ən.der.i/",
    partOfSpeech: "adjective",
    meaningAr: "أسطوري",
    definitionEn: "Very famous and admired by many people.",
    exampleEn: "He is a legendary football player.",
    exampleAr: "إنه لاعب كرة قدم أسطوري ومشهور.",
    category: "الصفات (Adjectives)",
    difficulty: "سهل"
  },
  {
    id: "fc-adj-9",
    word: "reliable",
    phonetic: "/rɪˈlaɪ.ə.bəl/",
    partOfSpeech: "adjective",
    meaningAr: "موثوق",
    definitionEn: "Can be trusted to work well or do what is expected.",
    exampleEn: "Ali is a reliable person you can trust.",
    exampleAr: "عليّ شخص موثوق يمكنك الاعتماد عليه.",
    category: "الصفات (Adjectives)",
    difficulty: "سهل"
  },
  {
    id: "fc-adj-10",
    word: "symbiotic",
    phonetic: "/ˌsɪm.baɪˈɒt.ɪk/",
    partOfSpeech: "adjective",
    meaningAr: "تكافلي",
    definitionEn: "Helping each other in a close relationship.",
    exampleEn: "Bees and flowers have a symbiotic relationship.",
    exampleAr: "بين النحل والأزهار علاقة تكافلية متبادلة.",
    category: "الصفات (Adjectives)",
    difficulty: "متقدم"
  },

  // ================= كلام واقعي / تعبيرات عامية (Real Talk) =================
  {
    id: "fc-expr-rt-1",
    word: "No sweat.",
    phonetic: "/noʊ swet/",
    partOfSpeech: "phrase",
    meaningAr: "لا مشكلة / الأمر سهل.",
    definitionEn: "No problem; it is easy to do.",
    exampleEn: "Can you help me? — Sure, no sweat!",
    exampleAr: "هل يمكنك مساعدتي؟ — بالتأكيد، لا مشكلة والأمر سهل!",
    category: "كلام واقعي (Real Talk)",
    difficulty: "سهل"
  },
  {
    id: "fc-expr-rt-2",
    word: "Not my cup of tea.",
    phonetic: "/nɒt maɪ kʌp ɒv tiː/",
    partOfSpeech: "phrase",
    meaningAr: "هذا ليس من اهتماماتي / ليس الشيء الذي أحبه.",
    definitionEn: "Something that I do not like or enjoy.",
    exampleEn: "Video games are not my cup of tea.",
    exampleAr: "ألعاب الفيديو ليست من اهتماماتي.",
    category: "كلام واقعي (Real Talk)",
    difficulty: "سهل"
  },
  {
    id: "fc-expr-rt-3",
    word: "on the same wavelength",
    phonetic: "/ɒn ðə seɪm ˈweɪv.leŋθ/",
    partOfSpeech: "phrase",
    meaningAr: "متفقان في التفكير / نفكر بالطريقة نفسها.",
    definitionEn: "Thinking in the same way and understanding each other.",
    exampleEn: "My friend and I are always on the same wavelength.",
    exampleAr: "أنا وصديقي دائماً متفقان في التفكير.",
    category: "كلام واقعي (Real Talk)",
    difficulty: "متوسط"
  }
];
