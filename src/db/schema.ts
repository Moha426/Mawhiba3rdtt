import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email"),
  name: text("name").notNull(),
  avatar: text("avatar"),
  role: text("role").default("student"),
  grade: text("grade").default("ثالث ثانوي - موهبة"),
  points: integer("points").default(0),
  level: integer("level").default(1),
  streak: integer("streak").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Study Files / Library Resources Table
export const studyFiles = pgTable("study_files", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  subject: text("subject"),
  url: text("url").notNull(),
  size: text("size").default("1.5 MB"),
  pages: integer("pages").default(10),
  tags: text("tags"), // JSON serialized array
  description: text("description"),
  isCustom: boolean("is_custom").default(true),
  isFavorite: boolean("is_favorite").default(false),
  color: text("color"),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Educational Platforms Table
export const educationalPlatforms = pgTable("educational_platforms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  category: text("category").notNull(),
  desc: text("desc"),
  badge: text("badge"),
  color: text("color").default("from-blue-600 to-indigo-700"),
  iconBg: text("icon_bg"),
  tags: text("tags"), // JSON serialized array
  isCustom: boolean("is_custom").default(true),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Flashcards Table
export const flashcards = pgTable("flashcards", {
  id: text("id").primaryKey(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  category: text("category").default("general"),
  difficulty: text("difficulty").default("medium"),
  example: text("example"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Custom Reminders Table
export const customReminders = pgTable("custom_reminders", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  category: text("category").default("مهمة"),
  scheduledTime: text("scheduled_time"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Community Channels Portal Table
export const communityChannels = pgTable("community_channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").default("discord"), // 'discord' | 'telegram' | 'whatsapp' | 'youtube' | 'custom'
  url: text("url").notNull(),
  category: text("category").notNull().default("قنوات عامة"),
  desc: text("desc"),
  badge: text("badge"),
  color: text("color").default("from-indigo-600 to-violet-700"),
  icon: text("icon").default("MessageCircle"),
  memberCount: text("member_count").default("نشط 👥"),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Escalated / Unresolved Student Questions Table
export const escalatedQuestions = pgTable("escalated_questions", {
  id: serial("id").primaryKey(),
  studentName: text("student_name").notNull(),
  studentGrade: text("student_grade").default("ثالث ثانوي - موهبة"),
  subject: text("subject").notNull().default("القدرات والتحصيلي"),
  question: text("question").notNull(),
  imageUrl: text("image_url"),
  aiAnswer: text("ai_answer"),
  studentFeedback: text("student_feedback"),
  status: text("status").notNull().default("pending"), // 'pending' | 'answered' | 'resolved'
  teacherReply: text("teacher_reply"),
  teacherName: text("teacher_name"),
  assignedTeacherId: text("assigned_teacher_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Messages Table
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id"),
  studentName: text("student_name"),
  content: text("content"),
  messageType: text("message_type"),
  sharedCard: text("shared_card"),
  replyToId: text("reply_to_id"),
  replyToContent: text("reply_to_content"),
  replyToAuthor: text("reply_to_author"),
  channelId: text("channel_id"),
  reactions: text("reactions"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// Suggestions Table (Student Suggestions)
export const suggestions = pgTable("suggestions", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  category: text("category").default("عام"),
  description: text("description").default(""),
  data: text("data"), // Stored as JSON string
  studentId: integer("student_id"),
  studentName: text("student_name"),
  studentUsername: text("student_username"),
  status: text("status").notNull().default("pending"),
  adminReply: text("admin_reply"),
  adminRepliedAt: timestamp("admin_replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Polls Table
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  options: text("options").notNull(), // JSON serialized array: string[]
  status: text("status").notNull().default("active"), // 'active' | 'closed'
  type: text("type").notNull().default("choice"), // 'choice' | 'text' | 'quiz' | 'action' | 'rating' | 'emoji'
  category: text("category").default("تنظيمي وجداول"),
  imageUrl: text("image_url"),
  isPublic: boolean("is_public").default(true),
  totalVotes: integer("total_votes").default(0),
  allowMultiple: boolean("allow_multiple").default(false),
  preventWithdraw: boolean("prevent_withdraw").default(false),
  isPinned: boolean("is_pinned").default(false),
  correctOptionIndex: integer("correct_option_index"),
  quizExplanation: text("quiz_explanation"),
  actionTitle: text("action_title"),
  actionDescription: text("action_description"),
  actionStatus: text("action_status").default("pending"),
  actionExecutedBy: text("action_executed_by"),
  actionExecutedAt: timestamp("action_executed_at"),
  showVoterNames: boolean("show_voter_names").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Poll Votes Table
export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  userId: text("user_id"), // uid or dynamic student ID
  userName: text("user_name"),
  optionIndex: integer("option_index"), // null for text poll
  textAnswer: text("text_answer"), // for text answers
  ratingValue: integer("rating_value"), // for 1-5 star ratings
  createdAt: timestamp("created_at").defaultNow(),
});


