/**
 * Field Service Ledger style: receipt history stays in browser-local storage
 * unless the operator explicitly exports it in readable or encrypted form.
 */
import { Button } from "@/components/ui/button";
import { Download, FileText, History, LockKeyhole, Plus, Search, ShieldCheck, Tag, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

export type HistoryReceipt = {
  label: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  at: string;
  authority: "USB" | "Root" | "Browser";
  restore?: string;
  tags?: string[];
};

type Range = "all" | "24h" | "7d" | "30d" | "custom";

function localTime(value: string, language: "en" | "ar" | "other") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

export function ReceiptHistoryWorkspace({
  language,
  history,
  remove,
  clear,
  updateTags,
  exportHistory,
  protectHistory,
}: {
  language: "en" | "ar" | "other";
  history: HistoryReceipt[];
  remove: (key: string) => void;
  clear: () => void;
  updateTags: (key: string, tags: string[]) => void;
  exportHistory: (format: "json" | "md") => void;
  protectHistory: (password: string) => Promise<void>;
}) {
  const isArabic = language === "ar";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "errors" | "restore">("all");
  const [range, setRange] = useState<Range>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [draftTags, setDraftTags] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [protecting, setProtecting] = useState(false);
  const keyFor = (receipt: HistoryReceipt) => `${receipt.at}-${receipt.command}-${receipt.label}`;
  const allTags = useMemo(() => Array.from(new Set(history.flatMap((receipt) => receipt.tags || []))).sort((left, right) => left.localeCompare(right)), [history]);
  const visible = useMemo(() => {
    const now = Date.now();
    const rangeStart = range === "24h" ? now - 86_400_000 : range === "7d" ? now - 604_800_000 : range === "30d" ? now - 2_592_000_000 : undefined;
    const fromTime = from ? new Date(`${from}T00:00:00`).getTime() : undefined;
    const toTime = to ? new Date(`${to}T23:59:59`).getTime() : undefined;
    return history.filter((receipt) => {
      const text = `${receipt.label} ${receipt.command} ${receipt.stdout} ${receipt.stderr} ${(receipt.tags || []).join(" ")}`.toLowerCase();
      const receiptTime = new Date(receipt.at).getTime();
      const rangeMatches = range === "custom" ? (!fromTime || receiptTime >= fromTime) && (!toTime || receiptTime <= toTime) : (!rangeStart || receiptTime >= rangeStart);
      return rangeMatches && (!query || text.includes(query.toLowerCase())) && (filter === "all" || (filter === "errors" ? receipt.exitCode !== 0 : Boolean(receipt.restore))) && (tagFilter === "all" || (receipt.tags || []).includes(tagFilter));
    });
  }, [history, query, filter, range, from, to, tagFilter]);

  const addTag = (receipt: HistoryReceipt) => {
    const key = keyFor(receipt);
    const next = (draftTags[key] || "").trim().replace(/\s+/g, " ").slice(0, 40);
    if (!next || (receipt.tags || []).includes(next)) return;
    updateTags(key, [...(receipt.tags || []), next]);
    setDraftTags((current) => ({ ...current, [key]: "" }));
  };

  const removeTag = (receipt: HistoryReceipt, tag: string) => updateTags(keyFor(receipt), (receipt.tags || []).filter((candidate) => candidate !== tag));

  const createProtectedArchive = async () => {
    setProtecting(true);
    try {
      await protectHistory(password);
      setPassword("");
    } finally {
      setProtecting(false);
    }
  };

  return <section className="space-y-5">
    <div className="service-card p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="kicker text-[#687584]">{isArabic ? "أرشيف محلي / سجل الأوامر" : "Local archive / command ledger"}</p><h2 className="mt-1 text-3xl font-bold tracking-[-0.05em]">{isArabic ? "راجع الإيصالات السابقة من هذا المتصفح." : "Review prior receipts from this browser."}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#526273]">{isArabic ? "تُخزن الإيصالات في مساحة التخزين المحلية للمتصفح فقط. احذف السجل أو صدّره متى شئت؛ لا تُرسل بيانات الجهاز إلى خادم." : "Receipts are kept only in this browser’s local storage. Remove or export them whenever you choose; no device data is sent to a server."}</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => exportHistory("json")} variant="outline" className="action-button border-[#14253a]"><Download className="mr-2" size={15} />JSON</Button><Button onClick={() => exportHistory("md")} variant="outline" className="action-button border-[#14253a]"><FileText className="mr-2" size={15} />Markdown</Button><Button onClick={clear} variant="outline" className="action-button border-[#934639] text-[#934639] hover:bg-[#fbe5df]"><Trash2 className="mr-2" size={15} />{isArabic ? "مسح السجل" : "Clear history"}</Button></div></div>
      <div className="mt-6 grid gap-3 border-t border-[#d8d1c4] pt-5 lg:grid-cols-[1fr_auto_auto]"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687584]" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isArabic ? "ابحث في الأوامر أو النتائج أو الوسوم" : "Search commands, results, or tags"} className="h-10 w-full border border-[#d8d1c4] bg-[#fffdf8] pl-9 pr-3 text-sm outline-none focus:border-[#14253a]" /></div><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="h-10 border border-[#d8d1c4] bg-[#fffdf8] px-3 text-sm"><option value="all">{isArabic ? "كل الإيصالات" : "All receipts"}</option><option value="errors">{isArabic ? "الأخطاء فقط" : "Errors only"}</option><option value="restore">{isArabic ? "تحتوي على استعادة" : "Has restore path"}</option></select><select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="h-10 border border-[#d8d1c4] bg-[#fffdf8] px-3 text-sm"><option value="all">{isArabic ? "كل الوسوم" : "All tags"}</option>{allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr_1fr]"><select value={range} onChange={(event) => setRange(event.target.value as Range)} className="h-10 border border-[#d8d1c4] bg-[#fffdf8] px-3 text-sm"><option value="all">{isArabic ? "كل الوقت" : "All time"}</option><option value="24h">{isArabic ? "آخر 24 ساعة" : "Last 24 hours"}</option><option value="7d">{isArabic ? "آخر 7 أيام" : "Last 7 days"}</option><option value="30d">{isArabic ? "آخر 30 يوماً" : "Last 30 days"}</option><option value="custom">{isArabic ? "نطاق مخصص" : "Custom range"}</option></select>{range === "custom" && <><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label={isArabic ? "من تاريخ" : "From date"} className="h-10 border border-[#d8d1c4] bg-[#fffdf8] px-3 text-sm" /><input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label={isArabic ? "إلى تاريخ" : "To date"} className="h-10 border border-[#d8d1c4] bg-[#fffdf8] px-3 text-sm" /></>}</div>
    </div>
    <div className="service-card border-[#527321] bg-[#eef8cd] p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-3"><LockKeyhole size={19} className="mt-0.5 shrink-0 text-[#527321]" /><div><p className="kicker text-[#527321]">{isArabic ? "أرشيف محمي" : "Protected archive"}</p><p className="mt-1 text-sm leading-5 text-[#35501c]">{isArabic ? "صدّر نسخة محلية مشفرة بكلمة مرور باستخدام AES-GCM. لا تُحفظ كلمة المرور أو ترسل خارج المتصفح." : "Export a local AES-GCM encrypted copy with a password. The password is never stored or sent outside this browser."}</p></div></div><div className="flex w-full gap-2 lg:max-w-md"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isArabic ? "كلمة مرور (10 أحرف على الأقل)" : "Password (10+ characters)"} className="h-10 min-w-0 flex-1 border border-[#b9da71] bg-white px-3 text-sm outline-none focus:border-[#527321]" /><Button onClick={createProtectedArchive} disabled={protecting || password.length < 10} className="action-button bg-[#35501c] text-white hover:bg-[#527321]"><LockKeyhole className="mr-2" size={15} />{isArabic ? "تصدير مشفر" : "Encrypt export"}</Button></div></div></div>
    {!visible.length ? <div className="service-card p-10 text-center"><History className="mx-auto text-[#59869c]" size={28} /><h3 className="mt-4 text-lg font-bold">{isArabic ? "لا توجد إيصالات مطابقة." : "No matching receipts."}</h3><p className="mt-2 text-sm text-[#526273]">{isArabic ? "ستظهر هنا كل عملية جديدة بعد إضافتها إلى سجل الأوامر." : "New operations will appear here after they are added to the command ledger."}</p></div> : <div className="space-y-3">{visible.map((receipt) => <article key={keyFor(receipt)} className="service-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`status-stamp ${receipt.exitCode === 0 ? "text-[#527321]" : "text-[#934639]"}`}>{receipt.authority}</span><span className="status-stamp text-[#687584]">{receipt.exitCode === 0 ? (isArabic ? "اكتمل" : "completed") : (isArabic ? "يتطلب المراجعة" : "needs review")}</span><span className="mono text-[0.65rem] text-[#687584]">{localTime(receipt.at, language)}</span></div><h3 className="mt-3 font-bold">{receipt.label}</h3><p className="mono mt-2 break-all text-xs leading-5 text-[#526273]">{receipt.command}</p></div><button onClick={() => remove(keyFor(receipt))} className="action-button inline-flex items-center gap-1 self-start border border-[#d8d1c4] px-2 py-1.5 text-xs text-[#687584] hover:border-[#934639] hover:text-[#934639]"><Trash2 size={14} />{isArabic ? "إزالة" : "Remove"}</button></div><div className={`mono mt-4 whitespace-pre-wrap border-l-2 p-3 text-[0.7rem] leading-5 ${receipt.stderr ? "border-[#d39152] bg-[#fff2e1] text-[#6d5133]" : "border-[#59869c] bg-[#f3efe6] text-[#526273]"}`}>{receipt.stderr || receipt.stdout || (isArabic ? "لا توجد مخرجات مسجلة." : "No output recorded.")}</div><div className="mt-3 flex flex-wrap items-center gap-2"><Tag size={14} className="text-[#59869c]" />{(receipt.tags || []).map((tag) => <button onClick={() => removeTag(receipt, tag)} key={tag} className="action-button inline-flex items-center gap-1 border border-[#b9da71] bg-[#eef8cd] px-2 py-1 text-[0.65rem] text-[#35501c] hover:border-[#527321]"><span>{tag}</span><X size={12} /></button>)}<input value={draftTags[keyFor(receipt)] || ""} onChange={(event) => setDraftTags((current) => ({ ...current, [keyFor(receipt)]: event.target.value }))} onKeyDown={(event) => event.key === "Enter" && addTag(receipt)} placeholder={isArabic ? "أضف وسماً" : "Add tag"} className="h-7 w-28 border border-[#d8d1c4] bg-[#fffdf8] px-2 text-xs outline-none focus:border-[#59869c]" /><button onClick={() => addTag(receipt)} className="action-button grid h-7 w-7 place-items-center border border-[#59869c] text-[#59869c] hover:bg-[#e6f4bb]" aria-label={isArabic ? "إضافة وسم" : "Add tag"}><Plus size={14} /></button></div>{receipt.restore && <div className="mt-3 flex gap-2 border-l-2 border-[#c8f04a] bg-[#eef8cd] p-3"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#527321]" /><p className="mono text-[0.68rem] text-[#35501c]">{isArabic ? "مسار الاستعادة: " : "Restore path: "}{receipt.restore}</p></div>}</article>)}</div>}
  </section>;
}
