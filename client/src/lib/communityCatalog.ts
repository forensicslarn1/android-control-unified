/**
 * Field Service Ledger style: upstream classifications remain transparent,
 * locally joined to a device inventory, and are never sent back to GitHub.
 */
export type RemovalLevel = "Recommended" | "Advanced" | "Expert" | "Unsafe" | string;

export type CommunityPackage = {
  id: string;
  list: string;
  description: string;
  dependencies: string[];
  neededBy: string[];
  labels: string[];
  removal: RemovalLevel;
};

type RawPackage = Omit<CommunityPackage, "id">;

export const COMMUNITY_SOURCE =
  "https://raw.githubusercontent.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/main/resources/assets/uad_lists.json";

export async function fetchCommunityCatalog() {
  const response = await fetch(COMMUNITY_SOURCE, { cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}.`);
  const raw = (await response.json()) as Record<string, RawPackage>;
  const entries = Object.entries(raw)
    .filter(([id, value]) => typeof id === "string" && value && typeof value.removal === "string")
    .map(([id, value]) => ({
      id,
      list: value.list || "Misc",
      description: value.description || "No upstream description supplied.",
      dependencies: Array.isArray(value.dependencies) ? value.dependencies : [],
      neededBy: Array.isArray(value.neededBy) ? value.neededBy : [],
      labels: Array.isArray(value.labels) ? value.labels : [],
      removal: value.removal,
    }));

  return { entries, refreshedAt: new Date().toISOString() };
}
