/**
 * Field Service Ledger safety model: candidates are only matched against the
 * connected device inventory. OEM profiles only add review guards; they never
 * widen bulk-disable access or infer that a package is safe on every device.
 */
export type DeGoogleLevel = "essential" | "low" | "medium" | "high" | "total";
export type DeGoogleAction = "disable" | "review";
export type AlternativeIcon = "mail" | "map" | "image" | "cloud" | "video" | "store" | "notes" | "calendar" | "contacts" | "music" | "files" | "message" | "browser";

export type DeGoogleAlternative = {
  name: string;
  url: string;
  source: "F-Droid" | "Project";
  icon: AlternativeIcon;
};

export type DeGoogleCandidate = {
  id: string;
  name: string;
  group: string;
  minimumLevel: Exclude<DeGoogleLevel, "essential">;
  action: DeGoogleAction;
  alternatives?: DeGoogleAlternative[];
  profileGuard?: string;
};

export type OemProfile = {
  id: "generic" | "pixel" | "samsung" | "xiaomi" | "oneplus" | "motorola" | "huawei";
  label: string;
  labelAr: string;
  matches: string[];
  reviewOnly: string[];
  notice: string;
  noticeAr: string;
};

export const DEGOOGLE_LEVELS: Array<{ id: DeGoogleLevel; rank: number }> = [
  { id: "essential", rank: 0 },
  { id: "low", rank: 1 },
  { id: "medium", rank: 2 },
  { id: "high", rank: 3 },
  { id: "total", rank: 4 },
];

const coreReview = [
  "com.google.android.gms", "com.google.android.gsf", "com.google.android.gsf.login", "com.android.vending",
  "com.google.android.syncadapters.contacts", "com.google.android.syncadapters.calendar", "com.google.android.setupwizard",
  "com.google.android.configupdater", "com.google.android.webview", "com.google.android.marvin.talkback",
];

export const OEM_PROFILES: OemProfile[] = [
  { id: "generic", label: "Generic Android guard", labelAr: "حماية Android العامة", matches: [], reviewOnly: coreReview, notice: "Core framework, setup, accessibility, WebView, account, and store packages remain review-only.", noticeAr: "تبقى حزم الإطار والإعداد وإمكانية الوصول وWebView والحساب والمتجر للمراجعة فقط." },
  { id: "pixel", label: "Google Pixel", labelAr: "Google Pixel", matches: ["google", "pixel"], reviewOnly: [...coreReview, "com.google.android.googlequicksearchbox", "com.google.android.inputmethod.latin", "com.google.android.tts"], notice: "Pixel system features often integrate Search, keyboard, speech, setup, and Play components. Those packages stay review-only.", noticeAr: "تتكامل ميزات Pixel غالباً مع البحث ولوحة المفاتيح والصوت والإعداد ومكونات Play. تبقى هذه الحزم للمراجعة فقط." },
  { id: "samsung", label: "Samsung Galaxy", labelAr: "Samsung Galaxy", matches: ["samsung"], reviewOnly: [...coreReview, "com.google.android.apps.messaging", "com.google.android.projection.gearhead", "com.google.android.apps.tachyon"], notice: "Samsung builds can route carrier, vehicle, or collaboration behavior through Google components. These remain review-only.", noticeAr: "قد تمرر أجهزة Samsung سلوك المشغل أو السيارة أو التعاون عبر مكونات Google. تبقى هذه للمراجعة فقط." },
  { id: "xiaomi", label: "Xiaomi / Redmi / POCO", labelAr: "Xiaomi / Redmi / POCO", matches: ["xiaomi", "redmi", "poco"], reviewOnly: [...coreReview, "com.google.android.apps.messaging", "com.google.android.projection.gearhead"], notice: "Xiaomi-family software varies by region and may pair Google packages with regional services. Guarded packages stay review-only.", noticeAr: "يختلف برنامج عائلة Xiaomi حسب المنطقة وقد يقترن بخدمات إقليمية. تبقى الحزم المحمية للمراجعة فقط." },
  { id: "oneplus", label: "OnePlus / OPPO / realme", labelAr: "OnePlus / OPPO / realme", matches: ["oneplus", "oppo", "realme"], reviewOnly: [...coreReview, "com.google.android.apps.messaging", "com.google.android.projection.gearhead"], notice: "OxygenOS and ColorOS variants can connect Google packages to dialer, vehicle, and migration features. Guarded packages stay review-only.", noticeAr: "قد تربط إصدارات OxygenOS وColorOS حزم Google بالاتصال والسيارة والترحيل. تبقى الحزم المحمية للمراجعة فقط." },
  { id: "motorola", label: "Motorola", labelAr: "Motorola", matches: ["motorola", "moto"], reviewOnly: [...coreReview, "com.google.android.apps.messaging", "com.google.android.projection.gearhead"], notice: "Motorola’s near-stock builds can still pair Google components with carrier and automotive functions. Guarded packages stay review-only.", noticeAr: "قد تقرن إصدارات Motorola القريبة من Android الخام مكونات Google بوظائف المشغل والسيارة. تبقى الحزم المحمية للمراجعة فقط." },
  { id: "huawei", label: "Huawei / HONOR", labelAr: "Huawei / HONOR", matches: ["huawei", "honor"], reviewOnly: [...coreReview, "com.google.android.googlequicksearchbox", "com.google.android.apps.messaging"], notice: "Regional firmware and compatibility layers differ widely. This profile adds review guards and does not assume Google package behavior.", noticeAr: "تختلف البرامج الإقليمية وطبقات التوافق كثيراً. تضيف هذه البطاقة حواجز مراجعة ولا تفترض سلوك حزم Google." },
];

export const DEGOOGLE_CANDIDATES: DeGoogleCandidate[] = [
  { id: "com.google.android.gms.analytics", name: "Google analytics component", group: "Analytics", minimumLevel: "low", action: "review" },
  { id: "com.google.android.gms.measurement", name: "Google measurement component", group: "Analytics", minimumLevel: "low", action: "review" },
  { id: "com.google.android.feedback", name: "Google Feedback", group: "Feedback", minimumLevel: "low", action: "review" },
  { id: "com.google.android.apps.books", name: "Google Play Books", group: "Reading", minimumLevel: "low", action: "disable" },
  { id: "com.google.android.videos", name: "Google TV / Movies", group: "Media", minimumLevel: "low", action: "disable" },
  { id: "com.google.android.apps.magazines", name: "Google News", group: "News", minimumLevel: "low", action: "disable" },
  { id: "com.google.android.apps.subscriptions.red", name: "Google One", group: "Subscription", minimumLevel: "low", action: "disable" },
  { id: "com.google.android.music", name: "Google Play Music", group: "Music", minimumLevel: "low", action: "disable", alternatives: [{ name: "Auxio", url: "https://f-droid.org/packages/org.oxycblt.auxio/", source: "F-Droid", icon: "music" }] },
  { id: "com.google.android.apps.youtube.music", name: "YouTube Music", group: "Music", minimumLevel: "low", action: "disable", alternatives: [{ name: "Auxio", url: "https://f-droid.org/packages/org.oxycblt.auxio/", source: "F-Droid", icon: "music" }] },
  { id: "com.google.android.apps.podcasts", name: "Google Podcasts", group: "Podcasts", minimumLevel: "low", action: "disable", alternatives: [{ name: "AntennaPod", url: "https://f-droid.org/packages/de.danoeh.antennapod/", source: "F-Droid", icon: "music" }] },
  { id: "com.google.android.apps.wellbeing", name: "Digital Wellbeing", group: "Wellbeing", minimumLevel: "low", action: "review" },
  { id: "com.google.ar.lens", name: "Google Lens", group: "Visual search", minimumLevel: "low", action: "review" },
  { id: "com.google.android.projection.gearhead", name: "Android Auto", group: "Vehicle", minimumLevel: "low", action: "review" },
  { id: "com.google.android.gm", name: "Gmail", group: "Mail", minimumLevel: "medium", action: "disable", alternatives: [{ name: "Thunderbird", url: "https://f-droid.org/packages/net.thunderbird.android/", source: "F-Droid", icon: "mail" }] },
  { id: "com.google.android.apps.maps", name: "Google Maps", group: "Maps", minimumLevel: "medium", action: "disable", alternatives: [{ name: "Organic Maps", url: "https://f-droid.org/packages/app.organicmaps/", source: "F-Droid", icon: "map" }, { name: "Organic Maps project", url: "https://organicmaps.app/", source: "Project", icon: "map" }] },
  { id: "com.google.android.apps.photos", name: "Google Photos", group: "Photos", minimumLevel: "medium", action: "disable", alternatives: [{ name: "Aves Libre", url: "https://f-droid.org/packages/deckers.thibault.aves.libre/", source: "F-Droid", icon: "image" }] },
  { id: "com.google.android.apps.docs", name: "Google Drive", group: "Cloud storage", minimumLevel: "medium", action: "disable", alternatives: [{ name: "Nextcloud", url: "https://f-droid.org/packages/com.nextcloud.client/", source: "F-Droid", icon: "cloud" }, { name: "Syncthing-Fork", url: "https://f-droid.org/packages/com.github.catfriend1.syncthingandroid/", source: "F-Droid", icon: "cloud" }] },
  { id: "com.google.android.apps.tachyon", name: "Google Meet", group: "Calls", minimumLevel: "medium", action: "disable", alternatives: [{ name: "Jitsi Meet", url: "https://f-droid.org/packages/org.jitsi.meet/", source: "F-Droid", icon: "video" }] },
  { id: "com.google.android.apps.nbu.files", name: "Files by Google", group: "Files", minimumLevel: "medium", action: "disable", alternatives: [{ name: "Material Files", url: "https://f-droid.org/packages/me.zhanghai.android.files/", source: "F-Droid", icon: "files" }] },
  { id: "com.google.android.youtube", name: "YouTube", group: "Video", minimumLevel: "medium", action: "disable", alternatives: [{ name: "NewPipe", url: "https://f-droid.org/packages/org.schabi.newpipe/", source: "F-Droid", icon: "video" }] },
  { id: "com.google.android.keep", name: "Google Keep", group: "Notes", minimumLevel: "medium", action: "disable", alternatives: [{ name: "Joplin", url: "https://joplinapp.org/help/install/", source: "Project", icon: "notes" }] },
  { id: "com.google.android.calendar", name: "Google Calendar", group: "Calendar", minimumLevel: "medium", action: "disable", alternatives: [{ name: "Etar", url: "https://f-droid.org/packages/ws.xsoh.etar/", source: "F-Droid", icon: "calendar" }] },
  { id: "com.google.android.contacts", name: "Google Contacts", group: "Contacts", minimumLevel: "medium", action: "disable", alternatives: [{ name: "Fossify Contacts", url: "https://f-droid.org/packages/org.fossify.contacts/", source: "F-Droid", icon: "contacts" }] },
  { id: "com.google.android.apps.chromecast.app", name: "Google Home", group: "Home control", minimumLevel: "medium", action: "review" },
  { id: "com.google.android.apps.walletnfcrel", name: "Google Wallet", group: "Payments", minimumLevel: "medium", action: "review" },
  { id: "com.google.android.googlequicksearchbox", name: "Google Search", group: "Search", minimumLevel: "high", action: "review", alternatives: [{ name: "Firefox for Android", url: "https://www.mozilla.org/firefox/browsers/mobile/android/", source: "Project", icon: "browser" }] },
  { id: "com.google.android.apps.googleassistant", name: "Google Assistant", group: "Assistant", minimumLevel: "high", action: "review" },
  { id: "com.google.android.apps.messaging", name: "Google Messages", group: "Messaging", minimumLevel: "high", action: "review", alternatives: [{ name: "Fossify Messages", url: "https://f-droid.org/packages/org.fossify.messages/", source: "F-Droid", icon: "message" }] },
  { id: "com.android.chrome", name: "Google Chrome", group: "Browser", minimumLevel: "high", action: "review", alternatives: [{ name: "Firefox for Android", url: "https://www.mozilla.org/firefox/browsers/mobile/android/", source: "Project", icon: "browser" }] },
  { id: "com.google.android.webview", name: "Android System WebView", group: "Web runtime", minimumLevel: "high", action: "review" },
  { id: "com.google.android.tts", name: "Speech Services by Google", group: "Speech", minimumLevel: "high", action: "review" },
  { id: "com.google.android.inputmethod.latin", name: "Gboard", group: "Keyboard", minimumLevel: "high", action: "review" },
  { id: "com.google.android.marvin.talkback", name: "Android Accessibility Suite", group: "Accessibility", minimumLevel: "high", action: "review" },
  { id: "com.google.android.gms", name: "Google Play services", group: "Core framework", minimumLevel: "total", action: "review" },
  { id: "com.google.android.gsf", name: "Google Services Framework", group: "Core framework", minimumLevel: "total", action: "review" },
  { id: "com.google.android.gsf.login", name: "Google Account Manager", group: "Core accounts", minimumLevel: "total", action: "review" },
  { id: "com.android.vending", name: "Google Play Store", group: "Store", minimumLevel: "total", action: "review", alternatives: [{ name: "F-Droid", url: "https://f-droid.org/packages/org.fdroid.fdroid/", source: "F-Droid", icon: "store" }, { name: "Aurora Store", url: "https://f-droid.org/packages/com.aurora.store/", source: "F-Droid", icon: "store" }] },
  { id: "com.google.android.syncadapters.contacts", name: "Google Contacts Sync", group: "Sync", minimumLevel: "total", action: "review" },
  { id: "com.google.android.syncadapters.calendar", name: "Google Calendar Sync", group: "Sync", minimumLevel: "total", action: "review" },
];

export function getOemProfile(id: OemProfile["id"]) {
  return OEM_PROFILES.find((profile) => profile.id === id) ?? OEM_PROFILES[0];
}

export function detectOemProfile(manufacturer?: string) {
  const value = manufacturer?.toLowerCase().trim() || "";
  return OEM_PROFILES.find((profile) => profile.id !== "generic" && profile.matches.some((match) => value.includes(match))) ?? OEM_PROFILES[0];
}

export function deGoogleCandidatesFor(level: DeGoogleLevel, installedPackages: string[], profile: OemProfile = OEM_PROFILES[0]) {
  const rank = DEGOOGLE_LEVELS.find((item) => item.id === level)?.rank ?? 0;
  const installed = new Set(installedPackages);
  return DEGOOGLE_CANDIDATES.filter((candidate) => {
    const candidateRank = DEGOOGLE_LEVELS.find((item) => item.id === candidate.minimumLevel)?.rank ?? Number.POSITIVE_INFINITY;
    return candidateRank <= rank && installed.has(candidate.id);
  }).map((candidate) => profile.reviewOnly.includes(candidate.id) && candidate.action === "disable"
    ? { ...candidate, action: "review" as const, profileGuard: profile.id }
    : candidate);
}
