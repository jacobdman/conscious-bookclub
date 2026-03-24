# Google Sign-In on iOS (Capacitor)

The app uses `@capacitor-firebase/authentication` for native Google Sign-In on iOS. The JS side is already wired in `AuthContext.js` (when `isNativeApp()` is true it uses `FirebaseAuthentication.signInWithGoogle()`). This doc covers the native iOS setup.

## Prerequisites

- Firebase project with the iOS app added (bundle ID: `com.consciousbookclub.app`)
- Google Sign-In enabled in Firebase Console → Authentication → Sign-in method → Google

## 0. Add the Firebase iOS SDK and initialization

The native app must have the Firebase SDK and call `FirebaseApp.configure()` at startup. The initialization code is already in `AppDelegate.swift`; you only need to add the SDK:

1. Open the project in Xcode: `npm run cap:ios` (or open `ios/App/App.xcworkspace`).
2. **File → Add Package Dependencies…**
3. Enter: `https://github.com/firebase/firebase-ios-sdk.git`
4. Add the **Firebase** package; when asked which products to add, select **FirebaseCore** (required). Add **FirebaseAuth** if you want Auth APIs directly in native code; for this app, FirebaseCore is enough for the plugin.
5. Add the package to the **App** target.

`AppDelegate.swift` already contains:

```swift
import FirebaseCore

// in application(_:didFinishLaunchingWithOptions:)
FirebaseApp.configure()
```

Without this SDK and call, you may see: *"The default Firebase app has not yet been configured."*

## 1. Add GoogleService-Info.plist

1. In [Firebase Console](https://console.firebase.google.com/) → your project → Project settings → Your apps.
2. If the iOS app is not added, add an iOS app with bundle ID `com.consciousbookclub.app`.
3. Download **GoogleService-Info.plist**.
4. Add it to the Xcode project:
   - Place the file in `ios/App/App/` (same folder as `Info.plist` and `AppDelegate.swift`).
   - In Xcode: right‑click the **App** group → **Add Files to "App"** → select `GoogleService-Info.plist` → ensure **Copy items if needed** and the **App** target are checked.

## 2. Set the URL scheme (reversed client ID)

Google Sign-In needs a URL scheme so the app can receive the OAuth callback.

1. Open `ios/App/App/GoogleService-Info.plist` and find the key **`REVERSED_CLIENT_ID`** (e.g. `com.googleusercontent.apps.123456789-abcdefg`).
2. Open `ios/App/App/Info.plist` and find the `CFBundleURLTypes` entry.
3. Replace the placeholder **`YOUR_REVERSED_CLIENT_ID`** with the exact value of `REVERSED_CLIENT_ID` from `GoogleService-Info.plist` (no extra characters or spaces).

Alternatively in Xcode:

1. Select the **App** target → **Info** tab → **URL Types**.
2. Click **+** and set **URL Schemes** to the `REVERSED_CLIENT_ID` value from `GoogleService-Info.plist`. Leave **Identifier** and **Role** as you like (e.g. Editor). If you use the plist, this may already be present; just fix the scheme value if it still says `YOUR_REVERSED_CLIENT_ID`.

## 3. OAuth client ID (Firebase / Google Cloud)

- Firebase usually creates an iOS OAuth client when you add the iOS app and download `GoogleService-Info.plist`. No extra step if you use that plist.
- If you use a custom OAuth client: in [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials, create an **iOS** OAuth 2.0 Client ID with bundle ID `com.consciousbookclub.app`, and ensure the same client is used in Firebase Auth (or that the iOS client is configured for your Firebase project).

## 4. AppDelegate

`AppDelegate.swift` already configures Firebase at launch (see step 0) and forwards URL opens to the Capacitor Firebase Auth plugin:

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
}
```

No change needed unless you add other URL handlers.

## 5. Verify

1. `npm run cap:build` then open the app in Xcode: `npm run cap:ios`.
2. Run on a simulator or device and tap **Continue with Google** on the login screen.
3. You should see the native Google account picker and, after signing in, return to the app as a signed-in user.

If sign-in fails, check:

- **Firebase SDK**: Firebase package is added in Xcode and **FirebaseCore** is linked to the App target; `FirebaseApp.configure()` runs in `AppDelegate` (see step 0).
- `GoogleService-Info.plist` is in `ios/App/App/` and added to the App target.
- `Info.plist` → URL scheme equals `REVERSED_CLIENT_ID` from `GoogleService-Info.plist` (no placeholder left).
- Google Sign-In is enabled in Firebase Console → Authentication → Sign-in method.
- Bundle ID in Xcode matches `com.consciousbookclub.app`.
