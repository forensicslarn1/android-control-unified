/**
 * Field Service Ledger style: the mirror is a real device session with an
 * explicit start/stop trail, never a decorative static preview.
 */
import { Button } from "@/components/ui/button";
import { Check, CircleAlert, MonitorUp, Play, Square, Video } from "lucide-react";
import type { RefObject } from "react";

export type MirrorState = {
  phase: "idle" | "starting" | "live" | "stopping" | "error";
  detail: string;
  width?: number;
  height?: number;
  codec?: string;
};

export function LiveMirrorWorkspace({
  language,
  isLive,
  state,
  canvasRef,
  start,
  stop,
}: {
  language: "en" | "ar" | "other";
  isLive: boolean;
  state: MirrorState;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}) {
  const isArabic = language === "ar";
  const running = state.phase === "live";
  const busy = state.phase === "starting" || state.phase === "stopping";
  const displayDetail = state.phase === "idle" && isArabic ? "صِل جهازاً وفوضه، ثم ابدأ جلسة Scrcpy محلية واضحة." : state.detail;

  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.18fr_.82fr]">
        <div className="overflow-hidden border border-[#14253a] bg-[#14253a] p-5 text-[#f6f2ea] dark:border-[#3d566e]">
          <div className="flex items-start justify-between gap-4"><div><p className="kicker text-[#c8f04a]">Scrcpy / {isArabic ? "جلسة مباشرة" : "live session"}</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]">{isArabic ? "اعرض جهازاً مفوضاً في هذا المتصفح." : "Mirror an authorized device in this browser."}</h2><p className="mt-2 max-w-xl text-xs leading-5 text-[#b9c5cf]">{isArabic ? "يُنقل خادم Scrcpy المُدار عبر جلسة USB ADB الحالية ثم يُفك محلياً بواسطة WebCodecs. يسجل البدء والإيقاف إيصالاً واضحاً." : "The managed Scrcpy server is pushed over your existing USB ADB session, then decoded locally with WebCodecs. Starting and stopping both write a receipt."}</p></div><MonitorUp className="shrink-0 text-[#c8f04a]" size={23} /></div>
          <div className="relative mt-5 aspect-video overflow-hidden border border-[#2f4860] bg-[#0a1520]">
            <canvas ref={canvasRef} className={`h-full w-full object-contain ${running ? "block" : "hidden"}`} aria-label="Live Android screen mirror" />
            {!running && <div className="absolute inset-0 grid place-items-center p-6 text-center"><div><Video className="mx-auto text-[#c8f04a]" size={30} /><p className="mt-3 text-sm font-semibold">{state.phase === "starting" ? (isArabic ? "جارٍ فتح جلسة Scrcpy…" : "Opening Scrcpy session…") : state.phase === "error" ? (isArabic ? "توقفت جلسة النسخ" : "Mirror session stopped") : (isArabic ? "جلسة النسخ في وضع الخمول" : "Mirror session is idle")}</p><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#a6b3be]">{displayDetail}</p></div></div>}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2"><span className={`status-stamp ${running ? "text-[#c8f04a]" : "text-[#91acc0]"}`}>{running ? (isArabic ? "بث مباشر" : "stream live") : (isArabic ? "البث خامل" : "stream idle")}</span><span className="status-stamp text-[#91acc0]">h.264</span>{running && <span className="mono text-[0.65rem] text-[#b9c5cf]">{state.width} × {state.height} · codec {state.codec}</span>}</div>
          <div className="mt-4 flex flex-wrap gap-3"><Button onClick={start} disabled={!isLive || busy || running} className="action-button bg-[#c8f04a] text-[#14253a] hover:bg-[#d7f66c]"><Play className="mr-2" size={16} />{state.phase === "starting" ? (isArabic ? "جارٍ البدء…" : "Starting…") : (isArabic ? "بدء النسخ المباشر" : "Start live mirror")}</Button><Button onClick={stop} disabled={!running || busy} variant="outline" className="action-button border-[#91acc0] bg-transparent text-[#f6f2ea] hover:bg-[#1b3048]"><Square className="mr-2" size={15} />{state.phase === "stopping" ? (isArabic ? "جارٍ الإيقاف…" : "Stopping…") : (isArabic ? "إيقاف الجلسة" : "Stop session")}</Button></div>
        </div>
        <div className="service-card p-6"><p className="kicker text-[#687584]">{isArabic ? "إيصال الجلسة" : "Session receipt"}</p><div className="mt-5 space-y-4">{[["01", isArabic ? "صلاحية ADB" : "ADB authority", isLive ? (isArabic ? "مفوض" : "Authorized") : (isArabic ? "صِل جهازاً" : "Connect a device"), isLive], ["02", isArabic ? "نقل الخادم" : "Server transfer", running ? (isArabic ? "دُفع إلى /data/local/tmp" : "Pushed to /data/local/tmp") : (isArabic ? "يحدث عند بدء الجلسة" : "Occurs when session starts"), running], ["03", isArabic ? "فك WebCodecs" : "WebCodecs decode", running ? (isArabic ? "عرض إطارات H.264" : "Rendering H.264 frames") : (isArabic ? "يُفحص قبل الجلسة" : "Checked before session"), running]].map(([step, label, status, ok]) => <div className="flex gap-3 border-b border-[#e3dcd0] pb-4 dark:border-[#2f4860]" key={step as string}><span className={`state-square shrink-0 ${ok ? "text-[#527321] dark:text-[#c8f04a]" : "text-[#687584]"}`}>{ok ? <Check size={13} /> : step}</span><div><p className="text-sm font-semibold">{label}</p><p className="mono mt-1 text-[0.65rem] text-[#687584]">{status}</p></div></div>)}</div><div className="mt-5 border-l-2 border-[#d39152] bg-[#fff2e1] p-3 text-xs leading-5 text-[#6d5133] dark:bg-[#322821] dark:text-[#f0d4a8]"><div className="flex gap-2"><CircleAlert size={16} className="mt-0.5 shrink-0" /><p>{isArabic ? "يبقى جهاز أندرويد مصدر الوسائط. إذا رفض الخادم أو أداة فك الترميز، يُسجل السبب في سجل الأوامر." : "The Android device remains the media source. If it rejects the server or decoder, the returned reason is recorded in the command ledger."}</p></div></div></div>
      </div>
    </section>
  );
}
