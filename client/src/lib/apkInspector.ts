/**
 * Field Service Ledger security inspection: APK data and signatures are parsed
 * locally in-browser. v2/v3 verification is explicit; no APK leaves the device.
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

export type ApkSigner = {
  index: number;
  signatureAlgorithm?: string;
  signatureVerified: boolean;
  contentVerified: boolean;
  fingerprintSha256?: string;
  subject?: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  minSdk?: number;
  maxSdk?: number;
  proofOfRotation: boolean;
  note: string;
};

export type ApkSigningScheme = {
  scheme: "v2" | "v3";
  status: "verified" | "invalid" | "unsupported" | "detected" | "not-found";
  signerCount: number;
  verifiedSignerCount: number;
  note: string;
  signers: ApkSigner[];
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
  signingSchemes: ApkSigningScheme[];
  warnings: string[];
};

const V2_BLOCK_ID = 0x7109871a;
const V3_BLOCK_ID = 0xf05368c0;
const PROOF_OF_ROTATION_ID = 0x3ba06f8c;
const APK_SIG_BLOCK_MAGIC = new TextEncoder().encode("APK Sig Block 42");
const CHUNK_BYTES = 1024 * 1024;

const sensitivePermissionSuffixes = [
  "CAMERA", "RECORD_AUDIO", "READ_CONTACTS", "WRITE_CONTACTS", "READ_CALL_LOG", "WRITE_CALL_LOG", "READ_SMS", "RECEIVE_SMS", "SEND_SMS", "ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "MANAGE_EXTERNAL_STORAGE", "QUERY_ALL_PACKAGES", "REQUEST_INSTALL_PACKAGES", "BIND_ACCESSIBILITY_SERVICE", "PACKAGE_USAGE_STATS", "SYSTEM_ALERT_WINDOW", "POST_NOTIFICATIONS",
];

type SignatureAlgorithm = { id: number; label: string; hash: "SHA-256" | "SHA-512"; kind: "rsa-pss" | "rsa-pkcs1" | "ecdsa" | "dsa"; saltLength?: number; rank: number };
const signatureAlgorithms: SignatureAlgorithm[] = [
  { id: 0x0102, label: "RSA-PSS / SHA-512", hash: "SHA-512", kind: "rsa-pss", saltLength: 64, rank: 7 },
  { id: 0x0104, label: "RSA PKCS#1 v1.5 / SHA-512", hash: "SHA-512", kind: "rsa-pkcs1", rank: 6 },
  { id: 0x0202, label: "ECDSA / SHA-512", hash: "SHA-512", kind: "ecdsa", rank: 5 },
  { id: 0x0101, label: "RSA-PSS / SHA-256", hash: "SHA-256", kind: "rsa-pss", saltLength: 32, rank: 4 },
  { id: 0x0103, label: "RSA PKCS#1 v1.5 / SHA-256", hash: "SHA-256", kind: "rsa-pkcs1", rank: 3 },
  { id: 0x0201, label: "ECDSA / SHA-256", hash: "SHA-256", kind: "ecdsa", rank: 2 },
  { id: 0x0301, label: "DSA / SHA-256", hash: "SHA-256", kind: "dsa", rank: 1 },
];

class Reader {
  offset = 0;
  constructor(readonly data: Uint8Array) {}
  get remaining() { return this.data.length - this.offset; }
  u32() {
    if (this.remaining < 4) throw new Error("Unexpected end of APK signing data.");
    const value = new DataView(this.data.buffer, this.data.byteOffset + this.offset, 4).getUint32(0, true);
    this.offset += 4;
    return value;
  }
  lp() {
    const length = this.u32();
    if (length > this.remaining) throw new Error("APK signing data has an invalid length prefix.");
    const value = this.data.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }
}

function hex(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").match(/.{1,2}/g)?.join(":") || "";
}

function bytesEqual(left: Uint8Array, right: Uint8Array) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function asU8(buffer: ArrayBuffer): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(new ArrayBuffer(buffer.byteLength));
  copy.set(new Uint8Array(buffer));
  return copy;
}

function cryptoBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return asU8(toArrayBuffer(bytes));
}

function parseLengthPrefixed(data: Uint8Array) {
  const reader = new Reader(data);
  const values: Uint8Array[] = [];
  while (reader.remaining) values.push(reader.lp());
  return values;
}

function permissionStrings(manifest: Uint8Array) {
  const candidates = [new TextDecoder("utf-8", { fatal: false }).decode(manifest), new TextDecoder("utf-16le", { fatal: false }).decode(manifest)];
  const found = new Set<string>();
  for (const candidate of candidates) for (const permission of candidate.match(/(?:android\.permission|[A-Za-z][A-Za-z0-9_.]+\.permission)\.[A-Za-z0-9_.$]+/g) || []) found.add(permission);
  return Array.from(found).sort((left, right) => left.localeCompare(right));
}

function findEocd(bytes: Uint8Array) {
  const start = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= start; offset -= 1) {
    if (new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true) !== 0x06054b50) continue;
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
    const commentLength = view.getUint16(20, true);
    if (offset + 22 + commentLength === bytes.length) return offset;
  }
  throw new Error("The APK ZIP End of Central Directory record was not found.");
}

function findSigningBlock(bytes: Uint8Array) {
  const eocdOffset = findEocd(bytes);
  const eocd = new DataView(bytes.buffer, bytes.byteOffset + eocdOffset);
  const centralDirectoryOffset = eocd.getUint32(16, true);
  if (centralDirectoryOffset === 0xffffffff) throw new Error("ZIP64 APK signing blocks are not supported by this browser-local inspector.");
  if (centralDirectoryOffset < 24 || centralDirectoryOffset > eocdOffset) return null;
  const footerOffset = centralDirectoryOffset - 24;
  if (!bytesEqual(bytes.slice(footerOffset + 8, footerOffset + 24), APK_SIG_BLOCK_MAGIC)) return null;
  const footerSize = new DataView(bytes.buffer, bytes.byteOffset + footerOffset, 8).getBigUint64(0, true);
  if (footerSize > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("APK signing block is too large to inspect safely.");
  const blockStart = centralDirectoryOffset - Number(footerSize) - 8;
  if (blockStart < 0 || blockStart + 8 > footerOffset) throw new Error("APK signing block size is invalid.");
  const headerSize = new DataView(bytes.buffer, bytes.byteOffset + blockStart, 8).getBigUint64(0, true);
  if (headerSize !== footerSize) throw new Error("APK signing block size fields do not match.");
  const pairs = new Map<number, Uint8Array>();
  let offset = blockStart + 8;
  while (offset < footerOffset) {
    if (offset + 8 > footerOffset) throw new Error("APK signing block pair is truncated.");
    const pairLength = new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getBigUint64(0, true);
    offset += 8;
    if (pairLength < BigInt(4) || pairLength > BigInt(footerOffset - offset)) throw new Error("APK signing block pair length is invalid.");
    const length = Number(pairLength);
    const id = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true);
    pairs.set(id, bytes.slice(offset + 4, offset + length));
    offset += length;
  }
  if (offset !== footerOffset) throw new Error("APK signing block does not end at its footer.");
  return { blockStart, centralDirectoryOffset, eocdOffset, pairs };
}

function algorithmFor(id: number) { return signatureAlgorithms.find((algorithm) => algorithm.id === id); }

function ecdsaDerToRaw(signature: Uint8Array, size: number) {
  const reader = new Reader(signature);
  const readDerLength = () => {
    if (!reader.remaining) throw new Error("ECDSA DER signature is truncated.");
    const first = reader.data[reader.offset++];
    if (!(first & 0x80)) return first;
    const count = first & 0x7f;
    if (!count || count > 2 || reader.remaining < count) throw new Error("ECDSA DER length is invalid.");
    let result = 0;
    for (let index = 0; index < count; index += 1) result = (result << 8) | reader.data[reader.offset++];
    return result;
  };
  if (reader.data[reader.offset++] !== 0x30) throw new Error("ECDSA signature is not DER encoded.");
  const sequenceLength = readDerLength();
  if (sequenceLength !== reader.remaining) throw new Error("ECDSA DER sequence length is invalid.");
  const readInteger = () => {
    if (reader.data[reader.offset++] !== 0x02) throw new Error("ECDSA DER integer is missing.");
    const length = readDerLength();
    const encoded = reader.data.slice(reader.offset, reader.offset + length);
    reader.offset += length;
    const value = encoded.length > 1 && encoded[0] === 0 ? encoded.slice(1) : encoded;
    if (value.length > size) throw new Error("ECDSA DER integer is too large.");
    const padded = new Uint8Array(size);
    padded.set(value, size - value.length);
    return padded;
  };
  const r = readInteger(); const s = readInteger();
  if (reader.remaining) throw new Error("ECDSA DER signature has trailing bytes.");
  const raw = new Uint8Array(r.length + s.length);
  raw.set(r, 0); raw.set(s, r.length);
  return raw;
}

async function verifySignerSignature(algorithm: SignatureAlgorithm, publicKey: Uint8Array, signature: Uint8Array, signedData: Uint8Array) {
  if (!crypto.subtle) return { verified: false, supported: false, note: "Web Crypto is unavailable in this browser context." };
  try {
    if (algorithm.kind === "dsa") return { verified: false, supported: false, note: "DSA APK signatures cannot be verified by Web Crypto in this inspector." };
    if (algorithm.kind === "rsa-pss") {
      const key = await crypto.subtle.importKey("spki", cryptoBytes(publicKey), { name: "RSA-PSS", hash: algorithm.hash }, false, ["verify"]);
      const verified = await crypto.subtle.verify({ name: "RSA-PSS", saltLength: algorithm.saltLength || 0 }, key, cryptoBytes(signature), cryptoBytes(signedData));
      return { verified, supported: true, note: verified ? "Signer signature matches the protected signed data." : "Signer signature does not match the protected signed data." };
    }
    if (algorithm.kind === "rsa-pkcs1") {
      const key = await crypto.subtle.importKey("spki", cryptoBytes(publicKey), { name: "RSASSA-PKCS1-v1_5", hash: algorithm.hash }, false, ["verify"]);
      const verified = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, cryptoBytes(signature), cryptoBytes(signedData));
      return { verified, supported: true, note: verified ? "Signer signature matches the protected signed data." : "Signer signature does not match the protected signed data." };
    }
    const curves: Array<[NamedCurve, number]> = algorithm.hash === "SHA-256" ? [["P-256", 32], ["P-384", 48], ["P-521", 66]] : [["P-521", 66], ["P-384", 48], ["P-256", 32]];
    for (const [namedCurve, size] of curves) {
      try {
        const key = await crypto.subtle.importKey("spki", cryptoBytes(publicKey), { name: "ECDSA", namedCurve }, false, ["verify"]);
        const verified = await crypto.subtle.verify({ name: "ECDSA", hash: algorithm.hash }, key, cryptoBytes(ecdsaDerToRaw(signature, size)), cryptoBytes(signedData));
        return { verified, supported: true, note: verified ? "Signer signature matches the protected signed data." : "Signer signature does not match the protected signed data." };
      } catch { /* try the next standard EC curve */ }
    }
    return { verified: false, supported: false, note: "The ECDSA public key could not be imported with a supported standard curve." };
  } catch (error) {
    return { verified: false, supported: true, note: error instanceof Error ? `Signer verification failed: ${error.message}` : "Signer verification failed." };
  }
}

async function apkContentDigest(bytes: Uint8Array, layout: NonNullable<ReturnType<typeof findSigningBlock>>, hash: "SHA-256" | "SHA-512") {
  const eocd = bytes.slice(layout.eocdOffset);
  new DataView(eocd.buffer, eocd.byteOffset, eocd.byteLength).setUint32(16, layout.blockStart, true);
  const sections = [bytes.slice(0, layout.blockStart), bytes.slice(layout.centralDirectoryOffset, layout.eocdOffset), eocd];
  const count = sections.reduce((total, section) => total + Math.ceil(section.length / CHUNK_BYTES), 0);
  if (count > 0xffffffff) throw new Error("APK is too large for a v2/v3 chunk digest.");
  const chunkDigests: Uint8Array[] = [];
  for (const section of sections) {
    for (let offset = 0; offset < section.length; offset += CHUNK_BYTES) {
      const chunk = section.slice(offset, Math.min(section.length, offset + CHUNK_BYTES));
      const framed = new Uint8Array(5 + chunk.length);
      framed[0] = 0xa5;
      new DataView(framed.buffer).setUint32(1, chunk.length, true);
      framed.set(chunk, 5);
      chunkDigests.push(asU8(await crypto.subtle.digest(hash, cryptoBytes(framed))));
    }
  }
  const joined = new Uint8Array(5 + chunkDigests.reduce((total, digest) => total + digest.length, 0));
  joined[0] = 0x5a;
  new DataView(joined.buffer).setUint32(1, count, true);
  let offset = 5;
  for (const digest of chunkDigests) { joined.set(digest, offset); offset += digest.length; }
  return asU8(await crypto.subtle.digest(hash, cryptoBytes(joined)));
}

async function certificateDetails(raw: Uint8Array) {
  const fingerprintSha256 = hex(await crypto.subtle.digest("SHA-256", cryptoBytes(raw)));
  try {
    const certificate = Certificate.fromBER(toArrayBuffer(raw));
    const spki = new Uint8Array(certificate.subjectPublicKeyInfo.toSchema().toBER(false));
    return { fingerprintSha256, subject: certificate.subject.toString(), issuer: certificate.issuer.toString(), validFrom: certificate.notBefore.toString(), validTo: certificate.notAfter.toString(), spki };
  } catch { return { fingerprintSha256 }; }
}

async function inspectScheme(scheme: "v2" | "v3", value: Uint8Array | undefined, bytes: Uint8Array, layout: ReturnType<typeof findSigningBlock>): Promise<ApkSigningScheme> {
  if (!value) return { scheme, status: "not-found", signerCount: 0, verifiedSignerCount: 0, note: `No APK Signature Scheme ${scheme === "v2" ? "v2" : "v3"} block was found.`, signers: [] };
  if (!layout) return { scheme, status: "invalid", signerCount: 0, verifiedSignerCount: 0, note: "A signing-scheme value was found without a usable APK Signing Block layout.", signers: [] };
  try {
    const schemeReader = new Reader(value);
    const signerSequence = schemeReader.lp();
    if (schemeReader.remaining) throw new Error("Signing scheme block has unexpected trailing bytes.");
    const signers = await Promise.all(parseLengthPrefixed(signerSequence).map(async (rawSigner, index): Promise<ApkSigner> => {
      const reader = new Reader(rawSigner);
      const signedData = reader.lp();
      const outerMinSdk = scheme === "v3" ? reader.u32() : undefined;
      const outerMaxSdk = scheme === "v3" ? reader.u32() : undefined;
      const signatures = parseLengthPrefixed(reader.lp()).map((raw) => {
        const signatureReader = new Reader(raw);
        return { id: signatureReader.u32(), value: signatureReader.lp() };
      });
      const publicKey = reader.lp();
      if (reader.remaining) throw new Error("Signer record has unexpected trailing bytes.");
      const signedReader = new Reader(signedData);
      const digests = parseLengthPrefixed(signedReader.lp()).map((raw) => {
        const digestReader = new Reader(raw);
        return { id: digestReader.u32(), value: digestReader.lp() };
      });
      const certificates = parseLengthPrefixed(signedReader.lp());
      const innerMinSdk = scheme === "v3" ? signedReader.u32() : undefined;
      const innerMaxSdk = scheme === "v3" ? signedReader.u32() : undefined;
      const attributes = parseLengthPrefixed(signedReader.lp());
      const protectedTrailingBytes = signedReader.remaining;
      if (scheme === "v3" && (outerMinSdk !== innerMinSdk || outerMaxSdk !== innerMaxSdk)) throw new Error("v3 signer SDK ranges do not match protected signed data.");
      const detail = certificates[0] ? await certificateDetails(certificates[0]) : undefined;
      const publicKeyMatches = Boolean(detail?.spki && bytesEqual(detail.spki, publicKey));
      const proofOfRotation = attributes.some((attribute) => new Reader(attribute).u32() === PROOF_OF_ROTATION_ID);
      type SignatureCandidate = { id: number; value: Uint8Array<ArrayBuffer>; algorithm: SignatureAlgorithm };
      const candidates = signatures.map((signature) => ({ ...signature, algorithm: algorithmFor(signature.id) })).filter((item): item is SignatureCandidate => item.algorithm !== undefined).sort((left, right) => right.algorithm.rank - left.algorithm.rank);
      const matching = candidates.find((candidate) => digests.some((digest) => digest.id === candidate.id));
      const trailingNote = protectedTrailingBytes ? ` ${protectedTrailingBytes} protected trailing byte(s) were retained for Android-compatible signer parsing.` : "";
      if (!detail) return { index, signatureVerified: false, contentVerified: false, minSdk: innerMinSdk, maxSdk: innerMaxSdk, proofOfRotation, note: `Signer has no parseable X.509 certificate.${trailingNote}` };
      if (!publicKeyMatches) return { index, signatureAlgorithm: matching?.algorithm.label, signatureVerified: false, contentVerified: false, ...detail, minSdk: innerMinSdk, maxSdk: innerMaxSdk, proofOfRotation, note: `Signer certificate public key does not match the declared signer public key.${trailingNote}` };
      if (!matching) return { index, signatureVerified: false, contentVerified: false, ...detail, minSdk: innerMinSdk, maxSdk: innerMaxSdk, proofOfRotation, note: `No supported signer signature with a matching APK content digest was found.${trailingNote}` };
      const verified = await verifySignerSignature(matching.algorithm, publicKey, matching.value, signedData);
      if (!verified.verified) return { index, signatureAlgorithm: matching.algorithm.label, signatureVerified: false, contentVerified: false, ...detail, minSdk: innerMinSdk, maxSdk: innerMaxSdk, proofOfRotation, note: `${verified.note}${trailingNote}` };
      const expected = digests.find((digest) => digest.id === matching.id)?.value;
      const actual = expected ? await apkContentDigest(bytes, layout, matching.algorithm.hash) : undefined;
      const contentVerified = Boolean(expected && actual && bytesEqual(expected, actual));
      return { index, signatureAlgorithm: matching.algorithm.label, signatureVerified: true, contentVerified, ...detail, minSdk: innerMinSdk, maxSdk: innerMaxSdk, proofOfRotation, note: `${contentVerified ? "Signer signature and Android v2/v3 whole-file content digest verified locally." : "Signer signature verified, but the Android v2/v3 whole-file content digest did not match."}${trailingNote}` };
    }));
    const verifiedSignerCount = signers.filter((signer) => signer.signatureVerified && signer.contentVerified).length;
    const hasSupportedSignature = signers.some((signer) => signer.signatureAlgorithm);
    const status = verifiedSignerCount === signers.length && signers.length ? "verified" : hasSupportedSignature ? "invalid" : "unsupported";
    const verificationNote = status === "verified" ? `All ${signers.length} signer(s) passed local ${scheme} signature and whole-file digest verification.` : status === "invalid" ? "At least one signer did not pass local signature or whole-file digest verification." : "The signing block was detected, but no compatible browser-local signature algorithm could be verified.";
    return { scheme, status, signerCount: signers.length, verifiedSignerCount, note: verificationNote, signers };
  } catch (error) {
    return { scheme, status: "invalid", signerCount: 0, verifiedSignerCount: 0, note: error instanceof Error ? `Could not parse ${scheme} signing data: ${error.message}` : `Could not parse ${scheme} signing data.`, signers: [] };
  }
}

async function inspectJarCertificate(entries: Record<string, Uint8Array>): Promise<CertificateSummary> {
  const entry = Object.keys(entries).find((path) => /^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(path));
  if (!entry) return { status: "not-found", note: "No v1 JAR signature block was found." };
  const block = entries[entry];
  try {
    const content = ContentInfo.fromBER(toArrayBuffer(block));
    if (content.contentType !== ContentInfo.SIGNED_DATA) throw new Error("The signature block is not CMS SignedData.");
    const signed = new SignedData({ schema: content.content });
    const certificate = signed.certificates?.find((candidate) => candidate instanceof Certificate) as Certificate | undefined;
    if (!certificate) throw new Error("No X.509 certificate is embedded in the signature block.");
    const raw = certificate.toSchema().toBER(false);
    return { status: "available", entry, subject: certificate.subject.toString(), issuer: certificate.issuer.toString(), validFrom: certificate.notBefore.toString(), validTo: certificate.notAfter.toString(), fingerprintSha256: hex(await crypto.subtle.digest("SHA-256", raw)), note: "Embedded v1 JAR certificate parsed locally. v1 entry integrity is not independently revalidated by this inspector." };
  } catch (error) {
    return { status: "signature-block-only", entry, fingerprintSha256: hex(await crypto.subtle.digest("SHA-256", cryptoBytes(block))), note: error instanceof Error ? `A v1 signature block was found, but its embedded certificate could not be parsed: ${error.message}` : "A v1 signature block was found, but its embedded certificate could not be parsed." };
  }
}

export async function inspectApk(file: File): Promise<ApkInspection> {
  if (!file.name.toLowerCase().endsWith(".apk")) throw new Error("Choose an Android APK file.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = unzipSync(bytes);
  const manifest = entries["AndroidManifest.xml"];
  if (!manifest) throw new Error("This archive does not contain AndroidManifest.xml.");
  const warnings: string[] = [];
  let packageName: string | undefined; let versionName: string | undefined; let versionCode: number | undefined; let parserIssue = "";
  try {
    const parsed = await ManifestParser.extractApkManifest(file);
    packageName = parsed.packageName; versionName = parsed.versionName; versionCode = parsed.versionCode;
  } catch (error) { parserIssue = error instanceof Error ? error.message : "Manifest package metadata could not be fully parsed."; }
  if (!packageName) {
    const rawManifest = new TextDecoder("utf-8", { fatal: false }).decode(manifest);
    packageName = rawManifest.match(/\bpackage\s*=\s*["']([^"']+)["']/i)?.[1];
    versionName = rawManifest.match(/\bandroid:versionName\s*=\s*["']([^"']+)["']/i)?.[1];
    const versionCodeMatch = rawManifest.match(/\bandroid:versionCode\s*=\s*["'](\d+)["']/i);
    versionCode = versionCodeMatch ? Number(versionCodeMatch[1]) : undefined;
  }
  if (parserIssue && !packageName) warnings.push(`Manifest package metadata could not be fully parsed: ${parserIssue}`);
  const permissions = permissionStrings(manifest);
  const sensitivePermissions = permissions.filter((permission) => sensitivePermissionSuffixes.some((suffix) => permission.endsWith(`.${suffix}`)));
  const certificate = await inspectJarCertificate(entries);
  const layout = findSigningBlock(bytes);
  const signingSchemes = await Promise.all([inspectScheme("v2", layout?.pairs.get(V2_BLOCK_ID), bytes, layout), inspectScheme("v3", layout?.pairs.get(V3_BLOCK_ID), bytes, layout)]);
  if (certificate.status !== "available" && signingSchemes.every((scheme) => scheme.status === "not-found")) warnings.push("No parseable v1, v2, or v3 signing certificate was found. Do not rely on this APK until its origin is independently established.");
  for (const scheme of signingSchemes.filter((item) => item.status === "invalid")) warnings.push(`${scheme.scheme} signing inspection: ${scheme.note}`);
  if (!permissions.length) warnings.push("No declared permissions could be extracted from the manifest string pool; review the APK with Android platform tools before production use.");
  return { fileName: file.name, size: file.size, packageName, versionName, versionCode, permissions, sensitivePermissions, certificate, signingSchemes, warnings };
}
