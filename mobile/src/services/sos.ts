import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import type {EmergencyContact} from '../context/ContactsContext';

const {SmsModule} = NativeModules;

export type SosReason =
  | 'manual'
  | 'route_deviation'
  | 'checkpoint_overdue';

type SosLocation = {
  latitude: number;
  longitude: number;
};

const REASON_LABELS: Record<SosReason, string> = {
  manual: 'Emergency SOS triggered manually',
  route_deviation: 'Automatic alert: possible route deviation detected',
  checkpoint_overdue: 'Automatic alert: journey checkpoint overdue',
};

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // iOS doesn't allow silent SMS sending from a third-party app at all -
    // Apple's APIs only support the user-facing composer (MFMessageComposeViewController).
    // If you need iOS support, that has to fall back to a Linking('sms:...') flow
    // where the user taps Send themselves - true silent auto-SOS is Android-only.
    return false;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.SEND_SMS,
    {
      title: 'SMS Permission Required',
      message:
        'Smart Route AI needs SMS permission to alert your emergency contacts automatically if you deviate from your route or miss a checkpoint.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function buildMessage(
  reason: SosReason,
  location: SosLocation,
  destination?: string,
): string {
  const mapsLink = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
  const destinationLine = destination ? ` Heading to: ${destination}.` : '';

  return `${REASON_LABELS[reason]}.${destinationLine} Live location: ${mapsLink}`;
}

/**
 * Sends the SOS message to every saved emergency contact.
 * Returns per-contact results so the UI can show partial failures
 * (e.g. one number invalid) rather than a single opaque success/fail.
 */
export async function sendSOS(
  contacts: EmergencyContact[],
  location: SosLocation,
  reason: SosReason,
  destination?: string,
): Promise<{contact: EmergencyContact; success: boolean; error?: string}[]> {
  if (contacts.length === 0) {
    throw new Error('No emergency contacts configured.');
  }

  if (Platform.OS !== 'android' || !SmsModule) {
    throw new Error(
      'Automatic SMS sending is only available on Android with the native SmsModule linked. See setup notes.',
    );
  }

  const hasPermission = await requestSmsPermission();
  if (!hasPermission) {
    throw new Error('SMS permission was not granted.');
  }

  const message = buildMessage(reason, location, destination);

  const results = await Promise.all(
    contacts.map(async contact => {
      try {
        await SmsModule.sendSms(contact.phone, message);
        return {contact, success: true};
      } catch (err: any) {
        return {
          contact,
          success: false,
          error: err?.message ?? 'Unknown error',
        };
      }
    }),
  );

  return results;
}
