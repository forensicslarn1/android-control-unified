/**
 * Field Service Ledger style: a calm, evidence-led handoff sheet for first-time
 * Android authorization. It never implies a silent connection or a remote service.
 */
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, CircleAlert, KeyRound, PlugZap, ShieldCheck, Usb } from "lucide-react";

type Language = "en" | "ar" | "other";

type FirstRunSetupDialogProps = {
  open: boolean;
  language: Language;
  usbSupported: boolean;
  cryptoSupported: boolean;
  connecting: boolean;
  onOpenChange: (open: boolean) => void;
  onStartAuthorization: () => void;
  onDefer: () => void;
};

export function FirstRunSetupDialog({ open, language, usbSupported, cryptoSupported, connecting, onOpenChange, onStartAuthorization, onDefer }: FirstRunSetupDialogProps) {
  const ar = language === "ar";
  const steps = ar
    ? [
        { number: "01", title: "تحقق من بيئة المتصفح", detail: usbSupported ? "تم اكتشاف WebUSB. يعمل اتصال الجهاز عبر HTTPS ومتصفح Chromium." : "لم يتم اكتشاف WebUSB. افتح هذه اللوحة عبر Chrome أو Edge أو Opera أو Brave مع HTTPS.", good: usbSupported, icon: Usb },
        { number: "02", title: "فعّل تصحيح USB على الهاتف", detail: "افتح الإعدادات، وابحث عن «رقم الإصدار»، وانقره سبع مرات، ثم افتح خيارات المطوّر وفعّل تصحيح USB. تختلف الأسماء قليلاً حسب الشركة.", good: false, icon: ShieldCheck },
        { number: "03", title: "وافق على المفتاح في المتصفح والهاتف", detail: "سيظهر اختيار جهاز مرئي هنا، ثم ستظهر مطالبة ثقة على هاتفك. لا تبدأ أي أوامر قبل هاتين الموافقتين.", good: false, icon: KeyRound },
      ]
    : [
        { number: "01", title: "Confirm the browser environment", detail: usbSupported ? "WebUSB is available. Device transport runs through HTTPS in a Chromium-family browser." : "WebUSB was not detected. Open this desk in Chrome, Edge, Opera, or Brave over HTTPS.", good: usbSupported, icon: Usb },
        { number: "02", title: "Enable USB debugging on the phone", detail: "Open Settings, find Build number, tap it seven times, then open Developer options and enable USB debugging. Names vary slightly by manufacturer.", good: false, icon: ShieldCheck },
        { number: "03", title: "Approve the key in browser and phone", detail: "A visible device chooser appears here, followed by a trust prompt on the phone. No commands begin before both approvals.", good: false, icon: KeyRound },
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="setup-dialog max-h-[calc(100vh-2rem)] overflow-y-auto rounded-none border-[#14253a] bg-[#fffdf8] p-0 text-[#14253a] sm:max-w-2xl dark:bg-[#14253a] dark:text-[#e7eef3]" showCloseButton={false}>
        <div className="border-b border-[#d8d1c4] bg-[#14253a] p-5 text-[#f6f2ea] dark:border-[#2f4860]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="kicker text-[#c8f04a]">{ar ? "إعداد الخدمة / 01" : "Service setup / 01"}</p>
              <DialogHeader className="mt-2 gap-1 text-left">
                <DialogTitle className="text-xl font-bold tracking-[-0.04em] text-white">{ar ? "ابدأ بتفويض واضح، وليس اتصالاً صامتاً." : "Begin with explicit authorization, never a silent connection."}</DialogTitle>
                <DialogDescription className="max-w-xl text-xs leading-5 text-[#cdd7df]">{ar ? "تظل مفاتيح ADB وسجل الأوامر وأرشيف الإيصالات في هذا المتصفح. يطلب التطبيق اختيار جهاز وتأكيداً مرئياً قبل قراءة أي بيانات." : "ADB keys, command receipts, and receipt archives remain in this browser. The desk requests a device choice and visible confirmation before it reads any device data."}</DialogDescription>
              </DialogHeader>
            </div>
            <span className="state-square shrink-0 border-[#c8f04a] text-[#c8f04a]">01</span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return <article key={step.number} className={`setup-step grid grid-cols-[2.4rem_minmax(0,1fr)] gap-3 border p-4 ${step.good ? "border-[#b9da71] bg-[#eef8cd] text-[#263d55] dark:border-[#496b37] dark:bg-[#293f22] dark:text-[#e7eef3]" : "border-[#d8d1c4] bg-[#f7f3eb] dark:border-[#2f4860] dark:bg-[#1b3048]"}`}>
                <span className={`state-square ${step.good ? "text-[#527321]" : "text-[#59869c]"}`}>{step.good ? <Check size={15} /> : step.number}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><Icon size={16} className={step.good ? "text-[#527321]" : "text-[#59869c]"} /><h3 className="text-sm font-bold">{step.title}</h3>{step.number === "01" && <span className="mono text-[0.6rem] opacity-70">{cryptoSupported ? "WEB CRYPTO READY" : "WEB CRYPTO CHECK"}</span>}</div>
                  <p className="mt-2 text-xs leading-5 opacity-80">{step.detail}</p>
                </div>
              </article>;
            })}
          </div>

          {!usbSupported && <div className="mt-4 flex gap-3 border-l-2 border-[#d39152] bg-[#fff2e1] p-4 text-xs leading-5 text-[#6d5133] dark:bg-[#322821] dark:text-[#f0d4a8]"><CircleAlert size={17} className="mt-0.5 shrink-0" /><p>{ar ? "يمكنك استكشاف السجلات وملفات APK محلياً، لكن تفويض الجهاز والمرايا يتطلبان WebUSB. لن يعمل Firefox وSafari مع هذا الاتصال حتى يقدما WebUSB." : "You can still review local receipts and APK files, but device authorization and mirroring require WebUSB. Firefox and Safari cannot provide this transport unless they add WebUSB support."}</p></div>}
        </div>

        <DialogFooter className="border-t border-[#d8d1c4] bg-[#f3efe6] p-4 dark:border-[#2f4860] dark:bg-[#1b3048]">
          <Button variant="outline" onClick={onDefer} className="action-button border-[#14253a] bg-transparent text-[#14253a] dark:border-[#d7e0e8] dark:text-[#e7eef3]">{ar ? "سأكمل لاحقاً" : "I’ll continue later"}</Button>
          <Button onClick={onStartAuthorization} disabled={!usbSupported || connecting} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952] dark:bg-[#c8f04a] dark:text-[#14253a] dark:hover:bg-[#d7f66c]">{connecting ? <span className="mono">{ar ? "جارٍ الفتح" : "OPENING"}</span> : <><PlugZap className="mr-2" size={16} />{ar ? "بدء تفويض المتصفح" : "Begin browser authorization"}</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
