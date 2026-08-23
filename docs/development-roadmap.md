# Android Control Center — Development Roadmap

## Product direction

The next development cycle should deepen the product’s **trustworthy local-service workflow**. Priority work should make capabilities more observable, actions more reversible, and device-specific risks easier for non-technical operators to understand.

| Priority | Feature | User value | Practical first increment |
| --- | --- | --- | --- |
| 1 | Live Scrcpy mirror and controller | Turns the current readiness bench into an actual screen-view and device-control workflow. | Add a supported Scrcpy client/server adapter with an explicit session-start receipt and stop control. |
| 2 | Command-receipt export and restore plan | Lets operators keep a portable change record and recover package actions later. | Export receipts as local JSON/Markdown and generate a restore script from reversible package operations. |
| 3 | Debloat risk scoring | Makes community metadata easier to interpret before a change is approved. | Surface dependencies, “needed by” data, Android user scope, and an explainable risk badge in the review dialog. |
| 4 | Complete language packs | Extends the new language selector beyond navigation and About copy. | Finish Arabic translations for all workstations, then add a translation registry for French and Spanish. |
| 5 | APK provenance inspection | Helps operators evaluate an APK before it reaches a device. | Parse the chosen APK locally to show package ID, version, target SDK, certificate fingerprint, and declared permissions. |
| 6 | Device snapshot comparison | Shows what changed between service sessions without collecting cloud telemetry. | Store an opt-in local snapshot and compare package inventory, Android version, and selected privacy values. |

## Engineering safeguards

Each new action should continue to follow the established receipt model: an operator-visible command, scoped authority, complete output, and an available restoration path. Features that cannot promise a general Android-safe outcome—such as work-profile cloning or root actions—should remain capability checks until the connected device proves support.
