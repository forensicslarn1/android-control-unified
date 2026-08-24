/**
 * Field Service Ledger style: a compact, desktop-oriented shortcut reference.
 * Shortcuts navigate only; they never authorize hardware or execute an ADB action.
 */
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard, ShieldCheck } from "lucide-react";

type Language = "en" | "ar" | "other";

export function ShortcutGuideDialog({ open, language, onOpenChange }: { open: boolean; language: Language; onOpenChange: (open: boolean) => void }) {
  const ar = language === "ar";
  const shortcuts = ar
    ? [["Alt + 1…9", "التنقل بين محطات العمل بالترتيب"], ["?", "فتح أو إغلاق دليل الاختصارات"], ["Esc", "إغلاق أي ورقة إعداد أو دليل اختصارات"]]
    : [["Alt + 1…9", "Switch workstations in their displayed order"], ["?", "Open or close this shortcut guide"], ["Esc", "Close an open setup sheet or shortcut guide"]];

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="shortcut-dialog rounded-none border-[#14253a] bg-[#fffdf8] text-[#14253a] dark:bg-[#14253a] dark:text-[#e7eef3]" showCloseButton={false}>
      <DialogHeader className="text-left">
        <p className="kicker text-[#59869c]">{ar ? "سطح المكتب / تنقل" : "Desktop / navigation"}</p>
        <DialogTitle className="mt-1 flex items-center gap-2 text-xl font-bold tracking-[-0.04em]"><Keyboard className="text-[#59869c]" size={20} />{ar ? "اختصارات المشغل" : "Operator shortcuts"}</DialogTitle>
        <DialogDescription className="leading-5">{ar ? "تعمل الاختصارات خارج حقول النص فقط، وتنتقل بين المحطات من دون تشغيل أمر أو طلب اتصال أو تعديل الجهاز." : "Shortcuts work only outside editable fields. They move between workstations without running a command, requesting a device, or changing the phone."}</DialogDescription>
      </DialogHeader>
      <div className="mt-2 border-y border-[#d8d1c4] dark:border-[#2f4860]">
        {shortcuts.map(([keys, action]) => <div key={keys} className="flex items-center justify-between gap-4 border-b border-[#e5ded2] px-1 py-3 text-sm last:border-b-0 dark:border-[#2f4860]"><span className="mono rounded-sm border border-[#59869c] bg-[#edf1f3] px-2 py-1 text-xs text-[#263d55] dark:bg-[#0e1d2c] dark:text-[#d7e0e8]">{keys}</span><span className="text-right text-xs leading-5 text-[#526273] dark:text-[#c7d3dc]">{action}</span></div>)}
      </div>
      <div className="flex gap-3 border-l-2 border-[#c8f04a] bg-[#f3efe6] p-3 text-xs leading-5 text-[#526273] dark:bg-[#1b3048] dark:text-[#c7d3dc]"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#527321]" />{ar ? "الاختصارات محفوظة عمداً للأفعال غير المدمرة. تبقى الاتصالات والأوامر والإزالة والتثبيت إجراءات صريحة بالنقر والمراجعة." : "Shortcuts are deliberately limited to non-destructive actions. Connections, commands, removal, and installation remain explicit click-and-review actions."}</div>
      <DialogFooter><Button onClick={() => onOpenChange(false)} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952] dark:bg-[#c8f04a] dark:text-[#14253a]">{ar ? "تم" : "Done"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
