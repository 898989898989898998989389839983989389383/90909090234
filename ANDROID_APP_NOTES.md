# Android App Notes

RBS Academy is now prepared for Android packaging as a PWA/WebView app.

## Premium Screen Recording Protection

The web app automatically enters secure mode on premium course detail, video, and note screens, then exits secure mode when the student leaves those screens.

For a native Android WebView wrapper, map the JS bridge call to Android `FLAG_SECURE`:

```kotlin
class AndroidBridge(private val activity: Activity) {
    @JavascriptInterface
    fun setSecureMode(enabled: Boolean) {
        activity.runOnUiThread {
            if (enabled) {
                activity.window.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                )
            } else {
                activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
        }
    }
}
```

The app also supports these bridge method names for common wrappers:

- `Android.setSecureMode(true | false)`
- `Android.setFlagSecure(true | false)`
- `Android.enableSecureMode()` and `Android.disableSecureMode()`
- `webkit.messageHandlers.secureMode.postMessage({ enabled })`
- `ReactNativeWebView.postMessage(...)`

## Push Notifications

Student notification permission is requested from the header bell or Settings. The Android app uses Capacitor Push Notifications over Firebase Cloud Messaging.

To enable real device delivery:

1. Create a Firebase project.
2. Add an Android app with package name `com.rbsacademy.app`.
3. Download `google-services.json`.
4. Put it here: `android/app/google-services.json`.
5. Run:

```bash
npm run build
npx cap sync android
cd android
gradlew assembleDebug
```

When a student taps Enable in Settings, the app creates the `rbs-updates` Android notification channel and stores the FCM token in local storage. The Settings screen shows the last part of the token for testing.

For web/PWA delivery, the service worker can display Web Push payloads with:

```json
{
  "title": "RBS Academy",
  "body": "Your live class starts soon.",
  "url": "/"
}
```

The existing admin panel keeps the E-Droid notification console under `Push Notification`.

## Offline And Splash

- `public/offline.html` is the custom no-internet fallback.
- `public/sw.js` caches the app shell and handles notification clicks.
- `public/manifest.webmanifest`, `public/splash.svg`, and `public/icons/*` provide Android install metadata, splash branding, and icons.
