# Secure Serial Assessment and Forensic Export UX Design

## Purpose and Safety Boundary

The proposed **Serial/Modem Security Assessment** is an authorized, non-destructive workstation for documenting a connected serial interface and identifying exposure indicators. It must not execute unknown AT commands, inject shell payloads, modify device properties, install software, enable debugging, alter permissions, or automatically open ports. This boundary supports a planned technical assessment process and preserves an accountable evidence lifecycle.[1] [2]

> **Operating rule:** Observe by default. Any active probe requires an explicit, separately recorded operator decision and must be drawn from a conservative, reviewed allowlist.

## Interface Structure

| Interface region | Safe behavior | Operator outcome |
|---|---|---|
| **Authorization gate** | Requires an explicit statement that the device and interface are authorized for assessment. | A local receipt records scope, operator-entered case reference, and time. |
| **Port inventory** | Shows user-selected transport, descriptive port metadata, baud-rate proposal, and read-only mode. It does not enumerate or connect automatically. | The user can document the candidate interface before opening it. |
| **Passive observation** | When the user explicitly begins an observation session, captures only data already received from the authorized interface. | A time-stamped local transcript with byte count, line-ending mode, and connection parameters. |
| **Safe probe review** | Keeps probes disabled by default. If enabled in a future desktop companion, exposes each allowlisted query, expected read-only response, rate limit, and stop control before transmission. | A distinct, auditable receipt per command; unknown or write-capable strings cannot be pasted into the send field. |
| **Findings ledger** | Records port configuration, connection events, received banners, timeouts, and user-added observations. | Structured local JSON and a readable Markdown report. |

The workstation should use a plain-language status system: **Not connected**, **Ready for authorized observation**, **Observing**, **Paused**, **Blocked by policy**, and **Disconnected**. The first screen should show the safety boundary before any technical controls; the primary action should be **“Create assessment record”**, not **“Connect.”**

## Guardrails for Non-Destructive Operation

| Guardrail | Interface treatment |
|---|---|
| No automatic serial connection | Port connection is a deliberate step after the authorization gate and parameter review. |
| No arbitrary transmission | The browser UI has no free-form raw command transmitter. A future desktop mode should allow only a signed, versioned read-only query catalog. |
| Rate and duration controls | Observation duration, maximum capture size, and a pause/stop action are visible before a session starts. |
| Sensitive-data awareness | A live transcript is masked in the interface for obvious tokens, while the unmodified export requires a second confirmation if permitted by the case policy. |
| Integrity metadata | Export includes UTC timestamps, tool version, chosen transport parameters, SHA-256 hashes of exported artifacts, and the operator-entered case reference. |
| Local-first handling | No serial transcript is uploaded by default. User-initiated encrypted archive export can reuse the existing browser-side Web Crypto model. |

## Forensic Screenshot Export UX

The existing live mirror should gain a dedicated **Capture Evidence** action that opens a short capture sheet rather than saving immediately. The sheet should include an operator case reference, optional evidence note, device session label, and a toggle for a local redaction preview. On confirmation, the UI should capture the currently rendered mirror frame and produce a matching evidence record containing the UTC timestamp, capture source, image format, local hash, and receipt identifier.

| UX step | Recommendation |
|---|---|
| **Scope** | Make screenshot capture user-initiated; do not capture mirror frames in the background. |
| **Preview** | Show a fixed-size preview with optional visual redaction regions before export. The original must never be overwritten by a preview. |
| **Naming** | Use `case-reference__device-label__UTC-timestamp__sequence.png` rather than generic filenames. |
| **Bundle** | Export the image beside a Markdown/JSON evidence note, including the command-ledger reference and SHA-256 fingerprint. |
| **Feedback** | Show a persistent success row with `Open local download`, `Copy hash`, and `Add to case bundle` actions. |

## Packet Export UX and Feasibility

The current browser-local WebUSB/ADB application should **not claim to capture raw packets**. Raw Android packet capture may require elevated privileges, an approved device-side capture path, or a separately acquired PCAP/PCAPNG file; those conditions are not guaranteed on a non-rooted device. The safe initial capability is therefore a **Packet Evidence Import** workflow: an operator supplies an already authorized capture file, the application records case metadata, calculates a local hash, renders only safe summary metadata, and inserts the original file plus summary into a user-initiated case bundle.

| UX step | Recommendation |
|---|---|
| **Source declaration** | Require the operator to label the source: supplied PCAP, approved desktop capture, or device-generated diagnostic artifact. |
| **Privacy preview** | State that packet captures may contain credentials, identifiers, or content; require a pre-export acknowledgement. |
| **Storage clarity** | Display file size, format, local hash, and estimated bundle size before adding to a case. |
| **Export control** | Offer a metadata-only report by default; adding the original capture to the bundle needs a second explicit confirmation. |
| **Results** | Display parse failures as recorded status—not as a reason to modify or “repair” evidence. |

## Integration Path

The safest sequence is to first add the **UI-only Serial/Modem Security Assessment** with no write capability, then add screenshot evidence export, then add a user-supplied packet evidence importer. All three should create a common `case-manifest.json` extension so the Evidence Snapshot, De-Google migration shortlist, screenshots, and supplied packet artifacts can coexist in one time-stamped local bundle.

## References

[1] National Institute of Standards and Technology, [*Technical Guide to Information Security Testing and Assessment (SP 800-115)*](https://csrc.nist.gov/pubs/sp/800/115/final).

[2] National Institute of Standards and Technology, [*Chain of custody*](https://csrc.nist.gov/glossary/term/chain_of_custody).

[3] National Institute of Standards and Technology, [*Evidence Management*](https://www.nist.gov/forensic-science/interdisciplinary-topics/evidence-management).

