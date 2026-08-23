/**
 * Field Service Ledger style: public contact details are explicit destinations,
 * framed as project provenance rather than marketing copy.
 */
import { ArrowUpRight, Languages, Send, ShieldCheck } from "lucide-react";

type InterfaceLanguage = "en" | "ar" | "other";

const copy = {
  en: {
    eyebrow: "Project provenance / public channels",
    intro: "AndroidControl Center Forensicslarn is a local-first Android service desk. Follow the public channel for learning material and use the account link for direct Telegram contact.",
    channel: "Telegram channel",
    channelDetail: "@ufed4pclearn · learning updates and channel posts",
    account: "Telegram account",
    accountDetail: "@forensicslarn · direct Telegram contact",
    open: "Open in Telegram",
    language: "Language availability",
    languageDetail: "English and Arabic interface modes are available from the left rail. Additional language packs are planned.",
    note: "Contact links open directly in Telegram. This dashboard does not transmit connected-device data to either destination.",
  },
  ar: {
    eyebrow: "تعريف المشروع / القنوات العامة",
    intro: "AndroidControl Center Forensicslarn هو مكتب خدمة أندرويد يعمل محلياً أولاً. تابع القناة العامة لمواد التعلم واستخدم رابط الحساب للتواصل عبر تيليجرام.",
    channel: "قناة تيليجرام",
    channelDetail: "@ufed4pclearn · تحديثات التعلم ومنشورات القناة",
    account: "حساب تيليجرام",
    accountDetail: "@forensicslarn · تواصل مباشر عبر تيليجرام",
    open: "فتح في تيليجرام",
    language: "توفر اللغات",
    languageDetail: "تتوفر الواجهة بالإنجليزية والعربية من القائمة الجانبية. ستتم إضافة حزم لغات أخرى لاحقاً.",
    note: "تفتح روابط التواصل مباشرة في تيليجرام. لا ترسل هذه اللوحة بيانات الجهاز المتصل إلى أي من الوجهتين.",
  },
  other: {
    eyebrow: "Project provenance / public channels",
    intro: "AndroidControl Center Forensicslarn is a local-first Android service desk. Follow the public channel for learning material and use the account link for direct Telegram contact.",
    channel: "Telegram channel",
    channelDetail: "@ufed4pclearn · learning updates and channel posts",
    account: "Telegram account",
    accountDetail: "@forensicslarn · direct Telegram contact",
    open: "Open in Telegram",
    language: "Language availability",
    languageDetail: "Select English or Arabic from the left rail today. Additional language packs are being prepared.",
    note: "Contact links open directly in Telegram. This dashboard does not transmit connected-device data to either destination.",
  },
} as const;

export default function AboutWorkspace({ language }: { language: InterfaceLanguage }) {
  const text = copy[language];
  const destinations = [
    { label: text.channel, detail: text.channelDetail, href: "https://t.me/ufed4pclearn", mark: "CH" },
    { label: text.account, detail: text.accountDetail, href: "https://t.me/forensicslarn", mark: "ID" },
  ];

  return (
    <section className="space-y-5">
      <div className="overflow-hidden border border-[#14253a] bg-[#14253a] p-6 text-[#f6f2ea] sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="kicker text-[#c8f04a]">{text.eyebrow}</p><h2 className="mt-2 max-w-2xl text-3xl font-bold tracking-[-0.05em]">Forensicslarn</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-[#c7d3dc]">{text.intro}</p></div><Send className="shrink-0 text-[#c8f04a]" size={24} /></div>
        <div className="mt-6 flex flex-wrap gap-2"><span className="status-stamp text-[#c8f04a]">telegram</span><span className="status-stamp text-[#91acc0]">public links</span><span className="status-stamp text-[#91acc0]">local device data</span></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {destinations.map((destination) => <article key={destination.href} className="service-card p-6"><div className="flex items-start justify-between"><span className="state-square text-[#59869c]">{destination.mark}</span><Send size={18} className="text-[#59869c]" /></div><p className="kicker mt-6 text-[#687584]">Telegram</p><h3 className="mt-1 text-xl font-bold tracking-[-0.04em]">{destination.label}</h3><p className="mono mt-3 text-[0.68rem] leading-5 text-[#526273]">{destination.detail}</p><a href={destination.href} target="_blank" rel="noreferrer" className="action-button mt-6 inline-flex items-center border border-[#14253a] bg-[#14253a] px-4 py-2 text-sm font-semibold text-[#f6f2ea] hover:bg-[#223952]">{text.open}<ArrowUpRight className="ml-2" size={16} /></a></article>)}
      </div>

      <div className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
        <div className="border-l-2 border-[#c8f04a] bg-[#e6f4bb] p-5"><div className="flex gap-3"><Languages size={19} className="mt-0.5 shrink-0 text-[#527321]" /><div><p className="kicker text-[#527321]">{text.language}</p><p className="mt-2 text-sm leading-6 text-[#35501c]">{text.languageDetail}</p></div></div></div>
        <div className="service-card p-5"><div className="flex gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#59869c]" /><p className="text-sm leading-6 text-[#526273]">{text.note}</p></div></div>
      </div>
    </section>
  );
}
