/**
 * Field Service Ledger style: this module is the explicit device boundary.
 * It must surface the exact command, never silently alter device state, and
 * keep all session data in the browser.
 */
import { Adb, AdbDaemonTransport } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import { AdbScrcpyClient, AdbScrcpyOptions2_1 } from "@yume-chan/adb-scrcpy";
import { BitmapVideoFrameRenderer, WebCodecsVideoDecoder } from "@yume-chan/scrcpy-decoder-webcodecs";
import { ReadableStream as AdbReadableStream, WritableStream } from "@yume-chan/stream-extra";

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
export type MirrorSession = {
  stop: () => Promise<void>;
  width: number;
  height: number;
  codec: string;
};

const packageId = /^[A-Za-z0-9._]+$/;
const SCRCPY_SERVER_URL = "/manus-storage/scrcpy-server-2.1_0e0bd7e6.bin";
const SCRCPY_SERVER_PATH = "/data/local/tmp/scrcpy-server.jar";

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

function readableResponse(response: Response) {
  if (!response.body) throw new Error("The Scrcpy server binary could not be read from managed static storage.");
  const reader = response.body.getReader();
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
      packages: result.stdout.split("\n").map((line) => line.replace(/^package:/, "").trim()).filter(Boolean).sort(),
    };
  }

  async listUsers() { return this.run("pm list users"); }

  async probeRoot() {
    const result = await this.run("su -c id");
    return { result, granted: result.exitCode === 0 && /uid=0/.test(result.stdout) };
  }

  async disablePackage(id: string) { return this.run(`pm disable-user --user 0 ${safePackage(id)}`); }

  async uninstallForUser(id: string) { return this.run(`pm uninstall -k --user 0 ${safePackage(id)}`); }

  async restorePackage(id: string) {
    const safe = safePackage(id);
    return this.run(`cmd package install-existing --user 0 ${safe} || pm enable ${safe}`);
  }

  async applyRoot(command: string) { return this.run(`su -c ${JSON.stringify(command)}`); }

  async installApk(file: File) {
    const adb = this.requireAdb();
    const filename = safeFilename(file.name || "package.apk");
    const target = `/data/local/tmp/${filename}`;
    const sync = await adb.sync();
    try { await sync.write({ filename: target, file: readableFile(file) }); } finally { await sync.dispose(); }
    return this.run(`pm install -r -g ${target}`);
  }

  async listFiles(path: string): Promise<DeviceFile[]> {
    const adb = this.requireAdb();
    const sync = await adb.sync();
    try {
      const entries = await sync.readdir(path);
      return entries.map((entry) => ({ name: entry.name, size: Number(entry.size), modified: Number(entry.mtime), isDirectory: entry.type === 4 })).sort((left, right) => Number(right.isDirectory) - Number(left.isDirectory) || left.name.localeCompare(right.name));
    } finally {
      await sync.dispose();
    }
  }

  async startMirror(canvas: HTMLCanvasElement): Promise<MirrorSession> {
    const adb = this.requireAdb();
    if (!WebCodecsVideoDecoder.isSupported) throw new Error("This browser does not expose WebCodecs. Use a current Chromium browser over HTTPS.");

    const serverResponse = await fetch(SCRCPY_SERVER_URL, { cache: "force-cache" });
    if (!serverResponse.ok) throw new Error(`The managed Scrcpy server asset is unavailable (${serverResponse.status}).`);
    await AdbScrcpyClient.pushServer(adb, readableResponse(serverResponse), SCRCPY_SERVER_PATH);

    const options = new AdbScrcpyOptions2_1({
      video: true,
      audio: false,
      control: true,
      videoCodec: "h264",
      maxSize: 0,
      maxFps: 0,
      stayAwake: false,
      showTouches: false,
      tunnelForward: false,
    });
    const client = await AdbScrcpyClient.start(adb, SCRCPY_SERVER_PATH, options);

    // ADB multiplexing requires server output to be continuously consumed.
    void client.output.pipeTo(new WritableStream<string>({ write() {} })).catch(() => undefined);

    const video = await client.videoStream;
    if (!video) {
      await client.close();
      throw new Error("The device started Scrcpy without a video stream.");
    }

    const renderer = new BitmapVideoFrameRenderer(canvas);
    const decoder = new WebCodecsVideoDecoder({ codec: video.metadata.codec, renderer });
    const resize = ({ width, height }: { width: number; height: number }) => { canvas.width = width; canvas.height = height; };
    resize({ width: video.width, height: video.height });
    const disposeSizeListener = video.sizeChanged(resize);
    const pipe = video.stream.pipeTo(decoder.writable).catch(() => undefined);

    return {
      width: video.width,
      height: video.height,
      codec: String(video.metadata.codec),
      stop: async () => {
        disposeSizeListener();
        decoder.dispose();
        await client.close();
        await pipe;
      },
    };
  }
}
