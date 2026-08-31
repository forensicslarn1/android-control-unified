export type NotificationTone = "info" | "success" | "warning" | "error";

export type NotificationCopy = { en: string; ar: string };

export type AppNotification = {
  id: string;
  tone: NotificationTone;
  title: NotificationCopy;
  body: NotificationCopy;
  createdAt: string;
  read: boolean;
};

export type NotificationVisibility = {
  enabled: boolean;
  showSuccess: boolean;
  showWarnings: boolean;
  showErrors: boolean;
};

export function isAppNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AppNotification>;
  return typeof item.id === "string" && typeof item.createdAt === "string" && typeof item.read === "boolean" && (item.tone === "info" || item.tone === "success" || item.tone === "warning" || item.tone === "error") && Boolean(item.title?.en && item.title?.ar && item.body?.en && item.body?.ar);
}

export function filterVisibleNotifications(notifications: AppNotification[], settings: NotificationVisibility) {
  return notifications.filter((notification) => {
    if (!settings.enabled) return false;
    if (notification.tone === "success" && !settings.showSuccess) return false;
    if (notification.tone === "warning" && !settings.showWarnings) return false;
    if (notification.tone === "error" && !settings.showErrors) return false;
    return true;
  });
}
