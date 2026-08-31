/**
 * Field Service Ledger style: export only user-selected, browser-local records
 * as a transparent timestamped case bundle; no device data is uploaded.
 */
import { strToU8, zipSync } from "fflate";

export type CaseBundleFile = { name: string; content: string };

function downloadBinary(filename: string, data: Uint8Array) {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  const blob = new Blob([buffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function createCaseId(prefix = "case") {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

export function exportTimestampedCaseBundle(caseId: string, manifest: Record<string, unknown>, files: CaseBundleFile[]) {
  const entries: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify({ format: "android-control-case-bundle", version: 1, caseId, createdAt: new Date().toISOString(), ...manifest }, null, 2)),
  };
  files.forEach((file) => { entries[file.name.replace(/^\/+/, "")] = strToU8(file.content); });
  downloadBinary(`${caseId}.zip`, zipSync(entries, { level: 6 }));
  return `${caseId}.zip`;
}
