## Cover

# Evidence + De-Google

### A transparent, browser-local Android audit and migration workflow

## Slide 1

# One desk, two governed workflows

- **Evidence Snapshot** captures selected device facts without changing the phone.
- **De-Google** reviews device-specific packages before a reversible User 0 action.
- Both workflows write an inspectable local command receipt for every outcome.

## Slide 2

# Evidence collection becomes a visible queue

- Operators select only the evidence categories required for the authorized audit.
- Every ADB command is displayed before it runs, with progress and a result state.
- The queue continues after a failure, preserving success, block, failure, or skipped outcomes.

## Slide 3

# Permission boundaries stay explicit

- Device identity, packages, battery, network, storage, and bounded logs form the baseline snapshot.
- Usage, accounts, communication providers, and logs are separate sensitive categories.
- Android provider permissions and OEM policy can block a category; the app records the block and does not bypass it.[1]

## Slide 4

# Timestamped bundles preserve audit context

- A local ZIP bundle contains a machine-readable manifest and separate human-readable results.
- The evidence bundle records device metadata, chosen categories, commands, timestamps, and outcomes.
- Downloads remain user-initiated and browser-local; no device data is uploaded by default.

## Slide 5

# De-Google starts with device reality

- Candidate counts are derived from the connected device inventory, not fixed generic claims.
- OEM profile guards flag vendor-sensitive components for expert review.
- Only reviewed user-facing packages are eligible for reversible User 0 disablement.

## Slide 6

# Alternatives turn removal into migration

- Suggested alternatives have direct user-initiated project or F-Droid links.
- Android-version badges distinguish compatible, incompatible, and unverified minimum requirements.
- Search, filters, and browser-local Favorites create a migration shortlist before any download.

## Slide 7

# Favorites export as a migration case

- The Favorites shelf groups selected alternatives by category with source and compatibility context.
- **Export case bundle** produces a timestamped ZIP with Markdown and JSON summaries.
- The bundle deliberately contains no app payloads, auto-downloads, or silent installation instructions.

## Slide 8

# Safeguards make the workflow defensible

- USB debugging requires explicit device-side RSA authorization before ADB commands run.[2]
- Every result is visible in the command ledger, including denied and failed operations.
- Root-only paths, hidden permission bypasses, and secret dialer-code enumeration remain outside the standard browser workflow.

## Slide 9

# Recommended next milestones

- Add a category-specific consent statement to exported evidence manifests.
- Add a local chain-of-custody note and operator case reference field.
- Add an optional encrypted case-bundle export using the existing browser-side Web Crypto model.

## Slide 10

# Sources

1. Android Developers, “Content providers.” https://developer.android.com/guide/topics/providers/content-providers
2. Android Developers, “Android Debug Bridge (adb).” https://developer.android.com/tools/adb
3. Android Open Source Project, “Read bug reports.” https://source.android.com/docs/core/tests/debug/read-bug-reports
4. DouglasFreshHabian, “AndroidForensics.” https://github.com/DouglasFreshHabian/AndroidForensics
