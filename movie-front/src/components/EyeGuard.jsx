import { useEffect, useRef, useState, useCallback } from "react";
import { FaceDetector as MPFaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const WARN_RATIO    = 0.38;
const CAUTION_RATIO = 0.28;
const FPS           = 8;

const MSGS = {
  noface:  { text: "얼굴이 감지되지 않습니다",           icon: "?",  color: "#94a3b8" },
  ok:      { text: "적정 거리입니다",                     icon: "✓",  color: "#22c55e" },
  caution: { text: "조금 멀어지세요",                     icon: "!",  color: "#f59e0b" },
  danger:  { text: "너무 가깝습니다!\n화면에서 멀어지세요", icon: "⚠", color: "#ef4444" },
  loading: { text: "모델 로딩 중...",                     icon: "⏳", color: "#64748b" },
};

export default function EyeGuard() {
  const videoRef    = useRef(null);
  const detectorRef = useRef(null);
  const timerRef    = useRef(null);
  const streamRef   = useRef(null);

  const [status,  setStatus]  = useState("noface");
  const [ratio,   setRatio]   = useState(0);
  const [running, setRunning] = useState(false);

  const judge = useCallback((r) => {
    if (r === 0)            return "noface";
    if (r >= WARN_RATIO)    return "danger";
    if (r >= CAUTION_RATIO) return "caution";
    return "ok";
  }, []);

  const detect = useCallback(() => {
    const video = videoRef.current;
    if (!video || !detectorRef.current || video.readyState < 2) return;
    try {
      const { detections } = detectorRef.current.detectForVideo(video, performance.now());
      if (!detections.length) { setRatio(0); setStatus("noface"); return; }
      const biggest = detections.reduce((a, b) =>
        a.boundingBox.width > b.boundingBox.width ? a : b
      );
      const r = biggest.boundingBox.width / video.videoWidth;
      setRatio(r);
      setStatus(judge(r));
    } catch { /* 무시 */ }
  }, [judge]);

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
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setRunning(true);
      setStatus("noface");
      timerRef.current = setInterval(detect, 1000 / FPS);
    } catch {
      setStatus("noface");
    }
  }, [detect]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
    setStatus("noface");
    setRatio(0);
  }, []);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const msg = MSGS[status];
  const pct = Math.min(ratio / WARN_RATIO, 1);
  const gaugeColor = status === "danger" ? "#ef4444" : status === "caution" ? "#f59e0b" : "#22c55e";

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-[#e2e8f0] p-6 gap-6 font-sans">

      {/* 타이틀 */}
      <div className="text-center">
        <div className="text-[13px] tracking-[4px] text-slate-500 mb-1.5 uppercase">Eye Guard</div>
        <div className="text-[22px] font-bold text-slate-100">눈 거리 보호 앱</div>
      </div>

      {/* 카메라 + 오버레이 */}
      <div className="relative w-[280px] h-[210px] rounded-2xl overflow-hidden bg-[#111827] border border-slate-800">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`w-full h-full object-cover [transform:scaleX(-1)] ${running ? "block" : "hidden"}`}
        />
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="text-[40px]">📷</span>
            <span className="text-xs text-slate-600">카메라 대기 중</span>
          </div>
        )}

        {/* 상태 뱃지 */}
        {running && (
          <div
            className="absolute top-2.5 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-3.5 py-1 text-[11px] whitespace-nowrap backdrop-blur-sm border"
            style={{ color: msg.color, borderColor: `${msg.color}44` }}
          >
            {msg.icon} {msg.text.split("\n")[0]}
          </div>
        )}
      </div>

      {/* 거리 게이지 */}
      <div className="w-[280px]">
        <div className="flex justify-between text-[11px] text-slate-500 mb-1.5">
          <span>멀다 (안전)</span>
          <span>가깝다 (위험)</span>
        </div>
        <div className="h-2 bg-slate-800 rounded overflow-hidden">
          <div
            className="h-full rounded transition-[width] duration-150 ease-linear"
            style={{
              width: `${pct * 100}%`,
              background: gaugeColor,
              boxShadow: running ? `0 0 8px ${gaugeColor}88` : "none",
            }}
          />
        </div>
        <div className="text-center mt-1.5 text-[11px] text-slate-500">
          {running ? `얼굴 비율 ${Math.round(ratio * 100)}% (임계 ${Math.round(WARN_RATIO * 100)}%)` : "—"}
        </div>
      </div>

      {/* 경고 메시지 */}
      <div
        className="w-[280px] min-h-[72px] rounded-xl flex flex-col items-center justify-center gap-1 p-3 border transition-all duration-300"
        style={{
          background:   running ? `${msg.color}11` : "#111827",
          borderColor:  running ? `${msg.color}44` : "#1e293b",
        }}
      >
        <div className="transition-[font-size] duration-300" style={{ fontSize: status === "danger" ? "32px" : "24px" }}>
          {msg.icon}
        </div>
        <div
          className={`text-[13px] text-center leading-relaxed whitespace-pre-line ${status === "danger" ? "font-bold" : "font-normal"}`}
          style={{ color: running ? msg.color : "#475569" }}
        >
          {msg.text}
        </div>
      </div>

      {/* 버튼 */}
      <button
        onClick={running ? stop : start}
        disabled={status === "loading"}
        className={`px-10 py-3 rounded-lg text-sm font-semibold border-0 tracking-wide transition-colors ${
          status === "loading"
            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
            : running
            ? "bg-slate-800 text-slate-400 cursor-pointer"
            : "bg-blue-500 text-white cursor-pointer"
        }`}
      >
        {status === "loading" ? "로딩 중..." : running ? "중지" : "시작"}
      </button>

      {/* 안내 */}
      <div className="text-[11px] text-slate-700 text-center leading-7">
        적정 시청 거리: <span className="text-green-400">30cm 이상</span><br />
        전면 카메라 필요
      </div>
    </div>
  );
}
