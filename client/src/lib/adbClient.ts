/**
 * Field Service Ledger style: this module is the explicit device boundary.
 * It must surface the exact command, never silently alter device state, and
 * keep all session data in the browser.
 */
import { Adb, AdbDaemonTransport } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import { ReadableStream as AdbReadableStream } from "@yume-chan/stream-extra";

export type DeviceProfile = {
  serial: string;
  manufacturer: string;
  model: string;
  androidVersion: string;
  sdk: string;
};

export type CommandResult = {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  at: string;
};

export type DeviceFile = { name: string; size: number; modified: number; isDirectory: boolean };

const packageId = /^[A-Za-z0-9._]+$/;

function safePackage(value: string) {
  if (!packageId.test(value)) throw new Error("Invalid package identifier.");
  return value;
}

function safeFilename(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

function readableFile(file: File) {
  const reader = file.stream().getReader();
  async function* chunks() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        if (value) yield value;
      }
    } finally {
      reader.releaseLock();
    }
  }
  return AdbReadableStream.from(chunks());
}

export class BrowserAdbClient {
  private adb: Adb | null = null;

  static isSupported() {
    return Boolean(AdbDaemonWebUsbDeviceManager.BROWSER);
  }

  get isConnected() {
    return Boolean(this.adb);
  }

  async connect(): Promise<DeviceProfile> {
    const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
    if (!manager) throw new Error("WebUSB is unavailable. Open this page over HTTPS in a Chromium-based browser.");

    const device = await manager.requestDevice();
    if (!device) throw new Error("No USB device was selected.");

    const connection = await device.connect();
    const transport = await AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection,
      credentialStore: new AdbWebCredentialStore("Android Control Center"),
    });
    this.adb = new Adb(transport);

    const [manufacturer, model, androidVersion, sdk] = await Promise.all([
      this.adb.getProp("ro.product.manufacturer"),
      this.adb.getProp("ro.product.model"),
      this.adb.getProp("ro.build.version.release"),
      this.adb.getProp("ro.build.version.sdk"),
    ]);

    return { serial: device.serial, manufacturer, model, androidVersion, sdk };
  }

  private requireAdb() {
    if (!this.adb) throw new Error("Connect and authorize a device first.");
    return this.adb;
  }

  async run(command: string): Promise<CommandResult> {
    const adb = this.requireAdb();
    const shell = adb.subprocess.shellProtocol;
    if (shell && (await shell.isSupported)) {
      const result = await shell.spawnWaitText(command);
      return { command, stdout: result.stdout.trim(), stderr: result.stderr.trim(), exitCode: result.exitCode, at: new Date().toISOString() };
    }
    const stdout = await adb.subprocess.noneProtocol.spawnWaitText(command);
    return { command, stdout: stdout.trim(), stderr: "", exitCode: 0, at: new Date().toISOString() };
  }

  async listPackages() {
    const result = await this.run("pm list packages -u");
    return {
      result,
      packages: result.stdout
        .split("\n")
        .map((line) => line.replace(/^package:/, "").trim())
        .filter(Boolean)
        .sort(),
    };
  }

  async listUsers() {
    return this.run("pm list users");
  }

  async probeRoot() {
    const result = await this.run("su -c id");
    return { result, granted: result.exitCode === 0 && /uid=0/.test(result.stdout) };
  }

  async disablePackage(id: string) {
    return this.run(`pm disable-user --user 0 ${safePackage(id)}`);
  }

  async uninstallForUser(id: string) {
    return this.run(`pm uninstall -k --user 0 ${safePackage(id)}`);
  }

  async restorePackage(id: string) {
    const safe = safePackage(id);
    return this.run(`cmd package install-existing --user 0 ${safe} || pm enable ${safe}`);
  }

  async applyRoot(command: string) {
    return this.run(`su -c ${JSON.stringify(command)}`);
  }

  async installApk(file: File) {
    const adb = this.requireAdb();
    const filename = safeFilename(file.name || "package.apk");
    const target = `/data/local/tmp/${filename}`;
    const sync = await adb.sync();
    try {
      await sync.write({ filename: target, file: readableFile(file) });
    } finally {
      await sync.dispose();
    }
    return this.run(`pm install -r -g ${target}`);
  }

  async listFiles(path: string): Promise<DeviceFile[]> {
    const adb = this.requireAdb();
    const sync = await adb.sync();
    try {
      const entries = await sync.readdir(path);
      return entries
        .map((entry) => ({
          name: entry.name,
          size: Number(entry.size),
          modified: Number(entry.mtime),
          isDirectory: entry.type === 4,
        }))
        .sort((left, right) => Number(right.isDirectory) - Number(left.isDirectory) || left.name.localeCompare(right.name));
    } finally {
      await sync.dispose();
    }
  }
}
