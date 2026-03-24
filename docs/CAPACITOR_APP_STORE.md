# Capacitor App Store Checklist

This app is configured for iOS and Android via Capacitor. Use this checklist when preparing for App Store and Google Play submission.

## Build and run locally

```bash
npm run cap:build    # Build web app and sync to native projects
npm run cap:ios      # Open Xcode
npm run cap:android  # Open Android Studio
```

## iOS (App Store Connect)

- [ ] **Apple Developer account** – Enroll at [developer.apple.com](https://developer.apple.com) ($99/year).
- [ ] **App ID** – Create an App ID with bundle ID `com.consciousbookclub.app` and enable Push Notifications capability.
- [ ] **Provisioning** – Create provisioning profiles (development and distribution) in Apple Developer portal.
- [ ] **Xcode** – Open `ios/App/App.xcworkspace`, select your Team and signing certificate.
- [ ] **Push Notifications** – In Xcode: select the **App** target → **Signing & Capabilities** → **+ Capability** → add **Push Notifications**. (Without this you get "no valid aps-environment entitlement" when registering.) Also add to `AppDelegate.swift` the `didRegisterForRemoteNotificationsWithDeviceToken` / `didFailToRegisterForRemoteNotificationsWithError` handlers (see [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)); these are already in the project.
- [ ] **Firebase** – Add `GoogleService-Info.plist` to `ios/App/App/` (required for FCM and for Google Sign-In). Configure in Firebase Console.
- [ ] **Google Sign-In (iOS)** – See [GOOGLE_SIGNIN_IOS.md](GOOGLE_SIGNIN_IOS.md). Summary: add `GoogleService-Info.plist`, set the URL scheme in `Info.plist` to your `REVERSED_CLIENT_ID` from that plist (replace `YOUR_REVERSED_CLIENT_ID`), enable Google in Firebase Auth. `AppDelegate.swift` already forwards URL opens to the plugin.
- [ ] **Privacy** – Add any required usage descriptions to `ios/App/App/Info.plist` (e.g. `NSCameraUsageDescription` if you add camera later).
- [ ] **Deployment target** – Currently iOS 15.0; increase in Xcode if needed.
- [ ] **Archive and upload** – Product → Archive, then Distribute App to App Store Connect.
- [ ] **Listing** – Screenshots, description, keywords, privacy policy URL, category.

## Android (Google Play Console)

- [ ] **Play Developer account** – [play.google.com/console](https://play.google.com/console) ($25 one-time).
- [ ] **Application ID** – Already set to `com.consciousbookclub.app` in `android/app/build.gradle`.
- [ ] **Signing** – Create an upload key, then use Play App Signing (recommended). Add `keystore` and signing config to `android/app/build.gradle` for release builds.
- [ ] **Firebase** – Add `google-services.json` to `android/app/` (required for FCM and Google Sign-In). Get it from Firebase Console.
- [ ] **Google Sign-In (Android)** – Native Google Sign-In uses `@capacitor-firebase/authentication`. Follow [setup-google.md](https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-google.md) for OAuth client IDs and SHA-1/SHA-256 if needed.
- [ ] **minSdkVersion** – Currently 24 (Android 7); change in `android/variables.gradle` if needed.
- [ ] **Build AAB** – Android Studio: Build → Generate Signed Bundle / APK → Android App Bundle.
- [ ] **Upload** – Upload AAB in Play Console.
- [ ] **Listing** – Screenshots, description, privacy policy URL, content rating.

## Backend: native push tokens

The app registers native (FCM/APNs) push tokens with the backend when running in Capacitor. Ensure:

1. **Migration** – Run the migration that creates `native_push_tokens`:  
   `cd functions && npx sequelize-cli db:migrate` (or your migration command).
2. **Sending to native devices** – The backend currently sends web push via VAPID. To send to iOS/Android you need to:
   - Use Firebase Admin SDK (FCM) for Android tokens stored in `native_push_tokens`.
   - Use APNs (e.g. `node-apn` or Firebase Admin for iOS) for iOS tokens.
   - Extend your notification send logic to check for native tokens and use the appropriate channel.

## Assets

App icons and splash screens are generated from `assets/logo.png`. To regenerate after changing the logo:

```bash
npm run cap:assets
```

Use a 1024×1024 logo for best results. Customize colors in the script in `package.json` if needed.
