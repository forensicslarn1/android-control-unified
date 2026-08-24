/**
 * Field Service Ledger style: an explicit, non-destructive evidence queue.
 * Every selected command is shown before execution and becomes a local receipt.
 */
import { Button } from "@/components/ui/button";
import type { CommandResult, DeviceProfile } from "@/lib/adbClient";
import { AlertTriangle, Archive, Check, CircleAlert, ClipboardCheck, FileOutput, HardDrive, Loader2, LockKeyhole, Play, ShieldAlert, ShieldCheck, Square, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type Language = "en" | "ar" | "other";
export type EvidenceStatus = "pending" | "running" | "success" | "blocked" | "failed" | "skipped";
export type EvidenceOperation = { id: string; label: string; labelAr: string; detail: string; detailAr: string; command: string; sensitive?: boolean };
export type EvidenceOutcome = { id: string; status: EvidenceStatus; result?: CommandResult; startedAt?: string; completedAt?: string };

const operations: EvidenceOperation[] = [
  { id: "device-profile", label: "Device identity & build", labelAr: "هوية الجهاز والبناء", detail: "Model, maker, Android release, SDK, and build fingerprint.", detailAr: "الطراز والشركة المصنعة وإصدار Android وSDK وبصمة البناء.", command: "getprop ro.product.manufacturer; getprop ro.product.model; getprop ro.build.version.release; getprop ro.build.version.sdk; getprop ro.build.fingerprint" },
  { id: "package-inventory", label: "Installed package inventory", labelAr: "جرد الحزم المثبتة", detail: "All installed package identifiers, including uninstalled-for-user entries where Android reports them.", detailAr: "معرّفات الحزم المثبتة كما يبلغ عنها Android.", command: "pm list packages -u" },
  { id: "power-network", label: "Battery & network state", labelAr: "حالة البطارية والشبكة", detail: "Battery service, connectivity service, and active network state.", detailAr: "خدمة البطارية والاتصال وحالة الشبكة النشطة.", command: "dumpsys battery; printf '\\n--- connectivity ---\\n'; dumpsys connectivity" },
  { id: "storage", label: "Storage & mount summary", labelAr: "ملخص التخزين ووحدات الربط", detail: "Disk usage and Android storage-service summary.", detailAr: "استخدام القرص وملخص خدمة التخزين في Android.", command: "df -h; printf '\\n--- diskstats ---\\n'; dumpsys diskstats" },
  { id: "usage", label: "Usage statistics", labelAr: "إحصاءات الاستخدام", detail: "System usage statistics; availability varies by Android build.", detailAr: "إحصاءات استخدام النظام؛ يختلف توفرها حسب بناء Android.", command: "dumpsys usagestats", sensitive: true },
  { id: "logcat", label: "Bounded system log", labelAr: "سجل نظام محدود", detail: "The most recent 750 threadtime log lines, which can contain app and system events.", detailAr: "أحدث 750 سطراً من سجل threadtime، وقد تتضمن أحداث تطبيقات ونظام.", command: "logcat -d -v threadtime -t 750", sensitive: true },
  { id: "accounts", label: "Account-service summary", labelAr: "ملخص خدمة الحسابات", detail: "Account-service output; may be redacted or blocked by Android/OEM policy.", detailAr: "مخرجات خدمة الحسابات؛ قد تكون منقحة أو محجوبة وفق سياسة Android أو الشركة المصنعة.", command: "dumpsys account", sensitive: true },
  { id: "communications", label: "Communication-provider check", labelAr: "فحص موفر الاتصالات", detail: "A clearly labeled availability check for contacts, call logs, and SMS providers. Android may block access.", detailAr: "فحص توفر واضح لموفري جهات الاتصال وسجل المكالمات والرسائل؛ قد يحجب Android الوصول.", command: "content query --uri content://contacts/phones/ --projection display_name:number; printf '\\n--- call-log ---\\n'; content query --uri content://call_log/calls; printf '\\n--- sms ---\\n'; content query --uri content://sms/", sensitive: true },
];

function classify(result: CommandResult): EvidenceStatus {
  const output = `${result.stdout}\n${result.stderr}`.toLowerCase();
  if (/permission denial|securityexception|not allowed|access denied|operation not permitted|unknown command|not found/.test(output)) return "blocked";
  return result.exitCode === 0 ? "success" : "failed";
}

export function EvidenceSnapshotWorkspace({ language, isLive, device, run, exportCase, openSetup }: { language: Language; isLive: boolean; device: DeviceProfile | null; run: (operation: EvidenceOperation) => Promise<CommandResult>; exportCase: (outcomes: EvidenceOutcome[], selected: EvidenceOperation[]) => void; openSetup: () => void }) {
  const ar = language === "ar";
  const [selectedIds, setSelectedIds] = useState<string[]>(operations.filter((operation) => !operation.sensitive).map((operation) => operation.id));
  const [sensitiveAcknowledged, setSensitiveAcknowledged] = useState(false);
  const [outcomes, setOutcomes] = useState<EvidenceOutcome[]>([]);
  const [running, setRunning] = useState(false);
  const cancelRequested = useRef(false);
  const selected = useMemo(() => operations.filter((operation) => selectedIds.includes(operation.id)), [selectedIds]);
  const completed = outcomes.filter((outcome) => ["success", "blocked", "failed", "skipped"].includes(outcome.status)).length;
  const progress = selected.length ? Math.round((completed / selected.length) * 100) : 0;
  const copy = ar ? {
    eyebrow: "سجل الأدلة / مفوض", title: "لقطة الأدلة", subtitle: "اجمع فقط الفئات التي تختارها على جهاز مفوض. تُعرض الأوامر قبل التنفيذ وتبقى النتائج في هذا المتصفح حتى تصديرها.", noDevice: "يتطلب هذا المسار جهازاً مفوضاً عبر USB. لا توجد مجموعة افتراضية أو اتصال صامت.", select: "حدد نطاق المجموعة", sensitive: "فئات حساسة", sensitiveNote: "قد تحتوي هذه الفئات على أحداث استخدام أو سجل أو بيانات شخصية. قد يحجب Android أو الشركة المصنعة الوصول؛ يتم تسجيل الحجب ولا تتم محاولة تجاوزه.", acknowledge: "أفهم أنني مخول بجمع الفئات الحساسة المحددة من هذا الجهاز.", command: "الأمر المرئي", start: "بدء لقطة الأدلة", cancel: "إيقاف بعد العملية الحالية", export: "تصدير حزمة قضية مؤرخة", reset: "إعادة ضبط النتائج", selected: "محدد", progress: "تقدم المجموعة", noResults: "لا توجد نتائج بعد. حدد الفئات وشغّل مجموعة واضحة.", status: { pending: "بانتظار", running: "جارٍ", success: "نجح", blocked: "محجوب", failed: "فشل", skipped: "تم تخطيه" }, connection: "إعداد الاتصال", summary: "ملخص الجهاز", local: "محلي فقط", allowed: "مفوض", warning: "لن يحاول هذا المسار تجاوز الصلاحيات أو استخراج بيانات الجذر أو تغيير الهاتف.",
  } : {
    eyebrow: "Evidence ledger / authorized", title: "Evidence Snapshot", subtitle: "Collect only categories you choose from an authorized device. Commands are shown before execution and results remain in this browser until you export them.", noDevice: "This workstation requires a USB-authorized device. There is no default collection or silent connection.", select: "Select collection scope", sensitive: "Sensitive categories", sensitiveNote: "These categories can contain usage events, logs, or personal data. Android or the OEM can block access; a block is recorded and never bypassed.", acknowledge: "I am authorized to collect the selected sensitive categories from this device.", command: "Visible command", start: "Start evidence snapshot", cancel: "Stop after current operation", export: "Export timestamped case bundle", reset: "Reset outcomes", selected: "selected", progress: "Collection progress", noResults: "No results yet. Select categories and run an explicit queue.", status: { pending: "pending", running: "running", success: "success", blocked: "blocked", failed: "failed", skipped: "skipped" }, connection: "Open connection setup", summary: "Device summary", local: "local only", allowed: "authorized", warning: "This workflow does not bypass permissions, extract root-only data, or change the phone.",
  };
  const labelFor = (operation: EvidenceOperation) => ar ? operation.labelAr : operation.label;
  const detailFor = (operation: EvidenceOperation) => ar ? operation.detailAr : operation.detail;
  const outcomeFor = (id: string) => outcomes.find((outcome) => outcome.id === id);
  const statusTone: Record<EvidenceStatus, string> = { pending: "text-[#687584]", running: "text-[#59869c]", success: "text-[#527321]", blocked: "text-[#8b5c1c]", failed: "text-[#934639]", skipped: "text-[#687584]" };

  const toggle = (operation: EvidenceOperation) => {
    if (operation.sensitive && !sensitiveAcknowledged) return;
    setSelectedIds((current) => current.includes(operation.id) ? current.filter((id) => id !== operation.id) : [...current, operation.id]);
  };
  const start = async () => {
    if (!isLive || !selected.length || running) return;
    cancelRequested.current = false;
    setRunning(true);
    setOutcomes(selected.map((operation) => ({ id: operation.id, status: "pending" })));
    for (let index = 0; index < selected.length; index += 1) {
      const operation = selected[index];
      if (cancelRequested.current) {
        setOutcomes((current) => current.map((outcome) => outcome.status === "pending" ? { ...outcome, status: "skipped", completedAt: new Date().toISOString() } : outcome));
        break;
      }
      setOutcomes((current) => current.map((outcome) => outcome.id === operation.id ? { ...outcome, status: "running", startedAt: new Date().toISOString() } : outcome));
      try {
        const result = await run(operation);
        setOutcomes((current) => current.map((outcome) => outcome.id === operation.id ? { ...outcome, status: classify(result), result, completedAt: new Date().toISOString() } : outcome));
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Evidence operation did not run.";
        const result: CommandResult = { command: operation.command, stdout: "", stderr: detail, exitCode: 1, at: new Date().toISOString() };
        setOutcomes((current) => current.map((outcome) => outcome.id === operation.id ? { ...outcome, status: "failed", result, completedAt: new Date().toISOString() } : outcome));
      }
    }
    setRunning(false);
  };

  return <section className="space-y-5">
    <div className="service-card overflow-hidden"><div className="border-b border-[#d8d1c4] bg-[#14253a] p-5 text-[#f6f2ea] sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="kicker text-[#c8f04a]">{copy.eyebrow}</p><h2 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-[-0.045em]"><ClipboardCheck className="text-[#c8f04a]" size={25} />{copy.title}</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#cdd7df]">{copy.subtitle}</p></div><div className="flex gap-2"><span className="status-stamp text-[#c8f04a]">{copy.local}</span><span className="status-stamp text-[#b4c6d2]">{isLive ? copy.allowed : "USB"}</span></div></div><div className="mt-5 grid gap-2 sm:grid-cols-3"><div className="border-l-2 border-[#c8f04a] bg-[#1b3048] p-3"><p className="kicker text-[#8e9eae]">{copy.summary}</p><p className="mt-2 text-sm font-semibold">{device ? `${device.manufacturer} ${device.model}` : "—"}</p></div><div className="border-l-2 border-[#59869c] bg-[#1b3048] p-3"><p className="kicker text-[#8e9eae]">Android</p><p className="mt-2 text-sm font-semibold">{device ? `${device.androidVersion} · API ${device.sdk}` : "—"}</p></div><div className="border-l-2 border-[#d39152] bg-[#1b3048] p-3"><p className="kicker text-[#8e9eae]">{copy.progress}</p><p className="mt-2 text-sm font-semibold">{completed} / {selected.length} · {progress}%</p></div></div></div>
      {!isLive ? <div className="flex gap-3 bg-[#fff2e1] p-5 text-sm leading-6 text-[#6d5133]"><CircleAlert size={18} className="mt-0.5 shrink-0" /><div><strong>{copy.noDevice}</strong><div><Button onClick={openSetup} variant="outline" className="action-button mt-3 border-[#6d5133] text-[#6d5133]"><ShieldCheck className="mr-2" size={15} />{copy.connection}</Button></div></div></div> : null}</div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]"><div className="space-y-4"><div className="service-card p-5"><div className="flex items-center justify-between gap-3"><div><p className="kicker text-[#687584]">01 / {copy.select}</p><h3 className="mt-1 text-xl font-bold tracking-[-0.04em]">{selected.length} {copy.selected}</h3></div><span className="state-square text-[#59869c]">EV</span></div><div className="mt-5 space-y-2">{operations.map((operation) => { const checked = selectedIds.includes(operation.id); const outcome = outcomeFor(operation.id); const blocked = operation.sensitive && !sensitiveAcknowledged; return <label key={operation.id} className={`block border p-4 ${checked ? "border-[#59869c] bg-[#eef5f8] dark:bg-[#14253a]" : "border-[#d8d1c4] bg-[#fffdf8] dark:border-[#2f4860] dark:bg-[#14253a]"} ${blocked ? "opacity-65" : ""}`}><div className="flex gap-3"><input type="checkbox" checked={checked} disabled={running || blocked} onChange={() => toggle(operation)} className="mt-1 h-4 w-4 accent-[#14253a]" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{labelFor(operation)}</strong>{operation.sensitive ? <span className="status-stamp text-[#8b5c1c]">{copy.sensitive}</span> : <span className="status-stamp text-[#527321]">{copy.local}</span>}{outcome ? <span className={`status-stamp ${statusTone[outcome.status]}`}>{copy.status[outcome.status]}</span> : null}</div><p className="mt-2 text-xs leading-5 text-[#526273] dark:text-[#c7d3dc]">{detailFor(operation)}</p><div className="mono mt-3 overflow-x-auto border-l-2 border-[#c8f04a] bg-[#f3efe6] px-3 py-2 text-[0.63rem] text-[#263d55] dark:bg-[#1b3048] dark:text-[#d7e0e8]">{copy.command} → {operation.command}</div>{outcome?.result ? <p className={`mono mt-2 max-h-20 overflow-auto whitespace-pre-wrap text-[0.62rem] ${outcome.status === "success" ? "text-[#527321]" : outcome.status === "blocked" ? "text-[#8b5c1c]" : "text-[#934639]"}`}>{outcome.result.stderr || outcome.result.stdout || "(no output)"}</p> : null}</div></div></label>; })}</div></div>
        <div className="service-card border-l-2 border-[#d39152] p-5"><div className="flex gap-3"><ShieldAlert className="mt-0.5 shrink-0 text-[#8b5c1c]" size={19} /><div><p className="font-bold">{copy.sensitive}</p><p className="mt-1 text-xs leading-5 text-[#6d5133] dark:text-[#f0d4a8]">{copy.sensitiveNote}</p><label className="mt-4 flex gap-3 text-xs leading-5"><input type="checkbox" checked={sensitiveAcknowledged} onChange={(event) => setSensitiveAcknowledged(event.target.checked)} disabled={running} className="mt-0.5 h-4 w-4 accent-[#14253a]" />{copy.acknowledge}</label></div></div></div>
      </div><aside className="space-y-4"><div className="service-card p-5"><p className="kicker text-[#687584]">02 / {copy.progress}</p><div className="mt-4 h-3 overflow-hidden border border-[#14253a] bg-[#f3efe6] dark:border-[#d7e0e8] dark:bg-[#1b3048]"><div className="h-full bg-[#c8f04a] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div><p className="mono mt-3 text-xs text-[#687584]">{completed} / {selected.length} {copy.selected}</p><div className="mt-5 grid gap-2"><Button onClick={start} disabled={!isLive || !selected.length || running} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]">{running ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Play className="mr-2" size={16} />}{copy.start}</Button><Button variant="outline" onClick={() => { cancelRequested.current = true; }} disabled={!running} className="action-button border-[#8b5c1c] text-[#8b5c1c]"><Square className="mr-2" size={15} />{copy.cancel}</Button><Button variant="outline" onClick={() => exportCase(outcomes, selected)} disabled={!outcomes.length || running} className="action-button border-[#527321] text-[#527321]"><Archive className="mr-2" size={15} />{copy.export}</Button><Button variant="outline" onClick={() => setOutcomes([])} disabled={running || !outcomes.length} className="action-button border-[#687584] text-[#687584]"><X className="mr-2" size={15} />{copy.reset}</Button></div></div><div className="border border-[#d8d1c4] bg-[#f3efe6] p-4 text-xs leading-5 text-[#526273] dark:border-[#2f4860] dark:bg-[#1b3048] dark:text-[#c7d3dc]"><AlertTriangle className="mb-2 text-[#8b5c1c]" size={16} /><strong>{copy.warning}</strong></div><div className="service-card p-4"><p className="kicker text-[#687584]">03 / Outcome ledger</p><div className="mt-3 space-y-2">{outcomes.length ? outcomes.map((outcome) => <div key={outcome.id} className="flex items-center justify-between gap-2 border-b border-[#e5ded2] pb-2 text-xs"><span>{labelFor(operations.find((operation) => operation.id === outcome.id) || operations[0])}</span><span className={`status-stamp ${statusTone[outcome.status]}`}>{copy.status[outcome.status]}</span></div>) : <p className="text-xs text-[#687584]">{copy.noResults}</p>}</div></div></aside></div>
  </section>;
}
