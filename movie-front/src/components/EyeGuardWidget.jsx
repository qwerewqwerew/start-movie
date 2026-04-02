import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { FaceDetector as MPFaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const WARN_RATIO    = 0.38;
const CAUTION_RATIO = 0.28;
const FPS           = 8;

const STATUS = {
  noface:  { icon: "?",  label: "얼굴 없음",  color: "#94a3b8" },
  ok:      { icon: "✓",  label: "안전",       color: "#22c55e" },
  caution: { icon: "!",  label: "주의",       color: "#f59e0b" },
  danger:  { icon: "⚠",  label: "너무 가까움", color: "#ef4444" },
  loading: { icon: "⏳", label: "로딩 중",    color: "#64748b" },
};

function judge(r) {
  if (r === 0)            return "noface";
  if (r >= WARN_RATIO)    return "danger";
  if (r >= CAUTION_RATIO) return "caution";
  return "ok";
}

// ── 위젯 본체 ──────────────────────────────────────────
function Widget() {
  const videoRef    = useRef(null);
  const detectorRef = useRef(null);
  const timerRef    = useRef(null);
  const streamRef   = useRef(null);
  const dragRef     = useRef({ dragging: false, ox: 0, oy: 0 });

  const [status,  setStatus]  = useState("noface");
  const [ratio,   setRatio]   = useState(0);
  const [running, setRunning] = useState(false);
  const [pos,     setPos]     = useState({ x: 16, y: 16 });
  const [open,    setOpen]    = useState(true);

  const detect = useCallback(() => {
    const v = videoRef.current;
    if (!v || !detectorRef.current || v.readyState < 2) return;
    try {
      const { detections } = detectorRef.current.detectForVideo(v, performance.now());
      if (!detections.length) { setRatio(0); setStatus("noface"); return; }
      const big = detections.reduce((a, b) =>
        a.boundingBox.width > b.boundingBox.width ? a : b
      );
      const r = big.boundingBox.width / v.videoWidth;
      setRatio(r);
      setStatus(judge(r));
    } catch { /* 무시 */ }
  }, []);

  const start = useCallback(async () => {
    setStatus("loading");
    try {
      if (!detectorRef.current) {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        detectorRef.current = await MPFaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
        });
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 320 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setRunning(true);
      setStatus("noface");
      timerRef.current = setInterval(detect, 1000 / FPS);
    } catch { setStatus("noface"); }
  }, [detect]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false); setStatus("noface"); setRatio(0);
  }, []);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // ── 드래그 핸들러 ──
  const onMouseDown = (e) => {
    dragRef.current = { dragging: true, ox: e.clientX, oy: e.clientY };
    e.preventDefault();
  };
  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.ox;
      const dy = e.clientY - dragRef.current.oy;
      dragRef.current.ox = e.clientX;
      dragRef.current.oy = e.clientY;
      setPos(p => ({ x: p.x - dx, y: p.y - dy }));
    };
    const onUp = () => { dragRef.current.dragging = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const s = STATUS[status];
  const pct = Math.min((ratio / WARN_RATIO) * 100, 100);
  const isDanger = status === "danger";

  return (
    <div style={{
      position:   "fixed",
      right:      `${pos.x}px`,
      bottom:     `${pos.y}px`,
      zIndex:     999999,
      userSelect: "none",
      filter:     isDanger ? "drop-shadow(0 0 12px #ef444488)" : "none",
      transition: "filter 0.3s",
    }}>
      {/* ── 패널 ── */}
      {open && (
        <div style={{
          width:        "200px",
          background:   "#0f172a",
          border:       `1px solid ${isDanger ? "#ef444466" : "#1e293b"}`,
          borderRadius: "12px",
          overflow:     "hidden",
          marginBottom: "8px",
          transition:   "border-color 0.3s",
        }}>
          {/* 드래그 헤더 */}
          <div
            onMouseDown={onMouseDown}
            style={{
              padding:        "8px 12px",
              background:     "#0a0f1e",
              cursor:         "grab",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              borderBottom:   "1px solid #1e293b",
            }}
          >
            <span style={{ fontSize: "11px", color: "#475569", letterSpacing: "2px" }}>EYE GUARD</span>
            <span style={{ fontSize: "11px", color: s.color, fontWeight: "700" }}>
              {s.icon} {s.label}
            </span>
          </div>

          {/* 카메라 */}
          <div style={{ position: "relative", height: "112px", background: "#060912" }}>
            <video
              ref={videoRef} muted playsInline
              style={{
                width: "100%", height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                display: running ? "block" : "none",
              }}
            />
            {!running && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "28px" }}>📷</span>
              </div>
            )}
            {isDanger && (
              <div style={{
                position:   "absolute",
                inset:      0,
                background: "#ef444422",
                animation:  "blink 0.6s ease-in-out infinite alternate",
                pointerEvents: "none",
              }} />
            )}
          </div>

          {/* 게이지 */}
          <div style={{ padding: "8px 12px" }}>
            <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{
                height:     "100%",
                width:      `${pct}%`,
                background: s.color,
                borderRadius: "2px",
                transition: "width 0.15s, background 0.3s",
              }} />
            </div>
            <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#334155" }}>
                {running ? `비율 ${Math.round(ratio * 100)}%` : "카메라 꺼짐"}
              </span>
              <button
                onClick={running ? stop : start}
                disabled={status === "loading"}
                style={{
                  fontSize:   "10px",
                  padding:    "3px 10px",
                  borderRadius: "4px",
                  border:     "none",
                  background: status === "loading" ? "#111827" : running ? "#1e293b" : "#3b82f6",
                  color:      status === "loading" ? "#475569" : running ? "#94a3b8" : "#fff",
                  cursor:     status === "loading" ? "not-allowed" : "pointer",
                  fontWeight: "600",
                }}
              >
                {status === "loading" ? "로딩..." : running ? "중지" : "시작"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 토글 버튼 ── */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width:        "36px",
            height:       "36px",
            borderRadius: "50%",
            border:       `1px solid ${isDanger ? "#ef444466" : "#1e293b"}`,
            background:   "#0f172a",
            color:        isDanger ? "#ef4444" : "#64748b",
            fontSize:     "16px",
            cursor:       "pointer",
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
          }}
        >
          {open ? "✕" : "👁"}
        </button>
      </div>

      <style>{`@keyframes blink { from { opacity:0 } to { opacity:1 } }`}</style>
    </div>
  );
}

// ── Portal 래퍼 ────────────────────────────────────────
export default function EyeGuardWidget() {
  return createPortal(<Widget />, document.body);
}
