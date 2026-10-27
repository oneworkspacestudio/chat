# Android launcher and native Chat background access

Development integration with the Android app in One Workspace's `android/`
directory, package `uk.co.m8e.workspace`. This is not a standalone native rewrite
of the full WhatsApp feature matrix. The app launches the actual installed web
apps and uses the existing Chat mobile UI; Android supplies notification and
background integration.

## Device access

An authenticated, same-origin `POST api/native/link` links a phone. Only a hash
of its random bearer credential is retained in the protected
`native-devices.dpapi` file. Grants expire after30 days, are capped at20 active
devices per identity, and are rechecked against the synchronized directory.
The phone uses Android Keystore encryption and disables Android app backup.
Credentials never enter a URL, message, push, log or browser local storage.

`api/native/bootstrap` and `api/native/socket` accept the device bearer only.
The short-lived engine ticket and gateway binding both identify the same verified
MyAccounts account. The engine still checks its current state and conversation
membership. Native sockets are bounded per device and cancelled on revocation.
`POST api/native/session` restores only that account's Chat web session, not a
Workspace owner session. Removing a device also closes web sessions created by it.

Chat's `workspace-native-devices.html` screen lists/removes the signed-in user's
phones. The API never lists another user's devices and all browser writes require
the exact same origin. Global Workspace Chat revocation and directory removals
also revoke phone credentials. Native sign-out removes local credentials, pending
notification actions and alerts. An explicit authentication-data restore can
restore old device records; review/remove stale phones after such a restore.

## My Push: the self hosted route

Install My Push with the matching Workspace manager. Workspace injects the
loopback URL, public HTTPS endpoint and a Chat-scoped service capability into
both managed processes automatically. No Firebase project is required. The
Android build no longer includes Firebase Messaging or Google service SDKs.

The native bootstrap registers a short-lived My Push device only after normal
Chat authentication and current-directory checks. The phone receives a scoped
30-minute transport credential. It connects through an Android `remoteMessaging`
foreground service with a quiet ongoing notification and a native on/off setting.
Renewal rechecks the existing 30-day linked Chat grant. Server-side subscriptions
restrict the connection to that device's channel; the phone cannot publish.

The Tinode `workspace` push plugin uses the authorized recipient list and sends
only recipient IDs over the loopback service call. My Push queues a random event
ID, timestamp and opaque sync instruction. No message body, sender, attachment,
password or conversation topic enters the phone push payload. The existing
native Chat sync fetches authorized conversation content and shows notifications.
Replies/read actions continue through Chat. An uncertain publish acknowledgement
does not trigger a blind reply resend.

Chat revocation asks My Push to delete/block that device as well. If unavailable,
the remaining push token expires within 30 minutes and cannot fetch messages.
My Push console disconnects create a tombstone: relink the phone in Chat to
re-enable it; a stale token cannot silently register again.

The pre-existing optional server FCM adapter/config remains for compatibility
with other clients, but it is not used by this Android build and is superseded
when Workspace supplies My Push. No browser client is switched to FCM.

## Boundaries and acceptance still required

The Android service reconnects with capped backoff, resubscribes after server
restarts and recovers queued wake signals. WorkManager keeps a periodic fallback
of at least 15 minutes. Force-stop, denied permission, battery policies, no network
or an unavailable server can interrupt it. This does not grant OS wake privileges.

No physical Android, Doze, reboot, notification action, server restart or lost-device
acceptance is claimed solely from compilation. No automated tests or owner live
fixtures were used. Native Telecom/foreground microphone/camera call services
remain outside this increment. Existing E2EE/calling/TURN limitations remain.
See My Push's docs/ARCHITECTURE.md for transport/storage and provider boundaries.
