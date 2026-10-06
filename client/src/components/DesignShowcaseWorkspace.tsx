import {
  Archive,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileKey2,
  Fingerprint,
  Gauge,
  LockKeyhole,
  PackageCheck,
  Play,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";

type Props = { language: "en" | "ar" | "other" };

export function DesignShowcaseWorkspace({ language }: Props) {
  const ar = language === "ar";
  const copy = ar
    ? {
        eyebrow: "مختبر التصميم / v0",
        title: "سطح الأدلة · غرفة التحكم",
        subtitle:
          "اتجاه بصري تجريبي يجمع بين وضوح حالة القضية وفصل إجراءات الجهاز عن سجلها.",
        live: "نموذج بصري — لا ينفذ أوامر",
        caseState: "حالة القضية",
        authorized: "تفويض مطلوب",
        device: "جهاز غير متصل",
        integrity: "سلامة الأدلة",
        ready: "جاهز للحساب عند التصدير",
        progress: "مسار الجلسة",
        steps: ["تفويض", "جمع", "تحقق", "تصدير"],
        actionTitle: "إجراءات الحزمة",
        actionSubtitle: "كل خيار يعرض تأثيره قبل التنفيذ.",
        disable: "تعطيل",
        keep: "إلغاء التثبيت · إبقاء البيانات",
        purge: "مسح كامل",
        safe: "قابل للعكس",
        caution: "يتطلب مراجعة",
        destructive: "مدمر للبيانات",
        command: "الأمر المعروض",
        receipts: "سجل الإيصالات",
        receiptText: "لا شيء يحدث خارج السجل.",
        receiptItems: [
          "جرد محلي بانتظار الجهاز",
          "مصدر المجتمع متاح عند الطلب",
          "مسار الاستعادة سيظهر هنا",
        ],
        note: "الهوية الحالية محفوظة: WebUSB محلي، أوامر مرئية، وعدم وجود نقل صامت.",
      }
    : {
        eyebrow: "Design lab / v0",
        title: "Evidence deck · Control room",
        subtitle:
          "A visual direction that pairs case-state clarity with a dedicated device-action rail and immutable receipts.",
        live: "Visual prototype — commands disabled",
        caseState: "Case state",
        authorized: "Authorization required",
        device: "No device connected",
        integrity: "Evidence integrity",
        ready: "Ready to hash on export",
        progress: "Session path",
        steps: ["Authorize", "Collect", "Verify", "Export"],
        actionTitle: "Package actions",
        actionSubtitle: "Every choice previews its impact before execution.",
        disable: "Disable",
        keep: "Uninstall · keep data",
        purge: "Complete purge",
        safe: "Reversible",
        caution: "Review required",
        destructive: "Data destructive",
        command: "Visible command",
        receipts: "Receipt ledger",
        receiptText: "Nothing happens off record.",
        receiptItems: [
          "Local inventory is waiting for a device",
          "Community source is available on demand",
          "A restore path will appear here",
        ],
        note: "Current identity preserved: local WebUSB, visible commands, and no silent transport.",
      };

  const actions = [
    {
      title: copy.disable,
      risk: copy.safe,
      command: "pm disable-user --user 0 com.example.app",
      tone: "lime",
      icon: ShieldCheck,
    },
    {
      title: copy.keep,
      risk: copy.caution,
      command: "pm uninstall -k --user 0 com.example.app",
      tone: "amber",
      icon: PackageCheck,
    },
    {
      title: copy.purge,
      risk: copy.destructive,
      command: "pm uninstall --user 0 com.example.app",
      tone: "red",
      icon: CircleAlert,
    },
  ] as const;

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden border border-[#2f4860] bg-[#14253a] p-5 text-[#f6f2ea] shadow-[0_20px_45px_rgba(20,37,58,.16)] sm:p-7">
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full border border-[#c8f04a]/30" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="kicker text-[#c8f04a]">{copy.eyebrow}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.055em] sm:text-4xl">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#cdd7df]">
              {copy.subtitle}
            </p>
          </div>
          <span className="status-stamp w-fit text-[#c8f04a]">
            <Gauge size={12} />
            {copy.live}
          </span>
        </div>
        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-l-2 border-[#c8f04a] bg-[#1b3048] p-3">
            <p className="kicker text-[#8e9eae]">{copy.caseState}</p>
            <p className="mt-2 text-sm font-semibold text-[#c8f04a]">
              {copy.authorized}
            </p>
            <p className="mono mt-1 text-[0.65rem] text-[#b4c6d2]">
              USB / local only
            </p>
          </div>
          <div className="border-l-2 border-[#59869c] bg-[#1b3048] p-3">
            <p className="kicker text-[#8e9eae]">{copy.device}</p>
            <p className="mt-2 text-sm font-semibold">Awaiting trust</p>
            <p className="mono mt-1 text-[0.65rem] text-[#b4c6d2]">
              WebUSB chooser
            </p>
          </div>
          <div className="border-l-2 border-[#d39152] bg-[#1b3048] p-3">
            <p className="kicker text-[#8e9eae]">{copy.integrity}</p>
            <p className="mt-2 text-sm font-semibold">{copy.ready}</p>
            <p className="mono mt-1 text-[0.65rem] text-[#b4c6d2]">
              SHA-256 / chain
            </p>
          </div>
          <div className="border-l-2 border-[#a6b3be] bg-[#1b3048] p-3">
            <p className="kicker text-[#8e9eae]">{copy.progress}</p>
            <div className="mt-3 flex gap-1">
              {copy.steps.map((step, index) => (
                <span key={step} className="flex-1">
                  <span
                    className={`block h-1 ${index === 0 ? "bg-[#c8f04a]" : "bg-[#3d566e]"}`}
                  />
                  <span className="mono mt-2 block text-[0.58rem] text-[#b4c6d2]">
                    0{index + 1}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="border border-[#d8d1c4] bg-[#fffdf8] p-5 dark:border-[#2f4860] dark:bg-[#14253a] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="kicker text-[#59869c]">01 / {copy.actionTitle}</p>
              <h3 className="mt-1 text-2xl font-bold tracking-[-0.045em]">
                {copy.actionSubtitle}
              </h3>
            </div>
            <TerminalSquare className="text-[#59869c]" size={22} />
          </div>
          <div className="mt-5 grid gap-3">
            {actions.map(({ title, risk, command, tone, icon: Icon }) => (
              <div
                key={title}
                className="group border border-[#d8d1c4] p-4 transition-colors hover:border-[#59869c] dark:border-[#2f4860]"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center border ${tone === "lime" ? "border-[#b9da71] bg-[#eef8cd] text-[#527321]" : tone === "amber" ? "border-[#e6c473] bg-[#fff0ce] text-[#8b5c1c]" : "border-[#dba193] bg-[#fbe5df] text-[#934639]"}`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-bold">{title}</h4>
                      <span
                        className={`status-stamp scale-90 origin-right ${tone === "lime" ? "text-[#527321]" : tone === "amber" ? "text-[#8b5c1c]" : "text-[#934639]"}`}
                      >
                        {risk}
                      </span>
                    </div>
                    <p className="mono mt-3 overflow-x-auto border-l-2 border-[#c8f04a] bg-[#f3efe6] px-3 py-2 text-[0.66rem] text-[#263d55] dark:bg-[#1b3048] dark:text-[#d7e0e8]">
                      {copy.command} → {command}
                    </p>
                  </div>
                  <ChevronRight
                    className="mt-2 hidden text-[#a6b3be] transition-transform group-hover:translate-x-1 sm:block"
                    size={17}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="border border-[#2f4860] bg-[#0e1d2c] p-5 text-[#e7eef3] sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="kicker text-[#c8f04a]">02 / {copy.receipts}</p>
              <h3 className="mt-1 text-xl font-bold">{copy.receiptText}</h3>
            </div>
            <Archive className="text-[#c8f04a]" size={20} />
          </div>
          <div className="mt-6 space-y-3">
            {copy.receiptItems.map((item, index) => (
              <div
                key={item}
                className="flex gap-3 border-l-2 border-[#3d566e] pl-3"
              >
                <span className="mono text-[0.65rem] text-[#c8f04a]">
                  0{index + 1}
                </span>
                <p className="text-xs leading-5 text-[#b4c6d2]">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 border-t border-[#2f4860] pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#c8f04a]">
              <Fingerprint size={15} /> SHA-256 / local browser
            </div>
            <p className="mt-2 text-xs leading-5 text-[#8e9eae]">{copy.note}</p>
          </div>
          <button
            type="button"
            disabled
            className="action-button mt-5 flex w-full items-center justify-center gap-2 border border-[#3d566e] px-3 py-2.5 text-xs font-semibold text-[#8e9eae]"
          >
            <LockKeyhole size={14} /> {ar ? "المعاينة فقط" : "Preview only"}
          </button>
        </aside>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-[#c8f04a] bg-[#f3efe6] px-4 py-3 text-xs text-[#526273] dark:bg-[#1b3048] dark:text-[#c7d3dc]">
        <div className="flex items-center gap-2">
          <FileKey2 size={15} className="text-[#59869c]" />
          {copy.note}
        </div>
        <span className="mono">A + B / v0</span>
      </div>
    </section>
  );
}
