import { describe, expect, it } from "vitest";
import { filterVisibleNotifications, isAppNotification, type AppNotification } from "./notificationUtils";

const sample: AppNotification[] = [
  { id: "one", tone: "success", title: { en: "Done", ar: "تم" }, body: { en: "Completed", ar: "اكتمل" }, createdAt: "2026-01-01T00:00:00.000Z", read: false },
  { id: "two", tone: "warning", title: { en: "Review", ar: "راجع" }, body: { en: "Check output", ar: "تحقق من المخرجات" }, createdAt: "2026-01-01T00:01:00.000Z", read: false },
  { id: "three", tone: "error", title: { en: "Failed", ar: "فشل" }, body: { en: "Command failed", ar: "فشل الأمر" }, createdAt: "2026-01-01T00:02:00.000Z", read: true },
];

describe("notificationUtils", () => {
  it("accepts only complete, supported notification records", () => {
    expect(isAppNotification(sample[0])).toBe(true);
    expect(isAppNotification({ ...sample[0], tone: "unknown" })).toBe(false);
    expect(isAppNotification({ id: "missing" })).toBe(false);
  });

  it("filters notifications according to local priority settings", () => {
    expect(filterVisibleNotifications(sample, { enabled: true, showSuccess: true, showWarnings: false, showErrors: true }).map((item) => item.id)).toEqual(["one", "three"]);
    expect(filterVisibleNotifications(sample, { enabled: false, showSuccess: true, showWarnings: true, showErrors: true })).toEqual([]);
  });
});
