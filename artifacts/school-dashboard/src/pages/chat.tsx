/* ══════════════════════════════════════════════════════════════════════════
   Discord-like school chat — Arabic RTL · always dark theme
   Features: message grouping · reactions · reply · delete · member list
             emoji picker · file uploads · whiteboard · screen share · voice
   ══════════════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, MessageCircle, Loader2, Lock, ArrowRight, Plus, Users, Hash,
  Trash2, LogOut, Copy, Check, Wrench, X, Globe, UserPlus,
  Search, Paperclip, FileText, Reply, Smile, ChevronDown, Eye, Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useListChatMessages, useSendChatMessage,
  useListRooms, useCreateRoom, useJoinRoom, useDeleteRoom, useLeaveRoom,
  useListRoomMessages, useSendRoomMessage,
  useListRoomContent, useAddRoomContent, useDeleteRoomContent,
  useListDmConversations, useListDirectMessages, useSendDirectMessage,
  useListStudents,
  useGetRoomActiveView, useSetRoomActiveView, useClearRoomActiveView,
} from "@workspace/api-client-react";
import type { Room as StudyRoom, RoomContent } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useStudentProfile } from "@/lib/use-student-profile";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Whiteboard } from "@/components/whiteboard";
import { ScreenShare } from "@/components/screen-share";
import { VoiceChat } from "@/components/voice-chat";

/* ─────────────────────────────────────────────────────── constants ── */
const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const POLL      = 2500;
const GROUP_GAP = 7 * 60 * 1000;   // 7 min → new group
const MAX_FILE  = 8 * 1024 * 1024; // 8 MB

const QUICK_EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

const EMOJI_CATS: Record<string, string[]> = {
  "😀": ["😀","😃","😄","😁","😅","😂","🤣","😊","😇","🥰","😍","😘","🙂","🤗","🤔","🤐","😐","😶","😏","😒","🙄","😬","😮","😲","😳","🥺","😢","😭","😱","😡","😠","🤬","😈","💀"],
  "👍": ["👍","👎","👌","✌️","🤞","🖖","🤟","👏","🙌","🤝","🙏","💪","👋","✊","🤜","🤛","☝️"],
  "❤️": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💕","💞","💓","💗","💖","💝","💘","🩷","🩶","🩵"],
  "🎉": ["🎉","🎊","🏆","🥇","⭐","🌟","💫","✨","🔥","💥","🌈","🎵","🎶","📚","✏️","💡","🎯","🚀","🎓","☀️","🌙","🌸","🍕","⚽","🎮","🎲","🧩"],
};

// Discord dark colour palette (hardcoded – always dark regardless of app theme)
const C = {
  sidebar:      "#1e1f22",
  main:         "#313338",
  panel:        "#2b2d31",
  input:        "#383a40",
  hover:        "rgba(255,255,255,0.04)",
  active:       "#404249",
  text:         "#dbdee1",
  muted:        "#80848e",
  faint:        "#4e5058",
  online:       "#23a55a",
  danger:       "#ed4245",
  discord:      "#5865f2",
  border:       "rgba(0,0,0,0.25)",
  inputBorder:  "rgba(255,255,255,0.04)",
  rxBg:         "rgba(255,255,255,0.07)",
  rxMyBg:       "rgba(88,101,242,0.3)",
  rxBorder:     "rgba(255,255,255,0.10)",
  rxMyBorder:   "rgba(88,101,242,0.6)",
};

/* ─────────────────────────────────────────────────────────── types ── */
interface RichMsg {
  id: number;
  studentId: number;
  studentName: string;
  content: string;
  messageType: string;
  replyToId?:      number | null;
  replyToContent?: string | null;
  replyToAuthor?:  string | null;
  deletedAt?:      string | null;
  reactions: MsgReaction[];
  createdAt: string;
}
interface MsgReaction { emoji: string; count: number; myReaction: boolean; users: string[] }
interface Member { studentId: number; displayName: string }
type View = { kind: "general" } | { kind: "dm"; studentId: number; studentName: string } | { kind: "room"; room: StudyRoom };
type ToolTab = "whiteboard" | "content" | "screenshare" | "voice";
type ContentTabKind = "youtube" | "pdf" | "canva" | "image" | "link";
type RoomMode = "open" | "restricted" | "private";

/* ─────────────────────────────────────────────────────── helpers ── */
const shortTime = (iso: string) => format(new Date(iso), "HH:mm");
const longTime  = (iso: string) => format(new Date(iso), "HH:mm · d MMM", { locale: ar });
const dateLabel = (iso: string) => format(new Date(iso), "EEEE، d MMMM yyyy", { locale: ar });
const avatarHue = (id: number) => `hsl(${(id * 47) % 360},55%,62%)`;

function toRich(m: any): RichMsg {
  return {
    id: m.id, studentId: m.studentId, studentName: m.studentName,
    content: m.content, messageType: m.messageType ?? "text",
    replyToId: m.replyToId ?? null, replyToContent: m.replyToContent ?? null, replyToAuthor: m.replyToAuthor ?? null,
    deletedAt: m.deletedAt ?? null, reactions: m.reactions ?? [],
    createdAt: m.createdAt,
  };
}

/* ─────────────────────────────────────── small reusable components ── */
function SmAvatar({ id, name, size = 10 }: { id: number; name: string; size?: number }) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white select-none shrink-0`}
      style={{ background: avatarHue(id), width: size * 4, height: size * 4, fontSize: size * 1.5 }}
    >
      {name.charAt(0)}
    </div>
  );
}

function ChanRow({ icon, name, active, onClick, muted, badge }: {
  icon: React.ReactNode; name: string; active?: boolean; onClick: () => void; muted?: boolean; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-right transition-colors group"
      style={{ background: active ? C.active : "transparent", color: active ? C.text : (muted ? C.faint : C.muted) }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = C.hover; (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = muted ? C.faint : C.muted; } }}
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      <span className="flex-1 text-sm truncate">{name}</span>
      {badge ? (
        <span className="h-5 min-w-5 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0"
          style={{ background: C.danger }}>{badge}</span>
      ) : null}
    </button>
  );
}

function SecHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 mb-1 mt-4 first:mt-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>{label}</span>
      {action}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <div className="flex-1 h-px" style={{ background: C.border }} />
      <span className="text-[11px] font-medium shrink-0" style={{ color: C.muted }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: C.border }} />
    </div>
  );
}

/* ─────────────────────────────────────────────── EmojiPicker ── */
function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const [cat, setCat] = useState(Object.keys(EMOJI_CATS)[0]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function down(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-2 rounded-xl shadow-2xl z-50 overflow-hidden border"
      style={{ background: C.panel, borderColor: C.border, width: 320 }}>
      {/* Category tabs */}
      <div className="flex border-b" style={{ borderColor: C.border }}>
        {Object.keys(EMOJI_CATS).map(k => (
          <button key={k} onClick={() => setCat(k)}
            className="flex-1 py-2 text-base transition-colors"
            style={{ background: cat === k ? C.hover : "transparent" }}>
            {k.split(" ")[0]}
          </button>
        ))}
      </div>
      {/* Grid */}
      <div className="p-2 grid grid-cols-9 gap-0.5 max-h-52 overflow-y-auto">
        {(EMOJI_CATS[cat] ?? []).map(e => (
          <button key={e} onClick={() => { onPick(e); onClose(); }}
            className="h-8 w-8 flex items-center justify-center rounded text-xl hover:bg-white/10 transition-colors">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── ReactionBar ── */
function ReactionBar({ reactions, onToggle }: { reactions: MsgReaction[]; onToggle: (emoji: string) => void }) {
  if (!reactions.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji)}
          title={r.users.join(", ")}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:brightness-125 border"
          style={{
            background: r.myReaction ? C.rxMyBg : C.rxBg,
            borderColor: r.myReaction ? C.rxMyBorder : C.rxBorder,
            color: r.myReaction ? "#c9cdfb" : C.muted,
          }}
        >
          <span className="text-sm leading-none">{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────── FileCard ── */
function FileCard({ content }: { content: string }) {
  let meta: { name?: string; url?: string } = {};
  try { meta = JSON.parse(content); } catch { meta = { name: content, url: content }; }
  const name = meta.name ?? "ملف";
  const url  = meta.url  ?? content;
  const isVideo = name.endsWith(".webm") || name.endsWith(".mp4") || url.startsWith("data:video/");

  if (isVideo) {
    return (
      <video controls src={url} className="mt-1.5 rounded-lg max-w-xs"
        style={{ maxHeight: 200, background: "#000" }} />
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2.5 mt-1.5 px-3 py-2.5 rounded-xl border hover:brightness-110 transition-colors max-w-xs"
      style={{ background: "rgba(255,255,255,0.05)", borderColor: C.border, color: C.text }}
    >
      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "rgba(88,101,242,0.2)" }}>
        <FileText className="h-5 w-5" style={{ color: C.discord }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate max-w-[180px]">{name}</p>
        <p className="text-[11px]" style={{ color: C.muted }}>تحميل الملف</p>
      </div>
    </a>
  );
}

/* ─────────────────────────────────────────────── DiscordMsg ── */
function DiscordMsg({ msg, isFirst, myId, onReact, onReply, onDelete }: {
  msg: RichMsg; isFirst: boolean; myId: number;
  onReact: (msgId: number, emoji: string) => void;
  onReply: (msg: RichMsg) => void;
  onDelete: (msgId: number) => void;
}) {
  const isMe = msg.studentId === myId;

  return (
    <div
      className="group relative flex gap-3 px-4"
      style={{ paddingTop: isFirst ? 20 : 2, paddingBottom: 2 }}
    >
      {/* Avatar / small timestamp */}
      <div className="w-10 shrink-0 flex items-start justify-center pt-0.5">
        {isFirst ? (
          <SmAvatar id={msg.studentId} name={msg.studentName} />
        ) : (
          <span className="text-[10px] font-mono select-none transition-opacity"
            style={{ color: "transparent", lineHeight: "22px" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.muted)}
            onMouseLeave={e => (e.currentTarget.style.color = "transparent")}>
            {shortTime(msg.createdAt)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-0.5">
        {isFirst && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm" style={{ color: isMe ? C.discord : C.text }}>
              {msg.studentName}
            </span>
            <span className="text-[11px]" style={{ color: C.muted }}>{longTime(msg.createdAt)}</span>
          </div>
        )}

        {/* Reply quote */}
        {msg.replyToId && !msg.deletedAt && (
          <div className="flex items-center gap-2 mb-1.5 px-2 py-1 rounded cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)", borderRight: `3px solid rgba(255,255,255,0.2)` }}>
            <Reply className="h-3 w-3 shrink-0" style={{ color: C.muted }} />
            <span className="text-[11px] font-semibold shrink-0" style={{ color: C.muted }}>
              {msg.replyToAuthor}:
            </span>
            <span className="text-[11px] truncate" style={{ color: C.muted }}>
              {(msg.replyToContent ?? "").slice(0, 120)}
            </span>
          </div>
        )}

        {/* Message content */}
        {msg.deletedAt ? (
          <p className="italic text-sm inline-flex items-center gap-1.5 px-2 py-0.5 rounded border"
            style={{ color: C.muted, borderColor: "rgba(255,255,255,0.08)" }}>
            <Trash2 className="h-3 w-3" />تم حذف هذه الرسالة
          </p>
        ) : msg.messageType === "image" ? (
          <img src={msg.content} alt="" className="mt-1.5 rounded-xl cursor-pointer hover:brightness-95 transition-all"
            style={{ maxWidth: 400, maxHeight: 300, display: "block" }}
            onClick={() => window.open(msg.content, "_blank")} />
        ) : msg.messageType === "file" ? (
          <FileCard content={msg.content} />
        ) : (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ color: C.text }} dir="auto">
            {msg.content}
          </p>
        )}

        {/* Reactions */}
        {(msg.reactions?.length ?? 0) > 0 && (
          <ReactionBar reactions={msg.reactions} onToggle={e => onReact(msg.id, e)} />
        )}
      </div>

      {/* Hover action bar — floats above message */}
      {!msg.deletedAt && (
        <div
          className="absolute opacity-0 group-hover:opacity-100 flex items-center gap-0.5 rounded-lg shadow-2xl z-20 border pointer-events-none group-hover:pointer-events-auto"
          style={{
            left: 8, top: 0, transform: "translateY(-100%) translateY(-4px)",
            background: C.panel, borderColor: C.border, padding: "2px 4px",
          }}
        >
          {QUICK_EMOJI.map(e => (
            <button key={e} onClick={() => onReact(msg.id, e)}
              className="h-8 w-8 flex items-center justify-center rounded text-base transition-colors"
              style={{ fontSize: 18 }}
              onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(255,255,255,0.1)")}
              onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}>
              {e}
            </button>
          ))}
          <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: "rgba(255,255,255,0.12)" }} />
          <ActionBtn icon={<Reply className="h-4 w-4" />} title="رد" onClick={() => onReply(msg)} />
          {isMe && <ActionBtn icon={<Trash2 className="h-4 w-4" />} title="حذف" danger onClick={() => onDelete(msg.id)} />}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, title, onClick, danger }: { icon: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick} title={title}
      className="h-8 w-8 flex items-center justify-center rounded transition-colors"
      style={{ color: C.muted }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = danger ? "rgba(237,66,69,0.2)" : "rgba(255,255,255,0.1)";
        (e.currentTarget as HTMLButtonElement).style.color = danger ? C.danger : C.text;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = C.muted;
      }}
    >
      {icon}
    </button>
  );
}

/* ─────────────────────────────────────────────── DiscordMsgList ── */
function DiscordMsgList({ msgs, myId, onReact, onReply, onDelete, bottomRef }: {
  msgs: RichMsg[]; myId: number;
  onReact: (msgId: number, emoji: string) => void;
  onReply: (msg: RichMsg) => void;
  onDelete: (msgId: number) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}) {
  let lastDate = "";

  return (
    <>
      {msgs.map((msg, i) => {
        const prev = i > 0 ? msgs[i - 1] : null;
        const isFirst = !prev ||
          prev.studentId !== msg.studentId ||
          new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_GAP;

        const d = dateLabel(msg.createdAt);
        const showDate = d !== lastDate;
        lastDate = d;

        return (
          <div key={msg.id}>
            {showDate && <Divider label={d} />}
            <div style={{ background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <DiscordMsg msg={msg} isFirst={isFirst} myId={myId} onReact={onReact} onReply={onReply} onDelete={onDelete} />
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="h-6" />
    </>
  );
}

/* ─── Simple messages list (general chat / DMs — no reactions) ── */
function SimpleMsg({ msg, isFirst, myId }: { msg: RichMsg; isFirst: boolean; myId: number }) {
  const isMe = msg.studentId === myId;
  return (
    <div className="flex gap-3 px-4" style={{ paddingTop: isFirst ? 20 : 2, paddingBottom: 2 }}>
      <div className="w-10 shrink-0 flex items-start justify-center pt-0.5">
        {isFirst ? <SmAvatar id={msg.studentId} name={msg.studentName} /> : null}
      </div>
      <div className="flex-1 min-w-0 pb-0.5">
        {isFirst && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm" style={{ color: isMe ? C.discord : C.text }}>{msg.studentName}</span>
            <span className="text-[11px]" style={{ color: C.muted }}>{longTime(msg.createdAt)}</span>
          </div>
        )}
        {msg.messageType === "image" ? (
          <img src={msg.content} alt="" className="mt-1.5 rounded-xl cursor-pointer" style={{ maxWidth: 360, maxHeight: 280 }} onClick={() => window.open(msg.content, "_blank")} />
        ) : msg.messageType === "file" ? (
          <FileCard content={msg.content} />
        ) : (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ color: C.text }} dir="auto">{msg.content}</p>
        )}
      </div>
    </div>
  );
}

function SimpleMsgList({ msgs, myId, bottomRef }: { msgs: RichMsg[]; myId: number; bottomRef: React.RefObject<HTMLDivElement | null> }) {
  let lastDate = "";
  return (
    <>
      {msgs.map((msg, i) => {
        const prev = i > 0 ? msgs[i - 1] : null;
        const isFirst = !prev || prev.studentId !== msg.studentId ||
          new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > GROUP_GAP;
        const d = dateLabel(msg.createdAt);
        const showDate = d !== lastDate; lastDate = d;
        return (
          <div key={msg.id}>
            {showDate && <Divider label={d} />}
            <div onMouseEnter={e => (e.currentTarget.style.background = C.hover)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <SimpleMsg msg={msg} isFirst={isFirst} myId={myId} />
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="h-6" />
    </>
  );
}

/* ─────────────────────────────────────────────── RichInput ── */
const _videoSenders = new Map<number, (blob: Blob, name: string) => Promise<void>>();
function _VidReg({ roomId, handler }: { roomId: number; handler: (b: Blob, n: string) => Promise<void> }) {
  useEffect(() => { _videoSenders.set(roomId, handler); return () => { _videoSenders.delete(roomId); }; }, [roomId, handler]);
  return null;
}

async function compressImg(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_W = 1440;
      let w = img.width, h = img.height;
      if (w > MAX_W) { h = Math.round((h / w) * MAX_W); w = MAX_W; }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      let q = 0.88;
      let d = c.toDataURL("image/jpeg", q);
      while (d.length > 600 * 1024 * 1.37 && q > 0.2) { q -= 0.08; d = c.toDataURL("image/jpeg", q); }
      res(d);
    };
    img.onerror = rej; img.src = url;
  });
}

async function toB64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function RichInput({ roomId, replyingTo, onClearReply }: {
  roomId: number;
  replyingTo: RichMsg | null;
  onClearReply: () => void;
}) {
  const qc = useQueryClient();
  const msgKey = ["room", roomId, "messages"];
  const send = useSendRoomMessage({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: msgKey }) } });

  const fileRef   = useRef<HTMLInputElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const [val,      setVal]      = useState("");
  const [uploading, setUploading] = useState(false);
  const [err,      setErr]      = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE) { setErr("الملف كبير جداً (الحد 8 ميجابايت)"); setTimeout(() => setErr(null), 3000); return; }
    setUploading(true);
    try {
      const dataUrl = file.type.startsWith("image/") ? await compressImg(file) : await toB64(file);
      const mt = file.type.startsWith("image/") ? "image" : "file";
      const content = mt === "image" ? dataUrl : JSON.stringify({ name: file.name, url: dataUrl });
      send.mutate({ id: roomId, data: { content, messageType: mt } as any });
    } catch { setErr("فشل في رفع الملف"); setTimeout(() => setErr(null), 3000); }
    finally { setUploading(false); }
  };

  const handleVideoBlob = async (blob: Blob, name: string) => {
    if (blob.size > MAX_FILE) { setErr("التسجيل كبير جداً"); setTimeout(() => setErr(null), 4000); return; }
    setUploading(true);
    try {
      const dataUrl = await toB64(new File([blob], name, { type: blob.type }));
      send.mutate({ id: roomId, data: { content: JSON.stringify({ name, url: dataUrl }), messageType: "file" } as any });
    } catch { } finally { setUploading(false); }
  };

  const sendMsg = () => {
    if (!val.trim() || send.isPending || uploading) return;
    const data: any = { content: val.trim() };
    if (replyingTo) {
      data.replyToId      = replyingTo.id;
      data.replyToContent = replyingTo.deletedAt ? "تم حذف هذه الرسالة" : replyingTo.content.slice(0, 200);
      data.replyToAuthor  = replyingTo.studentName;
    }
    send.mutate({ id: roomId, data });
    setVal("");
    onClearReply();
  };

  return (
    <div className="px-4 pb-4 pt-2 shrink-0">
      {/* Reply banner */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 mb-1.5 px-3 py-1.5 rounded-t-lg overflow-hidden"
            style={{ background: "rgba(88,101,242,0.1)", borderRight: `3px solid ${C.discord}` }}>
            <Reply className="h-3.5 w-3.5 shrink-0" style={{ color: C.discord }} />
            <span className="text-xs font-medium" style={{ color: C.discord }}>رداً على</span>
            <span className="text-xs font-semibold" style={{ color: C.text }}>{replyingTo.studentName}</span>
            <span className="text-xs flex-1 truncate" style={{ color: C.muted }}>
              {replyingTo.deletedAt ? "تم حذف هذه الرسالة" : replyingTo.content.slice(0, 80)}
            </span>
            <button onClick={onClearReply} style={{ color: C.muted }} className="hover:opacity-100 opacity-60 transition-opacity">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {err && <p className="text-xs mb-1.5 px-1" style={{ color: C.danger }}>{err}</p>}

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl relative" style={{ background: C.input }}>
        {/* File input */}
        <input ref={fileRef} type="file" className="hidden"
          accept="image/*,video/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
          onChange={handleFile} />

        {/* Attach button */}
        <button onClick={() => fileRef.current?.click()} disabled={uploading || send.isPending}
          className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
          style={{ color: C.muted }}
          onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </button>

        {/* Emoji button */}
        <div className="relative shrink-0">
          <button onClick={() => setShowEmoji(s => !s)}
            className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: showEmoji ? "#f0b232" : C.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f0b232")} onMouseLeave={e => { if (!showEmoji) (e.currentTarget.style.color = C.muted); }}>
            <Smile className="h-4 w-4" />
          </button>
          {showEmoji && <EmojiPicker onPick={e => { setVal(v => v + e); inputRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />}
        </div>

        {/* Text input */}
        <input
          ref={inputRef}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
          placeholder={replyingTo ? `رداً على ${replyingTo.studentName}...` : "اكتب رسالة..."}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: C.text, caretColor: C.text, direction: "rtl" }}
          dir="auto"
          disabled={send.isPending || uploading}
        />

        {/* Send button */}
        <button onClick={sendMsg} disabled={!val.trim() || send.isPending || uploading}
          className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
          style={{ color: val.trim() ? C.discord : C.muted }}
          onMouseEnter={e => { if (val.trim()) e.currentTarget.style.background = "rgba(88,101,242,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
          {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <_VidReg roomId={roomId} handler={handleVideoBlob} />
    </div>
  );
}

/* ─────────────────────────────────────────────── SimpleInput ── */
function SimpleInput({ onSend, loading, placeholder = "اكتب رسالة..." }: {
  onSend: (text: string) => void; loading: boolean; placeholder?: string;
}) {
  const [val, setVal] = useState("");
  const send = () => { if (!val.trim() || loading) return; onSend(val.trim()); setVal(""); };
  return (
    <div className="px-4 pb-4 pt-2 shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: C.input }}>
        <input
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={placeholder} className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: C.text, caretColor: C.text }} dir="auto" disabled={loading}
        />
        <button onClick={send} disabled={!val.trim() || loading}
          className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors shrink-0"
          style={{ color: val.trim() ? C.discord : C.muted }}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────── MemberList ── */
function MemberList({ roomId, myId }: { roomId: number; myId: number }) {
  const [members, setMembers] = useState<Member[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/rooms/${roomId}/members`, { credentials: "include" });
        if (r.ok) setMembers(await r.json());
      } catch { }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [roomId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: C.border }}>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
          الأعضاء — {members.length}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {members.length === 0 && (
          <p className="text-xs text-center py-6" style={{ color: C.muted }}>جاري التحميل...</p>
        )}
        {members.map(m => (
          <div key={m.studentId} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md"
            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div className="relative">
              <SmAvatar id={m.studentId} name={m.displayName} size={8} />
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#2b2d31]"
                style={{ background: C.online }} />
            </div>
            <span className="text-sm" style={{ color: C.text }}>{m.displayName}</span>
            {m.studentId === myId && (
              <span className="text-[10px] mr-auto" style={{ color: C.muted }}>أنت</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────── Content helpers ── */
function extractYoutubeId(url: string): string | null {
  const pats = [/[?&]v=([a-zA-Z0-9_-]{11})/,/youtu\.be\/([a-zA-Z0-9_-]{11})/,/embed\/([a-zA-Z0-9_-]{11})/,/shorts\/([a-zA-Z0-9_-]{11})/];
  for (const p of pats) { const m = url.match(p); if (m) return m[1]; }
  return null;
}
function extractIframeSrc(html: string) { const m = html.match(/src=["']([^"']+)["']/); return m?.[1] ?? html; }
function contentIcon(t: string) { return t === "youtube" ? "▶️" : t === "pdf" ? "📄" : t === "canva" ? "🎨" : t === "image" ? "🖼️" : t === "link" ? "🔗" : "📁"; }
const timeLabel = (iso: string) => format(new Date(iso), "HH:mm", { locale: ar });

function ContentViewer({ item, onBack }: { item: RoomContent; onBack: () => void }) {
  const youtubeId = item.contentType === "youtube" ? extractYoutubeId(item.content) : null;
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}><ArrowRight className="h-4 w-4" /></Button>
        <span className="text-sm font-semibold flex-1 truncate" style={{ color: C.text }}>{contentIcon(item.contentType)} {item.title ?? item.contentType}</span>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden min-h-0" style={{ background: "rgba(0,0,0,0.3)" }}>
        {item.contentType === "youtube" ? (
          youtubeId ? <iframe src={`https://www.youtube.com/embed/${youtubeId}?rel=0`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            : <div className="flex items-center justify-center h-full text-sm p-4" style={{ color: C.danger }}>رابط يوتيوب غير صحيح</div>
        ) : item.contentType === "pdf" ? <iframe src={item.content} className="w-full h-full" title="PDF" />
          : item.contentType === "canva" ? <iframe src={extractIframeSrc(item.content)} className="w-full h-full" allowFullScreen allow="fullscreen" />
            : item.contentType === "link" ? <iframe src={item.content} className="w-full h-full" allowFullScreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
              : <img src={item.content} alt={item.title ?? ""} className="w-full h-full object-contain" />}
      </div>
    </div>
  );
}

const CTABS: { key: ContentTabKind; label: string }[] = [
  { key: "youtube", label: "▶️ يوتيوب" }, { key: "pdf", label: "📄 PDF" },
  { key: "canva", label: "🎨 Canva" }, { key: "image", label: "🖼️ صورة" }, { key: "link", label: "🔗 رابط" },
];
const CPLACEHOLDER: Record<ContentTabKind, string> = {
  youtube: "https://www.youtube.com/watch?v=...", pdf: "رابط PDF أو Google Drive...",
  canva: "الصق كود <iframe> Canva...", image: "رابط الصورة...", link: "رابط الموقع...",
};

function ContentPanel({ roomId, studentId, forceSelectedId, onOpen }: {
  roomId: number; studentId: number; forceSelectedId?: number | null; onOpen?: (item: RoomContent) => void;
}) {
  const qc = useQueryClient();
  const ck = ["room", roomId, "content"];
  const { data: items = [] } = useListRoomContent(roomId, { query: { queryKey: ck, refetchInterval: 5000 } });
  const addContent    = useAddRoomContent({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ck }) } });
  const deleteContent = useDeleteRoomContent({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ck }) } });

  const [tab, setTab] = useState<ContentTabKind>("youtube");
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [selected, setSelected] = useState<RoomContent | null>(null);

  useEffect(() => {
    if (!forceSelectedId || !items.length) return;
    const found = items.find(i => i.id === forceSelectedId);
    if (found) setSelected(found);
  }, [forceSelectedId, items]);

  const handleSelect = (item: RoomContent) => { setSelected(item); onOpen?.(item); };
  const add = () => {
    if (!urlInput.trim()) return;
    addContent.mutate({ id: roomId, data: { contentType: tab, title: titleInput || undefined, content: urlInput.trim() } });
    setUrlInput(""); setTitleInput("");
  };

  if (selected) return <ContentViewer item={selected} onBack={() => setSelected(null)} />;

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="rounded-xl p-3 border space-y-2 shrink-0" style={{ background: "rgba(255,255,255,0.03)", borderColor: C.border }}>
        <div className="flex gap-1 text-xs overflow-x-auto pb-0.5">
          {CTABS.map(({ key, label }) => (
            <button key={key} onClick={() => { setTab(key); setUrlInput(""); }}
              className="px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors shrink-0"
              style={{ background: tab === key ? C.discord : "rgba(255,255,255,0.06)", color: tab === key ? "#fff" : C.muted }}>
              {label}
            </button>
          ))}
        </div>
        <input value={titleInput} onChange={e => setTitleInput(e.target.value)} placeholder="عنوان (اختياري)"
          className="w-full h-8 text-sm rounded-lg px-2 outline-none border" dir="rtl"
          style={{ background: C.input, borderColor: C.border, color: C.text }} />
        <textarea value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder={CPLACEHOLDER[tab]}
          className="w-full h-16 resize-none text-xs p-2 rounded-lg border outline-none"
          dir="ltr" style={{ background: C.input, borderColor: C.border, color: C.text }} />
        <button onClick={add} disabled={!urlInput.trim() || addContent.isPending}
          className="w-full h-8 text-xs rounded-lg font-semibold flex items-center justify-center gap-1 transition-colors"
          style={{ background: C.discord, color: "#fff", opacity: !urlInput.trim() ? 0.5 : 1 }}>
          <Plus className="h-3 w-3" /> إضافة
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {items.length === 0 && <div className="text-center text-xs py-8" style={{ color: C.muted }}>لا يوجد محتوى مشترك بعد</div>}
        {items.map(item => (
          <div key={item.id} onClick={() => handleSelect(item)}
            className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer border transition-colors group"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: C.border }}
            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}>
            <div className="text-xl shrink-0">{contentIcon(item.contentType)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: C.text }}>{item.title ?? item.contentType}</p>
              <p className="text-[10px]" style={{ color: C.muted }}>{timeLabel(item.createdAt)}</p>
            </div>
            {item.studentId === studentId && (
              <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={e => { e.stopPropagation(); deleteContent.mutate({ id: roomId, contentId: item.id }); }}
                style={{ color: C.danger }}>
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────── Active View Banner ── */
function ActiveViewBanner({ roomId, myId, onJoinView }: { roomId: number; myId: number; onJoinView: (id: number | null) => void }) {
  const { data: av } = useGetRoomActiveView(roomId, { query: { queryKey: ["room", roomId, "active-view"], refetchInterval: 3000 } });
  if (!av || av.openedById === myId) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 shrink-0 border-b text-xs"
      style={{ background: "rgba(0,168,252,0.1)", borderColor: "rgba(0,168,252,0.2)", color: C.text }}>
      <div className="h-2 w-2 rounded-full animate-pulse shrink-0" style={{ background: "#00a8fc" }} />
      <span className="flex-1"><strong>{av.openedByName}</strong> يعرض: <span style={{ color: C.muted }}>{av.contentTitle ?? av.contentType ?? "ملف"}</span></span>
      <button onClick={() => onJoinView(av.contentId ?? null)}
        className="px-2.5 py-1 rounded text-xs font-medium border transition-colors"
        style={{ background: "rgba(0,168,252,0.15)", borderColor: "rgba(0,168,252,0.3)", color: "#00a8fc" }}>
        <Eye className="h-3 w-3 inline ml-1" />انضم
      </button>
    </div>
  );
}

/* ─────────────────────────────────── Chat sections ── */
function GeneralChat({ myId, bottomRef }: { myId: number; bottomRef: React.RefObject<HTMLDivElement | null> }) {
  const { data: raw = [], isLoading } = useListChatMessages(undefined, { query: { queryKey: ["chat", "messages"], refetchInterval: POLL, staleTime: 0 } });
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [raw.length]);
  const msgs = (raw as any[]).map(m => toRich(m));
  if (isLoading) return <CenteredLoader />;
  if (!msgs.length) return <EmptyState label="لا توجد رسائل بعد. كن أول من يبدأ!" />;
  return <SimpleMsgList msgs={msgs} myId={myId} bottomRef={bottomRef} />;
}

function DMChat({ myId, otherId, otherName, bottomRef }: { myId: number; otherId: number; otherName: string; bottomRef: React.RefObject<HTMLDivElement | null> }) {
  const { data: raw = [], isLoading } = useListDirectMessages(otherId, { query: { queryKey: ["dm", otherId], refetchInterval: POLL, staleTime: 0 } });
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [raw.length]);
  const msgs = (raw as any[]).map(m => toRich({ ...m, studentId: m.fromStudentId, studentName: m.fromStudentName }));
  if (isLoading) return <CenteredLoader />;
  if (!msgs.length) return <EmptyState label={`ابدأ محادثة مع ${otherName}`} />;
  return <SimpleMsgList msgs={msgs} myId={myId} bottomRef={bottomRef} />;
}

function RoomChat({ myId, room, bottomRef, replyingTo, setReplyingTo }: {
  myId: number; room: StudyRoom;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  replyingTo: RichMsg | null;
  setReplyingTo: (m: RichMsg | null) => void;
}) {
  const { data: raw = [], isLoading } = useListRoomMessages(room.id, { query: { queryKey: ["room", room.id, "messages"], refetchInterval: POLL, staleTime: 0 } });
  const [patches, setPatches] = useState<Map<number, Partial<RichMsg>>>(new Map());

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [raw.length]);

  const msgs: RichMsg[] = useMemo(() =>
    (raw as any[]).map(m => ({ ...toRich(m), ...patches.get(m.id) }))
  , [raw, patches]);

  const handleReact = useCallback(async (msgId: number, emoji: string) => {
    const base = (raw as any[]).find(m => m.id === msgId);
    const cur: MsgReaction[] = base?.reactions ?? patches.get(msgId)?.reactions ?? [];
    const ex = cur.find(r => r.emoji === emoji);
    let opt: MsgReaction[];
    if (ex) {
      opt = ex.myReaction
        ? cur.map(r => r.emoji === emoji ? { ...r, count: Math.max(0, r.count - 1), myReaction: false } : r).filter(r => r.count > 0)
        : [...cur];
    } else {
      opt = [...cur, { emoji, count: 1, myReaction: true, users: [] }];
    }
    setPatches(p => new Map(p).set(msgId, { ...(p.get(msgId) ?? {}), reactions: opt }));
    try {
      const res = await fetch(`${BASE_URL}/api/rooms/${room.id}/messages/${msgId}/reactions/${encodeURIComponent(emoji)}`, { method: "POST", credentials: "include" });
      const updated: MsgReaction[] = await res.json();
      setPatches(p => new Map(p).set(msgId, { ...(p.get(msgId) ?? {}), reactions: updated }));
    } catch { }
  }, [room.id, raw, patches]);

  const handleDelete = useCallback(async (msgId: number) => {
    setPatches(p => new Map(p).set(msgId, { ...(p.get(msgId) ?? {}), deletedAt: new Date().toISOString() }));
    try { await fetch(`${BASE_URL}/api/rooms/${room.id}/messages/${msgId}`, { method: "DELETE", credentials: "include" }); } catch { }
  }, [room.id]);

  if (isLoading) return <CenteredLoader />;
  if (!msgs.length) return <EmptyState label={`مرحباً في ${room.name}! ابدأ المحادثة`} />;
  return <DiscordMsgList msgs={msgs} myId={myId} onReact={handleReact} onReply={setReplyingTo} onDelete={handleDelete} bottomRef={bottomRef} />;
}

/* ─────────────────────────────────── Sidebar ── */
const ROOM_MODES: { value: RoomMode; label: string; desc: string }[] = [
  { value: "open",       label: "🌐 مفتوح",       desc: "يدخل بدون كود" },
  { value: "restricted", label: "🔒 بكود دعوة",   desc: "يظهر للجميع، يحتاج كود" },
  { value: "private",    label: "🔐 خاص تماماً",  desc: "مخفي عن الجميع" },
];
function modeToParams(m: RoomMode) {
  if (m === "open")       return { type: "public",  visibility: "everyone" };
  if (m === "restricted") return { type: "private", visibility: "everyone" };
  return                         { type: "private", visibility: "members_only" };
}

function DiscordSidebar({ me, view, setView, setShowSidebar }: {
  me: { id: number; displayName: string };
  view: View;
  setView: (v: View) => void;
  setShowSidebar: (b: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: rooms = [], isLoading: roomsLoading } = useListRooms({ query: { queryKey: ["rooms"], refetchInterval: 8000 } });
  const { data: convs = [] } = useListDmConversations({ query: { queryKey: ["dm", "convs"], refetchInterval: 5000 } });
  const { data: allStudents = [] } = useListStudents({ query: { queryKey: ["students", "list"] } });

  const createRoom = useCreateRoom({ mutation: { onSuccess: r => { qc.invalidateQueries({ queryKey: ["rooms"] }); setView({ kind: "room", room: r }); setShowCreate(false); setCreateName(""); setShowSidebar(false); } } });
  const joinRoom   = useJoinRoom({ mutation: { onSuccess: r => { qc.invalidateQueries({ queryKey: ["rooms"] }); setView({ kind: "room", room: r }); setShowJoin(false); setJoinCode(""); setShowSidebar(false); } } });
  const delRoom    = useDeleteRoom({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }) } });
  const leaveRoom  = useLeaveRoom({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }) } });

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createMode, setCreateMode] = useState<RoomMode>("open");
  const [showJoin, setShowJoin]     = useState(false);
  const [joinCode, setJoinCode]     = useState("");
  const [showDMPicker, setShowDMPicker] = useState(false);
  const [dmSearch, setDmSearch]     = useState("");

  const nav = (v: View) => { setView(v); setShowSidebar(false); };

  const filteredStudents = (allStudents as any[]).filter(s => s.id !== me.id && (!dmSearch || s.displayName.toLowerCase().includes(dmSearch.toLowerCase())));

  return (
    <aside
      className="flex flex-col shrink-0 border-l overflow-hidden"
      style={{ background: C.sidebar, borderColor: C.border, width: 240 }}
    >
      {/* School header */}
      <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-lg shrink-0" style={{ background: C.discord }}>🎓</div>
          <span className="font-bold text-sm" style={{ color: C.text }}>لوحة الطلاب</span>
        </div>
        <button className="lg:hidden h-7 w-7 flex items-center justify-center rounded" style={{ color: C.muted }}
          onClick={() => setShowSidebar(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">

        {/* Channels */}
        <SecHeader label="قنوات" />
        <ChanRow
          icon={<Hash className="h-4 w-4" />}
          name="دردشة الفصل"
          active={view.kind === "general"}
          onClick={() => nav({ kind: "general" })}
        />

        {/* Direct Messages */}
        <SecHeader label="رسائل مباشرة" action={
          <button onClick={() => setShowDMPicker(s => !s)} className="rounded transition-colors p-0.5" style={{ color: C.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
            <Plus className="h-3.5 w-3.5" />
          </button>
        } />

        <AnimatePresence>
          {showDMPicker && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-1">
              <div className="px-1 mb-1.5">
                <div className="relative">
                  <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3" style={{ color: C.muted }} />
                  <input value={dmSearch} onChange={e => setDmSearch(e.target.value)} placeholder="ابحث عن طالب..."
                    className="w-full h-7 pr-7 pl-2 rounded-md text-xs outline-none border"
                    style={{ background: C.input, borderColor: C.border, color: C.text }} dir="rtl" />
                </div>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-0.5">
                {filteredStudents.map((s: any) => (
                  <button key={s.id} onClick={() => { nav({ kind: "dm", studentId: s.id, studentName: s.displayName }); setShowDMPicker(false); setDmSearch(""); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-right"
                    onMouseEnter={e => (e.currentTarget.style.background = C.hover)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <SmAvatar id={s.id} name={s.displayName} size={6} />
                    <span className="text-xs" style={{ color: C.text }}>{s.displayName}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(convs as any[]).map((c: any) => (
          <ChanRow key={c.studentId}
            icon={<SmAvatar id={c.studentId} name={c.studentName} size={6} />}
            name={c.studentName}
            active={view.kind === "dm" && view.studentId === c.studentId}
            onClick={() => nav({ kind: "dm", studentId: c.studentId, studentName: c.studentName })}
          />
        ))}

        {/* Study Rooms */}
        <SecHeader label="غرف الدراسة" action={
          <div className="flex items-center gap-1">
            <button onClick={() => { setShowCreate(s => !s); setShowJoin(false); }} title="إنشاء غرفة"
              className="rounded transition-colors p-0.5" style={{ color: C.muted }}
              onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setShowJoin(s => !s); setShowCreate(false); }} title="انضمام بكود"
              className="rounded transition-colors p-0.5" style={{ color: C.muted }}
              onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              <Globe className="h-3.5 w-3.5" />
            </button>
          </div>
        } />

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-2 space-y-1.5 px-1">
              <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="اسم الغرفة"
                className="w-full h-8 px-2 rounded-md text-xs outline-none border"
                style={{ background: C.input, borderColor: C.border, color: C.text }} dir="rtl" />
              <div className="space-y-1">
                {ROOM_MODES.map(m => (
                  <button key={m.value} onClick={() => setCreateMode(m.value)}
                    className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md text-right text-xs border transition-colors"
                    style={{ background: createMode === m.value ? "rgba(88,101,242,0.15)" : "rgba(255,255,255,0.03)", borderColor: createMode === m.value ? "rgba(88,101,242,0.4)" : C.border, color: createMode === m.value ? "#c9cdfb" : C.muted }}>
                    <span className="font-semibold shrink-0">{m.label}</span>
                    <span className="text-[10px] leading-tight pt-px">{m.desc}</span>
                  </button>
                ))}
              </div>
              <button disabled={!createName.trim() || createRoom.isPending}
                onClick={() => { const p = modeToParams(createMode); createRoom.mutate({ data: { name: createName.trim(), ...p } }); }}
                className="w-full h-7 text-xs rounded-md font-semibold transition-colors flex items-center justify-center gap-1"
                style={{ background: C.discord, color: "#fff", opacity: !createName.trim() ? 0.5 : 1 }}>
                {createRoom.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "إنشاء الغرفة"}
              </button>
            </motion.div>
          )}

          {showJoin && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-2 space-y-1.5 px-1">
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="رمز الدعوة" maxLength={6} dir="ltr"
                className="w-full h-8 px-2 rounded-md text-xs text-center tracking-widest font-mono outline-none border"
                style={{ background: C.input, borderColor: C.border, color: C.text }} />
              <button disabled={joinCode.length < 4 || joinRoom.isPending}
                onClick={() => joinRoom.mutate({ data: { inviteCode: joinCode } })}
                className="w-full h-7 text-xs rounded-md font-semibold flex items-center justify-center gap-1"
                style={{ background: C.discord, color: "#fff", opacity: joinCode.length < 4 ? 0.5 : 1 }}>
                {joinRoom.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "انضمام"}
              </button>
              {joinRoom.isError && <p className="text-[10px] text-center" style={{ color: C.danger }}>رمز غير صحيح</p>}
            </motion.div>
          )}
        </AnimatePresence>

        {roomsLoading && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" style={{ color: C.muted }} /></div>}
        {(rooms as any[]).map((room: StudyRoom) => {
          const isPrivate = room.visibility === "members_only";
          const isOpen = room.type === "public";
          const isActive = view.kind === "room" && view.room.id === room.id;
          return (
            <div key={room.id} className="group flex items-center gap-1.5 relative">
              <ChanRow
                icon={isPrivate ? "🔐" : isOpen ? "🌐" : "🔒"}
                name={room.name}
                active={isActive}
                muted={!room.isMember}
                onClick={() => room.isMember ? nav({ kind: "room", room }) : undefined}
              />
              {/* Actions on hover */}
              <div className="absolute left-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {!room.isMember && (
                  <button onClick={e => { e.stopPropagation(); joinRoom.mutate({ data: { inviteCode: room.inviteCode } }); }}
                    className="h-5 px-1.5 rounded text-[10px] font-medium" style={{ background: C.discord, color: "#fff" }}>
                    انضمام
                  </button>
                )}
                {room.isMember && room.createdBy === me.id && (
                  <button onClick={e => { e.stopPropagation(); delRoom.mutate({ id: room.id }); }}
                    className="h-5 w-5 flex items-center justify-center rounded" style={{ color: C.danger }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                {room.isMember && room.createdBy !== me.id && (
                  <button onClick={e => { e.stopPropagation(); leaveRoom.mutate({ id: room.id }); }}
                    className="h-5 w-5 flex items-center justify-center rounded" style={{ color: C.muted }}>
                    <LogOut className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!roomsLoading && (rooms as any[]).length === 0 && (
          <p className="text-[11px] text-center py-4 px-2" style={{ color: C.faint }}>لا توجد غرف بعد</p>
        )}
      </div>

      {/* Me footer */}
      <div className="px-3 py-2 border-t shrink-0 flex items-center gap-2" style={{ borderColor: C.border, background: "#16171a" }}>
        <SmAvatar id={me.id} name={me.displayName} size={8} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{me.displayName}</p>
          <p className="text-[10px]" style={{ color: C.online }}>● متصل</p>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────── Utilities ── */
function CenteredLoader() {
  return <div className="flex justify-center items-center flex-1 py-12"><Loader2 className="h-5 w-5 animate-spin" style={{ color: C.muted }} /></div>;
}
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3" style={{ color: C.muted }}>
      <MessageCircle className="h-14 w-14 opacity-15" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main ChatPage
   ═══════════════════════════════════════════════════════════════════════════ */
export default function ChatPage() {
  const { isSignedIn } = useAuth();
  const { profile: me } = useStudentProfile();
  const qc = useQueryClient();

  const [view,         setView]         = useState<View>({ kind: "general" });
  const [showSidebar,  setShowSidebar]  = useState(true);
  const [showPanel,    setShowPanel]    = useState(false);
  const [panelTab,     setPanelTab]     = useState<"members" | "tools">("members");
  const [toolTab,      setToolTab]      = useState<ToolTab>("whiteboard");
  const [replyingTo,   setReplyingTo]   = useState<RichMsg | null>(null);
  const [copiedCode,   setCopiedCode]   = useState(false);
  const [joinViewId,   setJoinViewId]   = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const setActiveView = useSetRoomActiveView();
  const clearActiveView = useClearRoomActiveView();

  function handleOpenContent(item: RoomContent) {
    if (view.kind !== "room") return;
    setActiveView.mutate({ id: view.room.id, data: { contentId: item.id, contentType: item.contentType, contentTitle: item.title ?? item.contentType } });
  }
  function handleJoinView(id: number | null) { setShowPanel(true); setPanelTab("tools"); setToolTab("content"); setJoinViewId(id); }

  if (!isSignedIn || !me) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Lock className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h2 className="font-bold text-lg">الدردشة للطلاب المسجلين فقط</h2>
        <p className="text-sm text-muted-foreground mb-2">سجّل دخولك للتحدث مع زملائك</p>
        <Link href="/sign-in">
          <Button className="gap-2 rounded-xl"><ArrowRight className="h-4 w-4" />تسجيل الدخول</Button>
        </Link>
      </div>
    );
  }

  const isRoom = view.kind === "room";
  const room   = isRoom ? (view as { kind: "room"; room: StudyRoom }).room : null;

  return (
    <div
      dir="rtl"
      className="flex overflow-hidden"
      style={{
        height: "calc(100dvh - 220px)", minHeight: 440,
        background: C.main, color: C.text,
        borderRadius: 16, border: `1px solid ${C.border}`,
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}
    >
      {/* ─── RIGHT: Sidebar ─── */}
      <AnimatePresence initial={false}>
        {showSidebar && (
          <motion.div key="sidebar" initial={{ width: 0 }} animate={{ width: 240 }} exit={{ width: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="overflow-hidden shrink-0 flex flex-col" style={{ minWidth: 0 }}>
            <DiscordSidebar me={me} view={view} setView={v => { setView(v); setReplyingTo(null); }} setShowSidebar={setShowSidebar} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── CENTER: Main chat ─── */}
      <main className={`flex flex-1 flex-col min-w-0 overflow-hidden ${showSidebar ? "hidden lg:flex" : "flex"}`}>

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0"
          style={{ background: C.main, borderColor: C.border }}>
          {/* Sidebar toggle */}
          <button onClick={() => setShowSidebar(s => !s)}
            className="h-8 w-8 flex items-center justify-center rounded-md transition-colors shrink-0"
            style={{ color: showSidebar ? C.muted : C.text }}
            onMouseEnter={e => (e.currentTarget.style.background = C.hover)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <Menu className="h-4 w-4" />
          </button>

          {/* View info */}
          {view.kind === "general" && (
            <>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(88,101,242,0.2)" }}>
                <Hash className="h-4 w-4" style={{ color: C.discord }} />
              </div>
              <div><p className="text-sm font-bold" style={{ color: C.text }}>دردشة الفصل</p><p className="text-xs" style={{ color: C.muted }}>عام للجميع</p></div>
            </>
          )}
          {view.kind === "dm" && (
            <>
              <SmAvatar id={view.studentId} name={view.studentName} size={8} />
              <div><p className="text-sm font-bold" style={{ color: C.text }}>{view.studentName}</p><p className="text-xs" style={{ color: C.muted }}>رسالة مباشرة</p></div>
            </>
          )}
          {view.kind === "room" && room && (
            <>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(88,101,242,0.2)" }}>
                <Users className="h-4 w-4" style={{ color: C.discord }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: C.text }}>{room.name}</p>
                <p className="text-xs" style={{ color: C.muted }}>{room.memberCount} أعضاء</p>
              </div>
              {/* Copy invite code */}
              <button onClick={() => { navigator.clipboard.writeText(room.inviteCode); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}
                className="h-8 w-8 flex items-center justify-center rounded-md transition-colors shrink-0"
                style={{ color: C.muted }}
                onMouseEnter={e => (e.currentTarget.style.background = C.hover)} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                {copiedCode ? <Check className="h-3.5 w-3.5" style={{ color: C.online }} /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </>
          )}

          {/* Panel toggles (rooms only) */}
          {isRoom && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => { setShowPanel(s => panelTab === "members" ? !s : true); setPanelTab("members"); }}
                className="h-8 px-2 flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors"
                style={{ background: showPanel && panelTab === "members" ? C.active : "transparent", color: showPanel && panelTab === "members" ? C.text : C.muted }}
                onMouseEnter={e => (e.currentTarget.style.background = C.hover)} onMouseLeave={e => { if (!(showPanel && panelTab === "members")) (e.currentTarget.style.background = "transparent"); }}>
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">أعضاء</span>
              </button>
              <button onClick={() => { setShowPanel(s => panelTab === "tools" ? !s : true); setPanelTab("tools"); }}
                className="h-8 px-2 flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors"
                style={{ background: showPanel && panelTab === "tools" ? C.active : "transparent", color: showPanel && panelTab === "tools" ? C.text : C.muted }}
                onMouseEnter={e => (e.currentTarget.style.background = C.hover)} onMouseLeave={e => { if (!(showPanel && panelTab === "tools")) (e.currentTarget.style.background = "transparent"); }}>
                <Wrench className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">أدوات</span>
              </button>
            </div>
          )}
        </div>

        {/* Active view banner (rooms) */}
        <AnimatePresence>
          {isRoom && room && <ActiveViewBanner roomId={room.id} myId={me.id} onJoinView={handleJoinView} />}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {view.kind === "general" && <GeneralChat myId={me.id} bottomRef={bottomRef} />}
          {view.kind === "dm"      && <DMChat myId={me.id} otherId={view.studentId} otherName={view.studentName} bottomRef={bottomRef} />}
          {view.kind === "room" && room && (
            <RoomChat myId={me.id} room={room} bottomRef={bottomRef} replyingTo={replyingTo} setReplyingTo={setReplyingTo} />
          )}
        </div>

        {/* Input */}
        {view.kind === "general" && <GeneralChatInput qc={qc} />}
        {view.kind === "dm" && <DMInputArea otherId={view.studentId} qc={qc} />}
        {view.kind === "room" && room && (
          <RichInput roomId={room.id} replyingTo={replyingTo} onClearReply={() => setReplyingTo(null)} />
        )}
      </main>

      {/* ─── LEFT: Panel (members / tools) ─── */}
      <AnimatePresence initial={false}>
        {showPanel && isRoom && room && (
          <motion.aside key="panel"
            initial={{ width: 0, opacity: 0 }} animate={{ width: 272, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="flex flex-col border-r overflow-hidden shrink-0" style={{ background: C.panel, borderColor: C.border, minWidth: 0 }}>

            {panelTab === "members" ? (
              <MemberList roomId={room.id} myId={me.id} />
            ) : (
              <>
                {/* Tool tabs */}
                <div className="flex border-b shrink-0 overflow-x-auto" style={{ borderColor: C.border }}>
                  {(["whiteboard", "content", "screenshare", "voice"] as const).map(t => (
                    <button key={t} onClick={() => setToolTab(t)}
                      className="flex-1 py-2.5 text-xs font-semibold whitespace-nowrap px-1 transition-colors border-b-2"
                      style={{ color: toolTab === t ? C.discord : C.muted, borderColor: toolTab === t ? C.discord : "transparent" }}>
                      {t === "whiteboard" ? "🎨 لوح" : t === "content" ? "📁 ملفات" : t === "screenshare" ? "🖥️ شاشة" : "🎤 صوت"}
                    </button>
                  ))}
                </div>

                <div className="flex-1 p-2 overflow-hidden flex flex-col min-h-0">
                  {toolTab === "whiteboard" && (
                    <Whiteboard roomId={room.id} myId={me.id} className="flex-1 min-h-0"
                      onShareSnapshot={dataUrl => {
                        fetch(`${BASE_URL}/api/rooms/${room.id}/messages`, {
                          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ content: dataUrl, messageType: "image" }),
                        }).then(() => qc.invalidateQueries({ queryKey: ["room", room.id, "messages"] }));
                      }}
                    />
                  )}
                  {toolTab === "content" && (
                    <ContentPanel roomId={room.id} studentId={me.id} forceSelectedId={joinViewId} onOpen={handleOpenContent} />
                  )}
                  {toolTab === "screenshare" && (
                    <ScreenShare roomId={room.id} myId={me.id} myName={me.displayName}
                      onSendVideo={async (blob, name) => { const sender = _videoSenders.get(room.id); if (sender) await sender(blob, name); }}
                    />
                  )}
                  {toolTab === "voice" && <VoiceChat roomId={room.id} myId={me.id} myName={me.displayName} />}
                </div>
              </>
            )}

            {/* Close button */}
            <button onClick={() => setShowPanel(false)}
              className="absolute top-2 left-2 h-6 w-6 flex items-center justify-center rounded" style={{ color: C.muted, position: "absolute" }}
              onMouseEnter={e => (e.currentTarget.style.color = C.text)} onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Standalone input components (hooks must live in components, not inline JSX) ── */
function GeneralChatInput({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const send = useSendChatMessage({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: ["chat", "messages"] }) } });
  return <SimpleInput onSend={t => send.mutate({ data: { content: t } })} loading={send.isPending} />;
}

function DMInputArea({ otherId, qc }: { otherId: number; qc: ReturnType<typeof useQueryClient> }) {
  const send = useSendDirectMessage({
    mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["dm", otherId] }); qc.invalidateQueries({ queryKey: ["dm", "convs"] }); } },
  });
  return <SimpleInput onSend={t => send.mutate({ studentId: otherId, data: { content: t } })} loading={send.isPending} />;
}
