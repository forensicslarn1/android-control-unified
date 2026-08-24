# AndroidForensics Integration Review

## Scope and repository observations

The reviewed [AndroidForensics repository](https://github.com/DouglasFreshHabian/AndroidForensics) is a Bash/ADB toolkit with three principal collection patterns: a broad `extract.sh` snapshot, a granular `dumpsys.sh` collection loop, and a secret-code enumeration helper. Its `extract.sh` creates a timestamped folder, checks for ADB and a connected device, writes separate output files, and starts a bugreport in the background. The `dumpsys.sh` script is the stronger implementation pattern because it displays per-command progress, tracks successes and failures separately, and continues after an individual command fails.

| Repository capability | Benefit for Android Control Center | Recommendation |
|---|---|---|
| Timestamped collection folder | Clear audit/session boundary and repeatable output grouping | Adopt concept as a named, browser-local evidence case with a manifest and collection timestamp. |
| Per-category output files | Better review and export than a single unstructured command ledger | Adopt as user-selected evidence categories, with one local receipt per command and an exportable manifest. |
| Per-command progress and failure list | Reduces ambiguity when Android or OEMs block a command | Adopt as a visible collection queue with success, blocked, failed, and skipped outcomes. |
| Device, package, battery, network, usage, and log snapshots | Strong fit for the existing WebUSB/ADB scope | Prioritize as the safe baseline collection tier. |
| `adb bugreport` background collection | Valuable diagnostic package but can be large and privacy-sensitive | Offer only as an explicit opt-in, clearly labeled diagnostic export after reviewing storage impact. |
| Contacts, call-log, SMS, account, and clipboard queries | Potentially sensitive and commonly blocked on current consumer builds | Keep as separately selected, consent-confirmed categories; report denial/absence instead of bypassing protections. |
| `/data` pulls or root-only data | Not available to normal WebUSB ADB sessions | Do not add as a normal browser workflow. Explain the protection boundary. |
| Secret dialer code enumeration | Low audit value and may expose OEM service paths | Exclude from the default evidence workflow. It is not required for a safe authorized snapshot. |

## Feasibility and limits

The current dashboard already provides the essential transport boundary: a device must be manually connected and its RSA trust prompt approved before commands run. Android documentation states that ADB provides a device shell but requires USB debugging and, on Android 4.2.2+, explicit on-device RSA approval.[1] Android bug reports contain `dumpsys`, `dumpstate`, and `logcat` content and can be searched after capture, supporting a clearly labeled diagnostic option rather than an implicit collection.[2]

The browser can safely build a local case manifest, run selected ADB shell commands serially, retain outputs in browser-local storage/downloads, and create a receipt for every result. It should not promise access to protected providers or `/data` paths; those access decisions remain enforced by Android and the OEM. Android content providers have granular read and write permission controls, so contact, call-log, message, account, and similar categories must remain independently opt-in, visible in the preflight, and described as potentially blocked.[3]

## Recommended staged addition

The best fit is an **Evidence Snapshot** workstation with a four-step flow: authorize the user’s device; select non-sensitive and optional sensitive categories; run a numbered, cancellation-aware collection queue; and export a timestamped local case bundle containing a manifest, results, failures, and the existing command receipts. A baseline snapshot should include device identity, build properties, installed packages, battery/power, network state, storage, usage statistics, and bounded logcat. Contacts, calls, SMS, accounts, and clipboard should be disabled by default and require category-specific acknowledgement.

## References

1. [Android Developers — Android Debug Bridge](https://developer.android.com/tools/adb)
2. [Android Open Source Project — Read bug reports](https://source.android.com/docs/core/tests/debug/read-bug-reports)
3. [Android Developers — Content providers](https://developer.android.com/guide/topics/providers/content-providers)
4. [DouglasFreshHabian/AndroidForensics](https://github.com/DouglasFreshHabian/AndroidForensics)
