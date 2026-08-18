import { db, getDb, recordDbFailure } from "./index";
import {
  studyFiles,
  educationalPlatforms,
  flashcards,
  users,
  communityChannels,
  escalatedQuestions,
  suggestions,
  polls,
  pollVotes,
} from "./schema";
import { eq, desc, and, isNull, or, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

// ================= LOCAL FALLBACK STORE =================
// Ensures full operational capability without crashing when Cloud SQL is offline or not configured

interface LocalStore {
  users: any[];
  studyFiles: any[];
  educationalPlatforms: any[];
  flashcards: any[];
  communityChannels: any[];
  escalatedQuestions: any[];
  suggestions: any[];
  polls: any[];
  pollVotes: any[];
}

const STORE_FILE_PATH = path.join(process.cwd(), ".local_db_store.json");

const initialPlatforms = [
  {
    id: "tiqdr",
    name: "منصة تقدر (Tiqdr)",
    url: "https://tiqdr.com/ar",
    category: "قدرات وتحصيلي",
    desc: "منصة تعليمية رائدة للتدريب المكثف على اختبار القدرات العامة واختبار التحصيلي وبنوك الأسئلة والمحاكاة التفاعلية.",
    badge: "تدريب ذكي",
    color: "#059669",
    iconBg: "rgba(5, 150, 105, 0.12)",
    tags: JSON.stringify(["قدرات", "تحصيلي", "نماذج تفاعلية", "تقارير مستوى"]),
    isCustom: false,
    isFavorite: true,
    createdAt: new Date(),
  },
  {
    id: "elmonsf",
    name: "منصة المنصف التعليمية",
    url: "https://elmonsf.com/Category/1",
    category: "قدرات وتحصيلي",
    desc: "دورات تدريبية متخصصة ومقاطع تأسيسية وحلول النماذج الشاملة لاختبارات القدرات والتحصيلي.",
    badge: "دورات وبنوك أسئلة",
    color: "#d97706",
    iconBg: "rgba(217, 119, 6, 0.12)",
    tags: JSON.stringify(["المنصف", "تأسيس", "شروحات فيديو", "تطوير المهارات"]),
    isCustom: false,
    isFavorite: true,
    createdAt: new Date(),
  },
  {
    id: "yellowqt",
    name: "منصة YellowQT (كويزات واختبارات)",
    url: "https://p.yellowqt.com/",
    category: "قدرات وتحصيلي",
    desc: "منصة التمارين والاختبارات التفاعلية والأسئلة التدريبية السريعة لطلاب الثانوية والقدرات والتحصيلي.",
    badge: "كويزات تفاعلية",
    color: "#ca8a04",
    iconBg: "rgba(202, 138, 4, 0.15)",
    tags: JSON.stringify(["Quiz", "كويزات سريعة", "تحديات", "تدريب إلكتروني"]),
    isCustom: false,
    isFavorite: false,
    createdAt: new Date(),
  },
  {
    id: "almfkr",
    name: "منصة المفكر التعليمية",
    url: "https://almfkr.sa/",
    category: "قدرات وتحصيلي",
    desc: "منصة المفكر المتخصصة في تدريب واختبارات القدرات العامة والتحصيلي والتجميعات وشروحات نماذج الأسئلة.",
    badge: "قدرات وتحصيلي",
    color: "#8b5cf6",
    iconBg: "rgba(139, 92, 246, 0.12)",
    tags: JSON.stringify(["المفكر", "قدرات", "تحصيلي", "تجميعات", "اختبارات"]),
    isCustom: false,
    isFavorite: false,
    createdAt: new Date(),
  },
  {
    id: "ghasham",
    name: "منصة غشام (المجانية)",
    url: "https://ghasham1.cc/free",
    category: "قدرات وتحصيلي",
    desc: "تجميعات وشروحات مجانية شاملة مقدمة من منصة غشام التعليمية للقدرات والتحصيلي والتسريبات M1 & M2.",
    badge: "تجميعات مجانية",
    color: "#10b981",
    iconBg: "rgba(16, 185, 129, 0.12)",
    tags: JSON.stringify(["غشام", "مجاني", "تجميعات غشام", "قدرات"]),
    isCustom: false,
    isFavorite: true,
    createdAt: new Date(),
  },
  {
    id: "qiyas_official",
    name: "المركز الوطني للقياس (Qiyas - ETEC)",
    url: "https://qiyas.etec.gov.sa/",
    category: "قدرات وتحصيلي",
    desc: "البوابة الرسمية للمركز الوطني للقياس وهيئة تقويم التعليم والتدريب لحجز الاختبارات واستعلام النتائج والتسجيل في القدرات والتحصيلي.",
    badge: "قياس رسمي 🏛️",
    color: "#2563eb",
    iconBg: "rgba(37, 99, 235, 0.12)",
    tags: JSON.stringify(["قياس", "Qiyas", "تسجيل قدرات", "نتائج تحصيلي", "ETEC"]),
    isCustom: false,
    isFavorite: true,
    createdAt: new Date(),
  },
];

const initialChannels = [
  {
    id: "chan_discord_official",
    name: "خادم ديسكورد موهبة 3 الرسمي",
    type: "discord",
    url: "https://discord.com",
    category: "خوادم ديسكورد",
    desc: "المجتمع الصوتي والدراسي المباشر للدفعة، غرف مراجعة صامتة ونقاش جماعي للمسائل الصعبة",
    badge: "رسمي",
    color: "from-indigo-600 to-blue-700",
    icon: "MessageSquare",
    memberCount: "+450 موهوب",
    isPinned: true,
    createdAt: new Date(),
  },
  {
    id: "chan_telegram_qudrat",
    name: "قناة تجميعات وتسريبات القدرات",
    type: "telegram",
    url: "https://t.me",
    category: "قنوات تليجرام",
    desc: "ملفات وتجميعات يومية محلولة، نماذج اختبارات حديثة وقوانين ذهبية لاختبارات قياس",
    badge: "تجميعات",
    color: "from-sky-500 to-blue-600",
    icon: "Send",
    memberCount: "+1,200 مشترك",
    isPinned: true,
    createdAt: new Date(),
  },
  {
    id: "chan_whatsapp_study",
    name: "مجموعة واتساب الاستفسارات العاجلة",
    type: "whatsapp",
    url: "https://chat.whatsapp.com",
    category: "مجموعات واتساب",
    desc: "للتنبيهات اليومية السريعة، الواجبات والمهام المدرسية المباشرة بين الطلاب والمعلمين",
    badge: "عاجل",
    color: "from-emerald-600 to-teal-700",
    icon: "PhoneCall",
    memberCount: "+280 طالب",
    isPinned: false,
    createdAt: new Date(),
  },
  {
    id: "chan_youtube_lectures",
    name: "قناة شروحات التحصيلي والموهبة",
    type: "youtube",
    url: "https://youtube.com",
    category: "قنوات يوتيوب",
    desc: "سلاسل مرئية احترافية في شرح أصعب مسائل الرياضيات والفيزياء والكيمياء",
    badge: "فيديو",
    color: "from-red-600 to-rose-700",
    icon: "Tv",
    memberCount: "+5,400 متابع",
    isPinned: false,
    createdAt: new Date(),
  },
];

const initialFlashcards = [
  {
    id: "fc-1",
    front: "Achievement",
    back: "إنجاز / إحراز / نجاح (الاستخدام: Passing the STEP exam with high marks was a great achievement.)",
    category: "أكاديمي وSTEP",
    difficulty: "سهل",
    example: "Passing the STEP exam with high marks was a great achievement.",
    notes: "كان اجتياز اختبار STEP بدرجات عالية إنجازاً عظيماً.",
    createdAt: new Date(),
  },
  {
    id: "fc-2",
    front: "Analyze",
    back: "يطالع ويحلل / يفحص بالتفصيل (الاستخدام: Students need to analyze the graph before answering.)",
    category: "أكاديمي وSTEP",
    difficulty: "متوسط",
    example: "Students need to analyze the graph before answering the question.",
    notes: "يحتاج الطلاب إلى تحليل الرسم البياني قبل الإجابة على السؤال.",
    createdAt: new Date(),
  },
  {
    id: "fc-3",
    front: "Perseverance",
    back: "المواظبة / المثابرة والتحمل",
    category: "مفردات الموهبة",
    difficulty: "متقدم",
    example: "Success in competitive exams requires dedication and perseverance.",
    notes: "النجاح في الاختبارات التنافسية يتطلب التفاني والمثابرة.",
    createdAt: new Date(),
  },
];

const initialFiles = [
  {
    id: "file-math-1",
    title: "تجميعات القدرات المحوسبة - النموذج الأحدث",
    category: "قدرات كمي",
    subject: "الرياضيات",
    url: "https://example.com/qudrat-latest.pdf",
    size: "4.2 MB",
    pages: 45,
    tags: JSON.stringify(["قدرات", "كمي", "تجميعات 1448"]),
    description: "أحدث تجميعات ونماذج القدرات الكمية المحوسبة مع الشرح والحل النموذجي.",
    color: "from-blue-600 to-indigo-700",
    isCustom: false,
    isFavorite: true,
    uploadedBy: "أ. محمد علي",
    createdAt: new Date(),
  },
  {
    id: "file-physics-2",
    title: "ملخص قوانين الفيزياء - التحصيلي العلمي",
    category: "تحصيلي علمي",
    subject: "الفيزياء",
    url: "https://example.com/physics-summary.pdf",
    size: "2.8 MB",
    pages: 28,
    tags: JSON.stringify(["فيزياء", "تحصيلي", "قوانين"]),
    description: "ملخص مكثف لقوانين الميكانيكا والكهرباء والضوء لاختبار التحصيلي.",
    color: "from-purple-600 to-violet-700",
    isCustom: false,
    isFavorite: false,
    uploadedBy: "أ. أحمد محمود",
    createdAt: new Date(),
  },
];

const initialEscalatedQuestions = [
  {
    id: 1,
    studentName: "عبد الله الشمري",
    studentGrade: "ثالث ثانوي - موهبة",
    subject: "القدرات والتحصيلي",
    question: "كيف يمكنني إيجاد قيمة الزاوية المجهولة في المثلث إذا كان الضلعان متساويين ومجموع الزاويتين الأخريين 110؟",
    aiAnswer: "بما أن المثلث متطابق الضلعين، فإن زاويتي القاعدة متطابقتان، وبما أن مجموع زوايا المثلث 180 درجة...",
    studentFeedback: "أريد طريقة الحل السريع للاختبار بدون خطوات طويلة",
    status: "answered",
    teacherReply: "بارك الله فيك يا بني، في اختبار القدرات اطرح مباشرة: 180 - 110 = 70 درجة للزاوية الثالثة، وإذا كان المطلوب إحدى زاويتي القاعدة اقسم 110 على 2 = 55 درجة.",
    teacherName: "أ. محمد علي",
    assignedTeacherId: "teacher_math_1",
    createdAt: new Date(Date.now() - 3600000 * 24),
    updatedAt: new Date(Date.now() - 3600000 * 12),
  },
];

const initialPolls: any[] = [];
const initialPollVotes: any[] = [];

let memoryStore: LocalStore = {
  users: [],
  studyFiles: initialFiles,
  educationalPlatforms: initialPlatforms,
  flashcards: initialFlashcards,
  communityChannels: initialChannels,
  escalatedQuestions: initialEscalatedQuestions,
  suggestions: [],
  polls: [],
  pollVotes: [],
};

// Try loading persisted file store
try {
  if (fs.existsSync(STORE_FILE_PATH)) {
    const raw = fs.readFileSync(STORE_FILE_PATH, "utf-8");
    const loaded = JSON.parse(raw);
    memoryStore = {
      ...memoryStore,
      ...loaded,
      educationalPlatforms: loaded.educationalPlatforms?.length > 0 ? loaded.educationalPlatforms : initialPlatforms,
      communityChannels: loaded.communityChannels?.length > 0 ? loaded.communityChannels : initialChannels,
      studyFiles: loaded.studyFiles?.length > 0 ? loaded.studyFiles : initialFiles,
      flashcards: loaded.flashcards?.length > 0 ? loaded.flashcards : initialFlashcards,
      escalatedQuestions: loaded.escalatedQuestions?.length > 0 ? loaded.escalatedQuestions : initialEscalatedQuestions,
      suggestions: Array.isArray(loaded.suggestions) ? loaded.suggestions : [],
      polls: Array.isArray(loaded.polls) ? loaded.polls : [],
      pollVotes: Array.isArray(loaded.pollVotes) ? loaded.pollVotes : [],
    };
  }
} catch (e) {
  // Use memoryStore default
}

let adminFirestoreForSync: any = null;

export async function loadMemoryStoreFromFirestore(db: any) {
  adminFirestoreForSync = db;
  try {
    const doc = await db.collection("server_store").doc("memoryStore").get();
    if (doc.exists) {
      const loaded = doc.data();
      memoryStore = {
        ...memoryStore,
        ...loaded,
        educationalPlatforms: loaded.educationalPlatforms?.length > 0 ? loaded.educationalPlatforms : initialPlatforms,
        communityChannels: loaded.communityChannels?.length > 0 ? loaded.communityChannels : initialChannels,
        studyFiles: loaded.studyFiles?.length > 0 ? loaded.studyFiles : initialFiles,
        flashcards: loaded.flashcards?.length > 0 ? loaded.flashcards : initialFlashcards,
        escalatedQuestions: loaded.escalatedQuestions?.length > 0 ? loaded.escalatedQuestions : initialEscalatedQuestions,
        suggestions: Array.isArray(loaded.suggestions) ? loaded.suggestions : memoryStore.suggestions,
        polls: Array.isArray(loaded.polls) ? loaded.polls : memoryStore.polls,
        pollVotes: Array.isArray(loaded.pollVotes) ? loaded.pollVotes : memoryStore.pollVotes,
      };
      console.log("Memory store loaded from Firestore successfully.");
    }
  } catch (err) {
    console.warn("Failed to load memoryStore from Firestore:", err);
  }
}

function persistStore() {
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch (e) {
    // ignore
  }

  if (adminFirestoreForSync) {
    try {
      adminFirestoreForSync.collection("server_store").doc("memoryStore").set(memoryStore).catch((e: any) => {
        // fail silently in background
      });
    } catch (err) {}
  }
}

// ================= USER QUERIES =================
export async function getOrCreateUser(userData: {
  uid: string;
  name: string;
  email?: string;
  avatar?: string;
  grade?: string;
}) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const existing = await dbInstance
        .select()
        .from(users)
        .where(eq(users.uid, userData.uid))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      const inserted = await dbInstance
        .insert(users)
        .values({
          uid: userData.uid,
          name: userData.name,
          email: userData.email,
          avatar: userData.avatar,
          grade: userData.grade,
        })
        .returning();

      return inserted[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL user query skipped, using local store:", error);
    }
  }

  // Fallback
  let user = memoryStore.users.find((u) => u.uid === userData.uid);
  if (!user) {
    user = {
      id: memoryStore.users.length + 1,
      uid: userData.uid,
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar,
      grade: userData.grade || "ثالث ثانوي - موهبة",
      role: "student",
      points: 0,
      level: 1,
      streak: 1,
      createdAt: new Date(),
    };
    memoryStore.users.push(user);
    persistStore();
  }
  return user;
}

// ================= STUDY FILES QUERIES =================
export async function getAllStudyFiles() {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      return await dbInstance
        .select()
        .from(studyFiles)
        .orderBy(desc(studyFiles.createdAt));
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL study files fetch skipped, using local store:", error);
    }
  }

  return [...memoryStore.studyFiles].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function insertStudyFile(file: {
  id: string;
  title: string;
  category: string;
  subject?: string;
  url: string;
  size?: string;
  pages?: number;
  tags?: string;
  description?: string;
  color?: string;
  uploadedBy?: string;
}) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const inserted = await dbInstance
        .insert(studyFiles)
        .values({
          id: file.id,
          title: file.title,
          category: file.category,
          subject: file.subject,
          url: file.url,
          size: file.size || "1.5 MB",
          pages: file.pages || 10,
          tags: file.tags || "[]",
          description: file.description,
          color: file.color,
          uploadedBy: file.uploadedBy,
          isCustom: true,
          isFavorite: false,
        })
        .returning();
      return inserted[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL study file insert skipped, using local store:", error);
    }
  }

  const newFile = {
    id: file.id || `file_${Date.now()}`,
    title: file.title,
    category: file.category,
    subject: file.subject,
    url: file.url,
    size: file.size || "1.5 MB",
    pages: file.pages || 10,
    tags: file.tags || "[]",
    description: file.description,
    color: file.color || "from-blue-600 to-indigo-700",
    uploadedBy: file.uploadedBy,
    isCustom: true,
    isFavorite: false,
    createdAt: new Date(),
  };

  memoryStore.studyFiles = memoryStore.studyFiles.filter((f) => f.id !== newFile.id);
  memoryStore.studyFiles.unshift(newFile);
  persistStore();
  return newFile;
}

export async function deleteStudyFile(id: string) {
  const dbInstance = getDb();
  let deleted = null;
  if (dbInstance) {
    try {
      const res = await dbInstance.delete(studyFiles).where(eq(studyFiles.id, id)).returning();
      if (res && res.length > 0) deleted = res[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL study file delete skipped, using local store:", error);
    }
  }

  memoryStore.studyFiles = memoryStore.studyFiles.filter((f) => f.id !== id);
  persistStore();
  return deleted || { success: true };
}

export async function toggleStudyFileFavorite(id: string, isFavorite: boolean) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      return await dbInstance
        .update(studyFiles)
        .set({ isFavorite })
        .where(eq(studyFiles.id, id))
        .returning();
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL study file favorite update skipped, using local store:", error);
    }
  }

  const file = memoryStore.studyFiles.find((f) => f.id === id);
  if (file) {
    file.isFavorite = isFavorite;
    persistStore();
  }
  return file;
}

// ================= EDUCATIONAL PLATFORMS QUERIES =================
export async function getAllPlatforms() {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const data = await dbInstance
        .select()
        .from(educationalPlatforms)
        .orderBy(desc(educationalPlatforms.createdAt));
      if (data && data.length > 0) {
        return data;
      }
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL platforms fetch skipped, using local store:", error);
    }
  }

  return [...memoryStore.educationalPlatforms].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export async function insertPlatform(plat: {
  id: string;
  name: string;
  url: string;
  category: string;
  desc?: string;
  badge?: string;
  color?: string;
  iconBg?: string;
  tags?: string;
}) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const inserted = await dbInstance
        .insert(educationalPlatforms)
        .values({
          id: plat.id,
          name: plat.name,
          url: plat.url,
          category: plat.category,
          desc: plat.desc,
          badge: plat.badge,
          color: plat.color || "from-blue-600 to-indigo-700",
          iconBg: plat.iconBg,
          tags: plat.tags || "[]",
          isCustom: true,
          isFavorite: false,
        })
        .returning();
      return inserted[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL platform insert skipped, using local store:", error);
    }
  }

  const newPlat = {
    id: plat.id || `plat_${Date.now()}`,
    name: plat.name,
    url: plat.url,
    category: plat.category,
    desc: plat.desc,
    badge: plat.badge,
    color: plat.color || "from-blue-600 to-indigo-700",
    iconBg: plat.iconBg,
    tags: plat.tags || "[]",
    isCustom: true,
    isFavorite: false,
    createdAt: new Date(),
  };

  memoryStore.educationalPlatforms = memoryStore.educationalPlatforms.filter((p) => p.id !== newPlat.id);
  memoryStore.educationalPlatforms.unshift(newPlat);
  persistStore();
  return newPlat;
}

export async function deletePlatform(id: string) {
  const dbInstance = getDb();
  let deleted = null;
  if (dbInstance) {
    try {
      const res = await dbInstance
        .delete(educationalPlatforms)
        .where(eq(educationalPlatforms.id, id))
        .returning();
      if (res && res.length > 0) deleted = res[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL platform delete skipped, using local store:", error);
    }
  }

  memoryStore.educationalPlatforms = memoryStore.educationalPlatforms.filter((p) => p.id !== id);
  persistStore();
  return deleted || { success: true };
}

export async function togglePlatformFavorite(id: string, isFavorite: boolean) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      return await dbInstance
        .update(educationalPlatforms)
        .set({ isFavorite })
        .where(eq(educationalPlatforms.id, id))
        .returning();
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL platform favorite update skipped, using local store:", error);
    }
  }

  const plat = memoryStore.educationalPlatforms.find((p) => p.id === id);
  if (plat) {
    plat.isFavorite = isFavorite;
    persistStore();
  }
  return plat;
}

// ================= FLASHCARDS QUERIES =================
export async function getAllFlashcards() {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      return await dbInstance
        .select()
        .from(flashcards)
        .orderBy(desc(flashcards.createdAt));
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL flashcards fetch skipped, using local store:", error);
    }
  }

  return [...memoryStore.flashcards].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export async function insertFlashcard(fc: {
  id: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: string;
  example?: string;
  notes?: string;
}) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const inserted = await dbInstance
        .insert(flashcards)
        .values({
          id: fc.id,
          front: fc.front,
          back: fc.back,
          category: fc.category || "general",
          difficulty: fc.difficulty || "medium",
          example: fc.example,
          notes: fc.notes,
        })
        .returning();
      return inserted[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL flashcard insert skipped, using local store:", error);
    }
  }

  const newCard = {
    id: fc.id || `fc_${Date.now()}`,
    front: fc.front,
    back: fc.back,
    category: fc.category || "general",
    difficulty: fc.difficulty || "medium",
    example: fc.example,
    notes: fc.notes,
    createdAt: new Date(),
  };

  memoryStore.flashcards = memoryStore.flashcards.filter((c) => c.id !== newCard.id);
  memoryStore.flashcards.unshift(newCard);
  persistStore();
  return newCard;
}

export async function deleteFlashcard(id: string) {
  const dbInstance = getDb();
  let deleted = null;
  if (dbInstance) {
    try {
      const res = await dbInstance.delete(flashcards).where(eq(flashcards.id, id)).returning();
      if (res && res.length > 0) deleted = res[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL flashcard delete skipped, using local store:", error);
    }
  }

  memoryStore.flashcards = memoryStore.flashcards.filter((c) => c.id !== id);
  persistStore();
  return deleted || { success: true };
}

// ================= COMMUNITY CHANNELS QUERIES =================
export async function getAllCommunityChannels() {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      return await dbInstance
        .select()
        .from(communityChannels)
        .orderBy(desc(communityChannels.isPinned), desc(communityChannels.createdAt));
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL community channels fetch skipped, using local store:", error);
    }
  }

  return [...memoryStore.communityChannels].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export async function insertCommunityChannel(channel: {
  id: string;
  name: string;
  type?: string;
  url: string;
  category?: string;
  desc?: string;
  badge?: string;
  color?: string;
  icon?: string;
  memberCount?: string;
  isPinned?: boolean;
}) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const inserted = await dbInstance
        .insert(communityChannels)
        .values({
          id: channel.id,
          name: channel.name,
          type: channel.type || "discord",
          url: channel.url,
          category: channel.category || "قنوات عامة",
          desc: channel.desc,
          badge: channel.badge,
          color: channel.color || "from-indigo-600 to-violet-700",
          icon: channel.icon || "MessageCircle",
          memberCount: channel.memberCount || "نشط 👥",
          isPinned: channel.isPinned ?? false,
        })
        .returning();
      return inserted[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL community channel insert skipped, using local store:", error);
    }
  }

  const newChannel = {
    id: channel.id || `chan_${Date.now()}`,
    name: channel.name,
    type: channel.type || "discord",
    url: channel.url,
    category: channel.category || "قنوات عامة",
    desc: channel.desc,
    badge: channel.badge,
    color: channel.color || "from-indigo-600 to-violet-700",
    icon: channel.icon || "MessageCircle",
    memberCount: channel.memberCount || "نشط 👥",
    isPinned: channel.isPinned ?? false,
    createdAt: new Date(),
  };

  memoryStore.communityChannels = memoryStore.communityChannels.filter((c) => c.id !== newChannel.id);
  memoryStore.communityChannels.unshift(newChannel);
  persistStore();
  return newChannel;
}

export async function updateCommunityChannel(
  id: string,
  updates: {
    name?: string;
    type?: string;
    url?: string;
    category?: string;
    desc?: string;
    badge?: string;
    color?: string;
    icon?: string;
    memberCount?: string;
    isPinned?: boolean;
  }
) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const updated = await dbInstance
        .update(communityChannels)
        .set(updates)
        .where(eq(communityChannels.id, id))
        .returning();
      return updated[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL community channel update skipped, using local store:", error);
    }
  }

  const channel = memoryStore.communityChannels.find((c) => c.id === id);
  if (channel) {
    Object.assign(channel, updates);
    persistStore();
  }
  return channel;
}

export async function deleteCommunityChannel(id: string) {
  const dbInstance = getDb();
  let deleted = null;
  if (dbInstance) {
    try {
      const res = await dbInstance.delete(communityChannels).where(eq(communityChannels.id, id)).returning();
      if (res && res.length > 0) deleted = res[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL community channel delete skipped, using local store:", error);
    }
  }

  memoryStore.communityChannels = memoryStore.communityChannels.filter((c) => c.id !== id);
  persistStore();
  return deleted || { success: true };
}

// ================= ESCALATED QUESTIONS QUERIES =================
export async function getAllEscalatedQuestions() {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      return await dbInstance
        .select()
        .from(escalatedQuestions)
        .orderBy(desc(escalatedQuestions.createdAt));
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL escalated questions fetch skipped, using local store:", error);
    }
  }

  return [...memoryStore.escalatedQuestions].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export async function insertEscalatedQuestion(data: {
  studentName: string;
  studentGrade?: string;
  subject?: string;
  question?: string;
  questionText?: string;
  imageUrl?: string;
  aiAnswer?: string;
  studentFeedback?: string;
}) {
  const dbInstance = getDb();
  const qText = data.question || data.questionText || "سؤال موهبة";
  if (dbInstance) {
    try {
      const inserted = await dbInstance
        .insert(escalatedQuestions)
        .values({
          studentName: data.studentName,
          studentGrade: data.studentGrade || "ثالث ثانوي - موهبة",
          subject: data.subject || "القدرات والتحصيلي",
          question: qText,
          imageUrl: data.imageUrl,
          aiAnswer: data.aiAnswer,
          studentFeedback: data.studentFeedback || "يحتاج مساعدة المعلم",
          status: "pending",
        })
        .returning();
      return inserted[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL escalated question insert skipped, using local store:", error);
    }
  }

  const newQuestion = {
    id: Math.floor(Math.random() * 2000000000), // Avoid exceeding Postgres integer max
    studentName: data.studentName,
    studentGrade: data.studentGrade || "ثالث ثانوي - موهبة",
    subject: data.subject || "القدرات والتحصيلي",
    question: qText,
    imageUrl: data.imageUrl,
    aiAnswer: data.aiAnswer,
    studentFeedback: data.studentFeedback || "يحتاج مساعدة المعلم",
    status: "pending",
    teacherReply: null,
    teacherName: null,
    assignedTeacherId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  memoryStore.escalatedQuestions.unshift(newQuestion);
  persistStore();
  return newQuestion;
}

export async function updateEscalatedQuestionReply(
  id: number,
  replyData: {
    status: string;
    teacherReply?: string;
    teacherName?: string;
    assignedTeacherId?: string;
  }
) {
  const dbInstance = getDb();
  if (dbInstance && id <= 2147483647) {
    try {
      const updated = await dbInstance
        .update(escalatedQuestions)
        .set({
          status: replyData.status,
          teacherReply: replyData.teacherReply,
          teacherName: replyData.teacherName,
          assignedTeacherId: replyData.assignedTeacherId,
          updatedAt: new Date(),
        })
        .where(eq(escalatedQuestions.id, id))
        .returning();
      return updated[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL escalated question reply skipped, using local store:", error);
    }
  }

  const question = memoryStore.escalatedQuestions.find((q) => q.id === id);
  if (question) {
    question.status = replyData.status;
    if (replyData.teacherReply !== undefined) question.teacherReply = replyData.teacherReply;
    if (replyData.teacherName !== undefined) question.teacherName = replyData.teacherName;
    if (replyData.assignedTeacherId !== undefined) question.assignedTeacherId = replyData.assignedTeacherId;
    question.updatedAt = new Date();
    persistStore();
  }
  return question;
}

export async function deleteEscalatedQuestion(id: number) {
  const dbInstance = getDb();
  let deleted = null;
  if (dbInstance && id <= 2147483647) {
    try {
      const res = await dbInstance.delete(escalatedQuestions).where(eq(escalatedQuestions.id, id)).returning();
      if (res && res.length > 0) deleted = res[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL escalated question delete skipped, using local store:", error);
    }
  }

  memoryStore.escalatedQuestions = memoryStore.escalatedQuestions.filter((q) => q.id !== id);
  persistStore();
  return deleted || { success: true };
}

// ================= SUGGESTIONS QUERIES =================
export async function getAllSuggestions() {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      return await dbInstance
        .select()
        .from(suggestions)
        .orderBy(desc(suggestions.createdAt));
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL suggestions fetch skipped, using local store:", error);
    }
  }

  return [...memoryStore.suggestions].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export async function insertSuggestion(data: any) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const cleanData = {
        id: data.id,
        type: data.type,
        title: data.title,
        category: data.category || "عام",
        description: data.description || "",
        data: typeof data.data === "object" ? JSON.stringify(data.data) : (data.data || null),
        studentId: typeof data.studentId === "number" ? data.studentId : parseInt(data.studentId, 10) || null,
        studentName: data.studentName,
        studentUsername: data.studentUsername || null,
        status: data.status || "pending",
        adminReply: data.adminReply || null,
        adminRepliedAt: data.adminRepliedAt ? new Date(data.adminRepliedAt) : null,
      };

      const existing = await dbInstance.select().from(suggestions).where(eq(suggestions.id, data.id));
      if (existing.length > 0) {
        const updated = await dbInstance
          .update(suggestions)
          .set({ ...cleanData, updatedAt: new Date() })
          .where(eq(suggestions.id, data.id))
          .returning();
        return updated[0];
      } else {
        const inserted = await dbInstance
          .insert(suggestions)
          .values({
            ...cleanData,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
          })
          .returning();
        return inserted[0];
      }
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL suggestion insert skipped, using local store:", error);
    }
  }

  const existingIndex = memoryStore.suggestions.findIndex((s) => s.id === data.id);
  const cleanItem = {
    id: data.id,
    type: data.type,
    title: data.title,
    category: data.category || "عام",
    description: data.description || "",
    data: typeof data.data === "object" ? JSON.stringify(data.data) : (data.data || null),
    studentId: typeof data.studentId === "number" ? data.studentId : parseInt(data.studentId, 10) || null,
    studentName: data.studentName,
    studentUsername: data.studentUsername || null,
    status: data.status || "pending",
    adminReply: data.adminReply || null,
    adminRepliedAt: data.adminRepliedAt || null,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    memoryStore.suggestions[existingIndex] = cleanItem;
  } else {
    memoryStore.suggestions.unshift(cleanItem);
  }
  persistStore();
  return cleanItem;
}

export async function updateSuggestion(id: string, updateData: any) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const cleanUpdate: any = {};
      if (updateData.type !== undefined) cleanUpdate.type = updateData.type;
      if (updateData.title !== undefined) cleanUpdate.title = updateData.title;
      if (updateData.category !== undefined) cleanUpdate.category = updateData.category;
      if (updateData.description !== undefined) cleanUpdate.description = updateData.description;
      if (updateData.data !== undefined) {
        cleanUpdate.data = typeof updateData.data === "object" ? JSON.stringify(updateData.data) : updateData.data;
      }
      if (updateData.studentId !== undefined) {
        cleanUpdate.studentId = typeof updateData.studentId === "number" ? updateData.studentId : parseInt(updateData.studentId, 10) || null;
      }
      if (updateData.studentName !== undefined) cleanUpdate.studentName = updateData.studentName;
      if (updateData.studentUsername !== undefined) cleanUpdate.studentUsername = updateData.studentUsername;
      if (updateData.status !== undefined) cleanUpdate.status = updateData.status;
      if (updateData.adminReply !== undefined) cleanUpdate.adminReply = updateData.adminReply;
      if (updateData.adminRepliedAt !== undefined) {
        cleanUpdate.adminRepliedAt = updateData.adminRepliedAt ? new Date(updateData.adminRepliedAt) : null;
      }
      cleanUpdate.updatedAt = new Date();

      const updated = await dbInstance
        .update(suggestions)
        .set(cleanUpdate)
        .where(eq(suggestions.id, id))
        .returning();
      return updated[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL suggestion update skipped, using local store:", error);
    }
  }

  const item = memoryStore.suggestions.find((s) => s.id === id);
  if (item) {
    Object.assign(item, updateData);
    item.updatedAt = new Date().toISOString();
    persistStore();
  }
  return item;
}

export async function deleteSuggestion(id: string) {
  const dbInstance = getDb();
  let deleted = null;
  if (dbInstance) {
    try {
      const res = await dbInstance.delete(suggestions).where(eq(suggestions.id, id)).returning();
      if (res && res.length > 0) deleted = res[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL suggestion delete skipped, using local store:", error);
    }
  }

  memoryStore.suggestions = memoryStore.suggestions.filter((s) => s.id !== id);
  persistStore();
  return deleted || { success: true };
}

// ================= POLLS & VOTING QUERIES =================
export async function getAllPolls() {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      return await dbInstance
        .select()
        .from(polls)
        .orderBy(desc(polls.isPinned), desc(polls.createdAt));
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL polls fetch skipped, using local store:", error);
    }
  }

  return [...memoryStore.polls].sort((a, b) => {
    if (Boolean(b.isPinned) !== Boolean(a.isPinned)) {
      return b.isPinned ? 1 : -1;
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

export async function getPollById(id: number) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const res = await dbInstance.select().from(polls).where(eq(polls.id, id));
      return res[0] || null;
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL poll by id skipped, using local store:", error);
    }
  }
  return memoryStore.polls.find((p) => Number(p.id) === Number(id)) || null;
}

export async function insertPoll(data: any) {
  const optionsStr = typeof data.options === "string" ? data.options : JSON.stringify(data.options || []);
  const cleanData: any = {
    question: data.question,
    options: optionsStr,
    status: data.status || "active",
    type: data.type || "choice",
    category: data.category || "تنظيمي وجداول",
    imageUrl: data.imageUrl || null,
    isPublic: data.isPublic !== false,
    totalVotes: typeof data.totalVotes === "number" ? data.totalVotes : 0,
    allowMultiple: Boolean(data.allowMultiple),
    preventWithdraw: Boolean(data.preventWithdraw),
    isPinned: Boolean(data.isPinned),
    correctOptionIndex: data.correctOptionIndex !== undefined ? data.correctOptionIndex : null,
    quizExplanation: data.quizExplanation || null,
    actionTitle: data.actionTitle || null,
    actionDescription: data.actionDescription || null,
    actionStatus: data.actionStatus || "pending",
    actionExecutedBy: data.actionExecutedBy || null,
    actionExecutedAt: data.actionExecutedAt ? new Date(data.actionExecutedAt) : null,
    showVoterNames: data.showVoterNames !== false,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
  };

  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const inserted = await dbInstance
        .insert(polls)
        .values({
          ...cleanData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return inserted[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL poll insert skipped, using local store:", error);
    }
  }

  const nextId = memoryStore.polls.length > 0 ? Math.max(...memoryStore.polls.map(p => Number(p.id) || 0)) + 1 : 1;
  const newPoll = {
    id: nextId,
    ...cleanData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  memoryStore.polls.unshift(newPoll);
  persistStore();
  return newPoll;
}

export async function updatePoll(id: number, updateData: any) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const cleanUpdate: any = { updatedAt: new Date() };
      if (updateData.question !== undefined) cleanUpdate.question = updateData.question;
      if (updateData.options !== undefined) {
        cleanUpdate.options = typeof updateData.options === "string" ? updateData.options : JSON.stringify(updateData.options);
      }
      if (updateData.status !== undefined) cleanUpdate.status = updateData.status;
      if (updateData.type !== undefined) cleanUpdate.type = updateData.type;
      if (updateData.category !== undefined) cleanUpdate.category = updateData.category;
      if (updateData.imageUrl !== undefined) cleanUpdate.imageUrl = updateData.imageUrl;
      if (updateData.isPublic !== undefined) cleanUpdate.isPublic = updateData.isPublic;
      if (updateData.totalVotes !== undefined) cleanUpdate.totalVotes = updateData.totalVotes;
      if (updateData.allowMultiple !== undefined) cleanUpdate.allowMultiple = updateData.allowMultiple;
      if (updateData.preventWithdraw !== undefined) cleanUpdate.preventWithdraw = updateData.preventWithdraw;
      if (updateData.isPinned !== undefined) cleanUpdate.isPinned = Boolean(updateData.isPinned);
      if (updateData.correctOptionIndex !== undefined) cleanUpdate.correctOptionIndex = updateData.correctOptionIndex;
      if (updateData.quizExplanation !== undefined) cleanUpdate.quizExplanation = updateData.quizExplanation;
      if (updateData.actionTitle !== undefined) cleanUpdate.actionTitle = updateData.actionTitle;
      if (updateData.actionDescription !== undefined) cleanUpdate.actionDescription = updateData.actionDescription;
      if (updateData.actionStatus !== undefined) cleanUpdate.actionStatus = updateData.actionStatus;
      if (updateData.actionExecutedBy !== undefined) cleanUpdate.actionExecutedBy = updateData.actionExecutedBy;
      if (updateData.actionExecutedAt !== undefined) {
        cleanUpdate.actionExecutedAt = updateData.actionExecutedAt ? new Date(updateData.actionExecutedAt) : null;
      }
      if (updateData.showVoterNames !== undefined) cleanUpdate.showVoterNames = updateData.showVoterNames;
      if (updateData.expiresAt !== undefined) {
        cleanUpdate.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt) : null;
      }

      const updated = await dbInstance
        .update(polls)
        .set(cleanUpdate)
        .where(eq(polls.id, id))
        .returning();
      return updated[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL poll update skipped, using local store:", error);
    }
  }

  const poll = memoryStore.polls.find((p) => Number(p.id) === Number(id));
  if (poll) {
    if (updateData.options && typeof updateData.options !== "string") {
      updateData.options = JSON.stringify(updateData.options);
    }
    Object.assign(poll, updateData);
    poll.updatedAt = new Date().toISOString();
    persistStore();
  }
  return poll;
}

export async function deletePoll(id: number) {
  const dbInstance = getDb();
  let deleted = null;
  if (dbInstance) {
    try {
      await dbInstance.delete(pollVotes).where(eq(pollVotes.pollId, id));
      const res = await dbInstance.delete(polls).where(eq(polls.id, id)).returning();
      if (res && res.length > 0) deleted = res[0];
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL poll delete skipped, using local store:", error);
    }
  }

  memoryStore.pollVotes = memoryStore.pollVotes.filter((v) => Number(v.pollId) !== Number(id));
  memoryStore.polls = memoryStore.polls.filter((p) => Number(p.id) !== Number(id));
  persistStore();
  return deleted || { success: true };
}

export async function getPollVotes(pollId: number) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      return await dbInstance
        .select()
        .from(pollVotes)
        .where(eq(pollVotes.pollId, pollId))
        .orderBy(desc(pollVotes.createdAt));
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL poll votes fetch skipped, using local store:", error);
    }
  }

  return memoryStore.pollVotes.filter((v) => Number(v.pollId) === Number(pollId));
}

export async function submitVote(data: {
  pollId: number;
  userId: string;
  userName: string;
  optionIndex?: number | null;
  textAnswer?: string | null;
  ratingValue?: number | null;
}) {
  const pollId = Number(data.pollId);
  const dbInstance = getDb();

  // Check if poll exists
  const poll = await getPollById(pollId);
  if (!poll) {
    throw new Error("التصويت غير موجود");
  }

  if (poll.status !== "active") {
    throw new Error("هذا التصويت مغلق حالياً");
  }

  if (poll.expiresAt && new Date(poll.expiresAt).getTime() < Date.now()) {
    throw new Error("انتهت الفترة المحددة لهذا التصويت");
  }

  const cleanVote = {
    pollId,
    userId: data.userId || "anonymous",
    userName: data.userName || "طالب مجهول",
    optionIndex: data.optionIndex !== undefined && data.optionIndex !== null ? Number(data.optionIndex) : null,
    textAnswer: data.textAnswer ? String(data.textAnswer).trim() : null,
    ratingValue: data.ratingValue !== undefined && data.ratingValue !== null ? Number(data.ratingValue) : null,
  };

  if (dbInstance) {
    try {
      // If poll does NOT allow multiple, remove existing vote for this user first
      if (!poll.allowMultiple) {
        await dbInstance
          .delete(pollVotes)
          .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, cleanVote.userId)));
      } else if (cleanVote.optionIndex !== null && cleanVote.optionIndex !== undefined) {
        // In multiple choice mode, clicking an already selected option toggles it off
        const existingVoteForOption = await dbInstance
          .select()
          .from(pollVotes)
          .where(
            and(
              eq(pollVotes.pollId, pollId),
              eq(pollVotes.userId, cleanVote.userId),
              eq(pollVotes.optionIndex, cleanVote.optionIndex)
            )
          );

        if (existingVoteForOption.length > 0) {
          await dbInstance
            .delete(pollVotes)
            .where(
              and(
                eq(pollVotes.pollId, pollId),
                eq(pollVotes.userId, cleanVote.userId),
                eq(pollVotes.optionIndex, cleanVote.optionIndex)
              )
            );

          const allVotes = await dbInstance
            .select()
            .from(pollVotes)
            .where(eq(pollVotes.pollId, pollId));

          await dbInstance
            .update(polls)
            .set({ totalVotes: allVotes.length, updatedAt: new Date() })
            .where(eq(polls.id, pollId));

          return { toggledOff: true, totalVotes: allVotes.length };
        }
      }

      const inserted = await dbInstance
        .insert(pollVotes)
        .values({
          ...cleanVote,
          createdAt: new Date(),
        })
        .returning();

      // Recalculate total votes
      const allVotes = await dbInstance
        .select()
        .from(pollVotes)
        .where(eq(pollVotes.pollId, pollId));
      
      const totalCount = allVotes.length;
      await dbInstance
        .update(polls)
        .set({ totalVotes: totalCount, updatedAt: new Date() })
        .where(eq(polls.id, pollId));

      return { vote: inserted[0], totalVotes: totalCount };
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL vote submit skipped, using local store:", error);
    }
  }

  // Memory fallback
  if (!poll.allowMultiple) {
    memoryStore.pollVotes = memoryStore.pollVotes.filter(
      (v) => !(Number(v.pollId) === pollId && v.userId === cleanVote.userId)
    );
  } else if (cleanVote.optionIndex !== null && cleanVote.optionIndex !== undefined) {
    const existingIdx = memoryStore.pollVotes.findIndex(
      (v) =>
        Number(v.pollId) === pollId &&
        v.userId === cleanVote.userId &&
        Number(v.optionIndex) === Number(cleanVote.optionIndex)
    );
    if (existingIdx >= 0) {
      memoryStore.pollVotes.splice(existingIdx, 1);
      const currentTotal = memoryStore.pollVotes.filter((v) => Number(v.pollId) === pollId).length;
      const targetPoll = memoryStore.polls.find((p) => Number(p.id) === pollId);
      if (targetPoll) {
        targetPoll.totalVotes = currentTotal;
        targetPoll.updatedAt = new Date().toISOString();
      }
      persistStore();
      return { toggledOff: true, totalVotes: currentTotal };
    }
  }

  const nextVoteId = memoryStore.pollVotes.length > 0
    ? Math.max(...memoryStore.pollVotes.map((v) => Number(v.id) || 0)) + 1
    : 1;

  const newVote = {
    id: nextVoteId,
    ...cleanVote,
    createdAt: new Date().toISOString(),
  };

  memoryStore.pollVotes.push(newVote);

  // Update total votes
  const currentTotal = memoryStore.pollVotes.filter((v) => Number(v.pollId) === pollId).length;
  const targetPoll = memoryStore.polls.find((p) => Number(p.id) === pollId);
  if (targetPoll) {
    targetPoll.totalVotes = currentTotal;
    targetPoll.updatedAt = new Date().toISOString();
  }

  persistStore();
  return { vote: newVote, totalVotes: currentTotal };
}

export async function withdrawVote(pollId: number, userId: string) {
  const poll = await getPollById(pollId);
  if (!poll) throw new Error("التصويت غير موجود");
  if (poll.preventWithdraw) throw new Error("سحب التصويت غير متاح لهذا الاستفتاء");

  const dbInstance = getDb();
  if (dbInstance) {
    try {
      await dbInstance
        .delete(pollVotes)
        .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)));

      const allVotes = await dbInstance
        .select()
        .from(pollVotes)
        .where(eq(pollVotes.pollId, pollId));

      const totalCount = allVotes.length;
      await dbInstance
        .update(polls)
        .set({ totalVotes: totalCount, updatedAt: new Date() })
        .where(eq(polls.id, pollId));

      return { success: true, totalVotes: totalCount };
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL vote withdraw skipped, using local store:", error);
    }
  }

  memoryStore.pollVotes = memoryStore.pollVotes.filter(
    (v) => !(Number(v.pollId) === Number(pollId) && v.userId === userId)
  );

  const currentTotal = memoryStore.pollVotes.filter((v) => Number(v.pollId) === Number(pollId)).length;
  const targetPoll = memoryStore.polls.find((p) => Number(p.id) === Number(pollId));
  if (targetPoll) {
    targetPoll.totalVotes = currentTotal;
    targetPoll.updatedAt = new Date().toISOString();
  }

  persistStore();
  return { success: true, totalVotes: currentTotal };
}

export async function syncPollVotes(pollId: number) {
  const votes = await getPollVotes(pollId);
  const totalCount = votes.length;
  await updatePoll(pollId, { totalVotes: totalCount });
  return { pollId, totalVotes: totalCount, votes };
}

