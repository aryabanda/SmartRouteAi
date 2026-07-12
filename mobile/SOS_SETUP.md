# Wiring up the SOS feature — setup steps

## 1. Install AsyncStorage
```
npm install @react-native-async-storage/async-storage
cd android && ./gradlew clean && cd ..
```

## 2. Place the files
- `ContactsContext.tsx` → `mobile/src/context/ContactsContext.tsx`
- `EmergencyContactsScreen.tsx` → `mobile/src/screens/Contacts/EmergencyContactsScreen.tsx`
- `sos.ts` → `mobile/src/services/sos.ts`
- `SmsModule.java` → `mobile/android/app/src/main/java/com/smartrouteai/SmsModule.java`
- `SmsPackage.java` → `mobile/android/app/src/main/java/com/smartrouteai/SmsPackage.java`

**Important:** open `mobile/android/app/build.gradle` and check the `applicationId` (e.g. `applicationId "com.smartrouteai"`). The `package com.smartrouteai;` line at the top of both `.java` files must exactly match that, and the folder path (`java/com/smartrouteai/`) must match too. If your applicationId is different, rename both the package line and the folder to match.

## 3. Register the native module
Find `MainApplication` in `mobile/android/app/src/main/java/com/smartrouteai/` (or `.kt` if it's Kotlin — newer RN CLI projects generate Kotlin by default).

**If MainApplication.kt (Kotlin):**
```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(SmsPackage())
    }
```

**If MainApplication.java:**
```java
@Override
protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new SmsPackage());
    return packages;
}
```

## 4. Add the SMS permission
In `mobile/android/app/src/main/AndroidManifest.xml`, inside the `<manifest>` tag (alongside your existing location permissions):
```xml
<uses-permission android:name="android.permission.SEND_SMS" />
```

## 5. Wrap your app in ContactsProvider
In `App.tsx`, wrap your navigator:
```tsx
import {ContactsProvider} from './src/context/ContactsContext';

export default function App() {
  return (
    <ContactsProvider>
      {/* your existing NavigationContainer / AppNavigator */}
    </ContactsProvider>
  );
}
```

## 6. Add the contacts screen to your navigator
Add `EmergencyContactsScreen` as a screen in `AppNavigator.tsx` so users can reach it (e.g. from a settings icon or before starting a journey):
```tsx
<Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
```

## 7. Rebuild (native code changed, JS-only reload won't pick this up)
```
npx react-native run-android
```

## Notes for your report
- True *silent, automatic* SMS sending (no user tapping "Send") is Android-only — iOS doesn't expose an API for this to third-party apps, only the user-facing message composer. Worth mentioning as a platform limitation in your report if you ever target iOS.
- `SEND_SMS` is a "dangerous" permission — Android requires the runtime request (handled in `sos.ts`'s `requestSmsPermission`), and Google Play has extra policy restrictions on apps that send SMS silently, so if this ever goes on the Play Store you'd need to justify it under their "default SMS handler" policy exception. Fine for a college project / sideloaded APK, worth a sentence of awareness in your report.
