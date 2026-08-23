# Android Control Center — Native Desktop Companion

This is the **Rust native companion** for the Android Control Center browser dashboard. It uses a local `adb` executable rather than a hosted service. The design is intentionally transparent: package inventory, community metadata, actions, output, and restore attempts appear in a local command ledger.

## Safety and privacy

The normal package action is `pm disable-user --user 0 <package>`. The advanced option uses `pm uninstall -k --user 0 <package>` and is shown as less reversible. Both actions retain a local restore attempt using `cmd package install-existing --user 0 <package>` or `pm enable <package>`. A vendor may restrict, reinterpret, or reject these commands; classification from the community list is contextual guidance, not a guarantee.

The app does not collect telemetry and never uploads device serials, installed packages, command output, or receipts. The only network behavior implemented is a manual request to the published UAD-ng package-list URL. The update settings screen does not silently poll; a maintainer must configure their own GitHub Releases endpoint before a public release workflow is enabled.

## Local prerequisites

Install Android Platform Tools so `adb` is on the system `PATH`, enable Developer options and USB debugging on the Android device, then accept the debugging authorization dialog on the phone. Start the native app with `cargo run --release`.

The executable is written with `eframe`/`egui`, which supports Windows, macOS, and Linux. It is source-first in this workspace; release packaging should build and sign each platform artifact in a CI pipeline that bundles or documents the appropriate Platform Tools dependency.

## References

1. [Universal Android Debloater Next Generation](https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation)
2. [Android Developer — Android Debug Bridge](https://developer.android.com/tools/adb)
3. [Android Enterprise — Work Profile](https://www.android.com/enterprise/work-profile/)
