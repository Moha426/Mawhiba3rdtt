import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, ExternalLink, Sparkles, BookOpen, Compass, Award,
  Youtube, Search, BookmarkCheck,
  GraduationCap, Laptop, Share2, Layers, Lightbulb, MessageCircle, ChevronDown, X,
  Star, Settings2, Filter, Radio, RefreshCw, Send, ShoppingBag, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  getPlatformCategories, 
  getStoredPlatforms,
  saveStoredPlatforms,
} from "@/lib/cloud-sync";
import { StudentSuggestDialog } from "@/components/student-suggest-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePersistentState } from "@/lib/api-client-react";

export interface SubLink {
  label: string;
  url: string;
  badge?: string;
}

export interface PlatformItem {
  id: string;
  name: string;
  url: string;
  category: string;
  categories?: string[];
  desc: string;
  badge?: string;
  color: string;
  gradient?: string;
  iconBg?: string;
  image?: string;
  tags: string[];
  subLinks?: SubLink[];
  isCustom?: boolean;
  isFavorite?: boolean;
  openInNewTab?: boolean;
}

export const PRESET_COLORS = [
  { name: "زمردي", color: "#059669", gradient: "linear-gradient(135deg, #047857 0%, #10b981 100%)", bg: "rgba(5, 150, 105, 0.12)" },
  { name: "أزرق نيلي", color: "#6366f1", gradient: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)", bg: "rgba(99, 102, 241, 0.12)" },
  { name: "كهرماني", color: "#d97706", gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)", bg: "rgba(217, 119, 6, 0.12)" },
  { name: "ذهبي", color: "#ca8a04", gradient: "linear-gradient(135deg, #a16207 0%, #eab308 100%)", bg: "rgba(202, 138, 4, 0.15)" },
  { name: "وردي/بنفسجي", color: "#ec4899", gradient: "linear-gradient(135deg, #be185d 0%, #f472b6 100%)", bg: "rgba(236, 72, 153, 0.12)" },
  { name: "أزرق سماوي", color: "#0284c7", gradient: "linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)", bg: "rgba(2, 132, 199, 0.12)" },
];

export const DEFAULT_PLATFORMS: PlatformItem[] = [
  // ─── 1. قدرات وتحصيلي ───
  {
    id: "tiqdr",
    name: "منصة تقدر (Tiqdr)",
    url: "https://tiqdr.com/ar",
    category: "قدرات وتحصيلي",
    desc: "منصة تعليمية رائدة للتدريب المكثف على اختبار القدرات العامة واختبار التحصيلي وبنوك الأسئلة والمحاكاة التفاعلية.",
    badge: "تدريب ذكي",
    color: "#059669",
    gradient: "linear-gradient(135deg, #047857 0%, #10b981 100%)",
    iconBg: "rgba(5, 150, 105, 0.12)",
    tags: ["قدرات", "تحصيلي", "نماذج تفاعلية", "تقارير مستوى"],
    subLinks: [
      { label: "قسم تدريب القدرات", url: "https://tiqdr.com/ar" },
      { label: "بنك الأسئلة والتحصيلي", url: "https://tiqdr.com/ar" },
      { label: "الاختبارات والمحاكاة", url: "https://tiqdr.com/ar" }
    ]
  },
  {
    id: "elmonsf",
    name: "منصة المنصف التعليمية",
    url: "https://elmonsf.com/Category/1",
    category: "قدرات وتحصيلي",
    desc: "دورات تدريبية متخصصة ومقاطع تأسيسية وحلول النماذج الشاملة لاختبارات القدرات والتحصيلي.",
    badge: "دورات وبنوك أسئلة",
    color: "#d97706",
    gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
    iconBg: "rgba(217, 119, 6, 0.12)",
    tags: ["المنصف", "تأسيس", "شروحات فيديو", "تطوير المهارات"],
    subLinks: [
      { label: "قسم القدرات العامة", url: "https://elmonsf.com/Category/1" },
      { label: "قسم الاختبار التحصيلي", url: "https://elmonsf.com/Category/2" },
      { label: "الدورات والنماذج الشاملة", url: "https://elmonsf.com/" }
    ]
  },
  {
    id: "yellowqt",
    name: "منصة YellowQT (كويزات واختبارات)",
    url: "https://p.yellowqt.com/",
    category: "قدرات وتحصيلي",
    desc: "منصة التمارين والاختبارات التفاعلية والأسئلة التدريبية السريعة لطلاب الثانوية والقدرات والتحصيلي.",
    badge: "كويزات تفاعلية",
    color: "#ca8a04",
    gradient: "linear-gradient(135deg, #a16207 0%, #eab308 100%)",
    iconBg: "rgba(202, 138, 4, 0.15)",
    tags: ["Quiz", "كويزات سريعة", "تحديات", "تدريب إلكتروني"],
    subLinks: [
      { label: "اختبارات القدرات الكمي", url: "https://p.yellowqt.com/" },
      { label: "اختبارات القدرات اللفظي", url: "https://p.yellowqt.com/" },
      { label: "بنك أسئلة التحصيلي", url: "https://p.yellowqt.com/" }
    ]
  },
  {
    id: "almfkr",
    name: "منصة المفكر التعليمية",
    url: "https://almfkr.sa/",
    category: "قدرات وتحصيلي",
    desc: "منصة المفكر المتخصصة في تدريب واختبارات القدرات العامة والتحصيلي والتجميعات وشروحات نماذج الأسئلة.",
    badge: "قدرات وتحصيلي",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
    iconBg: "rgba(139, 92, 246, 0.12)",
    tags: ["المفكر", "قدرات", "تحصيلي", "تجميعات", "اختبارات"],
    subLinks: [
      { label: "تجميعات ونماذج القدرات", url: "https://almfkr.sa/" },
      { label: "اختبارات التحصيلي الإلكترونية", url: "https://almfkr.sa/" },
      { label: "بنوك الأسئلة والشروحات", url: "https://almfkr.sa/" }
    ]
  },
  {
    id: "ghasham",
    name: "منصة غشام (المجانية)",
    url: "https://ghasham1.cc/free",
    category: "قدرات وتحصيلي",
    desc: "تجميعات وشروحات مجانية شاملة مقدمة من منصة غشام التعليمية للقدرات والتحصيلي والتسريبات M1 & M2.",
    badge: "تجميعات مجانية",
    color: "#10b981",
    gradient: "linear-gradient(135deg, #059669 0%, #34d399 100%)",
    iconBg: "rgba(16, 185, 129, 0.12)",
    tags: ["غشام", "مجاني", "تجميعات غشام", "قدرات"],
    subLinks: [
      { label: "تجميعات غشام المجانية للقدرات", url: "https://ghasham1.cc/free" },
      { label: "تجميعات غشام للتحصيلي العلمي", url: "https://ghasham1.cc/free" },
      { label: "نماذج واختبارات مجانية", url: "https://ghasham1.cc/free" }
    ]
  },
  {
    id: "qiyas_official",
    name: "المركز الوطني للقياس (Qiyas - ETEC)",
    url: "https://qiyas.etec.gov.sa/",
    category: "قدرات وتحصيلي",
    desc: "البوابة الرسمية للمركز الوطني للقياس وهيئة تقويم التعليم والتدريب لحجز الاختبارات واستعلام النتائج والتسجيل في القدرات والتحصيلي.",
    badge: "قياس رسمي 🏛️",
    color: "#2563eb",
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)",
    iconBg: "rgba(37, 99, 235, 0.12)",
    tags: ["قياس", "Qiyas", "تسجيل قدرات", "نتائج تحصيلي", "ETEC"],
    subLinks: [
      { label: "بوابة التسجيل في الاختبارات (e-services)", url: "https://e-services.qiyas.sa/" },
      { label: "استعلام نتائج القدرات والتحصيلي", url: "https://e-services.qiyas.sa/" },
      { label: "الأدلة التعليمية والاختبارات التجريبية", url: "https://qiyas.etec.gov.sa/" }
    ]
  },
  {
    id: "einstein_qudrat",
    name: "منصة آينشتاين للقدرات (Einstein Qudrat)",
    url: "https://www.youtube.com/@EinsteinQudrat",
    category: "قدرات وتحصيلي",
    desc: "المرجع الشامل والأقوى لتأسيس وتدريب طلاب القدرات العامة بالقسم الكمي. تقدم المنصة شروحات مبسطة لجميع أساسيات الرياضيات (الهندسة، الجبر، الكسور، الجذور، النسبة والتناسب، الحركة والسرعات) بالإضافة لاستراتيجيات الحل الذهبي السريع بدون قوانين معقدة، وتغطية كاملة لنماذج المنصف والـ 120 نموذجاً والتسريبات الحديثة.",
    badge: "تأسيس كمي احترافي 🧠",
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
    iconBg: "rgba(99, 102, 241, 0.12)",
    tags: ["آينشتاين", "قدرات كمي", "تأسيس من الصفر", "نموذج المنصف", "الـ 120 نموذج", "استراتيجيات الحل السريع", "هندسة ومقارنات"],
    subLinks: [
      { label: "دورة تأسيس الكمي من الصفر (فيديوهات)", url: "https://www.youtube.com/results?search_query=Einstein+Qudrat+تأسيس+كمي" },
      { label: "شرح نموذج المنصف والـ 120 نموذجاً الحديثة", url: "https://www.youtube.com/results?search_query=Einstein+Qudrat+المنصف" },
      { label: "أسرار المهارات والحيل الحسابية السريعة", url: "https://www.youtube.com/results?search_query=Einstein+Qudrat+مهارات+الحل" },
      { label: "قناة التليجرام المباشرة للتجميعات (EinsteinQudrat)", url: "https://t.me/EinsteinQudrat" },
      { label: "شروحات قوائم التشغيل بالقناة الرسمية", url: "https://www.youtube.com/@EinsteinQudrat/playlists" }
    ]
  },
  {
    id: "hadafak",
    name: "منصة هدفك (Hadafak)",
    url: "https://hadafak-ehab.com/",
    category: "قدرات وتحصيلي",
    desc: "المنصة التعليمية الشاملة للأستاذ إيهاب عبد العظيم، تقدم دورات متكاملة في القدرات والتحصيلي مع حقائب تدريبية واختبارات محاكية.",
    badge: "دورات إيهاب عبد العظيم 🎯",
    color: "#ea580c",
    gradient: "linear-gradient(135deg, #c2410c 0%, #fb923c 100%)",
    iconBg: "rgba(234, 88, 12, 0.12)",
    tags: ["هدفك", "إيهاب عبد العظيم", "تحصيلي", "قدرات", "دورات مسجلة"],
    subLinks: [
      { label: "دورات القدرات العامة", url: "https://hadafak-ehab.com/" },
      { label: "دورات التحصيلي العلمي", url: "https://hadafak-ehab.com/" },
      { label: "الحقائب التدريبية", url: "https://hadafak-ehab.com/" }
    ]
  },
  {
    id: "dar_alharf",
    name: "منصة دار الحرف (Dar Al Harf)",
    url: "https://daralharf.com/",
    category: "قدرات وتحصيلي",
    desc: "المؤسسة العريقة في عالم الكتب التعليمية واختبارات قياس، توفر دورات إلكترونية مباشرة وتطبيقات ذكية لشرح سلاسل كتب التبسيط وناصر عبد الكريم.",
    badge: "كتب ودورات ذكية 📚",
    color: "#ca8a04",
    gradient: "linear-gradient(135deg, #a16207 0%, #eab308 100%)",
    iconBg: "rgba(202, 138, 4, 0.15)",
    tags: ["دار الحرف", "تبسيط", "ناصر عبد الكريم", "تحصيلي", "قدرات"],
    subLinks: [
      { label: "الدورات المباشرة والمسجلة", url: "https://daralharf.com/" },
      { label: "شروحات الكتب التعليمية", url: "https://daralharf.com/" },
      { label: "الاختبارات الإلكترونية", url: "https://daralharf.com/" }
    ]
  },
  {
    id: "ayed_academy",
    name: "أكاديمية عايد للتدريب (Ayed Academy)",
    url: "https://ayedacademy.co/",
    category: "قدرات وتحصيلي",
    desc: "منصة تدريبية متكاملة تقدم دورات في القدرات والتحصيلي، بالإضافة إلى دورات تخصصية في القدرة المعرفية واختبارات اللغة الإنجليزية (STEP/IELTS).",
    badge: "تدريب وتأسيس شامل ✨",
    color: "#0284c7",
    gradient: "linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)",
    iconBg: "rgba(2, 132, 199, 0.12)",
    tags: ["عايد", "قدرات", "تحصيلي", "قدرة معرفية", "STEP"],
    subLinks: [
      { label: "قسم دورات القدرات", url: "https://ayedacademy.co/" },
      { label: "قسم دورات التحصيلي", url: "https://ayedacademy.co/" },
      { label: "دورات اللغة الإنجليزية STEP", url: "https://ayedacademy.co/" }
    ]
  },

  // ─── 2. اختبارات دولية (SAT / IELTS / STEP) ───
  {
    id: "khan_sat",
    name: "Khan Academy - Digital SAT Prep",
    url: "https://www.khanacademy.org/test-prep/sat",
    category: "اختبارات دولية (SAT/IELTS/STEP)",
    desc: "المنصة الرسمية المعتمدة بالتعاون المباشر مع College Board لإعداد وتدريب اختبار SAT الرقمي الجديد، مع شروحات وتمارين تفاعلية.",
    badge: "SAT رسمي 🇺🇸",
    color: "#14b8a6",
    gradient: "linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)",
    iconBg: "rgba(20, 184, 166, 0.12)",
    tags: ["SAT", "Khan Academy", "Math", "Reading & Writing", "College Board"],
    subLinks: [
      { label: "قسم الرياضيات Math", url: "https://www.khanacademy.org/test-prep/v2-sat-math" },
      { label: "قسم القراءة والكتابة Reading", url: "https://www.khanacademy.org/test-prep/v2-sat-reading-writing" },
      { label: "اختبارات تجريبية كاملة Full-Length", url: "https://www.khanacademy.org/test-prep/sat/full-length-sat-practice-tests" }
    ]
  },
  {
    id: "sat_question_bank",
    name: "College Board SAT Question Bank",
    url: "https://satsuitequestionbank.collegeboard.org/",
    category: "اختبارات دولية (SAT/IELTS/STEP)",
    desc: "بنك الأسئلة الرسمي المباشر من مؤسسة College Board لاختبار الـ SAT الرقمي مع آلاف الأسئلة المعتمدة والتصنيف المتقدم.",
    badge: "بنك أسئلة SAT",
    color: "#2563eb",
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)",
    iconBg: "rgba(37, 99, 235, 0.12)",
    tags: ["SAT", "Question Bank", "College Board", "Bluebook", "Official"],
    subLinks: [
      { label: "تطبيق Bluebook للإمتحانات", url: "https://bluebook.app.collegeboard.org/" },
      { label: "محرك بحث الأسئلة والحلول", url: "https://satsuitequestionbank.collegeboard.org/digital/search" }
    ]
  },
  {
    id: "ielts_advantage",
    name: "IELTS Advantage (Christopher Pell)",
    url: "https://www.youtube.com/@IELTSAdvantage",
    category: "اختبارات دولية (SAT/IELTS/STEP)",
    desc: "القناة وشبكة الشروحات الشهيرة لإتقان اختبار الآيلتس مع الخبير كريستوفر بيل، تركز على أسرار الكتابة (Writing Task 1 & 2) والمحادثة.",
    badge: "IELTS 🇬🇧",
    color: "#dc2626",
    gradient: "linear-gradient(135deg, #b91c1c 0%, #f87171 100%)",
    iconBg: "rgba(220, 38, 38, 0.12)",
    tags: ["IELTS", "Writing", "Speaking", "Band 7+", "YouTube"],
    subLinks: [
      { label: "كورس الكتابة Writing Task 2", url: "https://www.youtube.com/playlist?list=PLWscf9S0m4aCq-Ksp4_LqO8S9hL9-Ld4V" },
      { label: "كورس المحادثة Speaking", url: "https://www.youtube.com/playlist?list=PLWscf9S0m4aC2WpSgAnxH4B8c9_dYn3X" },
      { label: "موقع IELTS Advantage المباشر", url: "https://www.ieltsadvantage.com/" }
    ]
  },
  {
    id: "e2_ielts",
    name: "E2 IELTS (قناة إي تو آيلتس)",
    url: "https://www.youtube.com/@E2IELTS",
    category: "اختبارات دولية (SAT/IELTS/STEP)",
    desc: "قناة عالمية احترافية تقدم استراتيجيات الحل المباشر لأقسام الآيلتس الأربعة (Listening, Reading, Writing, Speaking).",
    badge: "IELTS شروحات",
    color: "#ea580c",
    gradient: "linear-gradient(135deg, #c2410c 0%, #fb923c 100%)",
    iconBg: "rgba(234, 88, 12, 0.12)",
    tags: ["E2 IELTS", "IELTS", "Listening", "Reading", "شروحات"],
    subLinks: [
      { label: "قسم القراءة Reading", url: "https://www.youtube.com/results?search_query=E2+IELTS+Reading" },
      { label: "قسم الاستماع Listening", url: "https://www.youtube.com/results?search_query=E2+IELTS+Listening" },
      { label: "استراتيجيات نماذج الكتابة", url: "https://www.e2language.com/" }
    ]
  },
  {
    id: "ielts_liz",
    name: "IELTS Liz (موقع وقناة آيلتس ليز)",
    url: "https://ieltsliz.com/",
    category: "اختبارات دولية (SAT/IELTS/STEP)",
    desc: "المرجع الذهبي والأكثر شهرة لاختبار الآيلتس بأسلوب ليز البسيط، يحتوي نماذج إجابات وقوائم كلمات وملاحظات مصنفة.",
    badge: "IELTS مرجع",
    color: "#0284c7",
    gradient: "linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)",
    iconBg: "rgba(2, 132, 199, 0.12)",
    tags: ["IELTS Liz", "Vocabulary", "Model Answers", "Writing", "Tips"],
    subLinks: [
      { label: "قسم المفردات Vocabulary", url: "https://ieltsliz.com/ielts-vocabulary/" },
      { label: "قسم نماذج الكتابة", url: "https://ieltsliz.com/ielts-writing-task-2/" },
      { label: "قسم نصائح القراءة", url: "https://ieltsliz.com/ielts-reading-tips-and-information/" }
    ]
  },
  {
    id: "fastrack_ielts",
    name: "Fastrack IELTS (الإعداد السريع)",
    url: "https://www.youtube.com/@FastrackIELTS",
    category: "اختبارات دولية (SAT/IELTS/STEP)",
    desc: "قناة تعليمية ممتازة تقدم نصائح سريعة ومختصرة للتحضير لاختبار الآيلتس وتفادي الأخطاء الشائعة واستراتيجيات إدارة الوقت.",
    badge: "IELTS نصائح",
    color: "#e11d48",
    gradient: "linear-gradient(135deg, #be123c 0%, #fb7185 100%)",
    iconBg: "rgba(225, 29, 72, 0.12)",
    tags: ["Fastrack", "IELTS", "Time Management", "Tips"],
    subLinks: [
      { label: "أسرار وإدارة وقت الآيلتس", url: "https://www.youtube.com/@FastrackIELTS/videos" },
      { label: "استراتيجيات الكتابة والقراءة السريعة", url: "https://www.youtube.com/@FastrackIELTS/playlists" }
    ]
  },
  {
    id: "hassani_step",
    name: "قناة أ. عبد الله الحساني (تعلم الإنجليزية وSTEP)",
    url: "https://t.me/s/LearnEnglish1_e",
    category: "اختبارات دولية (SAT/IELTS/STEP)",
    desc: "القناة التعليمية المباشرة للأستاذ عبد الله الحساني لشروحات وتجميعات اختبار STEP وقواعد اللغة الإنجليزية والتأسيس الشامل.",
    badge: "STEP وتعلم الإنجليزية 📱",
    color: "#0088cc",
    gradient: "linear-gradient(135deg, #0077b5 0%, #38bdf8 100%)",
    iconBg: "rgba(0, 136, 204, 0.15)",
    tags: ["عبد الله الحساني", "STEP", "Learn English", "تأسيس إنجليزي", "قواعد", "تليجرام"],
    openInNewTab: true,
    subLinks: [
      { label: "فتح قناة تعلم الإنجليزية المباشرة في تليجرام", url: "https://t.me/LearnEnglish1_e" },
      { label: "تصفح القناة عبر المتصفح (LearnEnglish1_e)", url: "https://t.me/s/LearnEnglish1_e" },
      { label: "قناة اختبارات STEP التخصصية (HassaniSTEP)", url: "https://t.me/s/HassaniSTEP" }
    ]
  },

  // ─── 3. برامج الموهبة وCPP ───
  {
    id: "alhout_academy",
    name: "أكاديمية الحوت (تجمع وقناة CPP والتدرج)",
    url: "https://t.me/s/acdh_cpp22",
    category: "برامج الموهبة وCPP",
    desc: "القناة المخصصة والجامعة من أكاديمية الحوت للتحضير المكثف لبرنامج التدرج وابتعاث أرامكو CPP والموهوبين وتجميعات وتدريبات القبول.",
    badge: "تجمع CPP وأرامكو 📱",
    color: "#0284c7",
    gradient: "linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)",
    iconBg: "rgba(2, 132, 199, 0.15)",
    tags: ["الحوت", "CPP", "أرامكو", "تجميعات", "اختبارات القبول", "تليجرام"],
    openInNewTab: true,
    subLinks: [
      { label: "فتح قناة CPP المباشرة في تطبيق تليجرام", url: "https://t.me/acdh_cpp22" },
      { label: "تصفح القناة عبر المتصفح (acdh_cpp22)", url: "https://t.me/s/acdh_cpp22" },
      { label: "قناة أكاديمية الحوت العامة", url: "https://t.me/s/Alhout_Academic" }
    ]
  },
  {
    id: "cpp_with_eyad",
    name: "حقائب ومتجر Cpp with Eyad (ابتعاث أرامكو CPP)",
    url: "https://salla.sa/cppwitheyad/%D8%A5%D8%A8%D8%AA%D8%B9%D8%A7%D8%AB-%D8%A7%D8%B1%D8%A7%D9%85%D9%83%D9%88-cpp/p1523478620",
    category: "برامج الموهبة وCPP",
    desc: "المتجر والحقائب التدريبية الحصرية لإياد المتخصصة باختبارات ابتعاث أرامكو CPP والتدرج المباشر، وتجميعات التسريبات والشروحات المكثفة.",
    badge: "حقائب متجر إياد 🛒",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #6d28d9 0%, #c084fc 100%)",
    iconBg: "rgba(139, 92, 246, 0.15)",
    tags: ["CPP", "إياد", "متجر إياد", "ابتعاث أرامكو", "تجميعات CPP", "سلة"],
    openInNewTab: true,
    subLinks: [
      { label: "حقيبة ابتعاث أرامكو CPP بمتجر سلة", url: "https://salla.sa/cppwitheyad/%D8%A5%D8%A8%D8%AA%D8%B9%D8%A7%D8%AB-%D8%A7%D8%B1%D8%A7%D9%85%D9%83%D9%88-cpp/p1523478620" },
      { label: "قناة إياد المباشرة على تليجرام", url: "https://t.me/cpp_with_eyad" },
      { label: "تصفح القناة عبر المتصفح", url: "https://t.me/s/cpp_with_eyad" }
    ]
  },
  {
    id: "mawhiba_official",
    name: "مؤسسة موهبة (Mawhiba)",
    url: "https://www.mawhiba.org/",
    category: "برامج الموهبة وCPP",
    desc: "الموقع الرسمي لمؤسسة الملك عبد العزيز ورجاله للموهبة والإبداع، لمتابعة الأولمبياد الوطنية، برامج الإثراء الصيفي، واختبارات قياس الموهبة.",
    badge: "موهبة رسمي",
    color: "#059669",
    gradient: "linear-gradient(135deg, #047857 0%, #34d399 100%)",
    iconBg: "rgba(5, 150, 105, 0.12)",
    tags: ["موهبة", "أولمبياد", "مقاييس موهبة", "إثراء"],
    subLinks: [
      { label: "البرامج الإثرائية الصيفية", url: "https://www.mawhiba.org/" },
      { label: "مسابقة موهوب والأولمبياد الوطنية", url: "https://www.mawhiba.org/" },
      { label: "مقياس موهبة للقدرات العقلية", url: "https://www.mawhiba.org/" }
    ]
  },

  // ─── 4. منصات تعليمية ───
  {
    id: "madrasati",
    name: "منصة مدرستي (Madrasati)",
    url: "https://schools.madrasati.sa/",
    category: "منصات تعليمية",
    desc: "المنصة التعليمية الرسمية لوزارة التعليم بالمملكة العربية السعودية لمتابعة الدروس والواجبات المدرسية والأنشطة والجدول المدرسي.",
    badge: "منصة وزارية 🎒",
    color: "#059669",
    gradient: "linear-gradient(135deg, #047857 0%, #10b981 100%)",
    iconBg: "rgba(5, 150, 105, 0.12)",
    tags: ["مدرستي", "وزارة التعليم", "دروس", "واجبات", "جدول مدرسي"],
    subLinks: [
      { label: "تسجيل دخول الطلاب والتكليفات", url: "https://schools.madrasati.sa/" },
      { label: "الجدول الدراسي والمصادر", url: "https://schools.madrasati.sa/" }
    ]
  },
  {
    id: "ien_portal",
    name: "منصة عين الوطنية (IEN Portal)",
    url: "https://ien.edu.sa/",
    category: "منصات تعليمية",
    desc: "بوابة التعليم الوطنية عين لتحميل الكتب المدرسية الرقمية، وتصفح بنك الأسئلة، ومتابعة القنوات الفضائية والدروس النموذجية.",
    badge: "عين الوطنية 📚",
    color: "#0284c7",
    gradient: "linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)",
    iconBg: "rgba(2, 132, 199, 0.12)",
    tags: ["عين", "كتب مدرسية", "دروس عين", "بنك الأسئلة"],
    subLinks: [
      { label: "تحميل الكتب المدرسية والحقائب", url: "https://ien.edu.sa/Home/Bag" },
      { label: "دروس عين الفضائية والتسجيلات", url: "https://ien.edu.sa/" }
    ]
  },
  {
    id: "noon_academy",
    name: "نون أكاديمي (Noon Academy)",
    url: "https://www.noonacademy.com/",
    category: "منصات تعليمية",
    desc: "منصة التعلم التفاعلي والصفوف المباشرة للدروس الخصوصية والمراجعات الجماعية للقدرات والتحصيلي والمناهج الدراسية.",
    badge: "حصص تفاعلية 👥",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
    iconBg: "rgba(245, 158, 11, 0.12)",
    tags: ["نون أكاديمي", "حصص مباشرة", "قدرات", "تحصيلي", "مجموعات"],
    subLinks: [
      { label: "حصص القدرات المباشرة", url: "https://www.noonacademy.com/" },
      { label: "مجموعات المذاكرة التفاعلية", url: "https://www.noonacademy.com/" }
    ]
  },
  {
    id: "shaghaf",
    name: "منصة شغف (Shaghaf)",
    url: "https://shaghaf.sa/",
    category: "منصات تعليمية",
    desc: "منصة دورات تعليمية وتدريبية متكاملة لطلاب المرحلة الثانوية والجامعية لاختبارات القدرات والمهارات المتقدمة.",
    badge: "دورات واختبارات 💡",
    color: "#ec4899",
    gradient: "linear-gradient(135deg, #be185d 0%, #f472b6 100%)",
    iconBg: "rgba(236, 72, 153, 0.12)",
    tags: ["شغف", "دورات", "ثانوي", "جامعي", "قدرات"],
    subLinks: [
      { label: "دورات القدرات والتحصيلي", url: "https://shaghaf.sa/" },
      { label: "المسارات التعليمية والمهارات", url: "https://shaghaf.sa/" }
    ]
  },

  // ─── 5. قنوات وتليجرام ───
  {
    id: "qudrat_k_telegram",
    name: "قناة قدرات كمي ولفظي (تليجرام)",
    url: "https://t.me/s/Qudrat_K",
    category: "قنوات وتليجرام",
    desc: "القناة التفاعلية اليومية بنشر أسئلة وشروحات القدرات الكمية واللفظية والتسريبات والتجميعات الحديثة.",
    badge: "تليجرام قدرات 📱",
    color: "#0088cc",
    gradient: "linear-gradient(135deg, #0077b5 0%, #38bdf8 100%)",
    iconBg: "rgba(0, 136, 204, 0.15)",
    tags: ["قدرات", "تليجرام", "تسريبات", "تجميعات", "كمي ولفظي"],
    openInNewTab: true,
    subLinks: [
      { label: "فتح القناة في تطبيق تليجرام", url: "https://t.me/Qudrat_K" },
      { label: "تصفح القناة عبر المتصفح", url: "https://t.me/s/Qudrat_K" }
    ]
  },
  {
    id: "tahsili_sci_telegram",
    name: "قناة تحصيلي علمي (تليجرام)",
    url: "https://t.me/s/Tahsili_Sci",
    category: "قنوات وتليجرام",
    desc: "قناة وتجمع تليجرام لمناقشة وشرح أسئلة المواد العلمية (فيزياء، كيمياء، أحياء، رياضيات) لاختبار التحصيلي.",
    badge: "تليجرام تحصيلي 📱",
    color: "#0088cc",
    gradient: "linear-gradient(135deg, #0077b5 0%, #38bdf8 100%)",
    iconBg: "rgba(0, 136, 204, 0.15)",
    tags: ["تحصيلي", "فيزياء", "كيمياء", "أحياء", "تليجرام"],
    openInNewTab: true,
    subLinks: [
      { label: "فتح القناة في تطبيق تليجرام", url: "https://t.me/Tahsili_Sci" },
      { label: "تصفح القناة عبر المتصفح", url: "https://t.me/s/Tahsili_Sci" }
    ]
  },

  // ─── 6. فيديو ومحتوى ───
  {
    id: "fahad_altamimi",
    name: "قناة د. فهد التميمي (قدرات كمي)",
    url: "https://www.youtube.com/@FahadAltamimi",
    category: "فيديو ومحتوى",
    desc: "السلسلة الشاملة والأكثر شهرة لتأسيس وتبسيط مهارات وقوانين الجزء الكمي في اختبار القدرات العامة بأسلوب سلس وصور ذهنية.",
    badge: "تأسيس كمي 📺",
    color: "#dc2626",
    gradient: "linear-gradient(135deg, #b91c1c 0%, #f87171 100%)",
    iconBg: "rgba(220, 38, 38, 0.12)",
    tags: ["فهد التميمي", "قدرات كمي", "تأسيس", "شروحات يوتيوب"],
    subLinks: [
      { label: "سلسلة تأسيس القدرات الكمي", url: "https://www.youtube.com/@FahadAltamimi/playlists" },
      { label: "حلول التجميعات والنماذج الحديثة", url: "https://www.youtube.com/@FahadAltamimi/videos" }
    ]
  },
  {
    id: "ehab_abdelazeem",
    name: "قناة أ. إيهاب عبد العظيم (تحصيلي ورياضيات)",
    url: "https://www.youtube.com/@EhabAbdelazeem",
    category: "فيديو ومحتوى",
    desc: "شروحات مكثفة واحترافية لمناهج الرياضيات والتحصيلي واختبارات القدرات مع حلول الأسئلة الشائعة بأسهل الطرق.",
    badge: "رياضيات وتحصيلي 📺",
    color: "#ea580c",
    gradient: "linear-gradient(135deg, #c2410c 0%, #fb923c 100%)",
    iconBg: "rgba(234, 88, 12, 0.12)",
    tags: ["إيهاب عبد العظيم", "تحصيلي", "رياضيات", "قدرات", "يوتيوب"],
    subLinks: [
      { label: "كورس تأسيس التحصيلي الشامل", url: "https://www.youtube.com/@EhabAbdelazeem/playlists" },
      { label: "حل أسئلة ونماذج القدرات", url: "https://www.youtube.com/@EhabAbdelazeem/videos" }
    ]
  }
];

const LOCAL_STORAGE_KEY = "custom_educational_platforms_v3";

export default function PlatformsPage() {
  const { toast } = useToast();
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";
  const [platforms, setPlatforms] = useState<PlatformItem[]>(() => {
    return getStoredPlatforms(DEFAULT_PLATFORMS);
  });

  const [categories, setCategories] = useState<string[]>(() => getPlatformCategories());
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Synchronize across tabs and when admin adds/edits platforms
  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.detail?.platforms) {
        setPlatforms(e.detail.platforms);
      } else {
        setPlatforms(getStoredPlatforms(DEFAULT_PLATFORMS));
      }
    };
    window.addEventListener("platforms_storage_change" as any, handleStorageChange);
    return () => {
      window.removeEventListener("platforms_storage_change" as any, handleStorageChange);
    };
  }, []);
  
  // Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; desc?: string } | null>(null);

  // Workspace State
  const [openTabs, setOpenTabs] = useState<PlatformItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [secondActiveTabId, setSecondActiveTabId] = useState<string | null>(null);
  const [isDualView, setIsDualView] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showWarning, setShowWarning] = useState(true);
  const [browserInput, setBrowserInput] = useState("");
  const [searchType, setSearchType] = useState<"all" | "videos" | "questions">("all");
  const [syncedRoomTabs, setSyncedRoomTabs] = useState<any | null>(null);
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);

  // Listen to shared tab events from chat or other components
  useEffect(() => {
    const handleOpenSharedTab = (e: any) => {
      const item = e.detail?.item;
      if (!item) return;
      const tabItem: PlatformItem = {
        id: item.id || `shared_${Date.now()}`,
        name: item.title || item.name || "منصة مشاركة",
        url: item.url || "",
        category: item.category || "منصات مشاركة",
        desc: item.desc || "",
        badge: item.badge || "مشارك",
        color: item.color || "#6366f1",
        gradient: "linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)",
        iconBg: "rgba(99, 102, 241, 0.12)",
        tags: [item.category || "مشارك"]
      };

      setOpenTabs((prev) => {
        const exists = prev.find((t) => t.id === tabItem.id || t.url === tabItem.url);
        if (exists) return prev;
        return [...prev, tabItem];
      });
      setActiveTabId(tabItem.id);
      setShowGrid(false);
    };

    const handleOpenTabsBundle = (e: any) => {
      const bundleTabs = (e.detail?.tabs || []) as PlatformItem[];
      if (!bundleTabs.length) return;

      setOpenTabs((prev) => {
        const newTabs = [...prev];
        bundleTabs.forEach((bt) => {
          if (!newTabs.find((t) => t.id === bt.id || t.url === bt.url)) {
            newTabs.push(bt);
          }
        });
        return newTabs;
      });

      if (bundleTabs[0]) {
        setActiveTabId(bundleTabs[0].id);
      }
      setShowGrid(false);
    };

    window.addEventListener("open_shared_tab" as any, handleOpenSharedTab);
    window.addEventListener("open_tabs_bundle" as any, handleOpenTabsBundle);

    return () => {
      window.removeEventListener("open_shared_tab" as any, handleOpenSharedTab);
      window.removeEventListener("open_tabs_bundle" as any, handleOpenTabsBundle);
    };
  }, []);

  const savePlatformsList = (updated: PlatformItem[]) => {
    setPlatforms(updated);
    saveStoredPlatforms(updated);
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = platforms.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p);
    savePlatformsList(updated);
    const target = updated.find(p => p.id === id);
    toast({
      title: target?.isFavorite ? "تمت الإضافة إلى المفضلة ⭐" : "تمت الإزالة من المفضلة",
    });
  };

  const handleBrowserSubmit = (e?: React.FormEvent, inputVal?: string) => {
    if (e) e.preventDefault();
    const val = inputVal !== undefined ? inputVal : browserInput;
    const trimmed = val.trim();
    if (!trimmed) return;

    const isUrl = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(\/\S*)?$/i.test(trimmed);
    let targetUrl: string;
    let targetName: string;

    if (isUrl) {
      targetUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
      targetName = targetUrl.replace(/^https?:\/\//, "").split("/")[0];
    } else {
      let q = trimmed;
      if (searchType === "فيديوهات تعليمية") {
        targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + " تعليمي OR قدرات")}`;
      } else if (searchType === "أسئلة قدرات ومناهج") {
        targetUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(q + ' ("قدرات" OR "تحصيلي" OR "أسئلة" OR "اختبار")')}`;
      } else {
        targetUrl = `https://www.google.com/search?igu=1&q=${encodeURIComponent(q)}`;
      }
      targetName = trimmed;
    }

    const newItem: PlatformItem = {
      id: "browser_" + Date.now(),
      name: targetName,
      url: targetUrl,
      category: "تصفح",
      desc: "تصفح مباشر",
      badge: "تصفح",
      color: "#64748b",
      gradient: "linear-gradient(135deg, #475569 0%, #94a3b8 100%)",
      iconBg: "rgba(100, 116, 139, 0.12)",
      tags: []
    };

    setOpenTabs((prev) => [...prev, newItem]);
    setActiveTabId(newItem.id);
    setShowGrid(false);
    setBrowserInput("");
  };

  const filtered = platforms.filter((p) => {
    if (onlyFavorites && !p.isFavorite) return false;
    if (searchType === "videos") {
      const isVideo = p.tags?.some(t => t.includes("فيديو") || t.includes("شروح") || t.includes("تأسيس")) || p.desc?.includes("شروح") || p.name?.includes("شروحات") || p.url.includes("youtube");
      if (!isVideo) return false;
    } else if (searchType === "questions") {
      const isQ = p.tags?.some(t => t.includes("أسئلة") || t.includes("كويز") || t.includes("اختبار") || t.includes("تجميعات")) || p.desc?.includes("أسئلة") || p.desc?.includes("اختبار");
      if (!isQ) return false;
    }
    const matchCat =
      selectedCategory === "الكل" ||
      p.category === selectedCategory ||
      (Array.isArray(p.categories) && p.categories.includes(selectedCategory));
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.desc && p.desc.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
      (Array.isArray(p.categories) && p.categories.some((c) => c.toLowerCase().includes(q))) ||
      p.url.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="relative" dir="rtl">
      {/* ── Grid View ── */}
      <div className={showGrid ? "block space-y-6 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6" : "hidden"}>
        {/* ── Top Hero Banner ── */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-border/40 bg-card shadow-sm">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>دليل المنصات والمراجع التعليمية المعتمدة</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                المنصات ومصادر المذاكرة 🌐
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4">
                وصول فوري ومنصات تعليمية معتمدة للقدرات والتحصيلي ومصادر المذاكرة الشاملة.
              </p>
              
              {/* ── Main Browser Bar ── */}
              <form onSubmit={handleBrowserSubmit} className="relative mt-4 w-full max-w-2xl flex flex-col sm:flex-row gap-3">
                <div className="relative flex items-center flex-1">
                  <Search className="absolute right-4 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="ابحث في جوجل أو أدخل رابط الموقع مباشرة..."
                    value={browserInput}
                    onChange={(e) => setBrowserInput(e.target.value)}
                    className="w-full h-12 px-12 rounded-2xl border-2 border-primary/20 bg-background/80 backdrop-blur-sm shadow-inner focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="h-12 px-6 rounded-2xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shrink-0 w-full sm:w-auto"
                >
                  تصفح
                </Button>
              </form>
            </div>

            {/* Student Suggestion Action */}
            <div className="shrink-0 self-start md:self-center">
              <Button
                onClick={() => setShowSuggestDialog(true)}
                className="rounded-2xl h-11 px-5 font-bold text-xs gap-2 bg-primary text-primary-foreground shadow-lg hover:shadow-primary/25 hover:scale-[1.02] transition-all"
              >
                <Sparkles className="h-4 w-4" />
                <span>اقترح منصة أو موقع تعليمي 💡</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="flex flex-col gap-3">
          {/* Smart Search Mode Pills */}
          <div className="flex items-center gap-2 bg-card/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/60 w-fit">
            <span className="text-xs font-bold text-muted-foreground px-2">البحث الذكي:</span>
            <button
              onClick={() => setSearchType("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                searchType === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              جميع المحتوى
            </button>
            <button
              onClick={() => setSearchType("videos")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                searchType === "videos" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Youtube className="h-3.5 w-3.5 text-red-500" />
              <span>فيديوهات وشروحات</span>
            </button>
            <button
              onClick={() => setSearchType("questions")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                searchType === "questions" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <span>أسئلة واختبارات</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Category Pills & Favorite toggle */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-hide">
            <button
              onClick={() => { setSelectedCategory("الكل"); setOnlyFavorites(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === "الكل" && !onlyFavorites
                  ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                  : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              الكل ({platforms.length})
            </button>

            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                onlyFavorites
                  ? "bg-amber-500 text-white shadow-sm scale-[1.02]"
                  : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${onlyFavorites ? "fill-white" : "text-amber-500"}`} />
              <span>المفضلة</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setOnlyFavorites(false); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat && !onlyFavorites
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-72 mt-2 sm:mt-0 sm:mr-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو الموضوع..."
              className="pr-9 h-10 rounded-xl bg-card border-border/60 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Platforms Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((item, idx) => {
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="group cursor-pointer"
                  onClick={() => window.open(item.url, "_blank")}
                >
                  <Card className="h-full rounded-2xl border-border/50 bg-card hover:border-primary/40 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between relative p-5">
                    {/* Top Accent bar */}
                    <div
                      className="absolute top-0 right-0 left-0 h-1.5 opacity-90 transition-all group-hover:h-2"
                      style={{ background: item.gradient || item.color }}
                    />

                    <div>
                      {/* Header with icon, badges & quick edit tools */}
                      <div className="flex items-start justify-between gap-3 mb-3.5 pt-1">
                        <div
                          className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/10"
                          style={{ background: item.iconBg || "rgba(99, 102, 241, 0.12)" }}
                        >
                          {item.url.includes("salla.sa") || item.name.includes("متجر") || item.name.includes("حقائب") ? (
                            <ShoppingBag className="h-5 w-5 text-purple-400" />
                          ) : item.id.includes("youtube") || item.url.includes("youtube.com") ? (
                            <Youtube className="h-6 w-6 text-red-500" />
                          ) : item.id.includes("telegram") || item.url.includes("t.me") ? (
                            <Send className="h-5 w-5 text-sky-500" />
                          ) : item.category.includes("اختبارات دولية") ? (
                            <GraduationCap className="h-6 w-6" style={{ color: item.color }} />
                          ) : item.category.includes("برامج الموهبة") ? (
                            <Sparkles className="h-6 w-6" style={{ color: item.color }} />
                          ) : item.category === "قدرات وتحصيلي" ? (
                            <Award className="h-6 w-6" style={{ color: item.color }} />
                          ) : (
                            item.openInNewTab ? (
                              <ExternalLink className="h-6 w-6" style={{ color: item.color }} />
                            ) : (
                              <Globe className="h-6 w-6" style={{ color: item.color }} />
                            )
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {item.badge && (
                            <span
                              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow-xs"
                              style={{ background: item.color }}
                            >
                              {item.badge}
                            </span>
                          )}

                          {/* Favorite button */}
                          <button
                            onClick={(e) => handleToggleFavorite(item.id, e)}
                            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                              item.isFavorite ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground/50 hover:text-amber-500 hover:bg-muted"
                            }`}
                            title={item.isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                          >
                            <Star className={`h-3.5 w-3.5 ${item.isFavorite ? "fill-amber-500" : ""}`} />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5 mb-1.5">
                        <span>{item.name}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                        {item.desc}
                      </p>


                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-muted/60 text-muted-foreground font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Sub-Sections / Sub-Links */}
                      {item.subLinks && item.subLinks.length > 0 && (
                        <div className="mb-4 pt-2.5 border-t border-border/30 space-y-1.5">
                          <div className="flex items-center gap-1 text-[10px] font-extrabold text-muted-foreground">
                            <Layers className="h-3 w-3 text-primary shrink-0" />
                            <span>الأقسام الفرعية والروابط السريعة:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.subLinks.map((sub, sIdx) => (
                              <a
                                key={sIdx}
                                href={sub.url}
                                target={item.openInNewTab ? "_blank" : "_self"}
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                  if (!item.openInNewTab) {
                                    e.preventDefault();
                                    const subTab: PlatformItem = {
                                      id: `${item.id}_sub_${sIdx}`,
                                      name: `${item.name} - ${sub.label}`,
                                      url: sub.url,
                                      category: item.category,
                                      desc: item.desc,
                                      badge: sub.badge || "قسم فرعي",
                                      color: item.color,
                                      gradient: item.gradient,
                                      iconBg: item.iconBg,
                                      tags: item.tags,
                                      openInNewTab: item.openInNewTab,
                                    };
                                    setOpenTabs((prev) => {
                                      if (prev.find((t) => t.id === subTab.id || t.url === subTab.url)) return prev;
                                      return [...prev, subTab];
                                    });
                                    setActiveTabId(subTab.id);
                                    setShowGrid(false);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/80 hover:bg-primary/15 text-foreground hover:text-primary text-[11px] font-bold border border-border/50 transition-all hover:scale-[1.02]"
                              >
                                <span>{sub.label}</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Open & Share Buttons */}
                    <div className="pt-3 border-t border-border/40 mt-auto flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (item.openInNewTab) {
                            window.open(item.url, "_blank");
                            return;
                          }
                          if (!openTabs.find(t => t.id === item.id)) {
                            setOpenTabs(prev => [...prev, item]);
                          }
                          setActiveTabId(item.id);
                          setShowGrid(false);
                        }}
                        className="flex-1 rounded-xl gap-1.5 font-bold text-xs h-9 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all shadow-xs"
                      >
                        <span>{item.openInNewTab ? "فتح في نافذة جديدة" : "فتح المنصة"}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>

                      {!item.openInNewTab && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 w-9 rounded-xl border border-border/70 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs font-semibold"
                          title="فتح في تبويب مستقل"
                        >
                          <Globe className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border p-8">
            <Globe className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-bold text-base text-foreground mb-1">لا توجد نتائج مطابقة</h3>
            <p className="text-xs text-muted-foreground">جرب البحث بكلمة أخرى.</p>
          </div>
        )}
      </div>

      {/* ── Active Workspace Floating Button (when grid is open but tabs exist) ── */}
      {createPortal(
        <AnimatePresence>
          {showGrid && openTabs.length > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0, x: "-50%" }}
              animate={{ y: 0, opacity: 1, x: "-50%" }}
              exit={{ y: 100, opacity: 0, x: "-50%" }}
              className="fixed bottom-24 left-1/2 z-[100]"
            >
              <Button onClick={() => setShowGrid(false)} className="rounded-full shadow-2xl gap-2 px-6 h-12 bg-primary text-primary-foreground font-bold hover:scale-105 transition-transform">
                <Layers className="h-5 w-5" />
                العودة للمنصات المفتوحة ({openTabs.length})
              </Button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Workspace View (Tabs + Iframes + Chat) ── */}
      {createPortal(
        <AnimatePresence>
          {!showGrid && openTabs.length > 0 && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[100] bg-background flex flex-col" 
              dir="rtl"
            >
              {/* Top Bar / Tabs */}
              <div className="h-14 bg-card/90 backdrop-blur-md border-b border-border flex items-center justify-between px-2 sm:px-4 shrink-0 shadow-sm">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 mr-2 sm:mr-4">
                  <AnimatePresence mode="popLayout">
                    {openTabs.map(tab => {
                      const isActive = activeTabId === tab.id;
                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.8, x: 20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.8, x: -20 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          key={tab.id}
                          onClick={() => setActiveTabId(tab.id)}
                          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border select-none cursor-pointer whitespace-nowrap transition-all duration-200 ${
                            isActive 
                              ? 'bg-primary/10 border-primary/30 text-primary shadow-sm' 
                              : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <div className="h-5 w-5 rounded flex items-center justify-center shrink-0" style={{ background: tab.iconBg }}>
                            {tab.id === "youtube" ? (
                              <Youtube className="h-3 w-3 text-red-500" />
                            ) : tab.category === "قدرات وتحصيلي" ? (
                              <Award className="h-3 w-3" style={{ color: tab.color }} />
                            ) : (
                              <Globe className="h-3 w-3" style={{ color: tab.color }} />
                            )}
                          </div>
                          <span className="text-xs sm:text-sm font-bold">{tab.name}</span>
                          <button 
                            className="ml-1 h-5 w-5 rounded hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newTabs = openTabs.filter(t => t.id !== tab.id);
                              setOpenTabs(newTabs);
                              if (activeTabId === tab.id) {
                                if (newTabs.length > 0) {
                                  setActiveTabId(newTabs[newTabs.length - 1].id);
                                } else {
                                  setActiveTabId(null);
                                  setShowGrid(true);
                                }
                              }
                            }}
                            title="إغلاق التبويب"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  <button 
                    onClick={() => setShowGrid(true)} 
                    className="h-9 px-4 shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-md active:scale-95 ml-4"
                    title="تصفح قائمة المنصات"
                  >
                    <Globe className="h-4 w-4" />
                    <span>تصفح المنصات</span>
                  </button>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <form onSubmit={handleBrowserSubmit} className="relative hidden md:flex items-center w-64 lg:w-96 ml-4">
                    <Search className="absolute right-3 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="رابط أو بحث..."
                      value={browserInput}
                      onChange={(e) => setBrowserInput(e.target.value)}
                      className="w-full h-9 pl-3 pr-9 rounded-xl border border-border/60 bg-background/50 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                  </form>

                  {/* Share Active Tab to Chat Button */}
                  {/* Dual View Toggle Button */}
                  {openTabs.length >= 1 && (
                    <Button
                      variant={isDualView ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setIsDualView(!isDualView);
                        if (!isDualView && openTabs.length >= 2 && !secondActiveTabId) {
                          const second = openTabs.find(t => t.id !== activeTabId) || openTabs[0];
                          setSecondActiveTabId(second.id);
                        }
                      }}
                      className="h-9 rounded-xl font-bold gap-1.5 shadow-xs"
                      title="فتح نافذتين جنباً إلى جنب في نفس الشاشة"
                    >
                      <Layers className="h-4 w-4" />
                      <span className="hidden sm:inline">{isDualView ? "نافذة واحدة" : "نافذتين معاً"}</span>
                    </Button>
                  )}

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowGrid(true)}
                    className="h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="تصغير مساحة العمل"
                  >
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Main Area: Split View */}
              <div className="flex-1 flex overflow-hidden">
                {/* Iframes Container */}
                <div className="flex-1 relative bg-white flex flex-col">
                  {/* Warning Banner */}
                  <AnimatePresence>
                    {showWarning && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 overflow-hidden"
                      >
                        <div className="px-4 py-2 flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start sm:items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                            <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                              ملاحظة: بعض المنصات تمنع الفتح هنا لأسباب أمنية. إذا ظهرت شاشة بيضاء، يرجى الفتح في نافذة جديدة.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeTabId && openTabs.find(t => t.id === activeTabId) && (
                              <a
                                href={openTabs.find(t => t.id === activeTabId)?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white dark:bg-background border border-border rounded-lg text-[10px] sm:text-xs font-bold text-foreground hover:bg-muted transition-colors shrink-0 shadow-sm"
                              >
                                <ExternalLink className="h-3 w-3" />
                                فتح في نافذة جديدة
                              </a>
                            )}
                            <button
                              onClick={() => setShowWarning(false)}
                              className="h-7 w-7 rounded-lg hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-colors"
                              title="إغلاق التنبيه"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* The Iframes / Dual View */}
                  <div className="flex-1 relative w-full h-full flex flex-col md:flex-row overflow-hidden bg-background">
                    {isDualView && openTabs.length >= 2 ? (
                      <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                        {/* Left Window */}
                        <div className="flex flex-col h-full relative bg-card">
                          <div className="h-10 bg-muted/80 border-b border-border flex items-center justify-between px-3 shrink-0">
                            <span className="text-xs font-bold text-foreground">النافذة الأولى (اليمين)</span>
                            <select
                              value={activeTabId || ""}
                              onChange={(e) => setActiveTabId(e.target.value)}
                              className="bg-background border border-border rounded-lg text-xs px-2 py-1"
                            >
                              {openTabs.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1 relative">
                            {(() => {
                              const tab = openTabs.find(t => t.id === activeTabId) || openTabs[0];
                              if (!tab) return null;
                              let srcUrl = tab.url;
                              if (srcUrl.includes("youtube.com/watch?v=")) {
                                const videoId = srcUrl.split("v=")[1].split("&")[0];
                                srcUrl = `https://www.youtube.com/embed/${videoId}`;
                              } else if (srcUrl.includes("youtu.be/")) {
                                const videoId = srcUrl.split("youtu.be/")[1].split("?")[0];
                                srcUrl = `https://www.youtube.com/embed/${videoId}`;
                              }
                              return (
                                <iframe
                                  src={srcUrl}
                                  className="absolute inset-0 w-full h-full border-0"
                                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                                  loading="lazy"
                                  title={tab.name}
                                />
                              );
                            })()}
                          </div>
                        </div>

                        {/* Right Window */}
                        <div className="flex flex-col h-full relative bg-card">
                          <div className="h-10 bg-muted/80 border-b border-border flex items-center justify-between px-3 shrink-0">
                            <span className="text-xs font-bold text-foreground">النافذة الثانية (اليسار)</span>
                            <select
                              value={secondActiveTabId || openTabs[1]?.id || openTabs[0]?.id}
                              onChange={(e) => setSecondActiveTabId(e.target.value)}
                              className="bg-background border border-border rounded-lg text-xs px-2 py-1"
                            >
                              {openTabs.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1 relative">
                            {(() => {
                              const tab = openTabs.find(t => t.id === secondActiveTabId) || openTabs[1] || openTabs[0];
                              if (!tab) return null;
                              let srcUrl = tab.url;
                              if (srcUrl.includes("youtube.com/watch?v=")) {
                                const videoId = srcUrl.split("v=")[1].split("&")[0];
                                srcUrl = `https://www.youtube.com/embed/${videoId}`;
                              } else if (srcUrl.includes("youtu.be/")) {
                                const videoId = srcUrl.split("youtu.be/")[1].split("?")[0];
                                srcUrl = `https://www.youtube.com/embed/${videoId}`;
                              }
                              return (
                                <iframe
                                  src={srcUrl}
                                  className="absolute inset-0 w-full h-full border-0"
                                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                                  loading="lazy"
                                  title={tab.name}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 relative w-full h-full">
                        {openTabs.map(tab => {
                          const isActive = activeTabId === tab.id;
                          let srcUrl = tab.url;
                          if (srcUrl.includes("youtube.com/watch?v=")) {
                            const videoId = srcUrl.split("v=")[1].split("&")[0];
                            srcUrl = `https://www.youtube.com/embed/${videoId}`;
                          } else if (srcUrl.includes("youtu.be/")) {
                            const videoId = srcUrl.split("youtu.be/")[1].split("?")[0];
                            srcUrl = `https://www.youtube.com/embed/${videoId}`;
                          }
                          return (
                            <div 
                              key={tab.id} 
                              className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isActive ? 'z-10 opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none hidden'}`}
                            >
                              <iframe
                                src={srcUrl}
                                className="absolute inset-0 w-full h-full border-0"
                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                                loading="lazy"
                                title={tab.name}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Image Lightbox Dialog ── */}
      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-5 rounded-3xl" dir="rtl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {lightboxImage?.title}
              </DialogTitle>
              {lightboxImage?.desc && (
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {lightboxImage.desc}
                </DialogDescription>
              )}
            </div>
            {lightboxImage && (
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download={lightboxImage.title + ".png"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تحميل الصورة الأصلية</span>
                </a>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto rounded-2xl bg-black/5 dark:bg-black/40 border border-border/50 p-2 flex items-center justify-center min-h-[350px]">
            {lightboxImage && (
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-md"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Suggestion Dialog */}
      <StudentSuggestDialog
        isOpen={showSuggestDialog}
        onClose={() => setShowSuggestDialog(false)}
        defaultType="platform"
        defaultCategory={selectedCategory === "الكل" ? "منصة تعليمية" : selectedCategory}
      />
    </div>
  );
}
