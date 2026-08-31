import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, Settings2, ShieldAlert, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { filterVisibleNotifications, isAppNotification, type AppNotification, type NotificationTone } from "@/lib/notificationUtils";

type InterfaceLanguage = "en" | "ar" | "other";

type NotificationSettings = {
  enabled: boolean;
  showSuccess: boolean;
  showWarnings: boolean;
  showErrors: boolean;
};

const NOTIFICATION_SETTINGS_KEY = "acc-notification-settings-v1";

const defaultSettings: NotificationSettings = {
  enabled: true,
  showSuccess: true,
  showWarnings: true,
  showErrors: true,
};

function loadSettings(): NotificationSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) || "null") as Partial<NotificationSettings> | null;
    return {
      enabled: parsed?.enabled !== false,
      showSuccess: parsed?.showSuccess !== false,
      showWarnings: parsed?.showWarnings !== false,
      showErrors: parsed?.showErrors !== false,
    };
  } catch {
    return defaultSettings;
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function toneLabel(tone: NotificationTone, ar: boolean) {
  if (tone === "success") return ar ? "نجاح" : "success";
  if (tone === "warning") return ar ? "تنبيه" : "warning";
  if (tone === "error") return ar ? "خطأ" : "error";
  return ar ? "معلومة" : "info";
}

function toneClasses(tone: NotificationTone) {
  if (tone === "success") return { icon: CircleCheck, color: "text-[#527321]", border: "border-[#b9da71]", bg: "bg-[#eef8cd]" };
  if (tone === "warning") return { icon: CircleAlert, color: "text-[#8b5c1c]", border: "border-[#e6c473]", bg: "bg-[#fff0ce]" };
  if (tone === "error") return { icon: ShieldAlert, color: "text-[#934639]", border: "border-[#dba193]", bg: "bg-[#fbe5df]" };
  return { icon: Info, color: "text-[#59869c]", border: "border-[#9bc4d2]", bg: "bg-[#e6f3f6]" };
}

export function NotificationCenter({
  language,
  notifications,
  setNotifications,
}: {
  language: InterfaceLanguage;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}) {
  const ar = language === "ar";
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem("acc-notifications-v1", JSON.stringify(notifications.slice(0, 100)));
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Notifications remain useful for the current session when storage is unavailable.
    }
  }, [notifications, settings]);

  const visibleNotifications = useMemo(() => filterVisibleNotifications(notifications, settings), [notifications, settings]);
  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length;

  const updateSettings = (patch: Partial<NotificationSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const markAllRead = () => setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  const clearAll = () => setNotifications([]);
  const toggleRead = (id: string) => setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: !notification.read } : notification));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={ar ? "فتح مركز الإشعارات" : "Open notification center"}
        title={ar ? "الإشعارات المخصّصة" : "Custom notifications"}
        className="action-button relative inline-flex h-9 items-center gap-2 border border-[#14253a] bg-[#fffdf8] px-2.5 text-xs font-semibold text-[#14253a] hover:bg-[#e6f4bb] dark:border-[#d7e0e8] dark:bg-[#14253a] dark:text-[#e7eef3] dark:hover:bg-[#293f22]"
      >
        <Bell size={15} />
        <span className="hidden sm:inline">{ar ? "إشعارات" : "Alerts"}</span>
        {unreadCount > 0 && <span className="grid min-w-5 place-items-center bg-[#c8f04a] px-1 py-0.5 text-[0.62rem] font-bold text-[#14253a]">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(25rem,calc(100vw-2rem))] border border-[#14253a] bg-[#fffdf8] text-[#14253a] shadow-[0_18px_55px_rgba(20,37,58,.18)] dark:border-[#526a7e] dark:bg-[#14253a] dark:text-[#e7eef3]" role="dialog" aria-label={ar ? "مركز الإشعارات" : "Notification center"}>
          <div className="flex items-start justify-between border-b border-[#d8d1c4] px-4 py-3 dark:border-[#526a7e]">
            <div>
              <p className="kicker text-[#687584] dark:text-[#a6b3be]">{ar ? "سجل الحالة" : "Status feed"}</p>
              <h2 className="mt-1 text-base font-bold">{ar ? "الإشعارات المخصّصة" : "Custom notifications"}</h2>
              <p className="mt-1 text-xs text-[#687584] dark:text-[#a6b3be]">{ar ? "تبقى محلياً في هذا المتصفح ولا تُرسل إلى خادم." : "Stored locally in this browser; never sent to a server."}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={ar ? "إغلاق" : "Close"} className="p-1 text-[#687584] hover:text-[#14253a] dark:hover:text-white"><X size={16} /></button>
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-[#d8d1c4] bg-[#f3efe6] px-4 py-2 dark:border-[#526a7e] dark:bg-[#1b3048]">
            <span className="mono text-[0.64rem] text-[#687584] dark:text-[#a6b3be]">{visibleNotifications.length} {ar ? "ظاهرة" : "visible"} · {unreadCount} {ar ? "غير مقروء" : "unread"}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={markAllRead} className="inline-flex items-center gap-1 px-2 py-1 text-[0.65rem] font-semibold text-[#527321] hover:bg-[#eef8cd]" title={ar ? "تعليم الكل كمقروء" : "Mark all read"}><CheckCheck size={13} />{ar ? "قراءة الكل" : "Mark read"}</button>
              <button type="button" onClick={() => setSettingsOpen((current) => !current)} className="p-1 text-[#687584] hover:text-[#14253a] dark:hover:text-white" aria-label={ar ? "إعدادات الإشعارات" : "Notification settings"}><Settings2 size={15} /></button>
              <button type="button" onClick={clearAll} className="p-1 text-[#934639] hover:bg-[#fbe5df]" aria-label={ar ? "مسح الإشعارات" : "Clear notifications"}><Trash2 size={14} /></button>
            </div>
          </div>

          {settingsOpen && <div className="grid gap-2 border-b border-[#d8d1c4] bg-[#fffaf2] px-4 py-3 text-xs dark:border-[#526a7e] dark:bg-[#10243a]">
            <p className="kicker text-[#687584] dark:text-[#a6b3be]">{ar ? "تخصيص الأولوية" : "Priority controls"}</p>
            {[
              ["enabled", ar ? "تفعيل مركز الإشعارات" : "Enable notification center", settings.enabled],
              ["showSuccess", ar ? "إظهار إشعارات النجاح" : "Show success notifications", settings.showSuccess],
              ["showWarnings", ar ? "إظهار التنبيهات" : "Show warnings", settings.showWarnings],
              ["showErrors", ar ? "إظهار الأخطاء" : "Show errors", settings.showErrors],
            ].map(([key, label, checked]) => <label className="flex items-center justify-between gap-3" key={key as string}><span>{label as string}</span><input type="checkbox" checked={checked as boolean} onChange={(event) => updateSettings({ [key as string]: event.target.checked })} className="h-4 w-4 accent-[#7aa224]" /></label>)}
          </div>}

          <div className="max-h-80 overflow-auto p-3">
            {visibleNotifications.length === 0 ? <div className="border border-dashed border-[#d8d1c4] px-3 py-7 text-center text-xs text-[#687584] dark:border-[#526a7e] dark:text-[#a6b3be]">{ar ? "لا توجد إشعارات مطابقة." : "No matching notifications."}</div> : visibleNotifications.map((notification) => {
              const style = toneClasses(notification.tone);
              const Icon = style.icon;
              return <button type="button" onClick={() => toggleRead(notification.id)} key={notification.id} className={`w-full border-b border-[#eee8dc] px-1 py-3 text-left last:border-0 dark:border-[#29445d] ${notification.read ? "opacity-65" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center border ${style.border} ${style.bg} ${style.color}`}><Icon size={14} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="text-xs font-bold">{notification.title[ar ? "ar" : "en"]}</span><span className="mono text-[0.58rem] text-[#8a96a2]">{formatTime(notification.createdAt)}</span></span>
                    <span className="mt-1 block text-[0.69rem] leading-5 text-[#526273] dark:text-[#cdd7df]">{notification.body[ar ? "ar" : "en"]}</span>
                    <span className={`mt-1 inline-block mono text-[0.56rem] uppercase ${style.color}`}>{toneLabel(notification.tone, ar)} · {notification.read ? (ar ? "مقروء" : "read") : (ar ? "جديد" : "new")}</span>
                  </span>
                </div>
              </button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function loadLocalNotifications(): AppNotification[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("acc-notifications-v1") || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isAppNotification).slice(0, 100) : [];
  } catch {
    return [];
  }
}
