# De-Google Workstation — Safety and Scope Notes

## Action boundary

The De-Google workstation must inspect the connected device inventory first and show only packages that are actually installed. The default operation is **disable for User 0**, not a system-image deletion. Each completed operation must receive a local command receipt and a restore path using `cmd package install-existing --user 0 <package>` where Android permits it.

Android’s package guidance demonstrates that package removal decisions are context-dependent because packages can provide services, providers, or protected-storage behavior used elsewhere in the system. The user interface must therefore never claim that a generic Google package level is universally safe.[1]

## Level model

The interface will retain the requested progression—Essential, Low, Medium, High, Total—but package counts are **computed from the inspected device**, never hard-coded. Essential and Low provide conservative, review-led choices. Medium may offer a reversible per-user disable path for explicitly selected installed Google user apps. High and Total remain inspection-only within the browser dashboard: they explain that core framework components, vendor dependencies, and root/system-image changes require device-specific expert review and are not bulk-executed.

## Source model

The existing UAD-ng list remains optional, user-triggered community context. The project’s own fixed De-Google candidates are used only to identify potential packages in the device’s local inventory; an operator must review every resulting command. UAD-ng itself gives a use-at-your-own-risk disclaimer and uses GitHub package-list requests rather than collecting device data.[2]

## References

1. [Android Open Source Project — Remove packages for the system user](https://source.android.com/docs/automotive/users_accounts/disable_packages)
2. [Universal Android Debloater Next Generation — README](https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation)
