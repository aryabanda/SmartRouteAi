import {
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import type {
  EmergencyContact,
} from '../context/ContactsContext';


const {SmsModule} =
  NativeModules;


export type SosReason =
  | 'manual'
  | 'route_deviation'
  | 'checkpoint_overdue';


type SosLocation = {
  latitude: number;
  longitude: number;
};


const REASON_LABELS: Record<
  SosReason,
  string
> = {

  manual:
    'Emergency SOS triggered manually',

  route_deviation:
    'Automatic alert: possible route deviation detected',

  checkpoint_overdue:
    'Automatic alert: journey checkpoint overdue',
};


/*
 * Request Android SMS permission.
 */
export async function requestSmsPermission(): Promise<boolean> {

  if (Platform.OS !== 'android') {
    return false;
  }


  const granted =
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      {
        title:
          'SMS Permission Required',

        message:
          'Smart Route AI needs SMS permission to alert your emergency contacts automatically if you deviate from your route or miss a checkpoint.',

        buttonPositive:
          'Allow',

        buttonNegative:
          'Deny',
      },
    );


  return (
    granted ===
    PermissionsAndroid.RESULTS.GRANTED
  );
}


/*
 * Creates the SOS message.
 */
function buildMessage(
  reason: SosReason,

  location: SosLocation,

  destination?: string,

  trackingUrl?: string,
): string {

  const destinationLine =
    destination
      ? ` Heading to: ${destination}.`
      : '';


  /*
   * Prefer live tracking URL.
   *
   * Only use the static Google Maps location
   * if the tracking URL is unavailable.
   */
  const locationLine =
    trackingUrl

      ? `Live location (updates automatically): ${trackingUrl}`

      : `Location at time of alert: https://maps.google.com/?q=${location.latitude},${location.longitude}`;


  return (
    `${REASON_LABELS[reason]}.` +
    `${destinationLine} ` +
    `${locationLine}`
  );
}


/*
 * Sends SOS SMS to all emergency contacts.
 *
 * trackingUrl is optional for backwards compatibility,
 * but JourneyTrackingScreen should always provide it
 * when a journey has successfully been created.
 */
export async function sendSOS(

  contacts: EmergencyContact[],

  location: SosLocation,

  reason: SosReason,

  destination?: string,

  trackingUrl?: string,

): Promise<
  {
    contact: EmergencyContact;

    success: boolean;

    error?: string;
  }[]
> {

  if (contacts.length === 0) {

    throw new Error(
      'No emergency contacts configured.',
    );
  }


  if (
    Platform.OS !== 'android' ||
    !SmsModule
  ) {

    throw new Error(
      'Automatic SMS sending is only available on Android with the native SmsModule linked.',
    );
  }


  const hasPermission =
    await requestSmsPermission();


  if (!hasPermission) {

    throw new Error(
      'SMS permission was not granted.',
    );
  }


  const message =
    buildMessage(
      reason,
      location,
      destination,
      trackingUrl,
    );


  console.log(
    'SOS message:',
    message,
  );


  const results =
    await Promise.all(

      contacts.map(
        async contact => {

          try {

            await SmsModule.sendSms(
              contact.phone,
              message,
            );


            return {
              contact,
              success: true,
            };

          } catch (err: any) {

            return {
              contact,

              success: false,

              error:
                err?.message ??
                'Unknown error',
            };
          }
        },
      ),
    );


  return results;
}