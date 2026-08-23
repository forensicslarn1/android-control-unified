# Implementation Research Notes

## Browser-side USB and ADB

The browser interface must run in a secure context (HTTPS) because WebUSB is exposed only there. Access is user-mediated: device selection begins with the browser’s USB chooser, and the application can reconnect only to devices the user already granted permission for. MDN marks WebUSB as experimental and not universally available, so the UI must include a compatibility check and a clear unsupported-browser state rather than promise universal browser support.

Tango (formerly WebADB) is a maintained TypeScript reimplementation of an ADB client. Its project states that it works in Chromium-based browsers, Chrome for Android, Node.js, and Electron. The implementation should use its WebUSB transport package rather than embedding or recreating the ADB protocol.

## Product implications

The web dashboard should require a Chromium-based desktop browser and HTTPS, present explicit USB-debugging authorization instructions, and retain no device data remotely. The exact transport capability should be detected at runtime. Operations must degrade clearly when browser support, cable, device authorization, ADB daemon state, or Android privilege level blocks a requested workflow.

## Community package data and package safety

Universal Android Debloater Next Generation (UAD-ng) is an active Rust/ADB project with a community package list and an explicit “use at your own risk” disclaimer. It is a valuable upstream data reference, but its package definitions and licensing must be reviewed before redistribution. The integration should fetch a pinned, validated JSON snapshot only after the user requests a refresh, cache it locally, label the source and revision, and never submit local device inventory to GitHub.

Android’s official documentation describes removing or disabling packages for the system user (User 0) in its own product context. For a consumer debloating tool, that supports a conservative product model: default to reversible per-user disable/remove operations, retain a local undo receipt, and never frame an operation as a guaranteed restoration across all vendors or Android versions. The confirmation sheet should explicitly state that device manufacturers may restrict individual packages and that a factory reset can restore system-image apps in many cases but is not an in-app promise.

## Screen mirroring and work profiles

Tango’s Scrcpy implementation is designed for browser and Node.js clients. Its documentation covers pushing a server to the Android device, starting and connecting to it, rendering video, and forwarding control input. Therefore, the dashboard can honestly offer a browser-native mirroring workstation, but it must show an explicit compatibility state and never imply that mirroring is simply a static screenshot feature.

Android describes a work profile as an Android Enterprise separation of managed work applications and data from personal applications and data. This is not a reliable generic “clone any app” ADB action. The product should reframe the requested feature as a **Work Profile Inspector** that detects profiles and offers device-specific guidance. Installing or cloning into a work profile should be gated behind clear evidence that an eligible profile and the required provisioning or device-policy authority exist.

## Connection and execution requirements

Tango’s browser device manager should be initialized with `AdbDaemonWebUsbDeviceManager.BROWSER`; it is unavailable if the page is not secure or the browser does not expose WebUSB. Device selection must happen directly in response to a user gesture. A browser permission can persist, but an Android USB interface change may create a new USB identity and require new permission. A device interface can be busy if it is already claimed by platform-tools or another ADB client, so the status view must tell the user to close the competing tool rather than retry invisibly.

After the ADB interface is connected, `AdbDaemonTransport.authenticate` creates an authenticated transport and `new Adb(transport)` creates the high-level command client. Device-side authorization is part of that step. Commands should use the subprocess API, read all outgoing streams to avoid blocking the multiplexed connection, and retain both output and exit result in the local ledger. Device properties can be read through `adb.getProp`.

## Sources

1. [MDN — WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
2. [Tango / ya-webadb repository](https://github.com/yume-chan/ya-webadb)
3. [Universal Android Debloater Next Generation](https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation)
4. [Android Open Source Project — Remove packages for the system user](https://source.android.com/docs/automotive/users_accounts/disable_packages)
5. [Tango ADB — Scrcpy quick start](https://tangoadb.dev/scrcpy/)
6. [Android Enterprise — Work Profile](https://www.android.com/enterprise/work-profile/)
7. [Tango ADB — Request device permission](https://tangoadb.dev/tango/daemon/usb/request-device/)
8. [Tango ADB — Create USB connection](https://tangoadb.dev/tango/daemon/usb/create-connection/)
9. [Tango ADB — Handshake and authenticate](https://tangoadb.dev/tango/daemon/connect-device/)
10. [Tango ADB API overview](https://tangoadb.dev/api/)
11. [Tango ADB — subprocess (legacy API example)](https://tangoadb.dev/0.0.24/api/adb/subprocess/)
12. [Tango ADB — getProp](https://tangoadb.dev/api/adb/get-prop/)
