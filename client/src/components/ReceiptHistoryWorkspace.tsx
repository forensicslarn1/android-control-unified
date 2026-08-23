/**
 * Field Service Ledger style: historical receipts are a local audit shelf.
 * They never leave browser storage unless the operator chooses an export.
 */
import { Button } from "@/components/ui/button";
import { Download, FileText, History, Search, ShieldCheck, Trash2 } from "lucide-react";
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
};

function localTime(value: string, language: "en" | "ar" | "other") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value));
}

export function ReceiptHistoryWorkspace({
  language,
  history,
  remove,
  clear,
  exportHistory,
}: {
  language: "en" | "ar" | "other";
  history: HistoryReceipt[];
  remove: (key: string) => void;
  clear: () => void;
  exportHistory: (format: "json" | "md") => void;
}) {
  const isArabic = language === "ar";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "errors" | "restore">("all");
  const visible = useMemo(() => history.filter((receipt) => {
    const text = `${receipt.label} ${receipt.command} ${receipt.stdout} ${receipt.stderr}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (filter === "all" || (filter === "errors" ? receipt.exitCode !== 0 : Boolean(receipt.restore)));
  }), [history, query, filter]);
  const keyFor = (receipt: HistoryReceipt) => `${receipt.at}-${receipt.command}-${receipt.label}`;

  return <section className="space-y-5">
    <div className="service-card p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="kicker text-[#687584]">{isArabic ? "أرشيف محلي / سجل الأوامر" : "Local archive / command ledger"}</p><h2 className="mt-1 text-3xl font-bold tracking-[-0.05em]">{isArabic ? "راجع الإيصالات السابقة من هذا المتصفح." : "Review prior receipts from this browser."}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#526273]">{isArabic ? "تُخزن الإيصالات في مساحة التخزين المحلية للمتصفح فقط. احذف السجل أو صدّره متى شئت؛ لا تُرسل بيانات الجهاز إلى خادم." : "Receipts are kept only in this browser’s local storage. Remove or export them whenever you choose; no device data is sent to a server."}</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => exportHistory("json")} variant="outline" className="action-button border-[#14253a]"><Download className="mr-2" size={15} />JSON</Button><Button onClick={() => exportHistory("md")} variant="outline" className="action-button border-[#14253a]"><FileText className="mr-2" size={15} />Markdown</Button><Button onClick={clear} variant="outline" className="action-button border-[#934639] text-[#934639] hover:bg-[#fbe5df]"><Trash2 className="mr-2" size={15} />{isArabic ? "مسح السجل" : "Clear history"}</Button></div></div>
      <div className="mt-6 flex flex-col gap-3 border-t border-[#d8d1c4] pt-5 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687584]" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isArabic ? "ابحث في الأوامر أو النتائج" : "Search commands or results"} className="h-10 w-full border border-[#d8d1c4] bg-[#fffdf8] pl-9 pr-3 text-sm outline-none focus:border-[#14253a]" /></div><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="h-10 border border-[#d8d1c4] bg-[#fffdf8] px-3 text-sm"><option value="all">{isArabic ? "كل الإيصالات" : "All receipts"}</option><option value="errors">{isArabic ? "الأخطاء فقط" : "Errors only"}</option><option value="restore">{isArabic ? "تحتوي على استعادة" : "Has restore path"}</option></select></div>
    </div>
    {!visible.length ? <div className="service-card p-10 text-center"><History className="mx-auto text-[#59869c]" size={28} /><h3 className="mt-4 text-lg font-bold">{isArabic ? "لا توجد إيصالات مطابقة." : "No matching receipts."}</h3><p className="mt-2 text-sm text-[#526273]">{isArabic ? "ستظهر هنا كل عملية جديدة بعد إضافتها إلى سجل الأوامر." : "New operations will appear here after they are added to the command ledger."}</p></div> : <div className="space-y-3">{visible.map((receipt) => <article key={keyFor(receipt)} className="service-card p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`status-stamp ${receipt.exitCode === 0 ? "text-[#527321]" : "text-[#934639]"}`}>{receipt.authority}</span><span className="status-stamp text-[#687584]">{receipt.exitCode === 0 ? (isArabic ? "اكتمل" : "completed") : (isArabic ? "يتطلب المراجعة" : "needs review")}</span><span className="mono text-[0.65rem] text-[#687584]">{localTime(receipt.at, language)}</span></div><h3 className="mt-3 font-bold">{receipt.label}</h3><p className="mono mt-2 break-all text-xs leading-5 text-[#526273]">{receipt.command}</p></div><button onClick={() => remove(keyFor(receipt))} className="action-button inline-flex items-center gap-1 self-start border border-[#d8d1c4] px-2 py-1.5 text-xs text-[#687584] hover:border-[#934639] hover:text-[#934639]"><Trash2 size={14} />{isArabic ? "إزالة" : "Remove"}</button></div><div className={`mono mt-4 whitespace-pre-wrap border-l-2 p-3 text-[0.7rem] leading-5 ${receipt.stderr ? "border-[#d39152] bg-[#fff2e1] text-[#6d5133]" : "border-[#59869c] bg-[#f3efe6] text-[#526273]"}`}>{receipt.stderr || receipt.stdout || (isArabic ? "لا توجد مخرجات مسجلة." : "No output recorded.")}</div>{receipt.restore && <div className="mt-3 flex gap-2 border-l-2 border-[#c8f04a] bg-[#eef8cd] p-3"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#527321]" /><p className="mono text-[0.68rem] text-[#35501c]">{isArabic ? "مسار الاستعادة: " : "Restore path: "}{receipt.restore}</p></div>}</article>)}</div>}
  </section>;
}
