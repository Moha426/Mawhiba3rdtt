import { useRef, useState, useEffect, useCallback } from "react";
import {
  Eraser, Trash2, Download, Minus, Plus, Undo2,
  Hand, Pencil, Share2, ZoomIn, ZoomOut, Maximize2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ── Palette ── */
const PALETTE = [
  { display: "hsl(var(--primary))", isVar: true  },
  { display: "#2563eb",             isVar: false },
  { display: "#059669",             isVar: false },
  { display: "#dc2626",             isVar: false },
  { display: "#d97706",             isVar: false },
  { display: "#db2777",             isVar: false },
  { display: "#000000",             isVar: false },
  { display: "#ffffff",             isVar: false },
];

function resolveColor(display: string, isVar: boolean): string {
  if (!isVar) return display;
  try {
    const hsl = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    return hsl ? `hsl(${hsl})` : "#7c3aed";
  } catch { return "#7c3aed"; }
}

/* ── SVG path math ── */
interface Point { x: number; y: number }

function toSvgPath(pts: Point[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1)
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} l 0.01 0`;
  if (pts.length === 2)
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1);
    const my = ((pts[i].y + pts[i + 1].y) / 2).toFixed(1);
    d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx} ${my}`;
  }
  const l = pts[pts.length - 1];
  d += ` L ${l.x.toFixed(1)} ${l.y.toFixed(1)}`;
  return d;
}

/* ── Stroke model ── */
interface Stroke {
  id: string;         // local client-side ID used for undo
  dbId?: number;      // server-assigned ID (used for undo via delete)
  points: Point[];
  color: string;
  width: number;
  authorId?: number;
}

/* Compact payload stored in strokeData JSON */
interface StrokePayload {
  lid: string;       // local ID
  pts: number[][];
  c: string;
  w: number;
  aid?: number;
}

function encodeStroke(s: Stroke): string {
  return JSON.stringify({
    lid: s.id,
    pts: s.points.map(p => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]),
    c: s.color,
    w: s.width,
    aid: s.authorId,
  } satisfies StrokePayload);
}

function decodeStroke(dbId: number, data: string): Stroke {
  const p = JSON.parse(data) as StrokePayload;
  return {
    id: p.lid,
    dbId,
    points: p.pts.map(([x, y]) => ({ x, y })),
    color: p.c,
    width: p.w,
    authorId: p.aid,
  };
}

/* ── API helpers ── */
const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const SYNC_POLL = 1000;

async function fetchStrokes(roomId: number, afterId: number): Promise<Array<{ id: number; studentId: number; strokeData: string }>> {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/whiteboard/strokes?after=${afterId}`, { credentials: "include" });
  if (!r.ok) return [];
  return r.json();
}

async function postStroke(roomId: number, strokeData: string): Promise<number | null> {
  const r = await fetch(`${BASE}/api/rooms/${roomId}/whiteboard/strokes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strokeData }),
  });
  if (!r.ok) return null;
  const row = await r.json() as { id: number };
  return row.id;
}

async function deleteStroke(roomId: number, dbId: number) {
  fetch(`${BASE}/api/rooms/${roomId}/whiteboard/strokes/${dbId}`, {
    method: "DELETE", credentials: "include",
  }).catch(() => {});
}

async function clearStrokes(roomId: number) {
  fetch(`${BASE}/api/rooms/${roomId}/whiteboard/strokes`, {
    method: "DELETE", credentials: "include",
  }).catch(() => {});
}

/* ── UID ── */
let uidCounter = 0;

type Tool = "pen" | "eraser" | "pan";

/* ── Props ── */
interface WhiteboardProps {
  roomId?: number;
  myId?: number;
  onShareSnapshot?: (dataUrl: string) => void;
  className?: string;
}

/* ── Component ── */
export function Whiteboard({ roomId, myId, onShareSnapshot, className }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const drawGroupRef = useRef<SVGGElement>(null);

  /* ── UI state ── */
  const [colorIdx, setColorIdx] = useState(0);
  const [size,     setSize]     = useState(3);
  const [tool,     setTool]     = useState<Tool>("pen");
  const [strokes,  setStrokes]  = useState<Stroke[]>([]);

  /* ── View transform ── */
  const [tx,    setTx]    = useState(0);
  const [ty,    setTy]    = useState(0);
  const [scale, setScale] = useState(1);

  /* ── Collaborator count ── */
  const [remoteCount, setRemoteCount] = useState(0);

  /* ── Stable refs ── */
  const toolRef     = useRef<Tool>("pen");
  const colorRef    = useRef(colorIdx);
  const sizeRef     = useRef(size);
  const txRef       = useRef(0);
  const tyRef       = useRef(0);
  const scaleRef    = useRef(1);
  const spaceRef    = useRef(false);
  const strokesRef  = useRef<Stroke[]>([]);
  /* highest DB id we've received so far */
  const lastDbIdRef = useRef(0);
  /* set of local IDs already in strokes state (avoid re-adding own strokes) */
  const knownLids   = useRef(new Set<string>());

  useEffect(() => { toolRef.current  = tool;     }, [tool]);
  useEffect(() => { colorRef.current = colorIdx; }, [colorIdx]);
  useEffect(() => { sizeRef.current  = size;     }, [size]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  /* ── Coordinate conversion ── */
  function screenToCanvas(sx: number, sy: number): Point {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (sx - rect.left - txRef.current) / scaleRef.current,
      y: (sy - rect.top  - tyRef.current) / scaleRef.current,
    };
  }

  function applyTransform(ntx: number, nty: number, ns: number) {
    txRef.current = ntx; tyRef.current = nty; scaleRef.current = ns;
    setTx(ntx); setTy(nty); setScale(ns);
  }

  /* ── Main pointer/touch event handler ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let drawing  = false;
    let panning  = false;
    let pts: Point[] = [];
    let strokeColor = "#000";
    let strokeWidth = 3;
    let liveEl: SVGPathElement | null = null;
    let panStartX = 0, panStartY = 0, panTx0 = 0, panTy0 = 0;
    let pinching = false;
    let pinchDist0 = 0, pinchTx0 = 0, pinchTy0 = 0, pinchScale0 = 1;
    let pinchMidX = 0, pinchMidY = 0;

    function getXY(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    }

    function touchDist(e: TouchEvent) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      return Math.hypot(dx, dy);
    }
    function touchMid(e: TouchEvent) {
      return {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }

    function startPan(x: number, y: number) {
      panning = true;
      panStartX = x; panStartY = y;
      panTx0 = txRef.current; panTy0 = tyRef.current;
    }

    function onDown(e: MouseEvent | TouchEvent) {
      if ("touches" in e && (e as TouchEvent).touches.length === 2) {
        e.preventDefault();
        const te = e as TouchEvent;
        pinching = true; drawing = false; panning = false;
        liveEl?.remove(); liveEl = null;
        pinchDist0   = touchDist(te);
        pinchScale0  = scaleRef.current;
        pinchTx0     = txRef.current; pinchTy0 = tyRef.current;
        const m = touchMid(te);
        const rect = el!.getBoundingClientRect();
        pinchMidX = m.x - rect.left; pinchMidY = m.y - rect.top;
        return;
      }

      const xy = getXY(e);
      if (!xy) return;

      const isRight  = "button" in e && (e as MouseEvent).button === 2;
      const isMiddle = "button" in e && (e as MouseEvent).button === 1;
      const t = toolRef.current;

      if (t === "pan" || isRight || isMiddle || spaceRef.current) {
        e.preventDefault();
        startPan(xy.x, xy.y);
        return;
      }

      e.preventDefault();
      drawing = true;
      const pt = screenToCanvas(xy.x, xy.y);
      pts = [pt];

      const isEr = t === "eraser";
      const pal  = PALETTE[colorRef.current];
      strokeColor = isEr ? "#ffffff" : resolveColor(pal.display, pal.isVar);
      strokeWidth = isEr ? sizeRef.current * 5 : sizeRef.current;

      const g = drawGroupRef.current;
      if (g) {
        liveEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        liveEl.setAttribute("stroke",          strokeColor);
        liveEl.setAttribute("stroke-width",    String(strokeWidth));
        liveEl.setAttribute("stroke-linecap",  "round");
        liveEl.setAttribute("stroke-linejoin", "round");
        liveEl.setAttribute("fill",            "none");
        liveEl.setAttribute("d", `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)} l 0.01 0`);
        g.appendChild(liveEl);
      }
    }

    function onMove(e: MouseEvent | TouchEvent) {
      e.preventDefault();

      if (pinching && "touches" in e && (e as TouchEvent).touches.length === 2) {
        const te = e as TouchEvent;
        const dist = touchDist(te);
        const ns   = Math.max(0.05, Math.min(20, pinchScale0 * (dist / pinchDist0)));
        const newTx = pinchMidX - (pinchMidX - pinchTx0) * (ns / pinchScale0);
        const newTy = pinchMidY - (pinchMidY - pinchTy0) * (ns / pinchScale0);
        applyTransform(newTx, newTy, ns);
        return;
      }

      const xy = getXY(e);
      if (!xy) return;

      if (panning) {
        applyTransform(
          panTx0 + xy.x - panStartX,
          panTy0 + xy.y - panStartY,
          scaleRef.current,
        );
        return;
      }

      if (!drawing || !liveEl) return;
      const pt   = screenToCanvas(xy.x, xy.y);
      const last = pts[pts.length - 1];
      const dx   = pt.x - last.x, dy = pt.y - last.y;
      const minD = 3 / scaleRef.current;
      if (dx * dx + dy * dy < minD * minD) return;
      pts.push(pt);
      liveEl.setAttribute("d", toSvgPath(pts));
    }

    function onUp() {
      if (pinching)  { pinching = false; return; }
      if (panning)   { panning  = false; return; }
      if (!drawing)  return;
      drawing = false;

      liveEl?.remove();
      liveEl = null;

      if (pts.length === 0) return;

      const lid = `${myId ?? 0}-${++uidCounter}`;
      const s: Stroke = { id: lid, points: [...pts], color: strokeColor, width: strokeWidth, authorId: myId };
      pts = [];

      /* Add locally immediately */
      knownLids.current.add(lid);
      setStrokes(prev => [...prev, s]);

      /* Persist to server — server assigns a dbId */
      if (roomId) {
        postStroke(roomId, encodeStroke(s)).then(dbId => {
          if (dbId != null) {
            /* Patch the dbId onto the existing stroke so undo can delete it from the server */
            setStrokes(prev => prev.map(x => x.id === lid ? { ...x, dbId } : x));
          }
        });
      }
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top;
      const factor = e.ctrlKey
        ? (e.deltaY > 0 ? 0.9 : 1.11)
        : (e.deltaY > 0 ? 0.88 : 1.14);
      const ns  = Math.max(0.05, Math.min(20, scaleRef.current * factor));
      const ntx = mx - (mx - txRef.current) * (ns / scaleRef.current);
      const nty = my - (my - tyRef.current) * (ns / scaleRef.current);
      applyTransform(ntx, nty, ns);
    }

    el.addEventListener("mousedown",    onDown);
    el.addEventListener("mousemove",    onMove);
    el.addEventListener("mouseup",      onUp);
    el.addEventListener("mouseleave",   onUp);
    el.addEventListener("touchstart",   onDown,   { passive: false });
    el.addEventListener("touchmove",    onMove,   { passive: false });
    el.addEventListener("touchend",     onUp);
    el.addEventListener("wheel",        onWheel,  { passive: false });
    el.addEventListener("contextmenu",  e => e.preventDefault());

    return () => {
      el.removeEventListener("mousedown",   onDown);
      el.removeEventListener("mousemove",   onMove);
      el.removeEventListener("mouseup",     onUp);
      el.removeEventListener("mouseleave",  onUp);
      el.removeEventListener("touchstart",  onDown);
      el.removeEventListener("touchmove",   onMove);
      el.removeEventListener("touchend",    onUp);
      el.removeEventListener("wheel",       onWheel);
    };
  }, [roomId, myId]);

  /* space key → temporary pan */
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.code === "Space" && !e.repeat) { e.preventDefault(); spaceRef.current = true; } };
    const up   = (e: KeyboardEvent) => { if (e.code === "Space") spaceRef.current = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  /* ── Collaborative sync — poll for new persistent strokes ── */
  useEffect(() => {
    if (!roomId) return;

    /* On mount: load all existing strokes */
    fetchStrokes(roomId, 0).then(rows => {
      if (!rows.length) return;
      const loaded = rows.map(r => decodeStroke(r.id, r.strokeData));
      loaded.forEach(s => knownLids.current.add(s.id));
      lastDbIdRef.current = rows[rows.length - 1].id;
      setStrokes(loaded);
      const authors = new Set(loaded.filter(s => s.authorId !== myId).map(s => s.authorId));
      setRemoteCount(authors.size);
    }).catch(() => {});

    /* Poll for incremental updates */
    const timer = setInterval(async () => {
      let rows: Awaited<ReturnType<typeof fetchStrokes>>;
      try { rows = await fetchStrokes(roomId, lastDbIdRef.current); } catch { return; }
      if (!rows.length) return;

      const toAdd: Stroke[] = [];
      for (const row of rows) {
        if (row.id > lastDbIdRef.current) lastDbIdRef.current = row.id;
        let s: Stroke;
        try { s = decodeStroke(row.id, row.strokeData); } catch { continue; }
        /* Skip strokes drawn by us in this session (already in state) */
        if (knownLids.current.has(s.id)) continue;
        knownLids.current.add(s.id);
        toAdd.push(s);
      }

      if (toAdd.length > 0) {
        setStrokes(prev => {
          const all = [...prev, ...toAdd];
          const authors = new Set(all.filter(x => x.authorId && x.authorId !== myId).map(x => x.authorId));
          setRemoteCount(authors.size);
          return all;
        });
      }
    }, SYNC_POLL);

    return () => clearInterval(timer);
  }, [roomId, myId]);

  /* ── Actions ── */
  const undo = useCallback(() => {
    setStrokes(s => {
      const own = [...s].reverse().find(st => !st.authorId || st.authorId === myId);
      if (!own) return s;
      /* Delete from server if we have the dbId */
      if (roomId && own.dbId) deleteStroke(roomId, own.dbId);
      knownLids.current.delete(own.id);
      return s.filter(x => x.id !== own.id);
    });
  }, [roomId, myId]);

  const clear = useCallback(() => {
    setStrokes([]);
    knownLids.current.clear();
    lastDbIdRef.current = 0;
    setRemoteCount(0);
    if (roomId) clearStrokes(roomId);
  }, [roomId]);

  const resetView = () => applyTransform(0, 0, 1);

  const zoomStep = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const r  = el.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height / 2;
    const ns = Math.max(0.05, Math.min(20, scaleRef.current * factor));
    applyTransform(
      cx - (cx - txRef.current) * (ns / scaleRef.current),
      cy - (cy - tyRef.current) * (ns / scaleRef.current),
      ns,
    );
  };

  const download = () => {
    const el = svgRef.current;
    if (!el) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const ns = "http://www.w3.org/2000/svg";
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width",  String(rect.width));
    clone.setAttribute("height", String(rect.height));
    clone.setAttribute("xmlns",  ns);
    const bg = document.createElementNS(ns, "rect");
    bg.setAttribute("width", "100%"); bg.setAttribute("height", "100%"); bg.setAttribute("fill", "white");
    clone.insertBefore(bg, clone.firstChild);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { download: "whiteboard.svg", href: url }).click();
    URL.revokeObjectURL(url);
  };

  const shareSnapshot = () => {
    if (!onShareSnapshot) return;
    const el = svgRef.current;
    if (!el) return;
    const rect = containerRef.current!.getBoundingClientRect();
    const ns = "http://www.w3.org/2000/svg";
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width",  String(rect.width));
    clone.setAttribute("height", String(rect.height));
    clone.setAttribute("xmlns",  ns);
    const bg = document.createElementNS(ns, "rect");
    bg.setAttribute("width", "100%"); bg.setAttribute("height", "100%"); bg.setAttribute("fill", "white");
    clone.insertBefore(bg, clone.firstChild);
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      const cvs = Object.assign(document.createElement("canvas"), { width: rect.width, height: rect.height });
      cvs.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      onShareSnapshot(cvs.toDataURL("image/jpeg", 0.82));
    };
    img.src = url;
  };

  const curPal = PALETTE[colorIdx];
  const cursor = tool === "pan" ? "grab" : tool === "eraser" ? "cell" : "crosshair";
  const gridSize = 24 * scale;
  const gridOffX = ((tx % gridSize) + gridSize) % gridSize;
  const gridOffY = ((ty % gridSize) + gridSize) % gridSize;

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 flex-wrap px-2 py-1.5 bg-muted/40 rounded-xl border border-border/40 text-xs">

        <div className="flex gap-0.5">
          <Button variant={tool === "pen"    ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setTool("pen")}    title="قلم">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant={tool === "eraser" ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setTool("eraser")} title="ممحاة">
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          <Button variant={tool === "pan"    ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => setTool("pan")}    title="تحريك">
            <Hand className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border/60 shrink-0" />

        <div className="flex gap-0.5">
          {PALETTE.map((pal, i) => (
            <button
              key={i}
              onClick={() => { setColorIdx(i); setTool("pen"); }}
              className="h-5 w-5 rounded-full transition-all hover:scale-110 focus:outline-none shrink-0"
              style={{
                background: pal.display,
                boxShadow:
                  tool === "pen" && colorIdx === i
                    ? `0 0 0 2px white, 0 0 0 3.5px ${resolveColor(pal.display, pal.isVar)}`
                    : pal.display === "#ffffff"
                      ? "0 0 0 1px #d1d5db"
                      : "none",
              }}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-border/60 shrink-0" />

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSize(s => Math.max(1, s - 1))}>
            <Minus className="h-3 w-3" />
          </Button>
          <div className="flex items-center justify-center w-7 h-6">
            <div className="rounded-full" style={{
              width:  Math.min(size * 2, 22),
              height: Math.min(size * 2, 22),
              background: tool === "eraser"
                ? "#e5e7eb"
                : curPal.isVar ? "hsl(var(--primary))" : curPal.display,
              border: tool === "eraser" || curPal.display === "#ffffff" ? "1px solid #9ca3af" : "none",
            }} />
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSize(s => Math.min(48, s + 1))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border/60 shrink-0" />

        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => zoomStep(0.8)}>
            <ZoomOut className="h-3 w-3" />
          </Button>
          <button
            onClick={resetView}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors w-9 text-center"
          >
            {Math.round(scale * 100)}%
          </button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => zoomStep(1.25)}>
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetView}>
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>

        <div className="w-px h-5 bg-border/60 shrink-0" />

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo}  title="تراجع" disabled={strokes.length === 0}>
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clear} title="مسح الكل">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={download} title="تحميل SVG">
          <Download className="h-3.5 w-3.5" />
        </Button>

        {onShareSnapshot && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 mr-auto shrink-0" onClick={shareSnapshot} title="إرسال لقطة للدردشة">
            <Share2 className="h-3 w-3" />
            إرسال
          </Button>
        )}

        {roomId && remoteCount > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-full px-2 py-0.5 shrink-0">
            <Users className="h-3 w-3" />
            {remoteCount} يرسم معك
          </div>
        )}
      </div>

      {/* ── Infinite canvas ── */}
      <div
        ref={containerRef}
        className="relative flex-1 rounded-xl overflow-hidden border border-border/40 bg-white min-h-0 select-none"
        style={{ cursor }}
      >
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.25 }}
          aria-hidden
        >
          <defs>
            <pattern
              id="wb-dots"
              x={gridOffX} y={gridOffY}
              width={gridSize} height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <circle cx={1} cy={1} r={Math.min(1.2, scale * 0.8)} fill="#9ca3af" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wb-dots)" />
        </svg>

        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full block"
          style={{ touchAction: "none" }}
        >
          <g ref={drawGroupRef} transform={`translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})`}>
            {strokes.map(s => (
              <path
                key={s.id}
                d={toSvgPath(s.points)}
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </g>
        </svg>

        <div className="absolute bottom-2 left-2 flex items-center gap-2 pointer-events-none">
          {scale !== 1 && (
            <span className="text-[9px] text-muted-foreground bg-white/80 dark:bg-zinc-900/80 rounded px-1.5 py-0.5 font-mono backdrop-blur-sm border border-border/20">
              {Math.round(scale * 100)}%
            </span>
          )}
          <span className="text-[9px] text-muted-foreground/60 bg-white/70 dark:bg-zinc-900/70 rounded px-1.5 py-0.5 backdrop-blur-sm">
            Scroll = تكبير · Space + سحب = تحريك
          </span>
        </div>

        {strokes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground/40">
              <Pencil className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-xs">
                {roomId ? "ابدأ الرسم — يرى الجميع رسمك مباشرة" : "ابدأ الرسم هنا"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
