/**
 * Field Service Ledger style: device identity dominates the workbench while
 * every consequential activity gets an inspectable, local command receipt.
 */
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { BrowserAdbClient, type CommandResult, type DeviceFile, type DeviceProfile, type MirrorSession } from "@/lib/adbClient";
import { COMMUNITY_SOURCE, fetchCommunityCatalog, type CommunityPackage } from "@/lib/communityCatalog";
import AboutWorkspace from "@/components/AboutWorkspace";
import { LiveMirrorWorkspace, type MirrorState } from "@/components/LiveMirrorWorkspace";
import { ReceiptHistoryWorkspace, type HistoryReceipt } from "@/components/ReceiptHistoryWorkspace";
import {
  AppWindow,
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Cpu,
  Download,
  FileArchive,
  FileText,
  Folder,
  HardDrive,
  History,
  HelpCircle,
  Info,
  Languages,
  ListFilter,
  Loader2,
  LockKeyhole,
  MonitorUp,
  Moon,
  PackageOpen,
  PlugZap,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  TerminalSquare,
  Upload,
  Usb,
  UsersRound,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Workspace = "overview" | "debloat" | "privacy" | "mirror" | "profiles" | "apk" | "files" | "history" | "about";
type InterfaceLanguage = "en" | "ar" | "other";
type Receipt = CommandResult & { label: string; authority: "USB" | "Root" | "Browser"; restore?: string };

const nav: Array<{ id: Workspace; label: string; icon: typeof Smartphone }> = [
  { id: "overview", label: "Device desk", icon: Smartphone },
  { id: "debloat", label: "Debloat", icon: PackageOpen },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "mirror", label: "Mirror", icon: MonitorUp },
  { id: "profiles", label: "Work profiles", icon: UsersRound },
  { id: "apk", label: "APK desk", icon: FileArchive },
  { id: "files", label: "Files", icon: Folder },
  { id: "history", label: "Receipt history", icon: History },
  { id: "about", label: "About", icon: Info },
];

const languageCopy = {
  en: {
    direction: "ltr" as const,
    language: "Interface language",
    choices: { en: "English", ar: "العربية", other: "Other languages" },
    nav: { overview: "Device desk", debloat: "Debloat", privacy: "Privacy", mirror: "Mirror", profiles: "Work profiles", apk: "APK desk", files: "Files", history: "Receipt history", about: "About" },
    ready: "ready",
    inspect: "Inspect first. Change only what you can explain.",
    about: "About Forensicslarn",
  },
  ar: {
    direction: "rtl" as const,
    language: "لغة الواجهة",
    choices: { en: "English", ar: "العربية", other: "لغات أخرى" },
    nav: { overview: "لوحة الجهاز", debloat: "تنظيف التطبيقات", privacy: "الخصوصية", mirror: "نسخ الشاشة", profiles: "ملفات العمل", apk: "حزمة APK", files: "الملفات", history: "أرشيف الإيصالات", about: "حول" },
    ready: "جاهز",
    inspect: "افحص أولاً. غيّر فقط ما تستطيع شرحه.",
    about: "حول Forensicslarn",
  },
  other: {
    direction: "ltr" as const,
    language: "Interface language",
    choices: { en: "English", ar: "العربية", other: "Other languages" },
    nav: { overview: "Device desk", debloat: "Debloat", privacy: "Privacy", mirror: "Mirror", profiles: "Work profiles", apk: "APK desk", files: "Files", history: "Receipt history", about: "About" },
    ready: "ready",
    inspect: "Inspect first. Change only what you can explain.",
    about: "About Forensicslarn",
  },
} as const;

const initialReceipt: Receipt = {
  label: "Session waiting",
  command: "No device command issued",
  stdout: "Connect a phone, approve USB debugging, and inventory will load locally.",
  stderr: "",
  exitCode: 0,
  at: new Date().toISOString(),
  authority: "Browser",
};

const RECEIPT_HISTORY_KEY = "acc-receipt-history-v1";

function shortTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function levelTone(level: string) {
  if (level === "Recommended") return "text-[#527321] bg-[#eef8cd] border-[#b9da71]";
  if (level === "Advanced") return "text-[#8b5c1c] bg-[#fff0ce] border-[#e6c473]";
  if (level === "Expert") return "text-[#934639] bg-[#fbe5df] border-[#dba193]";
  return "text-[#697482] bg-[#eee9df] border-[#d8d1c4]";
}

function removalLabel(level: string, isArabic: boolean) {
  if (!isArabic) return level;
  if (level === "Recommended") return "موصى به";
  if (level === "Advanced") return "متقدم";
  if (level === "Expert") return "خبير";
  return "غير مصنف";
}

function commandName(command: string) {
  return command.length > 62 ? `${command.slice(0, 59)}…` : command;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

export default function Home() {
  const adb = useRef(new BrowserAdbClient());
  const mirrorCanvas = useRef<HTMLCanvasElement | null>(null);
  const mirrorSession = useRef<MirrorSession | null>(null);
  const { theme, toggleTheme } = useTheme();
  const [active, setActive] = useState<Workspace>("overview");
  const [device, setDevice] = useState<DeviceProfile | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [root, setRoot] = useState(false);
  const [packages, setPackages] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<CommunityPackage[]>([]);
  const [catalogTime, setCatalogTime] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [recommendedOnly, setRecommendedOnly] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [actionMode, setActionMode] = useState<"disable" | "uninstall">("disable");
  const [receipts, setReceipts] = useState<Receipt[]>([initialReceipt]);
  const [receiptHistory, setReceiptHistory] = useState<HistoryReceipt[]>(() => {
    try {
      const saved = localStorage.getItem(RECEIPT_HISTORY_KEY);
      return saved ? (JSON.parse(saved) as HistoryReceipt[]).slice(0, 240) : [];
    } catch {
      return [];
    }
  });
  const [files, setFiles] = useState<DeviceFile[]>([]);
  const [filePath, setFilePath] = useState("/sdcard/Download");
  const [fileLoading, setFileLoading] = useState(false);
  const [userOutput, setUserOutput] = useState("");
  const [terminal, setTerminal] = useState("");
  const [terminalRunning, setTerminalRunning] = useState(false);
  const [language, setLanguage] = useState<InterfaceLanguage>(() => (localStorage.getItem("acc-language") as InterfaceLanguage) || "en");
  const [mirrorState, setMirrorState] = useState<MirrorState>({ phase: "idle", detail: "Connect and authorize a device, then start an explicit local Scrcpy session." });
  const [recoveryScriptName, setRecoveryScriptName] = useState("android-control-recovery");

  const mappedPackages = useMemo(() => {
    const mapped = new Map(catalog.map((item) => [item.id, item]));
    return packages.map((id) => mapped.get(id)).filter((item): item is CommunityPackage => Boolean(item));
  }, [packages, catalog]);

  const visiblePackages = useMemo(
    () =>
      mappedPackages.filter((item) => {
        const searchable = `${item.id} ${item.list} ${item.description}`.toLowerCase();
        return (!recommendedOnly || item.removal === "Recommended") && (!query || searchable.includes(query.toLowerCase()));
      }),
    [mappedPackages, query, recommendedOnly],
  );

  const addReceipt = (result: CommandResult, label: string, authority: Receipt["authority"] = "USB", restore?: string) => {
    const receipt = { ...result, label, authority, restore };
    setReceipts((current) => [receipt, ...current].slice(0, 60));
    setReceiptHistory((current) => [receipt, ...current].slice(0, 240));
  };

  const downloadLocal = (filename: string, contents: string, type: string) => {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const exportReceipts = (format: "json" | "md") => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (format === "json") {
      downloadLocal(`android-control-receipts-${stamp}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), receipts }, null, 2), "application/json");
    } else {
      const report = [`# Android Control Center — Command Receipts`, "", `Exported: ${new Date().toISOString()}`, "", ...receipts.flatMap((receipt, index) => [`## ${index + 1}. ${receipt.label}`, "", `- **Authority:** ${receipt.authority}`, `- **Time:** ${receipt.at}`, `- **Command:** \`${receipt.command}\``, `- **Exit code:** ${receipt.exitCode}`, `- **Output:** ${receipt.stderr || receipt.stdout || "(none)"}`, receipt.restore ? `- **Restore:** \`${receipt.restore}\`` : "", ""])].join("\n");
      downloadLocal(`android-control-receipts-${stamp}.md`, report, "text/markdown");
    }
    toast.success("Receipt export saved locally.");
  };

  const exportRecoveryScript = () => {
    const restoreItems = receipts.filter((receipt) => receipt.restore);
    if (!restoreItems.length) {
      toast.error("There are no recorded package restoration commands yet.");
      return;
    }
    const safeName = recoveryScriptName.trim().replace(/[^A-Za-z0-9._-]/g, "-") || "android-control-recovery";
    const script = ["#!/usr/bin/env sh", "# Generated locally by Android Control Center.", "# Review every line before executing against a connected Android device.", "set -eu", "", "adb wait-for-device", "", ...restoreItems.flatMap((receipt) => [`# ${receipt.label}`, `adb shell ${receipt.restore}`, ""])].join("\n");
    downloadLocal(`${safeName}.sh`, script, "text/x-shellscript");
    toast.success("Recovery script saved locally. Review it before running.");
  };

  const exportHistory = (format: "json" | "md") => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (format === "json") {
      downloadLocal(`android-control-history-${stamp}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), receipts: receiptHistory }, null, 2), "application/json");
    } else {
      const report = [`# Android Control Center — Receipt History`, "", `Exported: ${new Date().toISOString()}`, "", ...receiptHistory.flatMap((receipt, index) => [`## ${index + 1}. ${receipt.label}`, "", `- **Authority:** ${receipt.authority}`, `- **Time:** ${receipt.at}`, `- **Command:** \`${receipt.command}\``, `- **Exit code:** ${receipt.exitCode}`, `- **Output:** ${receipt.stderr || receipt.stdout || "(none)"}`, receipt.restore ? `- **Restore:** \`${receipt.restore}\`` : "", ""])].join("\n");
      downloadLocal(`android-control-history-${stamp}.md`, report, "text/markdown");
    }
    toast.success(language === "ar" ? "تم حفظ تصدير الأرشيف محلياً." : "Receipt-history export saved locally.");
  };

  const protectHistory = async (password: string) => {
    if (password.length < 10) {
      toast.error(language === "ar" ? "استخدم كلمة مرور من 10 أحرف على الأقل." : "Use a password with at least 10 characters.");
      return;
    }
    if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable in this browser context.");
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const payload = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), receipts: receiptHistory });
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(payload)));
    const envelope = { format: "android-control-encrypted-history", version: 1, cipher: "AES-256-GCM", kdf: { name: "PBKDF2", hash: "SHA-256", iterations: 250000, salt: bytesToBase64(salt) }, iv: bytesToBase64(iv), ciphertext: bytesToBase64(ciphertext) };
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadLocal(`android-control-history-${stamp}.encrypted.json`, JSON.stringify(envelope, null, 2), "application/json");
    toast.success(language === "ar" ? "تم تصدير الأرشيف المشفر محلياً." : "Encrypted archive exported locally.");
  };

  const removeHistoryReceipt = (key: string) => {
    setReceiptHistory((current) => current.filter((receipt) => `${receipt.at}-${receipt.command}-${receipt.label}` !== key));
  };

  const updateHistoryTags = (key: string, tags: string[]) => {
    setReceiptHistory((current) => current.map((receipt) => `${receipt.at}-${receipt.command}-${receipt.label}` === key ? { ...receipt, tags } : receipt));
  };

  const clearReceiptHistory = () => {
    setReceiptHistory([]);
    toast.success(language === "ar" ? "تم مسح أرشيف الإيصالات المحلي." : "Local receipt history cleared.");
  };

  const inspectAfterConnect = async () => {
    const [inventory, users, rootResult] = await Promise.all([adb.current.listPackages(), adb.current.listUsers(), adb.current.probeRoot()]);
    setPackages(inventory.packages);
    addReceipt(inventory.result, `Inventoried ${inventory.packages.length} package IDs`);
    addReceipt(users, "Read Android user and profile list");
    addReceipt(rootResult.result, rootResult.granted ? "Root authority confirmed" : "Root authority not granted", rootResult.granted ? "Root" : "USB");
    setRoot(rootResult.granted);
    setUserOutput(users.stdout || "No additional Android profiles were reported.");
  };

  const connect = async () => {
    setConnecting(true);
    try {
      const profile = await adb.current.connect();
      setDevice(profile);
      addReceipt(
        { command: "WebUSB → ADB authentication", stdout: `${profile.manufacturer} ${profile.model} authorized.`, stderr: "", exitCode: 0, at: new Date().toISOString() },
        "USB debugging authorization complete",
        "Browser",
      );
      await inspectAfterConnect();
      toast.success("Device inventory is ready.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unable to connect to the selected device.";
      addReceipt({ command: "WebUSB → ADB authentication", stdout: "", stderr: detail, exitCode: 1, at: new Date().toISOString() }, "Connection stopped", "Browser");
      toast.error(detail);
    } finally {
      setConnecting(false);
    }
  };

  const refreshCatalog = async () => {
    setCatalogLoading(true);
    try {
      const next = await fetchCommunityCatalog();
      setCatalog(next.entries);
      setCatalogTime(next.refreshedAt);
      addReceipt(
        { command: `GET ${COMMUNITY_SOURCE}`, stdout: `${next.entries.length} upstream definitions loaded locally.`, stderr: "", exitCode: 0, at: new Date().toISOString() },
        "Community package definitions refreshed",
        "Browser",
      );
      toast.success("Community definitions loaded; no device data was sent.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Could not refresh the community list.";
      addReceipt({ command: `GET ${COMMUNITY_SOURCE}`, stdout: "", stderr: detail, exitCode: 1, at: new Date().toISOString() }, "Community list refresh failed", "Browser");
      toast.error(detail);
    } finally {
      setCatalogLoading(false);
    }
  };

  const runQueued = async () => {
    for (const id of selected) {
      try {
        const result = actionMode === "disable" ? await adb.current.disablePackage(id) : await adb.current.uninstallForUser(id);
        addReceipt(result, actionMode === "disable" ? `Disabled ${id} for User 0` : `Removed ${id} for User 0`, "USB", `cmd package install-existing --user 0 ${id}`);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Package change failed.";
        addReceipt({ command: `${actionMode} ${id}`, stdout: "", stderr: detail, exitCode: 1, at: new Date().toISOString() }, `Could not change ${id}`);
      }
    }
    setSelected([]);
    setReviewOpen(false);
    toast.success("Queued operations have finished; see the command ledger.");
  };

  const restore = async (id: string) => {
    try {
      const result = await adb.current.restorePackage(id);
      addReceipt(result, `Attempted restore for ${id}`, "USB");
      toast.success("Restore command completed; inspect its receipt for device output.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore did not run.");
    }
  };

  const runTerminal = async () => {
    if (!terminal.trim()) return;
    setTerminalRunning(true);
    try {
      const result = await adb.current.run(terminal);
      addReceipt(result, "Operator command executed");
      toast.success(result.exitCode === 0 ? "Command completed." : "Command returned a non-zero result.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Command could not run.";
      addReceipt({ command: terminal, stdout: "", stderr: detail, exitCode: 1, at: new Date().toISOString() }, "Operator command failed");
      toast.error(detail);
    } finally {
      setTerminalRunning(false);
    }
  };

  const loadFiles = async () => {
    setFileLoading(true);
    try {
      const next = await adb.current.listFiles(filePath);
      setFiles(next);
      addReceipt({ command: `sync.readdir ${filePath}`, stdout: `${next.length} entries returned.`, stderr: "", exitCode: 0, at: new Date().toISOString() }, "File listing refreshed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to read this path.");
    } finally {
      setFileLoading(false);
    }
  };

  const installApk = async (file?: File) => {
    if (!file) return;
    try {
      const result = await adb.current.installApk(file);
      addReceipt(result, `Installed ${file.name}`);
      toast.success(result.exitCode === 0 ? "APK installation completed." : "APK installer reported a result; inspect the receipt.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "APK installation failed.";
      addReceipt({ command: `Install ${file.name}`, stdout: "", stderr: detail, exitCode: 1, at: new Date().toISOString() }, "APK installation failed");
      toast.error(detail);
    }
  };

  const startLiveMirror = async () => {
    if (!mirrorCanvas.current) return;
    setMirrorState({ phase: "starting", detail: "Pushing the managed Scrcpy server and negotiating a local H.264 stream…" });
    try {
      const session = await adb.current.startMirror(mirrorCanvas.current);
      mirrorSession.current = session;
      setMirrorState({ phase: "live", detail: "Scrcpy is rendering the connected device locally in this browser.", width: session.width, height: session.height, codec: session.codec });
      addReceipt({ command: "adb sync.push → /data/local/tmp/scrcpy-server.jar", stdout: "Managed Scrcpy 2.1 server transferred to authorized device.", stderr: "", exitCode: 0, at: new Date().toISOString() }, "Scrcpy server prepared", "USB");
      addReceipt({ command: "scrcpy-server 2.1 → H.264 WebCodecs session", stdout: `Live mirror started at ${session.width}×${session.height}; codec ${session.codec}.`, stderr: "", exitCode: 0, at: new Date().toISOString() }, "Live mirror started", "USB");
      toast.success("Live mirror started.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Scrcpy could not start.";
      setMirrorState({ phase: "error", detail });
      addReceipt({ command: "scrcpy start session", stdout: "", stderr: detail, exitCode: 1, at: new Date().toISOString() }, "Live mirror did not start", "USB");
      toast.error(detail);
    }
  };

  const stopLiveMirror = async () => {
    const session = mirrorSession.current;
    if (!session) return;
    setMirrorState((current) => ({ ...current, phase: "stopping", detail: "Closing the local Scrcpy tunnel and decoder…" }));
    try {
      await session.stop();
      mirrorSession.current = null;
      setMirrorState({ phase: "idle", detail: "Mirror session stopped. The device display is no longer streamed to this browser." });
      addReceipt({ command: "scrcpy session close", stdout: "Scrcpy control and media streams closed locally.", stderr: "", exitCode: 0, at: new Date().toISOString() }, "Live mirror stopped", "USB");
      toast.success("Live mirror stopped.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Mirror stop did not finish cleanly.";
      setMirrorState({ phase: "error", detail });
      addReceipt({ command: "scrcpy session close", stdout: "", stderr: detail, exitCode: 1, at: new Date().toISOString() }, "Mirror stop returned an error", "USB");
      toast.error(detail);
    }
  };

  const copy = languageCopy[language];
  const workspace = copy.nav[active];
  const isLive = Boolean(device);
  const isArabic = language === "ar";
  const debloatCopy = isArabic ? {
    context: "سياق المجتمع + الجرد المحلي", title: "ضع فقط التغييرات التي تفهمها في القائمة.", description: "تُطلب التعريفات من مستودع UAD-ng العام فقط عند اختيار التحديث. تبقى معرّفات الحزم المثبتة على هذا الجهاز. الإيقاف القابل للاستعادة للمستخدم 0 هو الخيار الآمن الافتراضي.", refresh: "تحديث القائمة", source: "المصدر:", notDownloaded: "لم يتم التنزيل", review: "مراجعة المصدر", connectTitle: "صِل جهازاً لمطابقة الحزم.", connectDetail: "يمكن تحديث قائمة المجتمع الآن، لكن مطابقة الحزم ووضعها في القائمة يتطلبان جرد أندرويد محلياً.", loadTitle: "حمّل تعريفات المجتمع لتصنيف هذا الجهاز.", loadDetail: "معرّفات الحزم المحلية جاهزة. يجري التحديث طلباً عاماً واحداً إلى GitHub ولا يرفع الجرد.", search: "ابحث في الحزم المطابقة", recommended: "عرض الموصى به فقط", package: "الحزمة", assessment: "تقييم المصدر", purpose: "الغرض والاعتماديات", restore: "استعادة", selected: "محدد", matched: "مطابق", only: "يبدأ الموصى به فقط مفعلاً.", disable: "إيقاف للمستخدم 0 (افتراضي)", uninstall: "إزالة للمستخدم 0 (متقدم)", reviewCommands: "مراجعة", commands: "أمر", descriptionSource: "وصف المصدر العام", neededBy: "تحتاجه", reviewRequired: "المراجعة مطلوبة", apply: "تطبيق الأوامر المراجعة", cancel: "إلغاء", risk: "استخدم على مسؤوليتك. يمكن لمصنّعي الأجهزة تقييد الحزم وتصنيف المجتمع ليس ضماناً. ستضاف النتائج ومحاولات الاستعادة إلى سجل الأوامر المحلي.",
  } : {
    context: "Community context + local inventory", title: "Queue only the changes you understand.", description: "Definitions are requested directly from the public UAD-ng repository only when you choose refresh. Installed package IDs remain on this device. The safe default is reversible disablement for User 0.", refresh: "Refresh list", source: "Source:", notDownloaded: "not downloaded", review: "review upstream", connectTitle: "Connect a device to match packages.", connectDetail: "The community list can be refreshed now, but package matching and queueing require a local Android inventory.", loadTitle: "Load community definitions to classify this device.", loadDetail: "local package IDs are ready. Refreshing makes one public GitHub request and does not upload the inventory.", search: "Search matched packages", recommended: "Show recommended only", package: "Package", assessment: "Upstream assessment", purpose: "Purpose & dependencies", restore: "Restore", selected: "selected", matched: "matched", only: "only Recommended starts enabled.", disable: "Disable for User 0 (default)", uninstall: "Remove for User 0 (advanced)", reviewCommands: "Review", commands: "command", descriptionSource: "Public-source description", neededBy: "needed by", reviewRequired: "Review required", apply: "Apply reviewed commands", cancel: "Cancel", risk: "Use at your own risk. Device makers can restrict packages and the community classification is not a warranty. Results and restore attempts will be added to the local command ledger.",
  };

  useEffect(() => {
    document.documentElement.lang = language === "ar" ? "ar" : "en";
    document.documentElement.dir = languageCopy[language].direction;
    localStorage.setItem("acc-language", language);
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem(RECEIPT_HISTORY_KEY, JSON.stringify(receiptHistory));
    } catch {
      toast.error(language === "ar" ? "تعذر حفظ أرشيف الإيصالات محلياً." : "Receipt history could not be saved locally.");
    }
  }, [receiptHistory, language]);

  const changeLanguage = (next: InterfaceLanguage) => {
    setLanguage(next);
    toast.message(next === "ar" ? "تم تفعيل وضع العربية." : next === "other" ? "More language packs are being prepared." : "English interface selected.");
  };

  return (
    <div dir={copy.direction} className="app-workbench min-h-screen bg-[#f6f2ea] text-[#14253a] dark:bg-[#0e1d2c] dark:text-[#e7eef3] lg:grid lg:grid-cols-[230px_minmax(0,1fr)_330px]">
      <aside className="border-b border-[#2f4860] bg-[#14253a] text-[#f6f2ea] lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-3 border-b border-[#2f4860] px-5 py-5">
          <img src="/manus-storage/android-control-mark_bcf284ab.png" alt="Android Control Center signal bracket mark" className="h-14 w-14" />
          <div className="min-w-0">
            <p className="kicker text-[#c8f04a]"><span className="cal-tick" />ACC / 01</p>
            <p className="brand-wordmark mt-1 text-[0.72rem] text-white">AndroidControl<br />Center <span className="text-[#c8f04a]">Forensicslarn</span></p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 py-4 lg:block lg:space-y-1 lg:overflow-visible">
          {nav.map((item, index) => {
            const Icon = item.icon;
            const chosen = active === item.id;
            return (
              <button key={item.id} onClick={() => setActive(item.id)} className={`action-button group flex min-w-max items-center gap-3 px-3 py-2.5 text-left text-sm lg:w-full ${chosen ? "bg-[#c8f04a] text-[#14253a]" : "text-[#cad3dc] hover:bg-[#223952] hover:text-white"}`}>
                <span className="mono text-[0.64rem] opacity-70">0{index + 1}</span>
                <Icon size={16} strokeWidth={1.8} />
                <span className="font-medium">{copy.nav[item.id]}</span>
              </button>
            );
          })}
        </nav>
        <div className="hidden px-5 lg:block lg:absolute lg:bottom-6">
          <div className="mb-5 border-y border-[#2f4860] py-3">
            <p className="kicker text-[#7f91a1]">{isArabic ? "المظهر" : "Appearance"}</p>
            <button onClick={() => toggleTheme?.()} className="action-button mt-2 flex w-full items-center justify-between border border-[#3d566e] bg-[#1b3048] px-2.5 py-2 text-xs text-[#f6f2ea] hover:border-[#c8f04a]" aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}>
              <span className="flex items-center gap-2">{theme === "dark" ? <Sun size={14} className="text-[#c8f04a]" /> : <Moon size={14} className="text-[#c8f04a]" />}{theme === "dark" ? (isArabic ? "داكن" : "Dark") : (isArabic ? "فاتح" : "Light")}</span>
              <span className="mono text-[0.6rem] text-[#a6b3be]">{isArabic ? "تغيير" : "change"}</span>
            </button>
          </div>
          <div className="mb-5 border-y border-[#2f4860] py-3">
            <label className="kicker flex items-center gap-2 text-[#7f91a1]" htmlFor="language-choice"><Languages size={13} /> {copy.language}</label>
            <select id="language-choice" value={language} onChange={(event) => changeLanguage(event.target.value as InterfaceLanguage)} className="mono mt-2 h-9 w-full border border-[#3d566e] bg-[#1b3048] px-2 text-xs text-[#f6f2ea] outline-none focus:border-[#c8f04a]">
              <option value="en">{copy.choices.en}</option>
              <option value="ar">{copy.choices.ar}</option>
              <option value="other">{copy.choices.other}</option>
            </select>
            {language === "other" && <p className="mt-2 text-[0.63rem] leading-4 text-[#8e9eae]">Select English or Arabic today; additional language packs are being prepared.</p>}
          </div>
          <p className="kicker text-[#7f91a1]">{isArabic ? "النقل" : "Transport"}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-[#cdd7df]"><Usb size={14} className={isLive ? "text-[#c8f04a]" : "text-[#7f91a1]"} /> {isLive ? (isArabic ? "تم تفويض تصحيح USB" : "USB Debugging authorized") : (isArabic ? "بانتظار التفويض" : "Awaiting authorization")}</div>
          <p className="mt-2 text-xs leading-5 text-[#8e9eae]">{isArabic ? "تبقى جميع العمليات على هذا الجهاز وفي هذا المتصفح." : "All work stays on this device and in this browser."}</p>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-7 lg:px-8 lg:py-7">
        <header className="mb-7 flex flex-col gap-4 border-b border-[#d8d1c4] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="kicker text-[#687584]">{isArabic ? "مكتب الخدمة" : "Service bench"} / {active === "overview" ? copy.ready : workspace}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{active === "overview" ? copy.inspect : active === "about" ? copy.about : workspace}</h1>
          </div>
          <div className={`status-stamp w-fit ${isLive ? "text-[#527321]" : "text-[#687584]"}`}><span>{isLive ? "live device" : "not connected"}</span></div>
        </header>

        {active === "overview" && (
          <section className="space-y-6">
            <div className="relative overflow-hidden border border-[#d8d1c4] bg-[#fffdf8]">
              <img src="/manus-storage/android-control-hero_a3d76729.jpg" alt="Android phone on a service workbench" className="absolute inset-y-0 right-0 h-full w-[56%] object-cover object-right opacity-90" />
              <div className="absolute inset-y-0 right-0 w-[68%] bg-gradient-to-r from-[#fffdf8] via-[#fffdf8]/80 to-transparent dark:from-[#14253a] dark:via-[#14253a]/88" />
              <div className="relative max-w-2xl p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2"><span className={`status-stamp ${isLive ? "text-[#527321]" : "text-[#687584]"}`}>{isLive ? "device live" : "session idle"}</span><span className="status-stamp text-[#59869c]">usb authority</span><span className="status-stamp text-[#687584]">local only</span></div>
                <p className="kicker mt-5 text-[#687584]">Service desk / handoff required</p>
                <h2 className="mt-2 max-w-lg text-3xl font-bold leading-[1.02] tracking-[-0.05em] sm:text-4xl">{isLive ? `${device?.manufacturer} ${device?.model} is ready for inspection.` : "Authorize a device to open the service record."}</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-[#526273]">The next event is a visible WebUSB request. Android will ask you to trust this browser key; then the desk reads device facts, package inventory, profiles, and root availability locally.</p>
                <div className="mt-5 grid max-w-xl gap-2 sm:grid-cols-2">
                  <div className="receipt-strip"><span className="text-[#c8f04a]">NEXT / </span>WebUSB → ADB authentication<br /><span className="text-[#b4c6d2]">authority: browser + phone prompt</span></div>
                  <div className="receipt-strip border-l-[#59869c]"><span className="text-[#c8f04a]">RESTORE / </span>not applicable before changes<br /><span className="text-[#b4c6d2]">evidence starts with inventory</span></div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button onClick={connect} disabled={connecting || isLive} className="action-button bg-[#14253a] px-5 text-[#f6f2ea] hover:bg-[#223952]">
                    {connecting ? <Loader2 className="mr-2 animate-spin" size={17} /> : <PlugZap className="mr-2" size={17} />}{isLive ? "Device authorized" : "Connect & authorize"}
                  </Button>
                  <span className="mono text-[0.67rem] text-[#687584]">HTTPS + Chromium · no silent connection</span>
                </div>
                <p className="mono mt-4 text-[0.61rem] text-[#687584]">INSPECTION SURFACE / USB-C DEVICE + LOCAL KEY / CAL: 01</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Device", value: device ? `${device.manufacturer} ${device.model}` : "No session", note: device ? `Android ${device.androidVersion} · API ${device.sdk}` : "state: device authorization required", icon: Smartphone },
                { label: "Inventory", value: isLive ? `${packages.length} found` : "No receipt", note: catalog.length ? `${mappedPackages.length} have community context` : "command: pm list packages -u", icon: Boxes },
                { label: "Authority", value: root ? "Root available" : "Standard USB", note: root ? "stamp: root commands stay separate" : "stamp: safe mode is default", icon: LockKeyhole },
                { label: "Privacy", value: "No telemetry", note: "stamp: only user-triggered GitHub requests", icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                return <div className="service-card p-4" key={item.label}><div className="flex items-start justify-between"><p className="kicker text-[#687584]">{item.label}</p><span className="state-square text-[#59869c]">0{item.label === "Device" ? 1 : item.label === "Inventory" ? 2 : item.label === "Authority" ? 3 : 4}</span></div><p className="mt-5 text-lg font-bold tracking-[-0.03em]">{item.value}</p><p className="mono mt-1 text-[0.64rem] leading-5 text-[#687584]">{item.note}</p></div>;
              })}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
              <div className="service-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="kicker text-[#687584]">Receipt sequence</p><h3 className="mt-1 text-xl font-bold tracking-[-0.04em]">Controlled connection</h3></div><Usb className="text-[#c8a800]" /></div><ol className="mt-6 grid gap-4 sm:grid-cols-3">{[["01", "Enable USB debugging", "Developer options → USB debugging."], ["02", "Approve device key", "Browser chooser, then Android trust prompt."], ["03", "Read the receipt", "The right rail retains command, output, and restore." ]].map(([step, title, copy]) => <li key={step} className="border-l-2 border-[#c8f04a] bg-[#f3efe6] p-3"><p className="mono text-xs text-[#59869c]">RECEIPT / {step}</p><p className="mt-2 text-sm font-semibold">{title}</p><p className="mono mt-1 text-[0.65rem] leading-5 text-[#687584]">{copy}</p></li>)}</ol></div>
              <div className="overflow-hidden border border-[#d8d1c4] bg-[#fffdf8]"><img src="/manus-storage/device-inspection-panel_29038d16.jpg" alt="Device inspection tools" className="h-40 w-full object-cover" /><div className="p-5"><p className="kicker text-[#687584]">Control discipline</p><p className="mt-2 text-sm leading-6 text-[#526273]">Actions never silently elevate permission. A failed command remains visible, and a package action records a restoration command when a normal-user restoration path exists.</p></div></div>
            </div>
          </section>
        )}

        {active === "debloat" && (
          <section className="space-y-5">
            <div className="service-card overflow-hidden"><div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:p-6"><div><p className="kicker text-[#687584]">{debloatCopy.context}</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">{debloatCopy.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#526273]">{debloatCopy.description}</p></div><div className="flex items-start gap-2"><Button variant="outline" onClick={refreshCatalog} disabled={catalogLoading} className="action-button border-[#14253a] bg-transparent text-[#14253a] hover:bg-[#e6f4bb]">{catalogLoading ? <Loader2 className="mr-2 animate-spin" size={15} /> : <RefreshCw className="mr-2" size={15} />}{debloatCopy.refresh}</Button></div></div><div className="border-t border-[#d8d1c4] bg-[#f3efe6] px-5 py-3 text-xs text-[#687584] sm:px-6"><span className="mono">{debloatCopy.source}</span> UAD-ng public data · {catalogTime ? `${isArabic ? "تم التحديث" : "refreshed"} ${shortTime(catalogTime)}` : debloatCopy.notDownloaded} · <a href="https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation" target="_blank" className="underline underline-offset-4">{debloatCopy.review}</a></div></div>

            {!isLive ? <EmptyState title={debloatCopy.connectTitle} copy={debloatCopy.connectDetail} action={connect} label={isArabic ? "صِل وفوض" : "Connect & authorize"} /> : !catalog.length ? <EmptyState title={debloatCopy.loadTitle} copy={`${packages.length} ${debloatCopy.loadDetail}`} action={refreshCatalog} label={debloatCopy.refresh} /> : (
              <div className="service-card overflow-hidden"><div className="flex flex-col gap-3 border-b border-[#d8d1c4] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#687584]" size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={debloatCopy.search} className="h-10 w-full border border-[#d8d1c4] bg-[#fffdf8] pl-9 pr-3 text-sm outline-none focus:border-[#14253a]" /></div><label className="flex items-center gap-2 text-xs text-[#526273]"><input type="checkbox" checked={recommendedOnly} onChange={(event) => setRecommendedOnly(event.target.checked)} className="accent-[#14253a]" /> {debloatCopy.recommended}</label></div>
                <div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[720px] text-left"><thead className="sticky top-0 bg-[#f3efe6] text-[0.64rem] uppercase tracking-[0.12em] text-[#687584]"><tr><th className="w-12 px-4 py-3"></th><th className="px-3 py-3">{debloatCopy.package}</th><th className="px-3 py-3">{debloatCopy.assessment}</th><th className="px-3 py-3">{debloatCopy.purpose}</th><th className="px-3 py-3"></th></tr></thead><tbody>{visiblePackages.slice(0, 120).map((item) => { const checked = selected.includes(item.id); return <tr key={item.id} className="border-t border-[#e5ded2] hover:bg-[#fbf8f1]"><td className="px-4 py-4"><input aria-label={`${debloatCopy.reviewCommands} ${item.id}`} type="checkbox" checked={checked} onChange={() => setSelected((current) => checked ? current.filter((id) => id !== item.id) : [...current, item.id])} className="h-4 w-4 accent-[#14253a]" /></td><td className="px-3 py-4"><p className="mono text-xs font-medium">{item.id}</p><p className="mt-1 text-xs text-[#687584]">{item.list} {isArabic ? "قائمة" : "list"}</p></td><td className="px-3 py-4"><span className={`inline-flex border px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${levelTone(item.removal)}`}>{removalLabel(item.removal, isArabic)}</span></td><td className="max-w-sm px-3 py-4"><p className="kicker text-[0.55rem] text-[#687584]">{debloatCopy.descriptionSource}</p><p className="line-clamp-2 text-xs leading-5 text-[#526273]">{item.description}</p>{item.neededBy.length > 0 && <p className="mt-1 mono text-[0.65rem] text-[#934639]">{debloatCopy.neededBy} {item.neededBy.join(", ")}</p>}</td><td className="px-3 py-4"><button onClick={() => restore(item.id)} className="text-xs font-semibold underline underline-offset-4">{debloatCopy.restore}</button></td></tr>; })}</tbody></table></div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d8d1c4] bg-[#f3efe6] px-4 py-3"><p className="text-xs text-[#526273]">{visiblePackages.length} {debloatCopy.matched} · {selected.length} {debloatCopy.selected} · {debloatCopy.only}</p><div className="flex items-center gap-2"><select value={actionMode} onChange={(event) => setActionMode(event.target.value as typeof actionMode)} className="h-9 border border-[#d8d1c4] bg-[#fffdf8] px-2 text-xs"><option value="disable">{debloatCopy.disable}</option><option value="uninstall">{debloatCopy.uninstall}</option></select><Button onClick={() => setReviewOpen(true)} disabled={!selected.length} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]">{debloatCopy.reviewCommands} {selected.length} {debloatCopy.commands}<ArrowRight className="ml-2" size={15} /></Button></div></div>
              </div>
            )}

            {reviewOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-[#14253a]/45 p-4"><div className="w-full max-w-2xl border border-[#14253a] bg-[#fffdf8] shadow-2xl"><div className="flex items-start justify-between border-b border-[#d8d1c4] p-5"><div><p className="kicker text-[#934639]">{debloatCopy.reviewRequired}</p><h3 className="mt-1 text-xl font-bold tracking-[-0.04em]">{actionMode === "disable" ? debloatCopy.disable : debloatCopy.uninstall} · {selected.length} {debloatCopy.package}</h3></div><button onClick={() => setReviewOpen(false)} className="p-1"><X size={19} /></button></div><div className="max-h-[48vh] space-y-2 overflow-auto p-5">{selected.map((id) => <div className="border border-[#d8d1c4] p-3" key={id}><p className="mono text-xs">{actionMode === "disable" ? `pm disable-user --user 0 ${id}` : `pm uninstall -k --user 0 ${id}`}</p><p className="mt-2 mono text-[0.65rem] text-[#687584]">{debloatCopy.restore}: cmd package install-existing --user 0 {id}</p></div>)}</div><div className="border-t border-[#d8d1c4] bg-[#fff2e1] p-5"><div className="flex gap-3"><CircleAlert size={18} className="mt-0.5 shrink-0 text-[#934639]" /><p className="text-xs leading-5 text-[#6d3d35]">{debloatCopy.risk}</p></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setReviewOpen(false)}>{debloatCopy.cancel}</Button><Button onClick={runQueued} className="action-button bg-[#14253a] text-[#f6f2ea]">{debloatCopy.apply}</Button></div></div></div></div>}
          </section>
        )}

        {active === "privacy" && <PrivacyWorkspace language={language} isLive={isLive} run={async (command, label) => { try { const result = await adb.current.run(command); addReceipt(result, label); toast.success(language === "ar" ? "اكتمل فحص الخصوصية." : "Privacy check completed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Command could not run."); } }} />}
        {active === "mirror" && <LiveMirrorWorkspace language={language} isLive={isLive} state={mirrorState} canvasRef={mirrorCanvas} start={startLiveMirror} stop={stopLiveMirror} />}
        {active === "profiles" && <ProfilesWorkspace language={language} isLive={isLive} output={userOutput} refresh={async () => { try { const result = await adb.current.listUsers(); setUserOutput(result.stdout); addReceipt(result, language === "ar" ? "تم تحديث مستخدمي وملفات أندرويد" : "Refreshed Android users and profiles"); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to inspect profiles."); } }} />}
        {active === "apk" && <ApkWorkspace language={language} isLive={isLive} install={installApk} />}
        {active === "files" && <FilesWorkspace language={language} isLive={isLive} path={filePath} setPath={setFilePath} files={files} loading={fileLoading} load={loadFiles} />}
        {active === "history" && <ReceiptHistoryWorkspace language={language} history={receiptHistory} remove={removeHistoryReceipt} clear={clearReceiptHistory} updateTags={updateHistoryTags} exportHistory={exportHistory} protectHistory={protectHistory} />}
        {active === "about" && <AboutWorkspace language={language} />}

        <section className="mt-7 border-t border-[#d8d1c4] pt-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="kicker text-[#687584]">{isArabic ? "تفاصيل المشغّل" : "Operator detail"}</p><span className="status-stamp text-[#59869c]">{isArabic ? "مسجل" : "logged"}</span></div><p className="mt-1 text-sm text-[#526273]">{isArabic ? "شغّل أمر shell مقصوداً. يُسجل كما هو ويستخدم تصحيح USB القياسي ما لم تكتب أمر su -c بنفسك." : "Run a deliberate shell command. It is logged as-is and uses standard USB debugging unless you write an `su -c` command yourself."}</p></div><div className="flex w-full max-w-xl gap-2"><input value={terminal} onChange={(event) => setTerminal(event.target.value)} onKeyDown={(event) => event.key === "Enter" && runTerminal()} placeholder="e.g. getprop ro.build.fingerprint" className="h-10 min-w-0 flex-1 border border-[#d8d1c4] bg-[#fffdf8] px-3 mono text-xs outline-none focus:border-[#14253a]" /><Button onClick={runTerminal} disabled={!isLive || terminalRunning} variant="outline" className="action-button border-[#14253a]">{terminalRunning ? <Loader2 className="animate-spin" size={16} /> : <TerminalSquare size={16} />}</Button></div></div></section>
      </main>

      <aside className="border-t border-[#2f4860] bg-[#14253a] text-[#f6f2ea] lg:sticky lg:top-0 lg:h-screen lg:border-l lg:border-t-0">
        <div className="border-b border-[#2f4860] px-5 py-5"><div className="flex items-center justify-between"><div><p className="kicker text-[#c8f04a]">{isArabic ? "سجل الأوامر" : "Command ledger"}</p><h2 className="mt-1 text-lg font-bold tracking-[-0.035em]">{isArabic ? "لا يحدث شيء من دون سجل." : "Nothing happens off record."}</h2></div><ClipboardList size={19} className="text-[#8e9eae]" /></div><p className="mt-2 text-xs leading-5 text-[#a6b3be]">{isArabic ? "تحفظ الإيصالات المحلية الأمر والمخرجات والصلاحية وتفاصيل الاستعادة معاً." : "Local receipts keep command, output, authority, and restoration detail together."}</p></div>
        <div className="max-h-[440px] space-y-3 overflow-auto p-4 lg:max-h-[calc(100vh-360px)]">{receipts.map((receipt, index) => <article key={`${receipt.at}-${index}`} className="receipt-enter border border-[#2f4860] bg-[#1b3048] p-3"><div className="flex items-center justify-between gap-2"><span className={`status-stamp scale-90 origin-left ${receipt.exitCode === 0 ? "text-[#c8f04a]" : "text-[#f1a38e]"}`}>{receipt.authority}</span><span className="mono text-[0.62rem] text-[#8e9eae]">{shortTime(receipt.at)}</span></div><p className="mt-2 text-xs font-semibold text-white">{receipt.label}</p><p className="mono mt-2 break-all text-[0.66rem] leading-5 text-[#d7e0e8]">{commandName(receipt.command)}</p>{(receipt.stdout || receipt.stderr) && <p className={`mono mt-2 max-h-20 overflow-auto whitespace-pre-wrap border-l pl-2 text-[0.64rem] leading-5 ${receipt.stderr ? "border-[#f1a38e] text-[#f5c5ba]" : "border-[#59869c] text-[#b4c6d2]"}`}>{receipt.stderr || receipt.stdout}</p>}{receipt.restore && <p className="mono mt-2 text-[0.62rem] leading-5 text-[#c8f04a]">restore → {receipt.restore}</p>}</article>)}</div>
        <div className="border-t border-[#2f4860] bg-[#10243a] p-4"><p className="kicker text-[#c8f04a]">{isArabic ? "تصدير محلي" : "Local export"}</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => exportReceipts("json")} className="action-button border border-[#3d566e] px-2 py-2 text-xs text-[#f6f2ea] hover:border-[#c8f04a]"><Download className="mr-1 inline" size={13} />JSON</button><button onClick={() => exportReceipts("md")} className="action-button border border-[#3d566e] px-2 py-2 text-xs text-[#f6f2ea] hover:border-[#c8f04a]"><FileText className="mr-1 inline" size={13} />Markdown</button></div><label className="mono mt-4 block text-[0.61rem] text-[#8e9eae]">{isArabic ? "اسم برنامج الاستعادة" : "Recovery script name"}</label><input value={recoveryScriptName} onChange={(event) => setRecoveryScriptName(event.target.value)} className="mono mt-1 h-8 w-full border border-[#3d566e] bg-[#0e1d2c] px-2 text-[0.65rem] text-[#f6f2ea] outline-none focus:border-[#c8f04a]" /><button onClick={exportRecoveryScript} className="action-button mt-2 w-full border border-[#c8f04a] bg-[#c8f04a] px-2 py-2 text-xs font-semibold text-[#14253a] hover:bg-[#d7f66c]"><RotateCcw className="mr-1 inline" size={13} />{isArabic ? "إنشاء برنامج الاستعادة" : "Generate restore script"}</button><p className="mt-2 text-[0.61rem] leading-4 text-[#8e9eae]">{receipts.filter((receipt) => receipt.restore).length} {isArabic ? "مسار استعادة حزمة مسجّل. تبقى التنزيلات في هذا المتصفح." : "recorded package restore path(s). Downloads stay in this browser."}</p></div>
      </aside>
    </div>
  );
}

function EmptyState({ title, copy, action, label }: { title: string; copy: string; action: () => void; label: string }) {
  return <div className="service-card p-8 text-center"><HardDrive className="mx-auto text-[#59869c]" size={27} /><h3 className="mt-4 text-xl font-bold tracking-[-0.04em]">{title}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#526273]">{copy}</p><Button onClick={action} className="action-button mt-5 bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]">{label}<ChevronRight className="ml-1" size={16} /></Button></div>;
}

function PrivacyWorkspace({ language, isLive, run }: { language: InterfaceLanguage; isLive: boolean; run: (command: string, label: string) => Promise<void> }) {
  const isArabic = language === "ar";
  const actions = isArabic ? [
    ["مراجعة حالة الموقع", "settings get secure location_mode", "للقراءة فقط · قد يقيّد أندرويد الإجابة"],
    ["مراجعة DNS الخاص", "settings get global private_dns_mode && settings get global private_dns_specifier", "للقراءة فقط · يتحقق من سياسة DNS الحالية"],
    ["مراجعة ADB عبر الشبكة", "getprop service.adb.tcp.port", "للقراءة فقط · يكشف منفذ تصحيح يستمع"],
    ["عرض منح أذونات وقت التشغيل", "dumpsys package packages | grep -E 'granted=true|granted=true' | head -120", "قراءة متقدمة فقط · تختلف النتائج باختلاف إصدار أندرويد"],
  ] : [
    ["Review location state", "settings get secure location_mode", "Read-only · Android may restrict the answer"],
    ["Review private DNS", "settings get global private_dns_mode && settings get global private_dns_specifier", "Read-only · verifies current DNS policy"],
    ["Review ADB over network", "getprop service.adb.tcp.port", "Read-only · detects a listening debug port"],
    ["List runtime permission grants", "dumpsys package packages | grep -E 'granted=true|granted=true' | head -120", "Advanced read-only · output varies by Android version"],
  ];
  return <section className="space-y-5"><div className="relative overflow-hidden border border-[#d8d1c4] bg-[#fffdf8]"><img src="/manus-storage/privacy-workstation_68e7bcbd.jpg" alt="Privacy workstation" className="absolute right-0 top-0 h-full w-48 object-cover opacity-70 sm:w-72" /><div className="relative max-w-2xl p-6 sm:p-7"><p className="kicker text-[#687584]">{isArabic ? "راجع قبل التغيير" : "Review before toggle"}</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.05em]">{isArabic ? "تحتاج أدوات الخصوصية إلى سياق الجهاز." : "Privacy controls need device context."}</h2><p className="mt-3 text-sm leading-6 text-[#526273]">{isArabic ? "تبدأ هذه المحطة بفحوصات للقراءة فقط. تعتمد إعدادات أندرويد على الشركة والسياسة، لذلك تعرض اللوحة النتيجة الدقيقة قبل اقتراح مسار تغيير." : "This workstation begins with read-only checks. Android settings are vendor- and policy-dependent, so the desk shows the exact result before presenting a change path."}</p></div></div><div className="grid gap-4 md:grid-cols-2">{actions.map(([label, command, note]) => <div className="service-card p-5" key={label}><div className="flex items-start justify-between"><ShieldCheck size={18} className="text-[#59869c]" /><span className="status-stamp text-[#687584]">{isArabic ? "قراءة" : "read"}</span></div><h3 className="mt-5 font-bold">{label}</h3><p className="mt-2 mono text-[0.68rem] leading-5 text-[#526273]">{command}</p><p className="mt-3 text-xs leading-5 text-[#687584]">{note}</p><Button variant="outline" disabled={!isLive} onClick={() => run(command, label)} className="action-button mt-5 border-[#14253a]">{isArabic ? "تشغيل الفحص" : "Run check"} <ArrowRight className="ml-2" size={15} /></Button></div>)}</div><div className="border-l-2 border-[#d39152] bg-[#fff2e1] p-4 text-sm leading-6 text-[#6d5133]"><strong>{isArabic ? "لماذا لا توجد قائمة تغييرات عامة؟" : "Why no universal toggle list?"}</strong> {isArabic ? "قد ترفض سياسة النظام أوامر إعدادات أندرويد، أو تطبقها بطريقة مختلفة حسب الإصدار، أو ينتج عنها أثر غير متوقع على الجهاز. تفحص اللوحة أولاً ثم تعرض أمراً محدداً فقط عندما تفهم النتيجة الحالية للهاتف." : "Android settings commands can be rejected by system policy, apply differently by version, or carry an unexpected device-wide effect. The normal workflow inspects first, then exposes a specific command only when you understand the phone’s current result."}</div></section>;
}

function MirrorWorkspace({ isLive }: { isLive: boolean }) {
  return <section className="space-y-5"><div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="overflow-hidden border border-[#14253a] bg-[#14253a] p-5 text-[#f6f2ea]"><div className="flex items-center justify-between"><div><p className="kicker text-[#c8f04a]">Screen mirror</p><h2 className="mt-1 text-2xl font-bold tracking-[-0.04em]">A live session, not a disguised screenshot.</h2></div><MonitorUp className="text-[#c8f04a]" /></div><div className="relative mt-5 aspect-video overflow-hidden border border-[#2f4860] bg-[#0e1d2c]"><img src="/manus-storage/command-ledger-texture_4af88a5a.jpg" alt="Command ledger texture" className="h-full w-full object-cover opacity-20" /><div className="absolute inset-0 grid place-items-center"><div className="text-center"><Smartphone className="mx-auto text-[#c8f04a]" size={31} /><p className="mt-3 text-sm font-semibold">{isLive ? "Device transport ready" : "Connect a device first"}</p><p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[#a6b3be]">The included browser ADB layer is ready for a Scrcpy client integration. Video streaming and input forwarding require a compatible device/server pairing, so they remain visible as a verified capability rather than a fake preview.</p></div></div></div><div className="mt-4 flex items-center gap-2 text-xs text-[#b9c5cf]"><span className="status-stamp text-[#59869c]">capability</span> WebUSB + ADB session • Scrcpy adapter required for streaming</div></div><div className="service-card p-6"><p className="kicker text-[#687584]">Mirror readiness</p><div className="mt-5 space-y-4">{[["USB debugging", isLive ? "Authorized" : "Awaiting device", isLive], ["Browser video decoder", "Checked when mirror adapter starts", false], ["Device screen control", "Requires an active Scrcpy controller", false]].map(([label, status, good]) => <div className="flex items-center gap-3 border-b border-[#e3dcd0] pb-3" key={label as string}><span className={`grid h-6 w-6 place-items-center border ${good ? "border-[#b9da71] bg-[#eef8cd] text-[#527321]" : "border-[#d8d1c4] text-[#687584]"}`}>{good ? <Check size={14} /> : <HelpCircle size={14} />}</span><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-[#687584]">{status}</p></div></div>)}</div><p className="mt-5 text-xs leading-5 text-[#687584]">No root is required for Scrcpy on compatible devices. The product will not claim a mirror is active until an H.264/AV1 video stream and device controller have actually initialized.</p></div></div></section>;
}

function ProfilesWorkspace({ language, isLive, output, refresh }: { language: InterfaceLanguage; isLive: boolean; output: string; refresh: () => void }) {
  const ar = language === "ar";
  return <section className="space-y-5"><div className="service-card p-6"><p className="kicker text-[#687584]">{ar ? "سياق أندرويد للمؤسسات" : "Android Enterprise context"}</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.05em]">{ar ? "ملفات منفصلة، وليست مفتاح استنساخ عاماً." : "Separate profiles, not a universal clone switch."}</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#526273]">{ar ? "يفصل ملف العمل في أندرويد التطبيقات والبيانات المُدارة عن البيانات الشخصية. لا يستطيع ADB إنشاء أو استنساخ كل تطبيق بأمان داخل ملف على كل هاتف؛ يعرض هذا الفاحص بنية المستخدم والملف الحالية قبل تقديم أي خطوة خاصة بالجهاز." : "Android Work Profile separates managed work apps and data from personal data. ADB cannot safely create or clone every app into a profile on every phone; this inspector reveals the current user/profile topology before offering any device-specific next step."}</p><div className="mt-6 flex flex-wrap gap-3"><Button disabled={!isLive} onClick={refresh} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]"><UsersRound className="mr-2" size={16} />{ar ? "فحص المستخدمين والملفات" : "Inspect users & profiles"}</Button><a href="https://www.android.com/enterprise/work-profile/" target="_blank" className="action-button inline-flex items-center border border-[#14253a] px-4 py-2 text-sm font-medium">{ar ? "دليل ملف العمل" : "Work Profile guide"} <ArrowRight className="ml-2" size={15} /></a></div></div><div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><div className="border border-[#d8d1c4] bg-[#fff2e1] p-5"><p className="kicker text-[#934639]">{ar ? "حاجز أمان" : "Guardrail"}</p><p className="mt-3 text-sm leading-6 text-[#6d3d35]">{ar ? "لا يصبح تثبيت تطبيق في ملف مناسباً إلا بعد أن يؤكد الجهاز وجود ملف مؤهل وصلاحية السياسة المطلوبة. لا تدّعي اللوحة أن «استنساخ التطبيق» أمر ADB قياسي قابل للنقل بين الأجهزة." : "An install-to-profile operation is only appropriate after this device confirms an eligible profile and the required policy authority. The desk does not pretend that “clone app” is a standard, portable ADB command."}</p></div><div className="service-card p-5"><div className="flex items-center justify-between"><div><p className="kicker text-[#687584]">{ar ? "النتيجة الحالية" : "Current result"}</p><h3 className="mt-1 font-bold">`pm list users`</h3></div><ListFilter size={18} className="text-[#59869c]" /></div><pre className="mono mt-5 max-h-72 overflow-auto whitespace-pre-wrap border-l border-[#c8f04a] bg-[#f3efe6] p-4 text-xs leading-6 text-[#263d55]">{isLive ? output : (ar ? "صِل جهازاً لفحص المستخدمين والملفات المُدارة." : "Connect a device to inspect users and managed profiles.")}</pre></div></div></section>;
}

function ApkWorkspace({ language, isLive, install }: { language: InterfaceLanguage; isLive: boolean; install: (file?: File) => Promise<void> }) {
  const ar = language === "ar";
  return <section className="space-y-5"><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="service-card p-6"><p className="kicker text-[#687584]">{ar ? "منضدة APK" : "APK desk"}</p><h2 className="mt-2 text-3xl font-bold tracking-[-0.05em]">{ar ? "اختر ملف APK. راجع أمر التثبيت الحقيقي." : "Pick an APK. See the real install command."}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#526273]">{ar ? "يُنقل ملف APK المختار عبر جلسة USB ADB النشطة إلى مسار مؤقت على الجهاز، ثم يثبت بواسطة pm install -r -g. لا يُرفع أي ملف إلى هذا التطبيق." : "The selected APK is transferred over the active USB ADB session to a temporary device path, then installed using `pm install -r -g`. Nothing is uploaded to this application."}</p><label className={`action-button mt-6 inline-flex items-center border px-4 py-3 text-sm font-semibold ${isLive ? "border-[#14253a] bg-[#14253a] text-[#f6f2ea]" : "cursor-not-allowed border-[#d8d1c4] bg-[#eee9df] text-[#687584]"}`}><Upload className="mr-2" size={16} />{ar ? "اختيار APK" : "Select APK"}<input disabled={!isLive} type="file" accept=".apk,application/vnd.android.package-archive" className="sr-only" onChange={(event) => install(event.target.files?.[0])} /></label><p className="mono mt-5 text-[0.68rem] text-[#687584]">transfer → /data/local/tmp/&lt;sanitized-name&gt; · install → pm install -r -g &lt;path&gt;</p></div><div className="overflow-hidden border border-[#d8d1c4] bg-[#fffdf8]"><img src="/manus-storage/privacy-workstation_68e7bcbd.jpg" alt="Android phone ready for application management" className="h-48 w-full object-cover object-[55%_45%]" /><div className="p-5"><p className="kicker text-[#687584]">{ar ? "ضوابط التثبيت" : "Installer guardrails"}</p><p className="mt-2 text-sm leading-6 text-[#526273]">{ar ? "يبقى الجهاز هو المرجع النهائي. تحفظ عدم مطابقة التوقيع والتثبيت المحظور وأخطاء السياسة كما هي في السجل." : "The device remains the final authority. Signature mismatches, blocked installs, and policy errors are retained verbatim in the ledger."}</p></div></div></div><div className="border-l-2 border-[#d39152] bg-[#fff2e1] p-4 text-sm leading-6 text-[#6d5133]"><strong>{ar ? "استخدم مصادر APK موثوقة." : "Use trusted APK sources."}</strong> {ar ? "تنقل هذه اللوحة الملف الذي تختاره؛ ولا تتحقق من الناشر أو تفحص الشهادة أو تتجاوز وسائل حماية تثبيت أندرويد." : "This desk transfers the file you choose; it does not verify the publisher, inspect a certificate, or bypass Android installation protections."}</div></section>;
}

function FilesWorkspace({ language, isLive, path, setPath, files, loading, load }: { language: InterfaceLanguage; isLive: boolean; path: string; setPath: (value: string) => void; files: DeviceFile[]; loading: boolean; load: () => Promise<void> }) {
  const ar = language === "ar";
  return <section className="space-y-5"><div className="service-card p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="kicker text-[#687584]">{ar ? "منضدة الملفات" : "File workbench"}</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.04em]">{ar ? "استعرض مساراً على الجهاز عبر مزامنة ADB." : "Browse a device path with ADB Sync."}</h2></div><div className="flex w-full gap-2 sm:max-w-lg"><input disabled={!isLive} value={path} onChange={(event) => setPath(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load()} className="h-10 min-w-0 flex-1 border border-[#d8d1c4] bg-[#fffdf8] px-3 mono text-xs outline-none focus:border-[#14253a]" /><Button disabled={!isLive || loading} onClick={load} className="action-button bg-[#14253a] text-[#f6f2ea] hover:bg-[#223952]">{loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}</Button></div></div><p className="mt-4 text-xs leading-5 text-[#687584]">{ar ? "تستخدم العمليات الأساسية قناة مزامنة ملفات ADB. أدخل عمليات الملفات المتقدمة أو المدمرة في تفاصيل المشغّل كي يُحفظ أمرها الدقيق." : "Basic actions use the ADB file-sync channel. Advanced destructive file operations should be entered in Operator detail so their exact command is preserved."}</p></div><div className="service-card overflow-hidden"><div className="flex items-center justify-between border-b border-[#d8d1c4] bg-[#f3efe6] px-4 py-3"><p className="mono text-xs text-[#526273]">{path}</p><span className="text-xs text-[#687584]">{files.length} {ar ? "عنصر" : "entries"}</span></div><div className="min-h-64">{!isLive ? <div className="grid min-h-64 place-items-center text-sm text-[#687584]">{ar ? "فوض جهازاً لاستعراض الملفات." : "Authorize a device to browse files."}</div> : files.length === 0 ? <div className="grid min-h-64 place-items-center text-sm text-[#687584]">{ar ? "اختر التحديث لقراءة هذا المسار." : "Select refresh to read this path."}</div> : files.map((file) => <div className="flex items-center gap-3 border-b border-[#eee8dc] px-4 py-3" key={file.name}>{file.isDirectory ? <Folder size={17} className="text-[#59869c]" /> : <FileText size={17} className="text-[#687584]" />}<div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="mono text-[0.63rem] text-[#687584]">{file.isDirectory ? (ar ? "مجلد" : "directory") : `${file.size.toLocaleString()} ${ar ? "بايت" : "bytes"}`}</p></div><ChevronRight size={16} className="text-[#a6b3be]" /></div>)}</div></div></section>;
}
