import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const POLL_MS = 900;

const RTC_CFG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/* ── Signal helpers ── */
async function postSig(roomId: number, toId: number | null, type: string, payload: object) {
  await fetch(`${BASE}/api/rooms/${roomId}/signals`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toStudentId: toId, signalType: type, payload: JSON.stringify(payload) }),
  });
}

async function fetchSigs(roomId: number): Promise<Array<{
  fromStudentId: number; fromStudentName: string; toStudentId: number | null;
  signalType: string; payload: string;
}>> {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/signals`, { credentials: "include" });
  if (!r.ok) return [];
  return r.json();
}

interface Props {
  roomId: number;
  myId: number;
  myName: string;
}

export function VoiceChat({ roomId, myId, myName }: Props) {
  const [inCall, setInCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peers, setPeers] = useState<Map<number, { name: string; connected: boolean }>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const audioEls = useRef<Map<number, HTMLAudioElement>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const removePeer = useCallback((peerId: number) => {
    pcsRef.current.get(peerId)?.close();
    pcsRef.current.delete(peerId);
    const a = audioEls.current.get(peerId);
    if (a) { a.srcObject = null; a.remove(); }
    audioEls.current.delete(peerId);
    if (mountedRef.current) {
      setPeers(prev => { const m = new Map(prev); m.delete(peerId); return m; });
    }
  }, []);

  const getOrCreatePC = useCallback((peerId: number, peerName: string) => {
    if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId)!;
    const pc = new RTCPeerConnection(RTC_CFG);
    pcsRef.current.set(peerId, pc);

    localStreamRef.current?.getTracks().forEach(t =>
      pc.addTrack(t, localStreamRef.current!)
    );

    pc.onicecandidate = e => {
      if (e.candidate) {
        postSig(roomId, peerId, "voice-ice", { candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = e => {
      let a = audioEls.current.get(peerId);
      if (!a) {
        a = new Audio();
        a.autoplay = true;
        audioEls.current.set(peerId, a);
      }
      a.srcObject = e.streams[0];
      if (mountedRef.current) {
        setPeers(prev => new Map(prev).set(peerId, { name: peerName, connected: true }));
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        removePeer(peerId);
      }
    };

    if (mountedRef.current) {
      setPeers(prev => new Map(prev).set(peerId, { name: peerName, connected: false }));
    }
    return pc;
  }, [roomId, removePeer]);

  const handleSignals = useCallback(async () => {
    if (!localStreamRef.current) return;
    let sigs: Awaited<ReturnType<typeof fetchSigs>>;
    try { sigs = await fetchSigs(roomId); } catch { return; }

    for (const s of sigs) {
      const pid = s.fromStudentId;
      const pname = s.fromStudentName;

      try {
        if (s.signalType === "voice-hello") {
          /* New peer joined — I make the offer */
          const pc = getOrCreatePC(pid, pname);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSig(roomId, pid, "voice-offer", { sdp: offer });
        }

        if (s.signalType === "voice-offer") {
          const { sdp } = JSON.parse(s.payload) as { sdp: RTCSessionDescriptionInit };
          const pc = getOrCreatePC(pid, pname);
          if (pc.signalingState === "stable") {
            await pc.setRemoteDescription(sdp);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            await postSig(roomId, pid, "voice-answer", { sdp: ans });
          }
        }

        if (s.signalType === "voice-answer") {
          const { sdp } = JSON.parse(s.payload) as { sdp: RTCSessionDescriptionInit };
          const pc = pcsRef.current.get(pid);
          if (pc && pc.signalingState !== "stable") {
            await pc.setRemoteDescription(sdp);
          }
        }

        if (s.signalType === "voice-ice") {
          const { candidate } = JSON.parse(s.payload) as { candidate: RTCIceCandidateInit };
          const pc = pcsRef.current.get(pid);
          if (pc?.remoteDescription) await pc.addIceCandidate(candidate);
        }

        if (s.signalType === "voice-bye") {
          removePeer(pid);
        }
      } catch { /* skip malformed signal */ }
    }
  }, [roomId, getOrCreatePC, removePeer]);

  const joinCall = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setInCall(true);
      await postSig(roomId, null, "voice-hello", { fromName: myName });
      pollRef.current = setInterval(handleSignals, POLL_MS);
    } catch (e: unknown) {
      const err = e as { name?: string };
      if (err?.name === "NotAllowedError") {
        setError("لم يتم السماح بالميكروفون — تحقق من إعدادات المتصفح");
      } else {
        setError("تعذّر تشغيل الميكروفون");
      }
    }
  };

  const leaveCall = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    await postSig(roomId, null, "voice-bye", {}).catch(() => {});
    pcsRef.current.forEach(pc => pc.close());
    pcsRef.current.clear();
    audioEls.current.forEach(a => { a.srcObject = null; });
    audioEls.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setPeers(new Map());
    setInCall(false);
    setMicMuted(false);
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicMuted(!track.enabled);
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pcsRef.current.forEach(pc => pc.close());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      audioEls.current.forEach(a => { a.srcObject = null; });
    };
  }, []);

  const peerList = [...peers.entries()];

  return (
    <div className="flex flex-col gap-3 h-full" dir="rtl">
      {/* Header */}
      <div className="bg-muted/30 rounded-xl p-3 border border-border/40 space-y-1">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">الدردشة الصوتية</span>
        </div>
        <p className="text-xs text-muted-foreground">
          صوت حي عبر WebRTC — يعمل في نفس الشبكة وعبر الإنترنت
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
          {error}
        </div>
      )}

      {/* Controls */}
      {!inCall ? (
        <Button className="w-full gap-2" onClick={joinCall}>
          <Phone className="h-4 w-4" />
          الانضمام للمحادثة الصوتية
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="flex-1">أنت في المحادثة الصوتية</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={micMuted ? "destructive" : "outline"}
              className="flex-1 gap-1.5 text-xs h-9"
              onClick={toggleMic}
            >
              {micMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {micMuted ? "مكتوم" : "مفعّل"}
            </Button>
            <Button variant="destructive" className="gap-1.5 h-9 px-3" onClick={leaveCall}>
              <PhoneOff className="h-3.5 w-3.5" />
              خروج
            </Button>
          </div>
        </div>
      )}

      {/* Participant list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {inCall && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              {micMuted ? <MicOff className="h-3.5 w-3.5 text-primary" /> : <Mic className="h-3.5 w-3.5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{myName}</p>
              <p className="text-[10px] text-muted-foreground">{micMuted ? "🔇 مكتوم" : "🎤 يتحدث"}</p>
            </div>
            <span className="text-[9px] text-primary font-medium">أنت</span>
          </div>
        )}

        {peerList.map(([id, peer]) => (
          <div key={id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/30 border border-border/30">
            <div className="h-8 w-8 rounded-full bg-muted/70 flex items-center justify-center shrink-0">
              <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{peer.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {peer.connected ? "🔊 متصل" : "⏳ جاري الاتصال..."}
              </p>
            </div>
          </div>
        ))}

        {inCall && peerList.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
            <Users className="h-8 w-8 opacity-20" />
            <p className="text-xs">لا يوجد أحد في المحادثة بعد</p>
            <p className="text-[10px] opacity-60">سيظهر الآخرون عند انضمامهم</p>
          </div>
        )}
      </div>
    </div>
  );
}
