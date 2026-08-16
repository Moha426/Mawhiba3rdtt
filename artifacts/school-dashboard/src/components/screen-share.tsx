import { useState, useRef, useEffect, useCallback } from "react";
import {
  Monitor, MonitorOff, Eye, EyeOff, Loader2, Radio,
  AlertCircle, Wifi, Camera, CameraOff, Video, Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetRoomScreenShare,
  useStartRoomScreenShare,
  useStopRoomScreenShare,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const SIGNAL_POLL = 900;

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

function isScreenCaptureSupported(): boolean {
  return !!(navigator.mediaDevices && "getDisplayMedia" in navigator.mediaDevices);
}

function isCameraSupported(): boolean {
  return !!(navigator.mediaDevices && "getUserMedia" in navigator.mediaDevices);
}

function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== "undefined";
}

/* ── Capture one JPEG frame ── */
function captureFrame(video: HTMLVideoElement, quality = 0.35): string | null {
  if (!video.videoWidth) return null;
  const w = Math.min(video.videoWidth, 1280);
  const h = Math.round((video.videoHeight / video.videoWidth) * w);
  const cvs = document.createElement("canvas");
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return cvs.toDataURL("image/jpeg", quality);
}

interface Props {
  roomId: number;
  myId: number;
  myName: string;
  onSendVideo?: (blob: Blob, name: string) => void;
}

export function ScreenShare({ roomId, myId, onSendVideo }: Props) {
  const qc = useQueryClient();
  const shareKey = ["room", roomId, "screen-share"];

  const { data: shareState } = useGetRoomScreenShare(roomId, {
    query: { queryKey: shareKey, refetchInterval: 2500 },
  });
  const startShareMut = useStartRoomScreenShare({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: shareKey }) },
  });
  const stopShareMut = useStopRoomScreenShare({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: shareKey }) },
  });

  const [isSharing, setIsSharing] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareMode, setShareMode] = useState<"screen" | "camera" | null>(null);

  /* WebRTC */
  const [viewerConnected, setViewerConnected] = useState(false);

  /* JPEG fallback */
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [lastFrameAt, setLastFrameAt] = useState<string | null>(null);

  /* Recording */
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef  = useRef<Blob[]>([]);
  const recordTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Refs */
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef  = useRef<HTMLVideoElement | null>(null);
  const sharerPCsRef   = useRef<Map<number, RTCPeerConnection>>(new Map());
  const viewerPCRef    = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const jpegShareRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const jpegWatchRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const screenSupported = isScreenCaptureSupported();
  const cameraSupported = isCameraSupported();
  const recordSupported = isRecordingSupported();

  /* ── Sharer: handle incoming signals ── */
  const handleSharerSignals = useCallback(async () => {
    let sigs: Awaited<ReturnType<typeof fetchSigs>>;
    try { sigs = await fetchSigs(roomId); } catch { return; }

    for (const s of sigs) {
      const viewerId = s.fromStudentId;
      try {
        if (s.signalType === "watch-request") {
          if (sharerPCsRef.current.has(viewerId)) continue;
          const pc = new RTCPeerConnection(RTC_CFG);
          sharerPCsRef.current.set(viewerId, pc);
          localStreamRef.current?.getTracks().forEach(t =>
            pc.addTrack(t, localStreamRef.current!)
          );
          pc.onicecandidate = e => {
            if (e.candidate) postSig(roomId, viewerId, "share-ice-sv", { candidate: e.candidate.toJSON() });
          };
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
              pc.close(); sharerPCsRef.current.delete(viewerId);
            }
          };
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await postSig(roomId, viewerId, "share-offer", { sdp: offer });
        }
        if (s.signalType === "share-answer") {
          const { sdp } = JSON.parse(s.payload) as { sdp: RTCSessionDescriptionInit };
          const pc = sharerPCsRef.current.get(viewerId);
          if (pc && pc.signalingState !== "stable") await pc.setRemoteDescription(sdp);
        }
        if (s.signalType === "share-ice-vs") {
          const { candidate } = JSON.parse(s.payload) as { candidate: RTCIceCandidateInit };
          const pc = sharerPCsRef.current.get(viewerId);
          if (pc?.remoteDescription) await pc.addIceCandidate(candidate);
        }
      } catch { /* skip */ }
    }
  }, [roomId]);

  /* ── Viewer: handle incoming signals ── */
  const handleViewerSignals = useCallback(async () => {
    let sigs: Awaited<ReturnType<typeof fetchSigs>>;
    try { sigs = await fetchSigs(roomId); } catch { return; }

    for (const s of sigs) {
      try {
        if (s.signalType === "share-offer") {
          const { sdp } = JSON.parse(s.payload) as { sdp: RTCSessionDescriptionInit };
          if (!viewerPCRef.current) {
            const pc = new RTCPeerConnection(RTC_CFG);
            viewerPCRef.current = pc;
            pc.onicecandidate = e => {
              if (e.candidate) postSig(roomId, s.fromStudentId, "share-ice-vs", { candidate: e.candidate.toJSON() });
            };
            pc.ontrack = e => {
              setViewerConnected(true);
              if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
            };
            pc.onconnectionstatechange = () => {
              if (pc.connectionState === "failed") setViewerConnected(false);
            };
          }
          const pc = viewerPCRef.current!;
          if (pc.signalingState === "stable") {
            await pc.setRemoteDescription(sdp);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            await postSig(roomId, s.fromStudentId, "share-answer", { sdp: ans });
          }
        }
        if (s.signalType === "share-ice-sv") {
          const { candidate } = JSON.parse(s.payload) as { candidate: RTCIceCandidateInit };
          const pc = viewerPCRef.current;
          if (pc?.remoteDescription) await pc.addIceCandidate(candidate);
        }
      } catch { /* skip */ }
    }
  }, [roomId]);

  /* ── Start sharing (screen or camera) ── */
  async function startSharing(mode: "screen" | "camera") {
    setError(null);
    try {
      let stream: MediaStream;
      if (mode === "screen") {
        stream = await (navigator.mediaDevices as MediaDevices & {
          getDisplayMedia: (opts: object) => Promise<MediaStream>;
        }).getDisplayMedia({
          video: { frameRate: { ideal: 15, max: 30 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      }

      localStreamRef.current = stream;

      const video = document.createElement("video");
      video.srcObject = stream; video.muted = true;
      video.play().catch(() => {});
      localVideoRef.current = video;

      stream.getVideoTracks()[0].onended = () => stopSharing();

      setIsSharing(true);
      setShareMode(mode);
      startShareMut.mutate({ id: roomId });

      pollRef.current = setInterval(handleSharerSignals, SIGNAL_POLL);

      jpegShareRef.current = setInterval(async () => {
        const frame = captureFrame(video);
        if (!frame) return;
        fetch(`${BASE}/api/rooms/${roomId}/screen-share/frame`, {
          method: "PUT", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frameData: frame }),
        }).catch(() => {});
      }, 2000);
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name === "NotAllowedError") return;
      setError(err?.message ?? "فشل في بدء البث");
    }
  }

  /* ── Stop sharing ── */
  function stopSharing() {
    stopRecording();
    if (pollRef.current) clearInterval(pollRef.current);
    if (jpegShareRef.current) clearInterval(jpegShareRef.current);
    sharerPCsRef.current.forEach(pc => pc.close());
    sharerPCsRef.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setIsSharing(false);
    setShareMode(null);
    stopShareMut.mutate({ id: roomId });
  }

  /* ── Start watching ── */
  async function startWatching() {
    setError(null);
    setIsWatching(true);
    setViewerConnected(false);
    setLiveFrame(null);

    const sharerId = shareState?.presenterStudentId ?? null;
    await postSig(roomId, sharerId, "watch-request", {}).catch(() => {});
    pollRef.current = setInterval(handleViewerSignals, SIGNAL_POLL);

    jpegWatchRef.current = setInterval(async () => {
      if (viewerPCRef.current?.connectionState === "connected") {
        if (jpegWatchRef.current) clearInterval(jpegWatchRef.current);
        return;
      }
      try {
        const r = await fetch(`${BASE}/api/rooms/${roomId}/screen-share/frame`, { credentials: "include" });
        if (!r.ok) return;
        const data = await r.json() as { frameData: string; frameUpdatedAt: string } | null;
        if (data?.frameData) { setLiveFrame(data.frameData); setLastFrameAt(data.frameUpdatedAt); }
      } catch { /* ignore */ }
    }, 2000);
  }

  /* ── Stop watching ── */
  function stopWatching() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (jpegWatchRef.current) clearInterval(jpegWatchRef.current);
    viewerPCRef.current?.close();
    viewerPCRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setIsWatching(false);
    setViewerConnected(false);
    setLiveFrame(null);
    setLastFrameAt(null);
  }

  /* ── Video recording ── */
  function startRecording() {
    const stream = localStreamRef.current;
    if (!stream || !recordSupported) return;
    recordChunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    mr.ondataavailable = e => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(recordChunksRef.current, { type: "video/webm" });
      if (blob.size > 0 && onSendVideo) onSendVideo(blob, `تسجيل-${Date.now()}.webm`);
    };
    mr.start(500);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setRecordSecs(0);
    recordTimerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000);
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    mediaRecorderRef.current = null;
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordSecs(0);
  }

  /* Stop watching when sharer stops */
  useEffect(() => {
    if (isWatching && !shareState) stopWatching();
  }, [shareState]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (pollRef.current) clearInterval(pollRef.current);
      if (jpegShareRef.current) clearInterval(jpegShareRef.current);
      if (jpegWatchRef.current) clearInterval(jpegWatchRef.current);
      sharerPCsRef.current.forEach(pc => pc.close());
      viewerPCRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const amSharer = shareState?.presenterStudentId === myId;
  const someoneElseSharing = !!shareState?.isActive && !amSharer;
  const idle = !shareState?.isActive && !isSharing;

  function staleness() {
    if (!lastFrameAt) return null;
    const s = Math.round((Date.now() - new Date(lastFrameAt).getTime()) / 1000);
    return s < 5 ? "الآن" : `${s}ث`;
  }

  function fmtSecs(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col gap-3 h-full" dir="rtl">
      {/* Info */}
      <div className="bg-muted/30 rounded-xl p-3 border border-border/40 space-y-1">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">البث المباشر</span>
        </div>
        <p className="text-xs text-muted-foreground">
          WebRTC حقيقي · يدعم الشاشة والكاميرا · تسجيل فيديو
        </p>
      </div>

      {/* Sharer controls */}
      {!someoneElseSharing && !isSharing && (
        <div className="grid grid-cols-2 gap-2">
          {screenSupported && (
            <Button className="gap-2 col-span-2 sm:col-span-1" onClick={() => startSharing("screen")}>
              <Monitor className="h-4 w-4" />
              مشاركة الشاشة
            </Button>
          )}
          {cameraSupported && (
            <Button variant={screenSupported ? "outline" : "default"} className="gap-2 col-span-2 sm:col-span-1" onClick={() => startSharing("camera")}>
              <Camera className="h-4 w-4" />
              {screenSupported ? "مشاركة الكاميرا" : "بث بالكاميرا"}
            </Button>
          )}
          {!screenSupported && !cameraSupported && (
            <div className="col-span-2 flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>البث غير مدعوم في هذا المتصفح</span>
            </div>
          )}
        </div>
      )}

      {isSharing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2.5">
            <Radio className="h-3.5 w-3.5 animate-pulse shrink-0" />
            <span className="flex-1">
              أنت تبث {shareMode === "camera" ? "كاميرتك" : "شاشتك"} الآن
            </span>
            <span className="text-[10px] opacity-60 flex items-center gap-1">
              <Wifi className="h-3 w-3" /> WebRTC
            </span>
          </div>

          {/* Recording controls */}
          {recordSupported && (
            <div className="flex items-center gap-2">
              {isRecording ? (
                <>
                  <div className="flex-1 flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span>جاري التسجيل {fmtSecs(recordSecs)}</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={stopRecording}>
                    <Square className="h-3 w-3" />
                    إيقاف
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="w-full h-8 gap-1.5 text-xs" onClick={startRecording}>
                  <Video className="h-3.5 w-3.5 text-red-500" />
                  تسجيل فيديو
                </Button>
              )}
            </div>
          )}

          <Button variant="destructive" className="w-full gap-2" onClick={stopSharing}>
            {shareMode === "camera" ? <CameraOff className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
            إيقاف البث
          </Button>
        </div>
      )}

      {/* Viewer controls */}
      {someoneElseSharing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5">
            <Radio className="h-3.5 w-3.5 text-blue-500 animate-pulse shrink-0" />
            <strong className="flex-1">{shareState!.presenterName ?? "شخص ما"}</strong>
            <span className="text-muted-foreground">يبث الآن</span>
          </div>

          {isWatching ? (
            <Button variant="outline" className="w-full gap-2" onClick={stopWatching}>
              <EyeOff className="h-4 w-4" />
              إيقاف المشاهدة
            </Button>
          ) : (
            <Button className="w-full gap-2" onClick={startWatching}>
              <Eye className="h-4 w-4" />
              مشاهدة البث
            </Button>
          )}
        </div>
      )}

      {/* WebRTC video viewer */}
      {isWatching && (
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-border/40 bg-black relative">
          <video
            ref={remoteVideoRef}
            autoPlay playsInline muted={false}
            className={`w-full h-full object-contain ${viewerConnected ? "block" : "hidden"}`}
          />

          {!viewerConnected && liveFrame && (
            <>
              <img src={liveFrame} alt="بث مباشر" className="w-full h-full object-contain" />
              <div className="absolute top-2 right-2 text-[10px] text-white/80 bg-black/50 rounded px-2 py-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                جاري الاتصال...
              </div>
            </>
          )}

          {viewerConnected && (
            <div className="absolute top-2 right-2 text-[10px] text-emerald-300 bg-black/50 rounded px-2 py-1 flex items-center gap-1">
              <Wifi className="h-3 w-3" /> WebRTC مباشر
            </div>
          )}

          {!viewerConnected && !liveFrame && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-60" />
                <p className="text-sm font-medium">جاري الاتصال...</p>
              </div>
            </div>
          )}

          {!viewerConnected && liveFrame && lastFrameAt && (
            <div className="absolute bottom-2 right-2 text-[10px] text-white/60 bg-black/40 rounded px-1.5 py-0.5">
              آخر تحديث: {staleness()}
            </div>
          )}
        </div>
      )}

      {idle && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground py-6">
          <Monitor className="h-12 w-12 opacity-15" />
          <p className="text-sm font-medium">لا يوجد بث نشط</p>
          <p className="text-xs opacity-60 text-center">ابدأ بمشاركة شاشتك أو كاميرتك</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
