# adbzero Repository Feature Audit

## Reviewed source

Repository: [forensicslarn1/adbzero](https://github.com/forensicslarn1/adbzero), cloned at its current `main` branch for static review. Its README describes browser-local WebUSB device insights, community debloating, De-Google levels, Scrcpy mirroring, managed-profile guidance, advanced files, APK installation, and device/privacy tools. The current Android Control Center already covers most of these areas with transparent command receipts and browser-local history.

## Comparable features and adoption decision

| adbzero capability | Current Android Control Center status | Integration decision |
| --- | --- | --- |
| Device inventory and dashboard | Present | Preserve the more evidence-led service desk. |
| Community debloat actions | Present | Preserve UAD-ng context and explicit receipt/restore paths. |
| De-Google wizard | Present, safer initial version | Adopt richer alternative mapping and manufacturer-aware filtering; retain device-specific counts and no bulk execution of core framework packages. |
| Screen mirror and control | Present as verified Scrcpy session | Preserve actual-session receipts; defer recording and input-control expansion. |
| Managed profile / app-cloner flow | Present as a guarded inspector | Preserve device-policy caveats; do not imply universal cloning. |
| Advanced file manager / root tools | Basic browser-local files and operator terminal present | Do not bulk-port root file operations; they are destructive and device-policy dependent. |
| Device tools (density, resolution, animation, private DNS) | Privacy review and operator terminal present | Candidate future addition only after a review-first, reversible command design. |
| F-Droid-style alternative suggestions | Partially present | Adopt verified project links and semantic category icons only; do not auto-download or install remote APKs. |
| Remote store, account, CMS, analytics, Supabase profiles | Outside browser-local promise | Do not adopt. They require a separate backend, authentication, consent, and privacy scope. |

## Safety findings

adbzero’s static De-Google data includes packages such as setup wizard, WebView, TalkBack, Gboard, Android Auto, Play services, and framework components at broad levels. These can be vendor-, accessibility-, or boot-critical; Android’s platform guidance emphasizes that removal decisions are dependency- and manifest-context-dependent.[1] The current project will not copy that bulk-execution model. Instead, it will keep those candidates expert-review-only and use OEM-aware profiles only to change review context and warnings, not to infer universal safety.

adbzero’s De-Google page can install alternatives from remote URL sources after removals. Android Control Center will provide direct, user-initiated links to verified project or F-Droid pages but will not auto-download or install an alternative application.

The transition links are intentionally **listing or official project pages**, rather than raw APK URLs. This preserves user choice, update channels, and the existing APK inspection workflow. The linked F-Droid pages for Thunderbird, Organic Maps, Aves Libre, and Nextcloud were checked during this review.[5] [6] [7] [8]

## Sources

1. [Android Open Source Project — Remove packages for the system user](https://source.android.com/docs/automotive/users_accounts/disable_packages)
2. [adbzero repository — README](https://github.com/forensicslarn1/adbzero/blob/main/README.md)
3. [adbzero De-Google levels source](https://github.com/forensicslarn1/adbzero/blob/main/src/data/degoogle-levels.ts)
4. [adbzero FOSS alternatives source](https://github.com/forensicslarn1/adbzero/blob/main/src/data/foss-alternatives.ts)
5. [F-Droid — Thunderbird](https://f-droid.org/packages/net.thunderbird.android/)
6. [F-Droid — Organic Maps](https://f-droid.org/packages/app.organicmaps/)
7. [F-Droid — Aves Libre](https://f-droid.org/packages/deckers.thibault.aves.libre/)
8. [F-Droid — Nextcloud](https://f-droid.org/packages/com.nextcloud.client/)
