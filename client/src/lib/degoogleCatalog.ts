/**
 * Field Service Ledger safety model: candidates are only matched against the
 * connected device inventory. Reversible User 0 disablement is limited to
 * selected user-facing Google apps; framework components remain review-only.
 */
export type DeGoogleLevel = "essential" | "low" | "medium" | "high" | "total";
export type DeGoogleAction = "disable" | "review";

export type DeGoogleCandidate = {
  id: string;
  name: string;
  group: string;
  minimumLevel: Exclude<DeGoogleLevel, "essential">;
  action: DeGoogleAction;
  alternative?: string;
};

export const DEGOOGLE_LEVELS: Array<{ id: DeGoogleLevel; rank: number }> = [
  { id: "essential", rank: 0 },
  { id: "low", rank: 1 },
  { id: "medium", rank: 2 },
  { id: "high", rank: 3 },
  { id: "total", rank: 4 },
];

export const DEGOOGLE_CANDIDATES: DeGoogleCandidate[] = [
  { id: "com.google.android.apps.books", name: "Google Play Books", group: "Reading", minimumLevel: "low", action: "disable" },
  { id: "com.google.android.videos", name: "Google TV / Movies", group: "Media", minimumLevel: "low", action: "disable" },
  { id: "com.google.android.apps.magazines", name: "Google News", group: "News", minimumLevel: "low", action: "disable" },
  { id: "com.google.android.apps.subscriptions.red", name: "Google One", group: "Subscription", minimumLevel: "low", action: "disable" },
  { id: "com.google.android.gm", name: "Gmail", group: "Mail", minimumLevel: "medium", action: "disable", alternative: "K-9 Mail or Thunderbird" },
  { id: "com.google.android.apps.maps", name: "Google Maps", group: "Maps", minimumLevel: "medium", action: "disable", alternative: "Organic Maps" },
  { id: "com.google.android.apps.photos", name: "Google Photos", group: "Photos", minimumLevel: "medium", action: "disable", alternative: "Aves or Ente" },
  { id: "com.google.android.apps.docs", name: "Google Drive", group: "Cloud storage", minimumLevel: "medium", action: "disable", alternative: "Nextcloud or Syncthing" },
  { id: "com.google.android.apps.tachyon", name: "Google Meet", group: "Calls", minimumLevel: "medium", action: "disable", alternative: "Jitsi Meet" },
  { id: "com.google.android.apps.nbu.files", name: "Files by Google", group: "Files", minimumLevel: "medium", action: "disable", alternative: "Material Files" },
  { id: "com.google.android.youtube", name: "YouTube", group: "Video", minimumLevel: "medium", action: "disable", alternative: "NewPipe or a browser" },
  { id: "com.google.android.googlequicksearchbox", name: "Google Search", group: "Search", minimumLevel: "high", action: "review", alternative: "A privacy-focused browser search" },
  { id: "com.google.android.apps.googleassistant", name: "Google Assistant", group: "Assistant", minimumLevel: "high", action: "review" },
  { id: "com.google.android.apps.messaging", name: "Google Messages", group: "Messaging", minimumLevel: "high", action: "review", alternative: "Fossify Messages or a vendor SMS app" },
  { id: "com.google.android.gms", name: "Google Play services", group: "Core framework", minimumLevel: "total", action: "review" },
  { id: "com.google.android.gsf", name: "Google Services Framework", group: "Core framework", minimumLevel: "total", action: "review" },
  { id: "com.android.vending", name: "Google Play Store", group: "Store", minimumLevel: "total", action: "review", alternative: "F-Droid or Aurora Store" },
  { id: "com.google.android.syncadapters.contacts", name: "Google Contacts Sync", group: "Sync", minimumLevel: "total", action: "review" },
  { id: "com.google.android.syncadapters.calendar", name: "Google Calendar Sync", group: "Sync", minimumLevel: "total", action: "review" },
];

export function deGoogleCandidatesFor(level: DeGoogleLevel, installedPackages: string[]) {
  const rank = DEGOOGLE_LEVELS.find((item) => item.id === level)?.rank ?? 0;
  const installed = new Set(installedPackages);
  return DEGOOGLE_CANDIDATES.filter((candidate) => {
    const candidateRank = DEGOOGLE_LEVELS.find((item) => item.id === candidate.minimumLevel)?.rank ?? Number.POSITIVE_INFINITY;
    return candidateRank <= rank && installed.has(candidate.id);
  });
}
