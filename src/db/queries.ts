import { db, getDb, recordDbFailure } from "./index";
import {
  studyFiles,
  educationalPlatforms,
  flashcards,
  users,
  communityChannels,
  escalatedQuestions,
} from "./schema";
import { eq, desc, and, isNull } from "drizzle-orm";
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

let memoryStore: LocalStore = {
  users: [],
  studyFiles: initialFiles,
  educationalPlatforms: initialPlatforms,
  flashcards: initialFlashcards,
  communityChannels: initialChannels,
  escalatedQuestions: initialEscalatedQuestions,
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
    };
  }
} catch (e) {
  // Use memoryStore default
}

function persistStore() {
  try {
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch (e) {
    // ignore
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
  if (dbInstance) {
    try {
      return await dbInstance.delete(studyFiles).where(eq(studyFiles.id, id)).returning();
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL study file delete skipped, using local store:", error);
    }
  }

  memoryStore.studyFiles = memoryStore.studyFiles.filter((f) => f.id !== id);
  persistStore();
  return { success: true };
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
  if (dbInstance) {
    try {
      return await dbInstance
        .delete(educationalPlatforms)
        .where(eq(educationalPlatforms.id, id))
        .returning();
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL platform delete skipped, using local store:", error);
    }
  }

  memoryStore.educationalPlatforms = memoryStore.educationalPlatforms.filter((p) => p.id !== id);
  persistStore();
  return { success: true };
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
  if (dbInstance) {
    try {
      return await dbInstance.delete(flashcards).where(eq(flashcards.id, id)).returning();
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL flashcard delete skipped, using local store:", error);
    }
  }

  memoryStore.flashcards = memoryStore.flashcards.filter((c) => c.id !== id);
  persistStore();
  return { success: true };
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
  if (dbInstance) {
    try {
      return await dbInstance.delete(communityChannels).where(eq(communityChannels.id, id)).returning();
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL community channel delete skipped, using local store:", error);
    }
  }

  memoryStore.communityChannels = memoryStore.communityChannels.filter((c) => c.id !== id);
  persistStore();
  return { success: true };
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
  question: string;
  imageUrl?: string;
  aiAnswer?: string;
  studentFeedback?: string;
}) {
  const dbInstance = getDb();
  if (dbInstance) {
    try {
      const inserted = await dbInstance
        .insert(escalatedQuestions)
        .values({
          studentName: data.studentName,
          studentGrade: data.studentGrade || "ثالث ثانوي - موهبة",
          subject: data.subject || "القدرات والتحصيلي",
          question: data.question,
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
    id: Date.now(),
    studentName: data.studentName,
    studentGrade: data.studentGrade || "ثالث ثانوي - موهبة",
    subject: data.subject || "القدرات والتحصيلي",
    question: data.question,
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
  if (dbInstance) {
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
  if (dbInstance) {
    try {
      return await dbInstance.delete(escalatedQuestions).where(eq(escalatedQuestions.id, id)).returning();
    } catch (error) {
      recordDbFailure(error);
      console.warn("Cloud SQL escalated question delete skipped, using local store:", error);
    }
  }

  memoryStore.escalatedQuestions = memoryStore.escalatedQuestions.filter((q) => q.id !== id);
  persistStore();
  return { success: true };
}
