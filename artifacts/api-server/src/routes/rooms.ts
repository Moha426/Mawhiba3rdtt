import { Router, type IRouter } from "express";
import { eq, desc, and, or, sql, inArray, gt } from "drizzle-orm";
import {
  db,
  studyRoomsTable,
  roomMembersTable,
  roomMessagesTable,
  roomSharedContentTable,
  directMessagesTable,
  studentsTable,
  roomActiveViewTable,
  roomScreenShareTable,
  roomWebRtcSignalsTable,
  roomWhiteboardStrokesTable,
  roomMessageReactionsTable,
} from "@workspace/db";
import { getStudentFromRequest } from "../middlewares/clerkAuth";

const router: IRouter = Router();

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function getStudent(req: import("express").Request) {
  const id = await getStudentFromRequest(req);
  if (!id) return null;
  const [s] = await db
    .select({ id: studentsTable.id, displayName: studentsTable.displayName })
    .from(studentsTable)
    .where(eq(studentsTable.id, id));
  return s ? { id: s.id, name: s.displayName } : null;
}

/* ── List rooms (filtered by visibility) ── */
router.get("/rooms", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const memberships = await db.select().from(roomMembersTable).where(eq(roomMembersTable.studentId, student.id));
  const memberSet = new Set(memberships.map((m) => m.roomId));

  const allRooms = await db.select().from(studyRoomsTable).orderBy(desc(studyRoomsTable.createdAt));

  /* Apply visibility filter: members_only rooms only show to members */
  const visibleRooms = allRooms.filter(r =>
    r.visibility === "everyone" || memberSet.has(r.id)
  );

  const counts = await db
    .select({ roomId: roomMembersTable.roomId, count: sql<number>`count(*)` })
    .from(roomMembersTable)
    .groupBy(roomMembersTable.roomId);
  const countMap = Object.fromEntries(counts.map((c) => [c.roomId, Number(c.count)]));

  res.json(
    visibleRooms.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      visibility: r.visibility,
      inviteCode: r.inviteCode,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
      memberCount: countMap[r.id] ?? 0,
      isMember: memberSet.has(r.id),
    }))
  );
});

/* ── Create room ── */
router.post("/rooms", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { name, type, visibility } = req.body as { name?: string; type?: string; visibility?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }

  const inviteCode = makeCode();
  const [room] = await db
    .insert(studyRoomsTable)
    .values({
      name: name.trim(),
      type: type ?? "public",
      visibility: visibility ?? "everyone",
      inviteCode,
      createdBy: student.id,
    })
    .returning();

  await db.insert(roomMembersTable).values({ roomId: room.id, studentId: student.id });

  res.status(201).json({
    id: room.id, name: room.name, type: room.type, visibility: room.visibility,
    inviteCode: room.inviteCode, createdBy: room.createdBy,
    createdAt: room.createdAt.toISOString(), memberCount: 1, isMember: true,
  });
});

/* ── Join room by code ── */
router.post("/rooms/join", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { inviteCode } = req.body as { inviteCode?: string };
  if (!inviteCode) { res.status(400).json({ error: "inviteCode required" }); return; }

  const [room] = await db.select().from(studyRoomsTable).where(eq(studyRoomsTable.inviteCode, inviteCode.toUpperCase()));
  if (!room) { res.status(404).json({ error: "Invalid invite code" }); return; }

  const [existing] = await db.select().from(roomMembersTable)
    .where(and(eq(roomMembersTable.roomId, room.id), eq(roomMembersTable.studentId, student.id)));
  if (!existing) {
    await db.insert(roomMembersTable).values({ roomId: room.id, studentId: student.id });
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(roomMembersTable)
    .where(eq(roomMembersTable.roomId, room.id));

  res.json({
    id: room.id, name: room.name, type: room.type, visibility: room.visibility,
    inviteCode: room.inviteCode, createdBy: room.createdBy,
    createdAt: room.createdAt.toISOString(),
    memberCount: Number(countRow?.count ?? 1), isMember: true,
  });
});

/* ── Delete room (creator only) ── */
router.delete("/rooms/:id", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const [room] = await db.select().from(studyRoomsTable).where(eq(studyRoomsTable.id, id));
  if (!room) { res.status(404).json({ error: "Not found" }); return; }
  if (room.createdBy !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(roomWebRtcSignalsTable).where(eq(roomWebRtcSignalsTable.roomId, id));
  await db.delete(roomScreenShareTable).where(eq(roomScreenShareTable.roomId, id));
  await db.delete(roomActiveViewTable).where(eq(roomActiveViewTable.roomId, id));
  await db.delete(roomMessagesTable).where(eq(roomMessagesTable.roomId, id));
  await db.delete(roomMembersTable).where(eq(roomMembersTable.roomId, id));
  await db.delete(roomSharedContentTable).where(eq(roomSharedContentTable.roomId, id));
  await db.delete(studyRoomsTable).where(eq(studyRoomsTable.id, id));
  res.status(204).end();
});

/* ── Leave room ── */
router.post("/rooms/:id/leave", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  await db.delete(roomMembersTable)
    .where(and(eq(roomMembersTable.roomId, id), eq(roomMembersTable.studentId, student.id)));
  res.status(204).end();
});

/* ── Room messages ── */
router.get("/rooms/:id/messages", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const msgs = await db.select().from(roomMessagesTable)
    .where(eq(roomMessagesTable.roomId, id))
    .orderBy(desc(roomMessagesTable.id))
    .limit(100);

  const reversed = msgs.reverse();
  const msgIds   = reversed.map(m => m.id);

  const reactions = msgIds.length > 0
    ? await db.select().from(roomMessageReactionsTable)
        .where(inArray(roomMessageReactionsTable.messageId, msgIds))
    : [];

  type ReactionGroup = { emoji: string; count: number; myReaction: boolean; users: string[] };
  const rMap: Record<number, Record<string, ReactionGroup>> = {};
  for (const r of reactions) {
    if (!rMap[r.messageId]) rMap[r.messageId] = {};
    if (!rMap[r.messageId][r.emoji]) rMap[r.messageId][r.emoji] = { emoji: r.emoji, count: 0, myReaction: false, users: [] };
    rMap[r.messageId][r.emoji].count++;
    rMap[r.messageId][r.emoji].users.push(r.studentName);
    if (r.studentId === student.id) rMap[r.messageId][r.emoji].myReaction = true;
  }

  res.json(reversed.map((m) => ({
    id: m.id, roomId: m.roomId, studentId: m.studentId,
    studentName: m.studentName, content: m.content,
    messageType: m.messageType,
    replyToId:      m.replyToId      ?? null,
    replyToContent: m.replyToContent ?? null,
    replyToAuthor:  m.replyToAuthor  ?? null,
    deletedAt:      m.deletedAt      ? m.deletedAt.toISOString() : null,
    reactions:      rMap[m.id]       ? Object.values(rMap[m.id]) : [],
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/rooms/:id/messages", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const { content, messageType, replyToId, replyToContent, replyToAuthor } =
    req.body as { content?: string; messageType?: string; replyToId?: number; replyToContent?: string; replyToAuthor?: string };
  if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

  const [msg] = await db.insert(roomMessagesTable)
    .values({
      roomId: id, studentId: student.id, studentName: student.name,
      content: content.trim(), messageType: messageType ?? "text",
      replyToId: replyToId ?? null,
      replyToContent: replyToContent ?? null,
      replyToAuthor:  replyToAuthor  ?? null,
    })
    .returning();

  res.status(201).json({
    id: msg.id, roomId: msg.roomId, studentId: msg.studentId,
    studentName: msg.studentName, content: msg.content,
    messageType: msg.messageType,
    replyToId: msg.replyToId ?? null, replyToContent: msg.replyToContent ?? null, replyToAuthor: msg.replyToAuthor ?? null,
    deletedAt: null, reactions: [],
    createdAt: msg.createdAt.toISOString(),
  });
});

/* ── Toggle emoji reaction ── */
router.post("/rooms/:id/messages/:msgId/reactions/:emoji", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const roomId = parseInt(req.params.id);
  const msgId  = parseInt(req.params.msgId);
  const emoji  = decodeURIComponent(req.params.emoji);

  const existing = await db.select().from(roomMessageReactionsTable)
    .where(and(
      eq(roomMessageReactionsTable.messageId, msgId),
      eq(roomMessageReactionsTable.studentId, student.id),
      eq(roomMessageReactionsTable.emoji, emoji),
    ));

  if (existing.length > 0) {
    await db.delete(roomMessageReactionsTable)
      .where(and(
        eq(roomMessageReactionsTable.messageId, msgId),
        eq(roomMessageReactionsTable.studentId, student.id),
        eq(roomMessageReactionsTable.emoji, emoji),
      ));
  } else {
    await db.insert(roomMessageReactionsTable)
      .values({ roomId, messageId: msgId, studentId: student.id, studentName: student.name, emoji })
      .onConflictDoNothing();
  }

  const allR = await db.select().from(roomMessageReactionsTable)
    .where(eq(roomMessageReactionsTable.messageId, msgId));

  const grouped: Record<string, { emoji: string; count: number; myReaction: boolean; users: string[] }> = {};
  for (const r of allR) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, myReaction: false, users: [] };
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.studentName);
    if (r.studentId === student.id) grouped[r.emoji].myReaction = true;
  }
  res.json(Object.values(grouped));
});

/* ── Soft-delete own message ── */
router.delete("/rooms/:id/messages/:msgId", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const msgId = parseInt(req.params.msgId);
  await db.update(roomMessagesTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(roomMessagesTable.id, msgId), eq(roomMessagesTable.studentId, student.id)));

  res.status(204).end();
});

/* ── Room member list ── */
router.get("/rooms/:id/members", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const members = await db
    .select({ studentId: roomMembersTable.studentId, displayName: studentsTable.displayName })
    .from(roomMembersTable)
    .leftJoin(studentsTable, eq(roomMembersTable.studentId, studentsTable.id))
    .where(eq(roomMembersTable.roomId, id));

  res.json(members.map(m => ({ studentId: m.studentId, displayName: m.displayName ?? "طالب" })));
});

/* ── Room shared content ── */
router.get("/rooms/:id/content", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const items = await db.select().from(roomSharedContentTable)
    .where(eq(roomSharedContentTable.roomId, id))
    .orderBy(desc(roomSharedContentTable.createdAt));

  res.json(items.map((c) => ({
    id: c.id, roomId: c.roomId, studentId: c.studentId,
    contentType: c.contentType, title: c.title,
    content: c.content, createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/rooms/:id/content", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const { contentType, title, content } = req.body as { contentType?: string; title?: string; content?: string };
  if (!contentType || !content) { res.status(400).json({ error: "contentType and content required" }); return; }

  const [item] = await db.insert(roomSharedContentTable)
    .values({ roomId: id, studentId: student.id, contentType, title: title ?? null, content })
    .returning();

  res.status(201).json({
    id: item.id, roomId: item.roomId, studentId: item.studentId,
    contentType: item.contentType, title: item.title,
    content: item.content, createdAt: item.createdAt.toISOString(),
  });
});

router.delete("/rooms/:id/content/:contentId", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const contentId = parseInt(req.params.contentId);
  await db.delete(roomSharedContentTable)
    .where(and(eq(roomSharedContentTable.id, contentId), eq(roomSharedContentTable.studentId, student.id)));
  res.status(204).end();
});

/* ═══════════════════════════════════════════════════════════════════════════
   ── Active View — synchronized content viewing ──
═══════════════════════════════════════════════════════════════════════════ */

router.get("/rooms/:id/active-view", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const [view] = await db.select().from(roomActiveViewTable).where(eq(roomActiveViewTable.roomId, id));

  if (!view) { res.json(null); return; }
  res.json({
    roomId: view.roomId,
    contentId: view.contentId,
    contentType: view.contentType,
    contentUrl: view.contentUrl,
    contentTitle: view.contentTitle,
    openedById: view.openedById,
    openedByName: view.openedByName,
    updatedAt: view.updatedAt.toISOString(),
  });
});

router.put("/rooms/:id/active-view", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const { contentId, contentType, contentUrl, contentTitle } =
    req.body as { contentId?: number; contentType?: string; contentUrl?: string; contentTitle?: string };

  await db
    .insert(roomActiveViewTable)
    .values({
      roomId: id,
      contentId: contentId ?? null,
      contentType: contentType ?? null,
      contentUrl: contentUrl ?? null,
      contentTitle: contentTitle ?? null,
      openedById: student.id,
      openedByName: student.name,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: roomActiveViewTable.roomId,
      set: {
        contentId: contentId ?? null,
        contentType: contentType ?? null,
        contentUrl: contentUrl ?? null,
        contentTitle: contentTitle ?? null,
        openedById: student.id,
        openedByName: student.name,
        updatedAt: new Date(),
      },
    });

  res.status(204).end();
});

router.delete("/rooms/:id/active-view", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  await db.delete(roomActiveViewTable).where(eq(roomActiveViewTable.roomId, id));
  res.status(204).end();
});

/* ═══════════════════════════════════════════════════════════════════════════
   ── Screen Share State ──
═══════════════════════════════════════════════════════════════════════════ */

router.get("/rooms/:id/screen-share", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const [share] = await db.select().from(roomScreenShareTable).where(eq(roomScreenShareTable.roomId, id));

  if (!share) { res.json(null); return; }
  res.json({
    roomId: share.roomId,
    presenterStudentId: share.sharerId,
    presenterName: share.sharerName,
    isActive: true,
    startedAt: share.startedAt.toISOString(),
  });
});

router.post("/rooms/:id/screen-share", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);

  await db
    .insert(roomScreenShareTable)
    .values({ roomId: id, sharerId: student.id, sharerName: student.name, startedAt: new Date() })
    .onConflictDoUpdate({
      target: roomScreenShareTable.roomId,
      set: { sharerId: student.id, sharerName: student.name, startedAt: new Date() },
    });

  res.status(204).end();
});

router.delete("/rooms/:id/screen-share", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const [share] = await db.select().from(roomScreenShareTable).where(eq(roomScreenShareTable.roomId, id));

  if (share && share.sharerId !== student.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(roomScreenShareTable).where(eq(roomScreenShareTable.roomId, id));
  /* Clear all signals for this room on stop */
  await db.delete(roomWebRtcSignalsTable).where(eq(roomWebRtcSignalsTable.roomId, id));
  res.status(204).end();
});

/* ── Screen Share: upload a frame (called by sharer every ~2s) ── */
router.put("/rooms/:id/screen-share/frame", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const { frameData } = req.body as { frameData?: string };
  if (!frameData) { res.status(400).json({ error: "frameData required" }); return; }

  await db
    .update(roomScreenShareTable)
    .set({ frameData, frameUpdatedAt: new Date() })
    .where(eq(roomScreenShareTable.roomId, id));

  res.status(204).end();
});

/* ── Screen Share: get latest frame (polled by viewers) ── */
router.get("/rooms/:id/screen-share/frame", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const [share] = await db.select().from(roomScreenShareTable).where(eq(roomScreenShareTable.roomId, id));

  if (!share || !share.frameData) { res.json(null); return; }
  res.json({ frameData: share.frameData, frameUpdatedAt: share.frameUpdatedAt?.toISOString() ?? null });
});

/* ═══════════════════════════════════════════════════════════════════════════
   ── WebRTC Signaling ──
═══════════════════════════════════════════════════════════════════════════ */

/* GET signals: fetch and consume all signals addressed to me */
router.get("/rooms/:id/signals", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);

  const sigs = await db
    .select()
    .from(roomWebRtcSignalsTable)
    .where(
      and(
        eq(roomWebRtcSignalsTable.roomId, id),
        or(
          eq(roomWebRtcSignalsTable.toStudentId, student.id),
          sql`${roomWebRtcSignalsTable.toStudentId} IS NULL AND ${roomWebRtcSignalsTable.fromStudentId} != ${student.id}`
        )
      )
    )
    .orderBy(roomWebRtcSignalsTable.id);

  if (sigs.length > 0) {
    const ids = sigs.map(s => s.id);
    await db.delete(roomWebRtcSignalsTable).where(
      inArray(roomWebRtcSignalsTable.id, ids)
    );
  }

  res.json(sigs.map(s => ({
    id: s.id,
    roomId: s.roomId,
    fromStudentId: s.fromStudentId,
    fromStudentName: s.fromStudentName,
    toStudentId: s.toStudentId,
    signalType: s.signalType,
    payload: s.payload,
    createdAt: s.createdAt.toISOString(),
  })));
});

/* POST signal */
router.post("/rooms/:id/signals", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const { toStudentId, signalType, payload } =
    req.body as { toStudentId?: number; signalType?: string; payload?: string };

  if (!signalType || payload === undefined) {
    res.status(400).json({ error: "signalType and payload required" }); return;
  }

  const [sig] = await db
    .insert(roomWebRtcSignalsTable)
    .values({
      roomId: id,
      fromStudentId: student.id,
      fromStudentName: student.name,
      toStudentId: toStudentId ?? null,
      signalType,
      payload,
    })
    .returning();

  res.status(201).json({
    id: sig.id,
    roomId: sig.roomId,
    fromStudentId: sig.fromStudentId,
    fromStudentName: sig.fromStudentName,
    toStudentId: sig.toStudentId,
    signalType: sig.signalType,
    payload: sig.payload,
    createdAt: sig.createdAt.toISOString(),
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   ── Whiteboard Strokes (persistent, poll-by-id) ──
═══════════════════════════════════════════════════════════════════════════ */

/* GET /rooms/:id/whiteboard/strokes?after=<lastId>  — returns all strokes with id > lastId */
router.get("/rooms/:id/whiteboard/strokes", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const afterId = req.query.after ? parseInt(String(req.query.after)) : 0;

  const strokes = await db
    .select()
    .from(roomWhiteboardStrokesTable)
    .where(and(eq(roomWhiteboardStrokesTable.roomId, id), gt(roomWhiteboardStrokesTable.id, afterId)))
    .orderBy(roomWhiteboardStrokesTable.id)
    .limit(200);

  res.json(strokes.map(s => ({ id: s.id, studentId: s.studentId, strokeData: s.strokeData })));
});

/* POST /rooms/:id/whiteboard/strokes — add a stroke */
router.post("/rooms/:id/whiteboard/strokes", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  const { strokeData } = req.body as { strokeData?: string };
  if (!strokeData) { res.status(400).json({ error: "strokeData required" }); return; }

  const [row] = await db
    .insert(roomWhiteboardStrokesTable)
    .values({ roomId: id, studentId: student.id, strokeData })
    .returning();

  res.status(201).json({ id: row.id, studentId: row.studentId, strokeData: row.strokeData });
});

/* DELETE /rooms/:id/whiteboard/strokes — clear the board */
router.delete("/rooms/:id/whiteboard/strokes", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id);
  await db.delete(roomWhiteboardStrokesTable).where(eq(roomWhiteboardStrokesTable.roomId, id));
  res.status(204).end();
});

/* DELETE /rooms/:id/whiteboard/strokes/:strokeId — undo a single stroke */
router.delete("/rooms/:id/whiteboard/strokes/:strokeId", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const strokeId = parseInt(req.params.strokeId);
  await db.delete(roomWhiteboardStrokesTable).where(eq(roomWhiteboardStrokesTable.id, strokeId));
  res.status(204).end();
});

/* ═══════════════════════════════════════════════════════════════════════════
   ── Direct messages ──
═══════════════════════════════════════════════════════════════════════════ */

router.get("/dm/conversations", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const msgs = await db.select().from(directMessagesTable)
    .where(or(eq(directMessagesTable.fromStudentId, student.id), eq(directMessagesTable.toStudentId, student.id)))
    .orderBy(desc(directMessagesTable.id))
    .limit(200);

  const convMap = new Map<number, { studentId: number; studentName: string; lastMessage: string; lastAt: string }>();
  for (const m of msgs) {
    const otherId = m.fromStudentId === student.id ? m.toStudentId : m.fromStudentId;
    const otherName = m.fromStudentId === student.id ? "..." : m.fromStudentName;
    if (!convMap.has(otherId)) {
      convMap.set(otherId, { studentId: otherId, studentName: otherName, lastMessage: m.content, lastAt: m.createdAt.toISOString() });
    }
  }

  const otherIds = [...convMap.keys()];
  if (otherIds.length > 0) {
    const students = await db.select({ id: studentsTable.id, displayName: studentsTable.displayName })
      .from(studentsTable)
      .where(sql`${studentsTable.id} = ANY(ARRAY[${sql.join(otherIds.map(id => sql`${id}`), sql`, `)}])`);
    for (const s of students) {
      const conv = convMap.get(s.id);
      if (conv) conv.studentName = s.displayName;
    }
  }

  res.json([...convMap.values()].map((c) => ({ ...c, unread: 0 })));
});

router.get("/dm/:studentId", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const otherId = parseInt(req.params.studentId);
  const msgs = await db.select().from(directMessagesTable)
    .where(or(
      and(eq(directMessagesTable.fromStudentId, student.id), eq(directMessagesTable.toStudentId, otherId)),
      and(eq(directMessagesTable.fromStudentId, otherId), eq(directMessagesTable.toStudentId, student.id))
    ))
    .orderBy(desc(directMessagesTable.id))
    .limit(80);

  res.json(msgs.reverse().map((m) => ({
    id: m.id, fromStudentId: m.fromStudentId, toStudentId: m.toStudentId,
    fromStudentName: m.fromStudentName, content: m.content,
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/dm/:studentId", async (req, res): Promise<void> => {
  const student = await getStudent(req);
  if (!student) { res.status(401).json({ error: "Unauthorized" }); return; }

  const toId = parseInt(req.params.studentId);
  const { content } = req.body as { content?: string };
  if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

  const [msg] = await db.insert(directMessagesTable)
    .values({ fromStudentId: student.id, toStudentId: toId, fromStudentName: student.name, content: content.trim() })
    .returning();

  res.status(201).json({
    id: msg.id, fromStudentId: msg.fromStudentId, toStudentId: msg.toStudentId,
    fromStudentName: msg.fromStudentName, content: msg.content,
    createdAt: msg.createdAt.toISOString(),
  });
});

export default router;
