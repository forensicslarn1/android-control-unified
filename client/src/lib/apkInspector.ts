/**
 * Android Control Center security inspection: APK data is parsed in-browser.
 * The result is advisory; it does not validate Android v2/v3/v4 signatures.
 */
import ManifestParser from "apk-manifest-parser";
import { unzipSync } from "fflate";
import { Certificate, ContentInfo, SignedData } from "pkijs";

export type CertificateSummary = {
  status: "available" | "signature-block-only" | "not-found";
  entry?: string;
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  fingerprintSha256?: string;
  note: string;
};

export type ApkInspection = {
  fileName: string;
  size: number;
  packageName?: string;
  versionName?: string;
  versionCode?: number;
  permissions: string[];
  sensitivePermissions: string[];
  certificate: CertificateSummary;
  warnings: string[];
};

const sensitivePermissionSuffixes = [
  "CAMERA", "RECORD_AUDIO", "READ_CONTACTS", "WRITE_CONTACTS", "READ_CALL_LOG", "WRITE_CALL_LOG", "READ_SMS", "RECEIVE_SMS", "SEND_SMS", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "MANAGE_EXTERNAL_STORAGE", "QUERY_ALL_PACKAGES", "REQUEST_INSTALL_PACKAGES", "BIND_ACCESSIBILITY_SERVICE", "PACKAGE_USAGE_STATS", "SYSTEM_ALERT_WINDOW", "POST_NOTIFICATIONS",
];

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("").match(/.{1,2}/g)?.join(":") || "";
}

function permissionStrings(manifest: Uint8Array) {
  const candidates = [
    new TextDecoder("utf-8", { fatal: false }).decode(manifest),
    new TextDecoder("utf-16le", { fatal: false }).decode(manifest),
  ];
  const found = new Set<string>();
  for (const candidate of candidates) {
    for (const permission of candidate.match(/(?:android\.permission|[A-Za-z][A-Za-z0-9_.]+\.permission)\.[A-Za-z0-9_.$]+/g) || []) found.add(permission);
  }
  return Array.from(found).sort((left, right) => left.localeCompare(right));
}

async function inspectJarCertificate(entries: Record<string, Uint8Array>): Promise<CertificateSummary> {
  const entry = Object.keys(entries).find((path) => /^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(path));
  if (!entry) return { status: "not-found", note: "No v1 JAR signature block was found. Modern v2/v3/v4 signatures are not expanded by this local inspector." };
  const block = entries[entry];
  try {
    const content = ContentInfo.fromBER(block.buffer.slice(block.byteOffset, block.byteOffset + block.byteLength));
    if (content.contentType !== ContentInfo.SIGNED_DATA) throw new Error("The signature block is not CMS SignedData.");
    const signed = new SignedData({ schema: content.content });
    const certificate = signed.certificates?.find((candidate) => candidate instanceof Certificate) as Certificate | undefined;
    if (!certificate) throw new Error("No X.509 certificate is embedded in the signature block.");
    const raw = certificate.toSchema().toBER(false);
    const fingerprint = await crypto.subtle.digest("SHA-256", raw);
    return {
      status: "available",
      entry,
      subject: certificate.subject.toString(),
      issuer: certificate.issuer.toString(),
      validFrom: certificate.notBefore.toString(),
      validTo: certificate.notAfter.toString(),
      fingerprintSha256: hex(fingerprint),
      note: "Embedded v1 JAR certificate parsed locally. This display does not establish publisher trust or verify modern APK signing schemes.",
    };
  } catch (error) {
    const fingerprint = await crypto.subtle.digest("SHA-256", block);
    return {
      status: "signature-block-only",
      entry,
      fingerprintSha256: hex(fingerprint),
      note: error instanceof Error ? `A signature block was found, but its embedded certificate could not be parsed: ${error.message}` : "A signature block was found, but its embedded certificate could not be parsed.",
    };
  }
}

export async function inspectApk(file: File): Promise<ApkInspection> {
  if (!file.name.toLowerCase().endsWith(".apk")) throw new Error("Choose an Android APK file.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(bytes);
  const manifest = entries["AndroidManifest.xml"];
  if (!manifest) throw new Error("This archive does not contain AndroidManifest.xml.");
  const warnings: string[] = [];
  let packageName: string | undefined;
  let versionName: string | undefined;
  let versionCode: number | undefined;
  let parserIssue = "";
  try {
    const parsed = await ManifestParser.extractApkManifest(file);
    packageName = parsed.packageName;
    versionName = parsed.versionName;
    versionCode = parsed.versionCode;
  } catch (error) {
    parserIssue = error instanceof Error ? error.message : "Manifest package metadata could not be fully parsed.";
  }
  if (!packageName) {
    const rawManifest = new TextDecoder("utf-8", { fatal: false }).decode(manifest);
    const packageMatch = rawManifest.match(/\bpackage\s*=\s*["']([^"']+)["']/i);
    const versionNameMatch = rawManifest.match(/\bandroid:versionName\s*=\s*["']([^"']+)["']/i);
    const versionCodeMatch = rawManifest.match(/\bandroid:versionCode\s*=\s*["'](\d+)["']/i);
    packageName = packageMatch?.[1];
    versionName = versionNameMatch?.[1];
    versionCode = versionCodeMatch ? Number(versionCodeMatch[1]) : undefined;
  }
  if (parserIssue && !packageName) warnings.push(`Manifest package metadata could not be fully parsed: ${parserIssue}`);
  const permissions = permissionStrings(manifest);
  const sensitivePermissions = permissions.filter((permission) => sensitivePermissionSuffixes.some((suffix) => permission.endsWith(`.${suffix}`)));
  const certificate = await inspectJarCertificate(entries);
  if (certificate.status !== "available") warnings.push(certificate.note);
  if (!permissions.length) warnings.push("No declared permissions could be extracted from the manifest string pool; review the APK with Android platform tools before production use.");
  return { fileName: file.name, size: file.size, packageName, versionName, versionCode, permissions, sensitivePermissions, certificate, warnings };
}
