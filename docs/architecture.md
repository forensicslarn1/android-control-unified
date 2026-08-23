# Android Control Center — Architecture and Safety Model

## Product boundary

Android Control Center is two interfaces over the same transparent activity model. The browser dashboard is the primary, installation-free experience for Chromium browsers that expose WebUSB. The desktop companion is a Rust native application for Windows, macOS, and Linux that invokes a locally available Android Debug Bridge executable. Neither interface needs an application server to inspect or change a connected device.

| Layer | Browser dashboard | Rust desktop companion |
| --- | --- | --- |
| Transport | WebUSB through Tango ADB | Local `adb` executable via child processes |
| Authentication | Android USB-debugging dialog and locally stored browser key | Android USB-debugging dialog and local ADB host key |
| Device data | In memory and optionally local browser storage | In memory and optional local activity receipt |
| Community list | Explicit, user-triggered GitHub request | Explicit, user-triggered GitHub request |
| Updates | Explicit release/version request | Explicit release/version request |
| Remote service | None | None |

## Authority model

The normal mode runs only commands granted by USB debugging. It starts with read-only inspection, uses reversible per-user package disablement by default, and exposes any destructive alternative only behind an explicit review. The root mode is not an assumption: it is an opt-in probe (`su -c id`) followed by a separate, clearly marked command path if and only if the device grants it.

> **Safety rule:** A community classification is context, not a warranty. The software may describe a package as “recommended” upstream, but it must still show the package identifier, dependencies, exact command, expected effect, execution result, and restore command before the user confirms a change.

## Command ledger

Every device interaction is represented as a receipt:

| Field | Purpose |
| --- | --- |
| Timestamp | Local time of the user action |
| Authority | Browser, standard USB debugging, or root |
| Exact command | The browser or Android command issued without hidden alteration |
| Result | Output, error, and exit state returned by the device |
| Restore path | The next safe attempt to undo an applied package operation |

Receipts are local. The interface makes no telemetry, analytics, or device-inventory request. Exporting a receipt is an explicit user download action.

## Workstation model

The device is managed through separate workstations: **Debloat**, **Privacy**, **Mirror**, **Work Profiles**, **APK Desk**, and **Files**. The workspace only enables actions for which the active device session and available Android authority are sufficient. Browser support, USB permission, Android authorization, current user/profile, and device-specific command result are all visible conditions rather than hidden implementation details.

## Community metadata model

The optional package source is UAD-ng’s published `uad_lists.json` artifact. When a user chooses **Refresh community list**, the application requests that public file directly from GitHub, validates the expected object shape, and joins it to a package inventory that remains in the browser. It never sends installed package names, device identifiers, or command receipts to GitHub. The product shows the upstream revision time and link and defaults to only **Recommended** entries for queueing.

## Known constraints that become product states

Screen mirroring requires a compatible device session and a Scrcpy server/client path; it is not presumed to be a static “screenshot” button. Work Profile is an Android Enterprise mechanism and cannot be presented as a universal ADB app-cloning primitive. The browser interface therefore detects users/profiles and supplies guided, device-specific next steps; it only offers an install-to-profile operation where an eligible target user and authority have been verified.

## References

1. [MDN — WebUSB API](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API)
2. [Tango ADB — USB device manager](https://tangoadb.dev/tango/daemon/usb/device-manager/)
3. [Tango ADB — Request device permission](https://tangoadb.dev/tango/daemon/usb/request-device/)
4. [Universal Android Debloater Next Generation](https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation)
5. [Android Enterprise — Work Profile](https://www.android.com/enterprise/work-profile/)
