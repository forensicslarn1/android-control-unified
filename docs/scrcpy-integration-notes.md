# Scrcpy Browser Integration Notes

The live mirror uses the maintained Tango browser client stack. The browser pushes a managed Scrcpy 2.1 server binary to `/data/local/tmp/scrcpy-server.jar` through the authenticated WebUSB ADB session, starts the server with `AdbScrcpyClient.start`, and consumes the H.264 video stream through a `WebCodecsVideoDecoder` with a canvas renderer. Server output is continuously consumed because ADB multiplexing can otherwise block the remaining streams.

The session uses no application backend. The dashboard requires an HTTPS Chromium context, WebUSB authorization from the Android device, WebCodecs support, and a connected device that accepts the Scrcpy server. The start, transfer, failure, and stop actions are represented as local command receipts. The page does not claim a mirror is active until a session returns real video dimensions and a codec identifier.

Current interface testing confirmed the JSON and Markdown export controls, generated recovery-script control, and the live-mirror destination render in the browser dashboard. An automated browser click for the JSON download was unavailable because the browsing session became unavailable; the client implementation uses a local Blob download and does not call a network API for exports.

## References

1. [Tango ADB — Scrcpy Quick Start](https://tangoadb.dev/scrcpy/)
2. [Tango ADB — Prepare server](https://tangoadb.dev/scrcpy/prepare-server/)
3. [Tango ADB — Start server](https://tangoadb.dev/scrcpy/start-server/)
4. [Tango ADB — WebCodecs decoder](https://tangoadb.dev/scrcpy/video/web-codecs/)
