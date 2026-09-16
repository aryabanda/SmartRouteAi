import {PermissionsAndroid, Platform} from 'react-native';

// Fires the plain native Android permission dialogs, one after another, in
// a sensible order. No custom UI - just the standard system popups. Called
// once right after a successful login/register, before landing on Main.
export async function requestAllPermissions(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    // Background location is a separate grant on Android 10+ (API 29+),
    // and the system dialog can only be shown after foreground location is
    // already granted. Best-effort: fire it, don't block on the result -
    // on Android 11+ this dialog often only offers "While using the app"
    // anyway, with "Allow all the time" only available via Settings, which
    // is out of scope for a plain-popup flow.
    if (Platform.Version >= 29) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      );
    }

    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.SEND_SMS);
  } catch (err) {
    // Don't block login/register on a permission dialog failing to show -
    // features that need a given permission will just prompt again (or
    // fail gracefully) when actually used, e.g. sos.ts already re-requests
    // SEND_SMS itself right before sending.
    console.warn('Permission request sequence failed:', err);
  }
}
