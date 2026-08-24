/**
 * Field Service Ledger style: staged, device-specific De-Google review with
 * explicit User 0 disablement only and command receipt hand-off to Home.
 */
import { Button } from "@/components/ui/button";
import { DEGOOGLE_LEVELS, deGoogleCandidatesFor, type DeGoogleCandidate, type DeGoogleLevel } from "@/lib/degoogleCatalog";
import { ArrowRight, Check, ChevronRight, CircleAlert, Cloud, Eye, Feather, Mail, MapPinned, PackageOpen, ShieldAlert, ShieldCheck, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";

type Language = "en" | "ar" | "other";
type Stage = "level" | "preview" | "alternatives" | "completed";

type Props = {
  language: Language;
  isLive: boolean;
  packages: string[];
  disablePackage: (id: string, label: string) => Promise<boolean>;
  openSetup: () => void;
};

const levelTone: Record<DeGoogleLevel, string> = {
  essential: "border-[#b9da71] bg-[#eef8cd] text-[#527321]",
  low: "border-[#9fc3dc] bg-[#eaf4fb] text-[#386b88]",
  medium: "border-[#e6c473] bg-[#fff0ce] text-[#8b5c1c]",
  high: "border-[#dba193] bg-[#fbe5df] text-[#934639]",
  total: "border-[#bd7171] bg-[#f9e0e0] text-[#8f3535]",
};

export function DeGoogleWorkspace({ language, isLive, packages, disablePackage, openSetup }: Props) {
  const ar = language === "ar";
  const [level, setLevel] = useState<DeGoogleLevel>("essential");
  const [stage, setStage] = useState<Stage>("level");
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const candidates = useMemo(() => deGoogleCandidatesFor(level, packages), [level, packages]);
  const reversible = candidates.filter((candidate) => candidate.action === "disable");
  const reviewOnly = candidates.filter((candidate) => candidate.action === "review");
  const stageOrder: Stage[] = ["level", "preview", "alternatives", "completed"];
  const stages = ar ? ["اختيار المستوى", "المعاينة", "البدائل", "مكتمل"] : ["Select level", "Preview", "Alternatives", "Completed"];

  const text = ar ? {
    eyebrow: "خصوصية الجهاز / Google", title: "De‑Google", subtitle: "راجع خدمات Google المثبتة على هذا الجهاز قبل تعطيل أي شيء.", noDevice: "صِل جهازاً أولاً لحساب الحزم المطابقة من جرده المحلي.", choose: "اختر مستوى إزالة Google. الأعلى يعرض خدمات أكثر للمراجعة، لكنه لا ينفذ مكونات الإطار الأساسية بشكل جماعي.", selected: "المستوى المحدد", continue: "متابعة إلى المعاينة", connected: "تمت قراءة الجرد المحلي", preview: "معاينة الجهاز", previewText: "هذه الحزم موجودة بالفعل على الجهاز المتصل. لا يوجد عداد ثابت أو قائمة عامة مطبقة على كل هاتف.", noMatches: "لا توجد حزم مرشحة من هذا المستوى في الجرد المحلي الحالي.", reversible: "يمكن تعطيلها بشكل قابل للاستعادة", review: "يتطلب مراجعة خبيرة", command: "أمر قابل للاستعادة", acknowledge: "أفهم أن تعطيل تطبيقات المستخدم 0 قد يغيّر التكاملات أو التطبيقات التي تعتمد على الشركة.", apply: "تعطيل الحزم القابلة للاستعادة", alternatives: "البدائل", alternativesText: "هذه اقتراحات مستقلة لتخطيط الانتقال وليست عمليات تثبيت أو توصيات تجارية.", complete: "تم تسجيل التغييرات", completeText: "أضيفت كل نتيجة إلى سجل الأوامر مع مسار استعادة عند توفره.", return: "العودة إلى المستويات", inspect: "افتح إعداد الاتصال", essential: ["أساسي", "لا تغييرات مجمعة", "يوجهك إلى فحوصات الخصوصية ولا يعطل برامج Google."], low: ["منخفض", "تطبيقات غير أساسية", "كتب وأخبار ووسائط واشتراكات Google عند وجودها."], medium: ["متوسط", "تطبيقات قابلة للاستبدال", "البريد والخرائط والصور والسحابة والفيديو قد تتوقف."], high: ["مرتفع", "خدمات مرتبطة بالنظام", "يعرض البحث والمساعد والمراسلة للمراجعة، وليس لتعطيل جماعي."], total: ["كامل", "مكونات أساسية", "Play services والإطار والمتجر معروضة فقط لمراجعة الخبراء."],
  } : {
    eyebrow: "Device privacy / Google", title: "De‑Google", subtitle: "Review Google services installed on this device before disabling anything.", noDevice: "Connect a device first to calculate matching packages from its local inventory.", choose: "Choose a De-Google level. Higher levels expose more services for review, but core framework components are never bulk-executed.", selected: "Selected level", continue: "Continue to preview", connected: "Local inventory read", preview: "Device preview", previewText: "These packages are actually present on the connected device. There are no fixed counts or universal lists applied to every phone.", noMatches: "No candidates from this level appear in the current local inventory.", reversible: "Reversible User 0 disablement available", review: "Expert review required", command: "Reversible command", acknowledge: "I understand disabling User 0 apps can change vendor integrations or apps that depend on them.", apply: "Disable reversible packages", alternatives: "Alternatives", alternativesText: "These are independent transition-planning ideas, not installations or commercial endorsements.", complete: "Changes recorded", completeText: "Every result was added to the command ledger with a restore path where Android permits it.", return: "Return to levels", inspect: "Open connection setup", essential: ["Essential", "No batch changes", "Directs you to privacy checks and does not disable Google apps."], low: ["Low", "Non-essential apps", "Books, news, media, and subscription apps when present."], medium: ["Medium", "Replaceable user apps", "Mail, maps, photos, cloud, and video can stop working."], high: ["High", "System-adjacent services", "Shows search, assistant, and messaging for review, not bulk disablement."], total: ["Total", "Core components", "Play services, framework, and store remain expert-review only."],
  };

  const getLevelCopy = (id: DeGoogleLevel) => text[id] as [string, string, string];
  const selectLevel = (next: DeGoogleLevel) => { setLevel(next); setConfirmed(false); setCompleted([]); };
  const applyReversible = async () => {
    if (!confirmed || !reversible.length) return;
    setRunning(true);
    const applied: string[] = [];
    for (const candidate of reversible) {
      const succeeded = await disablePackage(candidate.id, `${ar ? "تعطيل De‑Google" : "De‑Google disabled"}: ${candidate.name}`);
      if (succeeded) applied.push(candidate.id);
    }
    setCompleted(applied);
    setRunning(false);
    setStage("completed");
  };

  const candidateRow = (candidate: DeGoogleCandidate, kind: "reversible" | "review") => <article key={candidate.id} className="border border-[#d8d1c4] bg-[#fffdf8] p-4 dark:border-[#2f4860] dark:bg-[#14253a]"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><PackageOpen size={16} className={kind === "review" ? "text-[#934639]" : "text-[#527321]"} /><h3 className="text-sm font-bold">{candidate.name}</h3><span className="status-stamp scale-90 origin-left text-[#59869c]">{candidate.group}</span></div><p className="mono mt-2 break-all text-[0.67rem] text-[#526273] dark:text-[#c7d3dc]">{candidate.id}</p>{candidate.alternative && <p className="mt-2 text-xs leading-5 text-[#526273] dark:text-[#c7d3dc]">{ar ? "بديل للتخطيط:" : "Planning alternative:"} <strong>{candidate.alternative}</strong></p>}</div>{kind === "reversible" ? <span className="status-stamp text-[#527321]">{ar ? "قابل للاستعادة" : "reversible"}</span> : <span className="status-stamp text-[#934639]">{ar ? "لا تنفيذ جماعي" : "no bulk action"}</span>}</div>{kind === "reversible" && <div className="mono mt-3 border-l-2 border-[#c8f04a] bg-[#f3efe6] px-3 py-2 text-[0.63rem] text-[#263d55] dark:bg-[#1b3048] dark:text-[#d7e0e8]">pm disable-user --user 0 {candidate.id}<br />restore → cmd package install-existing --user 0 {candidate.id}</div>}</article>;

  return <section className="space-y-5">
    <div className="degoogle-banner overflow-hidden border border-[#d8d1c4] bg-[#fffdf8] p-5 sm:p-6 dark:border-[#2f4860] dark:bg-[#14253a]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="kicker text-[#527321]">{text.eyebrow}</p><h2 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-[-0.05em]"><Feather className="text-[#527321]" size={29} />{text.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#526273] dark:text-[#c7d3dc]">{text.subtitle}</p></div><span className="state-square shrink-0 border-[#527321] text-[#527321]">DG</span></div>
      <div className="mt-5 grid gap-2 sm:grid-cols-4">{stages.map((label, index) => { const stageId = stageOrder[index]; const isCurrent = stage === stageId; const done = stageOrder.indexOf(stage) > index; return <div key={label} className={`flex items-center gap-2 border-l-2 px-2 py-2 ${isCurrent ? "border-[#c8f04a] bg-[#eef8cd] dark:bg-[#293f22]" : done ? "border-[#59869c] bg-[#f3efe6] dark:bg-[#1b3048]" : "border-[#d8d1c4] bg-transparent"}`}><span className="state-square h-5 w-5 text-[0.55rem]">{done ? <Check size={12} /> : index + 1}</span><span className="text-xs font-semibold">{label}</span></div>; })}</div>
    </div>

    {!isLive && <div className="flex gap-3 border-l-2 border-[#d39152] bg-[#fff2e1] p-4 text-sm leading-6 text-[#6d5133] dark:bg-[#322821] dark:text-[#f0d4a8]"><CircleAlert size={18} className="mt-0.5 shrink-0" /><div><strong>{text.noDevice}</strong><p className="mt-1">{ar ? "لا تعرض اللوحة أو تنفذ حزم De‑Google عامة من دون جرد هذا الهاتف." : "The desk will not display or execute a generic De-Google package list without this phone’s inventory."}</p><Button onClick={openSetup} variant="outline" className="action-button mt-3 border-[#6d5133] text-[#6d5133] dark:border-[#f0d4a8] dark:text-[#f0d4a8]"><ShieldCheck className="mr-2" size={15} />{text.inspect}</Button></div></div>}

    {stage === "level" && <div className="space-y-4"><div><p className="kicker text-[#687584]">{text.selected}</p><h3 className="mt-1 text-2xl font-bold tracking-[-0.04em]">{text.choose}</h3></div><div className="grid gap-3">{DEGOOGLE_LEVELS.map(({ id }) => { const [name, summary, warning] = getLevelCopy(id); const count = isLive ? deGoogleCandidatesFor(id, packages).length : null; const chosen = level === id; return <button key={id} onClick={() => selectLevel(id)} className={`action-button text-left ${chosen ? "ring-2 ring-[#c8f04a]" : ""}`}><div className="service-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center border ${levelTone[id]}`}><Feather size={18} /></div><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold">{name}</h4><span className={`status-stamp scale-90 origin-left ${levelTone[id]}`}>{count === null ? "—" : count} {ar ? "حزمة مطابقة" : "matching packages"}</span></div><p className="mt-1 text-sm text-[#526273] dark:text-[#c7d3dc]">{summary}</p><p className={`mt-2 text-xs leading-5 ${id === "high" || id === "total" ? "text-[#934639] dark:text-[#f1a38e]" : "text-[#687584] dark:text-[#a6b3be]"}`}>⚠ {warning}</p></div></div><span className={`grid h-6 w-6 place-items-center rounded-full border ${chosen ? "border-[#527321] bg-[#eef8cd] text-[#527321]" : "border-[#d8d1c4] text-transparent"}`}>{chosen && <Check size={14} />}</span></div></button>; })}</div><div className="flex justify-end"><Button onClick={() => setStage("preview")} disabled={!isLive} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]"><Eye className="mr-2" size={16} />{text.continue}<ArrowRight className="ml-2" size={16} /></Button></div></div>}

    {stage === "preview" && <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="kicker text-[#687584]">{text.connected}</p><h3 className="mt-1 text-2xl font-bold tracking-[-0.04em]">{text.preview} · {getLevelCopy(level)[0]}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#526273] dark:text-[#c7d3dc]">{text.previewText}</p></div><Button variant="outline" onClick={() => setStage("level")} className="action-button border-[#14253a] dark:border-[#d7e0e8]">{text.return}</Button></div>{!candidates.length ? <div className="service-card p-8 text-center"><ShieldCheck className="mx-auto text-[#527321]" size={28} /><p className="mt-3 text-sm text-[#526273] dark:text-[#c7d3dc]">{text.noMatches}</p></div> : <><div className="grid gap-5 lg:grid-cols-2"><div><div className="mb-3 flex items-center gap-2"><Undo2 size={17} className="text-[#527321]" /><h4 className="font-bold">{text.reversible} ({reversible.length})</h4></div><div className="space-y-3">{reversible.map((candidate) => candidateRow(candidate, "reversible"))}</div></div><div><div className="mb-3 flex items-center gap-2"><ShieldAlert size={17} className="text-[#934639]" /><h4 className="font-bold">{text.review} ({reviewOnly.length})</h4></div><div className="space-y-3">{reviewOnly.map((candidate) => candidateRow(candidate, "review"))}</div></div></div>{reversible.length > 0 && <div className="border border-[#d8d1c4] bg-[#f3efe6] p-4 dark:border-[#2f4860] dark:bg-[#1b3048]"><label className="flex gap-3 text-xs leading-5"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#14253a]" />{text.acknowledge}</label><div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setStage("alternatives")} className="action-button border-[#14253a] dark:border-[#d7e0e8]"><Cloud className="mr-2" size={15} />{text.alternatives}</Button><Button onClick={applyReversible} disabled={!confirmed || running} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]">{running ? "…" : <><ShieldCheck className="mr-2" size={15} />{text.apply}</>}</Button></div></div>}</>}</div>}

    {stage === "alternatives" && <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="kicker text-[#687584]">{getLevelCopy(level)[0]}</p><h3 className="mt-1 text-2xl font-bold tracking-[-0.04em]">{text.alternatives}</h3><p className="mt-2 text-sm leading-6 text-[#526273] dark:text-[#c7d3dc]">{text.alternativesText}</p></div><Button variant="outline" onClick={() => setStage("preview")} className="action-button border-[#14253a] dark:border-[#d7e0e8]">{text.preview}</Button></div><div className="grid gap-3 md:grid-cols-2">{candidates.filter((candidate) => candidate.alternative).map((candidate) => <div key={candidate.id} className="service-card p-4"><div className="flex items-center gap-2"><AlternativeIcon group={candidate.group} /><p className="font-bold">{candidate.group}</p></div><p className="mt-3 text-sm text-[#526273] dark:text-[#c7d3dc]"><strong>{candidate.name}</strong> → {candidate.alternative}</p></div>)}</div><div className="flex justify-end"><Button onClick={() => setStage("preview")} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]">{text.preview}<ChevronRight className="ml-2" size={16} /></Button></div></div>}

    {stage === "completed" && <div className="service-card p-8 text-center"><Check className="mx-auto grid h-11 w-11 place-items-center border border-[#b9da71] bg-[#eef8cd] p-2 text-[#527321]" size={28} /><h3 className="mt-4 text-2xl font-bold tracking-[-0.04em]">{text.complete}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#526273] dark:text-[#c7d3dc]">{text.completeText}</p><p className="mono mt-4 text-xs text-[#59869c]">{completed.length} {ar ? "نتيجة معطلة قابلة للاستعادة" : "reversible disable result(s)"}</p><div className="mt-5 flex justify-center gap-2"><Button variant="outline" onClick={() => setStage("level")} className="action-button border-[#14253a] dark:border-[#d7e0e8]">{text.return}</Button><Button onClick={() => setStage("alternatives")} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]">{text.alternatives}</Button></div></div>}
  </section>;
}

function AlternativeIcon({ group }: { group: string }) {
  if (group === "Mail") return <Mail size={17} className="text-[#59869c]" />;
  if (group === "Maps") return <MapPinned size={17} className="text-[#59869c]" />;
  return <Cloud size={17} className="text-[#59869c]" />;
}
