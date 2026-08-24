/**
 * Field Service Ledger style: a device-specific De-Google review desk with
 * OEM guard context, version-aware alternatives, and explicit User 0 actions.
 */
import { Button } from "@/components/ui/button";
import { DEGOOGLE_LEVELS, deGoogleCandidatesFor, detectOemProfile, getAlternativeMinimumAndroid, getOemProfile, OEM_PROFILES, type AlternativeIcon, type DeGoogleCandidate, type DeGoogleLevel, type OemProfile } from "@/lib/degoogleCatalog";
import { ArrowRight, Check, ChevronRight, CircleAlert, Cloud, ExternalLink, Eye, Feather, FileText, FolderOpen, Image, Mail, MapPinned, MessageSquare, Music2, PackageOpen, Search, ShieldAlert, ShieldCheck, Store, Undo2, Video } from "lucide-react";
import { useMemo, useState } from "react";

type Language = "en" | "ar" | "other";
type Stage = "level" | "preview" | "alternatives" | "completed";

type Props = {
  language: Language;
  isLive: boolean;
  packages: string[];
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
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

function parseAndroidMajor(value?: string) {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function AlternativeGlyph({ icon }: { icon: AlternativeIcon }) {
  const props = { size: 17, className: "text-[#59869c]" };
  if (icon === "mail") return <Mail {...props} />;
  if (icon === "map") return <MapPinned {...props} />;
  if (icon === "image") return <Image {...props} />;
  if (icon === "cloud") return <Cloud {...props} />;
  if (icon === "video") return <Video {...props} />;
  if (icon === "store") return <Store {...props} />;
  if (icon === "notes") return <FileText {...props} />;
  if (icon === "calendar") return <FileText {...props} />;
  if (icon === "contacts" || icon === "message") return <MessageSquare {...props} />;
  if (icon === "music") return <Music2 {...props} />;
  if (icon === "files") return <FolderOpen {...props} />;
  return <Search {...props} />;
}

export function DeGoogleWorkspace({ language, isLive, packages, manufacturer, model, androidVersion, disablePackage, openSetup }: Props) {
  const ar = language === "ar";
  const [level, setLevel] = useState<DeGoogleLevel>("essential");
  const [stage, setStage] = useState<Stage>("level");
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [profileChoice, setProfileChoice] = useState<"auto" | OemProfile["id"]>("auto");
  const [alternativeQuery, setAlternativeQuery] = useState("");
  const [alternativeCategory, setAlternativeCategory] = useState("all");
  const [compatibleOnly, setCompatibleOnly] = useState(false);
  const detectedProfile = useMemo(() => detectOemProfile(manufacturer), [manufacturer]);
  const activeProfile = profileChoice === "auto" ? detectedProfile : getOemProfile(profileChoice);
  const candidates = useMemo(() => deGoogleCandidatesFor(level, packages, activeProfile), [level, packages, activeProfile]);
  const reversible = candidates.filter((candidate) => candidate.action === "disable");
  const reviewOnly = candidates.filter((candidate) => candidate.action === "review");
  const androidMajor = parseAndroidMajor(androidVersion);
  const stageOrder: Stage[] = ["level", "preview", "alternatives", "completed"];
  const stageLabels = ar ? ["اختيار المستوى", "المعاينة", "البدائل", "مكتمل"] : ["Select level", "Preview", "Alternatives", "Completed"];
  const text = ar ? {
    eyebrow: "خصوصية الجهاز / Google", title: "De‑Google", subtitle: "راجع خدمات Google المثبتة على هذا الجهاز قبل تعطيل أي شيء.",
    noDevice: "صِل جهازاً أولاً لحساب الحزم المطابقة من جرده المحلي.", choose: "اختر مستوى إزالة Google. المستويات الأعلى توسع المراجعة، لكن مكونات الإطار الأساسية لا تنفذ بشكل جماعي.",
    selected: "المستوى المحدد", continue: "متابعة إلى المعاينة", preview: "معاينة الجهاز", previewText: "هذه الحزم موجودة بالفعل على الجهاز المتصل. لا تطبق اللوحة عدادات ثابتة أو قائمة عامة على كل هاتف.",
    noMatches: "لا توجد حزم مرشحة من هذا المستوى في الجرد المحلي الحالي.", reversible: "تعطيل قابل للاستعادة للمستخدم 0", review: "يتطلب مراجعة خبيرة", acknowledge: "أفهم أن تعطيل تطبيقات المستخدم 0 قد يغير التكاملات أو التطبيقات التابعة للشركة.",
    apply: "تعطيل الحزم القابلة للاستعادة", alternatives: "البدائل", alternativesText: "هذه روابط انتقال يختارها المستخدم. لا يتم تنزيل أو تثبيت أي تطبيق تلقائياً.",
    return: "العودة إلى المستويات", inspect: "افتح إعداد الاتصال", complete: "تم تسجيل التغييرات", completeText: "أضيفت كل نتيجة إلى سجل الأوامر المحلي مع مسار استعادة عند توفره.",
    profile: "ملف الشركة المصنعة", auto: "تلقائي من الجهاز", profileContext: "سياق الحماية", model: "الطراز", search: "ابحث في البدائل", allCategories: "كل الفئات", compatible: "متوافق الآن", unknown: "الحد الأدنى غير متحقق", requires: "يتطلب Android", currentAndroid: "Android للجهاز", noResults: "لا توجد بدائل مطابقة لهذه المرشحات.", direct: "فتح الرابط المباشر", source: "المصدر", guard: "حاجز OEM", noBulk: "لا تنفيذ جماعي", restore: "قابل للاستعادة",
    essential: ["أساسي", "لا تغييرات مجمعة", "يوجهك إلى فحوصات الخصوصية ولا يعطل برامج Google."], low: ["منخفض", "تطبيقات غير أساسية", "كتب وأخبار ووسائط واشتراكات Google عند وجودها."], medium: ["متوسط", "تطبيقات قابلة للاستبدال", "البريد والخرائط والصور والسحابة والفيديو قد تتوقف."], high: ["مرتفع", "خدمات مرتبطة بالنظام", "يعرض البحث والمساعد والمراسلة للمراجعة فقط."], total: ["كامل", "مكونات أساسية", "تظل Play services والإطار والمتجر للمراجعة الخبيرة فقط."],
  } : {
    eyebrow: "Device privacy / Google", title: "De‑Google", subtitle: "Review Google services installed on this device before disabling anything.",
    noDevice: "Connect a device first to calculate matching packages from its local inventory.", choose: "Choose a De-Google level. Higher levels widen the review, but core framework components are never bulk-executed.",
    selected: "Selected level", continue: "Continue to preview", preview: "Device preview", previewText: "These packages are actually present on the connected device. The desk never applies fixed counts or a generic list to every phone.",
    noMatches: "No candidates from this level appear in the current local inventory.", reversible: "Reversible User 0 disablement", review: "Expert review required", acknowledge: "I understand disabling User 0 apps can change vendor integrations or dependent apps.",
    apply: "Disable reversible packages", alternatives: "Alternatives", alternativesText: "These are user-chosen transition links. No app is downloaded or installed automatically.",
    return: "Return to levels", inspect: "Open connection setup", complete: "Changes recorded", completeText: "Every result was added to the local command ledger with a restore path where Android permits it.",
    profile: "OEM profile", auto: "Auto-detect from device", profileContext: "Protection context", model: "Model", search: "Search alternatives", allCategories: "All categories", compatible: "Compatible now", unknown: "Minimum not verified", requires: "Requires Android", currentAndroid: "Device Android", noResults: "No alternatives match these filters.", direct: "Open direct link", source: "Source", guard: "OEM guard", noBulk: "no bulk action", restore: "reversible",
    essential: ["Essential", "No batch changes", "Directs you to privacy checks and does not disable Google apps."], low: ["Low", "Non-essential apps", "Books, news, media, and subscription apps when present."], medium: ["Medium", "Replaceable user apps", "Mail, maps, photos, cloud, and video can stop working."], high: ["High", "System-adjacent services", "Shows search, assistant, and messaging for review only."], total: ["Total", "Core components", "Play services, framework, and store remain expert-review only."],
  };
  const getLevelCopy = (id: DeGoogleLevel) => text[id] as [string, string, string];
  const alternativeEntries = useMemo(() => candidates.flatMap((candidate) => (candidate.alternatives ?? []).map((alternative) => ({ candidate, alternative, category: candidate.group }))), [candidates]);
  const categories = useMemo(() => Array.from(new Set(alternativeEntries.map((item) => item.category))).sort(), [alternativeEntries]);
  const filteredAlternatives = useMemo(() => alternativeEntries.filter(({ candidate, alternative, category }) => {
    const query = alternativeQuery.trim().toLowerCase();
    const searchable = `${alternative.name} ${candidate.name} ${category} ${alternative.source}`.toLowerCase();
    const minimum = getAlternativeMinimumAndroid(alternative);
    const meetsKnownMinimum = androidMajor !== undefined && minimum !== undefined && androidMajor >= minimum;
    return (!query || searchable.includes(query)) && (alternativeCategory === "all" || category === alternativeCategory) && (!compatibleOnly || meetsKnownMinimum);
  }), [alternativeEntries, alternativeCategory, alternativeQuery, androidMajor, compatibleOnly]);

  const selectLevel = (next: DeGoogleLevel) => { setLevel(next); setConfirmed(false); setCompleted([]); };
  const applyReversible = async () => {
    if (!confirmed || !reversible.length) return;
    setRunning(true);
    const applied: string[] = [];
    for (const candidate of reversible) {
      if (await disablePackage(candidate.id, `${ar ? "تعطيل De‑Google" : "De‑Google disabled"}: ${candidate.name}`)) applied.push(candidate.id);
    }
    setCompleted(applied);
    setRunning(false);
    setStage("completed");
  };

  const packageCard = (candidate: DeGoogleCandidate, mode: "reversible" | "review") => <article key={candidate.id} className="border border-[#d8d1c4] bg-[#fffdf8] p-4 dark:border-[#2f4860] dark:bg-[#14253a]"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><PackageOpen size={16} className={mode === "review" ? "text-[#934639]" : "text-[#527321]"} /><h4 className="text-sm font-bold">{candidate.name}</h4><span className="status-stamp scale-90 origin-left text-[#59869c]">{candidate.group}</span></div><p className="mono mt-2 break-all text-[0.67rem] text-[#526273] dark:text-[#c7d3dc]">{candidate.id}</p>{candidate.alternatives?.length ? <p className="mt-2 text-xs text-[#526273] dark:text-[#c7d3dc]">{candidate.alternatives.map((item) => item.name).join(" · ")}</p> : null}</div><div className="flex flex-wrap gap-2">{candidate.profileGuard ? <span className="status-stamp text-[#934639]">{text.guard}</span> : null}<span className={`status-stamp ${mode === "review" ? "text-[#934639]" : "text-[#527321]"}`}>{mode === "review" ? text.noBulk : text.restore}</span></div></div>{mode === "reversible" ? <div className="mono mt-3 border-l-2 border-[#c8f04a] bg-[#f3efe6] px-3 py-2 text-[0.63rem] text-[#263d55] dark:bg-[#1b3048] dark:text-[#d7e0e8]">pm disable-user --user 0 {candidate.id}<br />restore → cmd package install-existing --user 0 {candidate.id}</div> : null}</article>;

  return <section className="space-y-5">
    <div className="degoogle-banner overflow-hidden border border-[#d8d1c4] bg-[#fffdf8] p-5 sm:p-6 dark:border-[#2f4860] dark:bg-[#14253a]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="kicker text-[#527321]">{text.eyebrow}</p><h2 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-[-0.05em]"><Feather className="text-[#527321]" size={29} />{text.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#526273] dark:text-[#c7d3dc]">{text.subtitle}</p></div><span className="state-square shrink-0 border-[#527321] text-[#527321]">DG</span></div><div className="mt-5 grid gap-2 sm:grid-cols-4">{stageLabels.map((label, index) => { const current = stage === stageOrder[index]; const done = stageOrder.indexOf(stage) > index; return <div key={label} className={`flex items-center gap-2 border-l-2 px-2 py-2 ${current ? "border-[#c8f04a] bg-[#eef8cd] dark:bg-[#293f22]" : done ? "border-[#59869c] bg-[#f3efe6] dark:bg-[#1b3048]" : "border-[#d8d1c4]"}`}><span className="state-square h-5 w-5 text-[0.55rem]">{done ? <Check size={12} /> : index + 1}</span><span className="text-xs font-semibold">{label}</span></div>; })}</div></div>

    <div className="border border-[#d8d1c4] bg-[#f3efe6] p-4 dark:border-[#2f4860] dark:bg-[#1b3048]"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="kicker text-[#59869c]">{text.profileContext}</p><div className="mt-1 flex flex-wrap items-center gap-2"><h3 className="font-bold">{text.profile}</h3><span className="status-stamp text-[#527321]">{profileChoice === "auto" ? `${ar ? detectedProfile.labelAr : detectedProfile.label}` : ar ? activeProfile.labelAr : activeProfile.label}</span>{model ? <span className="mono text-[0.65rem] text-[#687584] dark:text-[#a6b3be]">{text.model}: {model}</span> : null}</div><p className="mt-2 max-w-3xl text-xs leading-5 text-[#526273] dark:text-[#c7d3dc]">{ar ? activeProfile.noticeAr : activeProfile.notice}</p></div><select aria-label={text.profile} value={profileChoice} onChange={(event) => setProfileChoice(event.target.value as "auto" | OemProfile["id"])} className="h-10 min-w-52 border border-[#14253a] bg-[#fffdf8] px-3 text-xs dark:border-[#d7e0e8] dark:bg-[#14253a]"><option value="auto">{text.auto}{manufacturer ? ` · ${manufacturer}` : ""}</option>{OEM_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{ar ? profile.labelAr : profile.label}</option>)}</select></div></div>

    {!isLive ? <div className="flex gap-3 border-l-2 border-[#d39152] bg-[#fff2e1] p-4 text-sm leading-6 text-[#6d5133] dark:bg-[#322821] dark:text-[#f0d4a8]"><CircleAlert size={18} className="mt-0.5 shrink-0" /><div><strong>{text.noDevice}</strong><p className="mt-1">{ar ? "لا تعرض اللوحة أو تنفذ قائمة عامة بدون جرد الهاتف." : "The desk will not display or execute a generic package list without this phone’s inventory."}</p><Button onClick={openSetup} variant="outline" className="action-button mt-3 border-[#6d5133] text-[#6d5133] dark:border-[#f0d4a8] dark:text-[#f0d4a8]"><ShieldCheck className="mr-2" size={15} />{text.inspect}</Button></div></div> : null}

    {stage === "level" ? <div className="space-y-4"><div><p className="kicker text-[#687584]">{text.selected}</p><h3 className="mt-1 text-2xl font-bold tracking-[-0.04em]">{text.choose}</h3></div><div className="grid gap-3">{DEGOOGLE_LEVELS.map(({ id }) => { const [name, summary, warning] = getLevelCopy(id); const count = isLive ? deGoogleCandidatesFor(id, packages, activeProfile).length : null; const chosen = level === id; return <button key={id} onClick={() => selectLevel(id)} className={`action-button text-left ${chosen ? "ring-2 ring-[#c8f04a]" : ""}`}><div className="service-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className={`grid h-10 w-10 shrink-0 place-items-center border ${levelTone[id]}`}><Feather size={18} /></div><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold">{name}</h4><span className={`status-stamp scale-90 origin-left ${levelTone[id]}`}>{count === null ? "—" : count} {ar ? "حزمة مطابقة" : "matching packages"}</span></div><p className="mt-1 text-sm text-[#526273] dark:text-[#c7d3dc]">{summary}</p><p className={`mt-2 text-xs leading-5 ${id === "high" || id === "total" ? "text-[#934639] dark:text-[#f1a38e]" : "text-[#687584] dark:text-[#a6b3be]"}`}>⚠ {warning}</p></div></div><span className={`grid h-6 w-6 place-items-center rounded-full border ${chosen ? "border-[#527321] bg-[#eef8cd] text-[#527321]" : "border-[#d8d1c4] text-transparent"}`}>{chosen ? <Check size={14} /> : null}</span></div></button>; })}</div><div className="flex justify-end"><Button onClick={() => setStage("preview")} disabled={!isLive} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]"><Eye className="mr-2" size={16} />{text.continue}<ArrowRight className="ml-2" size={16} /></Button></div></div> : null}

    {stage === "preview" ? <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="kicker text-[#687584]">{androidMajor ? `${text.currentAndroid} ${androidMajor}` : text.preview}</p><h3 className="mt-1 text-2xl font-bold tracking-[-0.04em]">{text.preview} · {getLevelCopy(level)[0]}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#526273] dark:text-[#c7d3dc]">{text.previewText}</p></div><Button variant="outline" onClick={() => setStage("level")} className="action-button border-[#14253a] dark:border-[#d7e0e8]">{text.return}</Button></div>{!candidates.length ? <div className="service-card p-8 text-center"><ShieldCheck className="mx-auto text-[#527321]" size={28} /><p className="mt-3 text-sm text-[#526273] dark:text-[#c7d3dc]">{text.noMatches}</p></div> : <><div className="grid gap-5 lg:grid-cols-2"><div><div className="mb-3 flex items-center gap-2"><Undo2 size={17} className="text-[#527321]" /><h4 className="font-bold">{text.reversible} ({reversible.length})</h4></div><div className="space-y-3">{reversible.map((candidate) => packageCard(candidate, "reversible"))}</div></div><div><div className="mb-3 flex items-center gap-2"><ShieldAlert size={17} className="text-[#934639]" /><h4 className="font-bold">{text.review} ({reviewOnly.length})</h4></div><div className="space-y-3">{reviewOnly.map((candidate) => packageCard(candidate, "review"))}</div></div></div>{reversible.length ? <div className="border border-[#d8d1c4] bg-[#f3efe6] p-4 dark:border-[#2f4860] dark:bg-[#1b3048]"><label className="flex gap-3 text-xs leading-5"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#14253a]" />{text.acknowledge}</label><div className="mt-4 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setStage("alternatives")} className="action-button border-[#14253a] dark:border-[#d7e0e8]"><Cloud className="mr-2" size={15} />{text.alternatives}</Button><Button onClick={applyReversible} disabled={!confirmed || running} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]">{running ? "…" : <><ShieldCheck className="mr-2" size={15} />{text.apply}</>}</Button></div></div> : <div className="flex justify-end"><Button onClick={() => setStage("alternatives")} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]"><Cloud className="mr-2" size={15} />{text.alternatives}</Button></div>}</>}</div> : null}

    {stage === "alternatives" ? <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="kicker text-[#687584]">{getLevelCopy(level)[0]}</p><h3 className="mt-1 text-2xl font-bold tracking-[-0.04em]">{text.alternatives}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[#526273] dark:text-[#c7d3dc]">{text.alternativesText}</p></div><Button variant="outline" onClick={() => setStage("preview")} className="action-button border-[#14253a] dark:border-[#d7e0e8]">{text.preview}</Button></div><div className="grid gap-3 border border-[#d8d1c4] bg-[#f3efe6] p-4 md:grid-cols-[1fr_auto_auto] dark:border-[#2f4860] dark:bg-[#1b3048]"><label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687584]" /><input value={alternativeQuery} onChange={(event) => setAlternativeQuery(event.target.value)} placeholder={text.search} className="h-10 w-full border border-[#14253a] bg-[#fffdf8] pl-9 pr-3 text-sm dark:border-[#d7e0e8] dark:bg-[#14253a]" /></label><select aria-label={text.allCategories} value={alternativeCategory} onChange={(event) => setAlternativeCategory(event.target.value)} className="h-10 border border-[#14253a] bg-[#fffdf8] px-3 text-xs dark:border-[#d7e0e8] dark:bg-[#14253a]"><option value="all">{text.allCategories}</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={compatibleOnly} onChange={(event) => setCompatibleOnly(event.target.checked)} disabled={androidMajor === undefined} className="h-4 w-4 accent-[#14253a]" />{text.compatible}</label></div><p className="mono text-[0.67rem] text-[#687584] dark:text-[#a6b3be]">{androidMajor ? `${text.currentAndroid}: ${androidMajor}` : `${text.currentAndroid}: —`}</p><div className="grid gap-3 md:grid-cols-2">{filteredAlternatives.map(({ candidate, alternative }) => { const minimum = getAlternativeMinimumAndroid(alternative); const compatible = androidMajor !== undefined && minimum !== undefined && androidMajor >= minimum; const incompatible = androidMajor !== undefined && minimum !== undefined && androidMajor < minimum; return <article key={`${candidate.id}-${alternative.name}`} className="service-card p-4"><div className="flex items-center gap-2"><AlternativeGlyph icon={alternative.icon} /><h4 className="font-bold">{alternative.name}</h4><span className="status-stamp scale-90 origin-left text-[#59869c]">{alternative.source}</span></div><p className="mt-3 text-sm text-[#526273] dark:text-[#c7d3dc]"><strong>{candidate.name}</strong> → {candidate.group}</p><div className={`mt-3 inline-flex border px-2 py-1 text-xs ${compatible ? "border-[#b9da71] bg-[#eef8cd] text-[#527321]" : incompatible ? "border-[#dba193] bg-[#fbe5df] text-[#934639]" : "border-[#d8d1c4] bg-[#f3efe6] text-[#687584] dark:border-[#2f4860] dark:bg-[#1b3048] dark:text-[#c7d3dc]"}`}>{minimum === undefined ? text.unknown : compatible ? `${text.compatible} · Android ${androidMajor}` : `${text.requires} ${minimum}+`}</div><a href={alternative.url} target="_blank" rel="noreferrer noopener" className="action-button mt-4 inline-flex items-center gap-2 border border-[#14253a] px-3 py-2 text-xs font-semibold text-[#14253a] hover:bg-[#e6f4bb] dark:border-[#d7e0e8] dark:text-[#d7e0e8] dark:hover:bg-[#293f22]"><ExternalLink size={14} />{text.direct}</a></article>; })}</div>{!filteredAlternatives.length ? <div className="service-card p-8 text-center"><Search className="mx-auto text-[#59869c]" size={26} /><p className="mt-3 text-sm text-[#526273] dark:text-[#c7d3dc]">{text.noResults}</p></div> : null}</div> : null}

    {stage === "completed" ? <div className="service-card p-8 text-center"><Check className="mx-auto grid h-11 w-11 place-items-center border border-[#b9da71] bg-[#eef8cd] p-2 text-[#527321]" size={28} /><h3 className="mt-4 text-2xl font-bold tracking-[-0.04em]">{text.complete}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#526273] dark:text-[#c7d3dc]">{text.completeText}</p><p className="mono mt-4 text-xs text-[#59869c]">{completed.length} {ar ? "نتيجة قابلة للاستعادة" : "reversible result(s)"}</p><div className="mt-5 flex justify-center gap-2"><Button variant="outline" onClick={() => setStage("level")} className="action-button border-[#14253a] dark:border-[#d7e0e8]">{text.return}</Button><Button onClick={() => setStage("alternatives")} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]">{text.alternatives}</Button></div></div> : null}
  </section>;
}
