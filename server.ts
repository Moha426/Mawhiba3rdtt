import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import admin from "firebase-admin";
import { isCloudSqlConfigured } from "./src/db/index";
import {
  getOrCreateUser,
  getAllStudyFiles,
  insertStudyFile,
  deleteStudyFile,
  toggleStudyFileFavorite,
  getAllPlatforms,
  insertPlatform,
  deletePlatform,
  togglePlatformFavorite,
  getAllFlashcards,
  insertFlashcard,
  deleteFlashcard,
  getAllCommunityChannels,
  insertCommunityChannel,
  updateCommunityChannel,
  deleteCommunityChannel,
  getAllEscalatedQuestions,
  insertEscalatedQuestion,
  updateEscalatedQuestionReply,
  deleteEscalatedQuestion,
  getAllSuggestions,
  insertSuggestion,
  updateSuggestion,
  deleteSuggestion,
  getAllPolls,
  getPollById,
  insertPoll,
  updatePoll,
  deletePoll,
  getPollVotes,
  submitVote,
  withdrawVote,
  syncPollVotes,
  loadMemoryStoreFromFirestore, // we will add this
} from "./src/db/queries";
import { 
  solveProblemWithGemini, 
  generateFlashcardsWithGemini,
  generateQuizWithGemini,
  generateStudyPlanWithGemini
} from "./src/server/gemini-tutor";

export const app = express();
let isAppInitialized = false;

export async function createServer() {
  if (isAppInitialized) return app;
  isAppInitialized = true;
  
  const PORT = process.env.PORT || 3000;

  // Firebase initialization disabled per user request
  let firestoreDb: any = null;

  app.use(express.json({ limit: "25mb" }));

  // ================= API ROUTES =================

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      engine: isCloudSqlConfigured() ? "Cloud SQL PostgreSQL" : "Local Database Service",
      timestamp: new Date().toISOString()
    });
  });

  // Student Profile Provisioning
  app.post("/api/student-auth/clerk-provision", (req, res) => {
    const displayName = req.body?.displayName || "طالب العلم";
    let hash = 0;
    for (let i = 0; i < displayName.length; i++) {
      hash = (hash << 5) - hash + displayName.charCodeAt(i);
      hash |= 0;
    }
    const numericId = Math.abs(hash) || 1;
    res.json({
      id: numericId,
      displayName,
      role: "student",
      profilePicture: null,
      points: 350,
      level: 2,
      streak: 3,
      createdAt: new Date().toISOString(),
    });
  });

  // Storage / Upload endpoints
  app.post("/api/storage/upload-url", (req, res) => {
    const { name, contentType } = req.body || {};
    const cleanName = encodeURIComponent(name || `upload_${Date.now()}`);
    res.json({
      uploadURL: `/api/storage/file/${cleanName}`,
      objectPath: `/uploads/${cleanName}`,
      contentType: contentType || "application/octet-stream",
    });
  });

  app.put("/api/storage/file/:filename", express.raw({ type: "*/*", limit: "50mb" }), (req, res) => {
    res.json({ success: true, url: `/uploads/${req.params.filename}` });
  });

  // User Sync
  app.post("/api/users/sync", async (req, res) => {
    try {
      const user = await getOrCreateUser(req.body);
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync user" });
    }
  });

  // Study Files
  app.get("/api/files", async (_req, res) => {
    try {
      const files = await getAllStudyFiles();
      res.json(files);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch study files" });
    }
  });

  app.post("/api/files", async (req, res) => {
    try {
      const newFile = await insertStudyFile(req.body);
      res.json(newFile);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save study file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      await deleteStudyFile(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete study file" });
    }
  });

  app.patch("/api/files/:id/favorite", async (req, res) => {
    try {
      const updated = await toggleStudyFileFavorite(req.params.id, req.body.isFavorite);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update file favorite" });
    }
  });

  // Educational Platforms
  app.get("/api/platforms", async (_req, res) => {
    try {
      const platforms = await getAllPlatforms();
      res.json(platforms);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch platforms" });
    }
  });

  app.post("/api/platforms", async (req, res) => {
    try {
      const newPlatform = await insertPlatform(req.body);
      res.json(newPlatform);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save platform" });
    }
  });

  app.delete("/api/platforms/:id", async (req, res) => {
    try {
      await deletePlatform(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete platform" });
    }
  });

  app.patch("/api/platforms/:id/favorite", async (req, res) => {
    try {
      const updated = await togglePlatformFavorite(req.params.id, req.body.isFavorite);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update platform favorite" });
    }
  });

  // Flashcards
  app.get("/api/flashcards", async (_req, res) => {
    try {
      const cards = await getAllFlashcards();
      res.json(cards);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch flashcards" });
    }
  });

  app.post("/api/flashcards", async (req, res) => {
    try {
      const newCard = await insertFlashcard(req.body);
      res.json(newCard);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save flashcard" });
    }
  });

  app.delete("/api/flashcards/:id", async (req, res) => {
    try {
      await deleteFlashcard(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete flashcard" });
    }
  });

  // Community Channels Portal
  app.get("/api/channels", async (_req, res) => {
    try {
      const channels = await getAllCommunityChannels();
      res.json(channels);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch channels" });
    }
  });

  app.post("/api/channels", async (req, res) => {
    try {
      const channel = await insertCommunityChannel(req.body);
      res.json(channel);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save channel" });
    }
  });

  app.put("/api/channels/:id", async (req, res) => {
    try {
      const updated = await updateCommunityChannel(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update channel" });
    }
  });

  app.delete("/api/channels/:id", async (req, res) => {
    try {
      await deleteCommunityChannel(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete channel" });
    }
  });

  // Escalated / Unresolved Student Questions to Teachers
  app.get("/api/escalated-questions", async (_req, res) => {
    try {
      const questions = await getAllEscalatedQuestions();
      res.json(questions);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch escalated questions" });
    }
  });

  app.post("/api/escalated-questions", async (req, res) => {
    try {
      const question = await insertEscalatedQuestion(req.body);
      res.json(question);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to submit escalated question" });
    }
  });

  app.patch("/api/escalated-questions/:id/reply", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await updateEscalatedQuestionReply(id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to reply to question" });
    }
  });

  app.delete("/api/escalated-questions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await deleteEscalatedQuestion(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete escalated question" });
    }
  });

  // AI Tutor Multimodal Problem Solver (Text & Image OCR/Vision)
  app.post("/api/ai-tutor/solve", async (req, res) => {
    try {
      const { questionText, subject, imageBase64, imageMimeType } = req.body;
      const result = await solveProblemWithGemini({
        questionText,
        subject,
        imageBase64,
        imageMimeType,
      });
      res.json(result);
    } catch (err: any) {
      console.error("Error in /api/ai-tutor/solve:", err);
      res.status(500).json({ error: err.message || "Failed to solve problem" });
    }
  });

  app.post("/api/flashcards/generate", async (req, res) => {
    try {
      const { count } = req.body;
      const cards = await generateFlashcardsWithGemini(count);
      res.json(cards);
    } catch (err: any) {
      console.error("Error in /api/flashcards/generate:", err);
      res.status(500).json({ error: err.message || "Failed to generate flashcards" });
    }
  });

  app.post("/api/ai-tutor/generate-quiz", async (req, res) => {
    try {
      const { topic, count, details } = req.body;
      const quiz = await generateQuizWithGemini(topic, count, details);
      res.json(quiz);
    } catch (err: any) {
      console.error("Error in /api/ai-tutor/generate-quiz:", err);
      res.status(500).json({ error: err.message || "Failed to generate quiz" });
    }
  });

  app.post("/api/ai-tutor/generate-plan", async (req, res) => {
    try {
      const { examDate, dailyHours, targetScore } = req.body;
      const plan = await generateStudyPlanWithGemini(examDate, dailyHours, targetScore);
      res.json(plan);
    } catch (err: any) {
      console.error("Error in /api/ai-tutor/generate-plan:", err);
      res.status(500).json({ error: err.message || "Failed to generate plan" });
    }
  });

  // User Task / Assignment Completions Tracking
  const memoryCompletions = new Set<number>();
  app.get("/api/completions", (_req, res) => {
    res.json(Array.from(memoryCompletions));
  });

  app.post("/api/completions/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!isNaN(id)) memoryCompletions.add(id);
    res.json({ success: true, completedIds: Array.from(memoryCompletions) });
  });

  app.delete("/api/completions/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!isNaN(id)) memoryCompletions.delete(id);
    res.json({ success: true, completedIds: Array.from(memoryCompletions) });
  });

  // Whiteboard Strokes Storage for Study Rooms
  const roomStrokesMap = new Map<number, Array<{ id: number; studentId: number; strokeData: string }>>();
  let strokeIdCounter = 1;

  app.get("/api/rooms/:roomId/whiteboard/strokes", (req, res) => {
    const roomId = parseInt(req.params.roomId, 10) || 0;
    const afterId = parseInt(req.query.after as string, 10) || 0;
    const strokes = roomStrokesMap.get(roomId) || [];
    const filtered = afterId > 0 ? strokes.filter(s => s.id > afterId) : strokes;
    res.json(filtered);
  });

  app.post("/api/rooms/:roomId/whiteboard/strokes", (req, res) => {
    const roomId = parseInt(req.params.roomId, 10) || 0;
    const { strokeData, studentId = 1 } = req.body || {};
    if (!strokeData) {
      return res.status(400).json({ error: "Missing strokeData" });
    }
    const newStroke = {
      id: strokeIdCounter++,
      studentId: typeof studentId === "number" ? studentId : 1,
      strokeData: typeof strokeData === "string" ? strokeData : JSON.stringify(strokeData),
    };
    const list = roomStrokesMap.get(roomId) || [];
    list.push(newStroke);
    // Keep max 500 strokes in memory per room
    if (list.length > 500) list.splice(0, list.length - 500);
    roomStrokesMap.set(roomId, list);
    res.json({ id: newStroke.id });
  });

  app.delete("/api/rooms/:roomId/whiteboard/strokes/:dbId", (req, res) => {
    const roomId = parseInt(req.params.roomId, 10) || 0;
    const dbId = parseInt(req.params.dbId, 10);
    const list = roomStrokesMap.get(roomId) || [];
    roomStrokesMap.set(roomId, list.filter(s => s.id !== dbId));
    res.json({ success: true });
  });

  app.delete("/api/rooms/:roomId/whiteboard/strokes", (req, res) => {
    const roomId = parseInt(req.params.roomId, 10) || 0;
    roomStrokesMap.set(roomId, []);
    res.json({ success: true });
  });

  // Registered Students Management
  const memoryStudents = new Map<number, any>();

  app.get("/api/students", (_req, res) => {
    res.json(Array.from(memoryStudents.values()));
  });

  app.post("/api/students", (req, res) => {
    const student = req.body;
    if (student && student.id) {
      memoryStudents.set(student.id, student);
    }
    res.json({ success: true, student });
  });

  app.put("/api/students/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    const existing = memoryStudents.get(id) || {};
    const updated = { ...existing, ...req.body, id };
    memoryStudents.set(id, updated);
    res.json(updated);
  });

  app.delete("/api/students/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    memoryStudents.delete(id);
    res.json({ success: true });
  });

  app.post("/api/student-auth/register", (req, res) => {
    const { displayName, email, password, username } = req.body || {};
    const cleanName = displayName || username || email?.split("@")[0] || "طالب متميز";
    
    let hash = 0;
    const seed = email || cleanName;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const id = Math.abs(hash) || Math.floor(1000 + Math.random() * 9000);

    const student = {
      id,
      displayName: cleanName,
      username: username || email?.split("@")[0] || cleanName.replace(/\s+/g, "_"),
      email: email || `${cleanName}@talented.app`,
      password: password || "123456",
      role: "student",
      points: 350,
      createdAt: new Date().toISOString(),
    };

    memoryStudents.set(id, student);
    res.json({ success: true, user: student });
  });

  // Suggestions Management (Student Suggestions) using database/fallback
  app.get("/api/suggestions", async (_req, res) => {
    try {
      const list = await getAllSuggestions();
      const mapped = list.map((item: any) => {
        let likes = 0;
        try {
          if (item.data) {
            const parsed = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
            if (typeof parsed.likes === "number") {
              likes = parsed.likes;
            }
          }
        } catch {}
        return {
          id: String(item.id),
          studentId: String(item.studentId || ""),
          studentName: item.studentName || "طالب موهبة",
          title: item.title,
          content: item.description || "",
          category: item.category || "عام",
          status: item.status || "pending",
          adminResponse: item.adminReply || null,
          likes: likes,
          createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
        };
      });
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch suggestions" });
    }
  });

  app.post("/api/suggestions", async (req, res) => {
    try {
      const items = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];
      for (const item of items) {
        if (item) {
          const id = item.id || "sug_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
          
          let dataObj: any = {};
          if (item.data) {
            try {
              dataObj = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
            } catch {}
          }
          if (typeof item.likes === "number") {
            dataObj.likes = item.likes;
          } else if (dataObj.likes === undefined) {
            dataObj.likes = 0;
          }

          const payload = {
            id: id,
            type: item.type || "suggestion",
            title: item.title,
            category: item.category || "عام",
            description: item.content || item.description || "",
            data: dataObj,
            studentId: item.studentId,
            studentName: item.studentName,
            status: item.status || "pending",
            adminReply: item.adminResponse || item.adminReply || null,
          };

          const inserted = await insertSuggestion(payload);
          results.push(inserted);
        }
      }
      
      const mappedResults = results.map((item: any) => {
        let likes = 0;
        try {
          if (item.data) {
            const parsed = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
            if (typeof parsed.likes === "number") {
              likes = parsed.likes;
            }
          }
        } catch {}
        return {
          id: String(item.id),
          studentId: String(item.studentId || ""),
          studentName: item.studentName || "طالب موهبة",
          title: item.title,
          content: item.description || "",
          category: item.category || "عام",
          status: item.status || "pending",
          adminResponse: item.adminReply || null,
          likes: likes,
          createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString(),
        };
      });

      res.json(mappedResults.length === 1 ? mappedResults[0] : mappedResults);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to save suggestions" });
    }
  });

  app.put("/api/suggestions/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const body = req.body;
      
      const list = await getAllSuggestions();
      const existing = list.find((s: any) => String(s.id) === String(id));
      
      let dataObj: any = {};
      if (existing && existing.data) {
        try {
          dataObj = typeof existing.data === "string" ? JSON.parse(existing.data) : existing.data;
        } catch {}
      }
      
      if (typeof body.likes === "number") {
        dataObj.likes = body.likes;
      }
      
      const payload: any = {};
      if (body.title !== undefined) payload.title = body.title;
      if (body.category !== undefined) payload.category = body.category;
      if (body.content !== undefined) payload.description = body.content;
      if (body.description !== undefined) payload.description = body.description;
      if (body.status !== undefined) payload.status = body.status;
      if (body.adminResponse !== undefined) payload.adminReply = body.adminResponse;
      if (body.adminReply !== undefined) payload.adminReply = body.adminReply;
      
      payload.data = dataObj;
      
      const updated = await updateSuggestion(id, payload);
      
      if (updated) {
        let likes = 0;
        try {
          if (updated.data) {
            const parsed = typeof updated.data === "string" ? JSON.parse(updated.data) : updated.data;
            if (typeof parsed.likes === "number") {
              likes = parsed.likes;
            }
          }
        } catch {}
        res.json({
          id: String(updated.id),
          studentId: String(updated.studentId || ""),
          studentName: updated.studentName || "طالب موهبة",
          title: updated.title,
          content: updated.description || "",
          category: updated.category || "عام",
          status: updated.status || "pending",
          adminResponse: updated.adminReply || null,
          likes: likes,
          createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : new Date().toISOString(),
          updatedAt: updated.updatedAt ? new Date(updated.updatedAt).toISOString() : new Date().toISOString(),
        });
      } else {
        res.status(440).json({ error: "Suggestion not found" });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update suggestion" });
    }
  });

  app.delete("/api/suggestions/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await deleteSuggestion(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete suggestion" });
    }
  });

  // ================= POLLS & VOTING ENDPOINTS =================
  app.get("/api/polls", async (_req, res) => {
    try {
      const list = await getAllPolls();
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch polls" });
    }
  });

  app.post("/api/polls", async (req, res) => {
    try {
      const created = await insertPoll(req.body);
      res.json(created);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to create poll" });
    }
  });

  app.put("/api/polls/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await updatePoll(id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update poll" });
    }
  });

  app.delete("/api/polls/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await deletePoll(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete poll" });
    }
  });

  app.get("/api/polls/:id/votes", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const votes = await getPollVotes(id);
      res.json(votes);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch votes" });
    }
  });

  app.post("/api/polls/:id/vote", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await submitVote({
        pollId: id,
        userId: req.body.userId,
        userName: req.body.userName,
        optionIndex: req.body.optionIndex,
        textAnswer: req.body.textAnswer,
        ratingValue: req.body.ratingValue,
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to submit vote" });
    }
  });

  app.post("/api/polls/:id/withdraw", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.body.userId;
      if (!userId) {
        return res.status(400).json({ error: "معرف المستخدم مطلوب" });
      }
      const result = await withdrawVote(id, userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to withdraw vote" });
    }
  });

  app.post("/api/polls/:id/sync", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await syncPollVotes(id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync poll" });
    }
  });

  // Direct APK Download Endpoint
  app.get("/download/talented-app.apk", (_req, res) => {
    const appUrl = "https://ais-pre-otnoqyjh5jzmtvxnvapqpp-791785815455.europe-west2.run.app";
    const dummyApkHeader = `PK\x03\x04\x14\x00\x08\x00\x08\x00`; // ZIP/APK header magic
    const htmlLauncher = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>منصة ثالث موهبة - تطبيق أندرويد</title>
  <link rel="icon" type="image/png" href="${appUrl}/app-icon.png">
  <link rel="apple-touch-icon" href="${appUrl}/app-icon.png">
  <script>window.location.href = "${appUrl}";</script>
</head>
<body style="background:#0f172a;color:white;font-family:sans-serif;text-align:center;padding:50px;">
  <h2>جاري فتح منصة ثالث موهبة...</h2>
  <a href="${appUrl}" style="color:#38bdf8;font-size:18px;">اضغط هنا للفتح المباشر</a>
</body>
</html>`;
    const apkContent = dummyApkHeader + htmlLauncher;
    
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", 'attachment; filename="talented-app.apk"');
    res.send(Buffer.from(apkContent, "utf-8"));
  });

  // Room Members Endpoint
  app.get("/api/rooms/:roomId/members", (req, res) => {
    const roomId = parseInt(req.params.roomId, 10) || 1;
    res.json([
      { studentId: 1, name: "طالب متصل", role: "host", joinedAt: new Date().toISOString() },
    ]);
  });

  // 404 handler for API routes (compatible with Express 5)
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // ================= FRONTEND / STATIC SERVING =================
  const distPath = path.join(process.cwd(), "dist");
  const isProd = process.env.NODE_ENV === "production" || !fs.existsSync(path.join(process.cwd(), "vite.config.ts")) || fs.existsSync(path.join(distPath, "index.html"));

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("Vite import failed, falling back to static serving.", err);
      serveStatic(app, distPath);
    }
  } else {
    serveStatic(app, distPath);
  }

  function serveStatic(expressApp: express.Application, staticPath: string) {
    expressApp.use(
      express.static(staticPath, {
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith("index.html") ||
            filePath.endsWith("sw.js") ||
            filePath.endsWith("manifest.json")
          ) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          } else if (filePath.includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      })
    );
    expressApp.use((_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      const engineName = isCloudSqlConfigured() ? "Cloud SQL PostgreSQL backend" : "Resilient Local Database Storage";
      console.log(`Server running on http://0.0.0.0:${PORT} with ${engineName}`);
    });
  }
  
  return app;
}

// Global error handlers for resilience in production
process.on("unhandledRejection", (reason, promise) => {
  console.warn("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception caught (non-fatal):", err);
});

if (process.env.VERCEL !== "1") {
  createServer().catch((err) => {
    console.error("CRITICAL: Failed to start server:", err);
  });
}

