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

  // 게이지 색 (런타임 동적값 — style prop 유지)
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

        {/* 상태 뱃지 — 색상은 런타임 동적값 */}
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

      {/* 경고 메시지 — 배경·테두리 색은 런타임 동적값 */}
      <div
        className="w-[280px] min-h-[72px] rounded-xl flex flex-col items-center justify-center gap-1 p-3 border transition-all duration-300"
        style={{
          background: running ? `${msg.color}11` : "#111827",
          borderColor: running ? `${msg.color}44` : "#1e293b",
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

      {/* 버튼 / 미지원 안내 */}
      {supported ? (
        <button
          onClick={running ? stop : start}
          className={`px-10 py-3 rounded-lg text-sm font-semibold cursor-pointer border-0 tracking-wide transition-colors ${
            running ? "bg-slate-800 text-slate-400" : "bg-blue-500 text-white"
          }`}
        >
          {running ? "중지" : "시작"}
        </button>
      ) : (
        <div className="w-[280px] rounded-xl bg-[#1a0a0a] border border-red-500/25 px-5 py-4 text-xs leading-loose text-slate-400">
          <div className="font-bold text-red-400 mb-2 text-[13px]">✕ FaceDetector가 비활성화되어 있습니다</div>
          <div>Chrome에서 아래 설정을 활성화하세요:</div>
          <div className="my-2 bg-slate-900 rounded-md px-3 py-2">
            <span className="text-blue-400 cursor-text select-all">
              chrome://flags/#enable-experimental-web-platform-features
            </span>
          </div>
          <ol className="mt-1 ml-4 text-slate-500 list-decimal space-y-0.5">
            <li>위 주소를 Chrome 주소창에 붙여넣기</li>
            <li><b className="text-slate-100">Experimental Web Platform features</b> → <span className="text-green-400">Enabled</span></li>
            <li>Chrome 재시작 후 다시 시도</li>
          </ol>
        </div>
      )}

      {/* 안내 */}
      <div className="text-[11px] text-slate-700 text-center leading-7">
        적정 시청 거리: <span className="text-green-400">30cm 이상</span><br />
        Chrome 브라우저 · 전면 카메라 필요
      </div>
    </div>
  );
}
