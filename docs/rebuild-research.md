# Rebuild research notes

## Official Android ADB documentation
Source: https://developer.android.com/tools/adb

- ADB consists of a workstation client, a device daemon, and a workstation server.
- USB debugging must be enabled in Developer options.
- Android 4.2.2/API 17 and newer require explicit RSA authorization on the device before ADB commands can run.
- `adb devices` exposes device state; only authorized `device` entries should be actionable.
- Android 11/API 30 and newer support wireless debugging with pairing, but the first release can focus on USB while exposing connection state clearly.
- The package manager is available from the ADB shell and should be used for package inspection and user-scoped actions.

## Community package list
Source: https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation

- UAD-ng is a cross-platform Rust GUI using ADB to debloat non-rooted Android devices.
- Its stated privacy boundary is that it does not collect/transmit user data; external connections are GET requests to GitHub for the package list and update checking.
- The project emphasizes an explicit risk disclaimer and community classifications rather than guarantees.
- The repository is GPL-3.0; use its published list as a remote data source or compatible separately reviewed asset, not as copied proprietary application code.

## Rust GUI
Source: https://github.com/emilk/egui

- egui/eframe supports native Windows, Linux, and macOS applications from shared Rust code.
- Native window rendering and common UI widgets are provided by eframe/egui.
- The interface should not claim to be native-looking by default, so layout, accessibility, and clear state feedback must be designed explicitly.

## Product implications

1. The application must have a real device state machine: no device, unauthorized, offline, multiple devices, and authorized.
2. The safe default is inspection and reversible disablement for User 0. Permanent-looking removal must be a separate, strongly warned action.
3. All package actions need exact commands, results, and a restore attempt in a local ledger.
4. The UI needs visible buttons and loading/error states, not just static panels.
5. GitHub is contacted only after an explicit package-list refresh or update-check action; no telemetry endpoint is needed.
