import { useEffect, useRef, useState, useCallback } from "react";

const WARN_RATIO = 0.38;   // 얼굴 너비 / 영상 너비 임계값 (경험치)
const CAUTION_RATIO = 0.28; // 주의 구간
const FPS = 8;              // 감지 주기 (초당 프레임)

const MSGS = {
  idle:    { text: "카메라를 시작하세요",           icon: "👁", color: "#64748b" },
  ok:      { text: "적정 거리입니다",               icon: "✓",  color: "#22c55e" },
  caution: { text: "조금 멀어지세요",               icon: "!",  color: "#f59e0b" },
  danger:  { text: "너무 가깝습니다!\n화면에서 멀어지세요", icon: "⚠", color: "#ef4444" },
  noface:  { text: "얼굴이 감지되지 않습니다",      icon: "?",  color: "#94a3b8" },
  unsupported: { text: "이 브라우저는 지원되지 않습니다\nChrome을 사용하세요", icon: "✕", color: "#ef4444" },
};

export default function EyeGuard() {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [ratio, setRatio] = useState(0);   // 현재 얼굴 비율 (0~1)
  const [running, setRunning] = useState(false);
  const [supported, setSupported] = useState(true);

  // 상태 판정
  const judge = useCallback((r) => {
    if (r === 0) return "noface";
    if (r >= WARN_RATIO) return "danger";
    if (r >= CAUTION_RATIO) return "caution";
    return "ok";
  }, []);

  // 감지 루프
  const detect = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !detectorRef.current || video.readyState < 2) return;

    try {
      const faces = await detectorRef.current.detect(video);
      if (faces.length === 0) {
        setRatio(0);
        setStatus("noface");
        return;
      }
      // 가장 큰 얼굴 기준
      const biggest = faces.reduce((a, b) =>
        a.boundingBox.width > b.boundingBox.width ? a : b
      );
      const r = biggest.boundingBox.width / video.videoWidth;
      setRatio(r);
      setStatus(judge(r));
    } catch {
      // 감지 실패 무시
    }
  }, [judge]);

  const start = useCallback(async () => {
    if (!("FaceDetector" in window)) {
      setStatus("unsupported");
      setSupported(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      detectorRef.current = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      setRunning(true);
      setStatus("noface");
      timerRef.current = setInterval(detect, 1000 / FPS);
    } catch {
      setStatus("idle");
    }
  }, [detect]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
    setStatus("idle");
    setRatio(0);
  }, []);

  useEffect(() => () => { clearInterval(timerRef.current); streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const msg = MSGS[status];
  const pct = Math.min(ratio / WARN_RATIO, 1);  // 0~1 (경고 임계 기준 100%)

  // 게이지 색
  const gaugeColor = status === "danger" ? "#ef4444" : status === "caution" ? "#f59e0b" : "#22c55e";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      color: "#e2e8f0",
      padding: "24px",
      gap: "24px",
    }}>
      {/* 타이틀 */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "13px", letterSpacing: "4px", color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>Eye Guard</div>
        <div style={{ fontSize: "22px", fontWeight: "700", color: "#f1f5f9" }}>눈 거리 보호 앱</div>
      </div>

      {/* 카메라 + 오버레이 */}
      <div style={{ position: "relative", width: "280px", height: "210px", borderRadius: "16px", overflow: "hidden", background: "#111827", border: "1px solid #1e293b" }}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: running ? "block" : "none" }}
        />
        {!running && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "40px" }}>📷</span>
            <span style={{ fontSize: "12px", color: "#475569" }}>카메라 대기 중</span>
          </div>
        )}

        {/* 상태 뱃지 */}
        {running && (
          <div style={{
            position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.7)", borderRadius: "20px", padding: "4px 14px",
            fontSize: "11px", color: msg.color, border: `1px solid ${msg.color}44`,
            whiteSpace: "nowrap", backdropFilter: "blur(4px)",
          }}>
            {msg.icon} {msg.text.split("\n")[0]}
          </div>
        )}
      </div>

      {/* 거리 게이지 */}
      <div style={{ width: "280px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#475569", marginBottom: "6px" }}>
          <span>멀다 (안전)</span>
          <span>가깝다 (위험)</span>
        </div>
        <div style={{ height: "8px", background: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${pct * 100}%`,
            background: gaugeColor,
            borderRadius: "4px",
            transition: "width 0.15s ease, background 0.3s ease",
            boxShadow: running ? `0 0 8px ${gaugeColor}88` : "none",
          }} />
        </div>
        <div style={{ textAlign: "center", marginTop: "6px", fontSize: "11px", color: "#475569" }}>
          {running ? `얼굴 비율 ${Math.round(ratio * 100)}% (임계 ${Math.round(WARN_RATIO * 100)}%)` : "—"}
        </div>
      </div>

      {/* 경고 메시지 */}
      <div style={{
        width: "280px", minHeight: "72px", borderRadius: "12px",
        background: running ? `${msg.color}11` : "#111827",
        border: `1px solid ${running ? msg.color + "44" : "#1e293b"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: "4px", padding: "12px",
        transition: "all 0.3s ease",
      }}>
        <div style={{ fontSize: status === "danger" ? "32px" : "24px", transition: "font-size 0.3s" }}>
          {msg.icon}
        </div>
        <div style={{
          fontSize: "13px", color: running ? msg.color : "#475569",
          textAlign: "center", lineHeight: "1.5", whiteSpace: "pre-line",
          fontWeight: status === "danger" ? "700" : "400",
        }}>
          {msg.text}
        </div>
      </div>

      {/* 버튼 */}
      {supported && (
        <button
          onClick={running ? stop : start}
          style={{
            padding: "12px 40px",
            borderRadius: "8px",
            border: "none",
            background: running ? "#1e293b" : "#3b82f6",
            color: running ? "#94a3b8" : "#fff",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            letterSpacing: "0.5px",
          }}
        >
          {running ? "중지" : "시작"}
        </button>
      )}

      {/* 안내 */}
      <div style={{ fontSize: "11px", color: "#334155", textAlign: "center", lineHeight: "1.7" }}>
        적정 시청 거리: <span style={{ color: "#22c55e" }}>30cm 이상</span><br />
        Chrome 브라우저 · 전면 카메라 필요
      </div>
    </div>
  );
}