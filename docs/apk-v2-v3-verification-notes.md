# APK v2/v3 browser-local verification notes

The local verifier follows the Android Open Source Project specifications. The APK Signing Block sits directly before the ZIP Central Directory and is located by reading the ZIP End of Central Directory offset. It uses matching 64-bit size fields and the `APK Sig Block 42` magic marker.

APK Signature Scheme v2 is an ID/value entry with ID `0x7109871a`; v3 uses `0xf05368c0`. Both schemes contain length-prefixed signers with protected signed data, signer certificates, algorithm identifiers, signature bytes, and a SubjectPublicKeyInfo public key. V3 additionally carries bounded SDK ranges and may include a protected proof-of-rotation attribute (`0x3ba06f8c`).

The verifier must distinguish **detected metadata** from **cryptographically verified integrity**. It will verify an available signer signature against the protected signed data in-browser and confirm that the signer's certificate public key agrees with the declared public key. It will label whole-file content-digest verification separately because it requires Android's 1 MiB chunk digest calculation across APK sections and an adjusted EOCD central-directory offset. Modern v2/v3 signatures are never represented as v1 JAR signatures.

Sources: <https://source.android.com/docs/security/features/apksigning/v2> and <https://source.android.com/docs/security/features/apksigning/v3>.

The Android platform v2 verifier source confirms that a signer contains length-prefixed signed data, signatures, and public key. After the signer signature passes, signed data is parsed as length-prefixed digest sequence, certificate sequence, and additional-attribute sequence. A live inspection of the official F-Droid APK verified its v3 signer signature and Android whole-file digest locally, and matched the signer SHA-256 certificate fingerprint published by F-Droid. The same fixture exposed an extra trailing v2 signed-data field that requires compatibility handling before v2 is reported as verified.

Platform source consulted: <https://android.googlesource.com/platform/frameworks/base/+/master/core/java/android/util/apk/ApkSignatureSchemeV2Verifier.java>.

The local parser now mirrors the platform verifier’s compatibility posture for protected trailing signed-data bytes: the bytes remain signature-covered and are explicitly reported rather than being misclassified as a failed v2 signature. A repeat inspection of the same fixture is used to confirm that both its v2 and v3 whole-file digests verify locally.
