import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import {PermissionsAndroid} from 'react-native';
import {useNavigation} from '@react-navigation/native';

// Shown once, right after login/register, before the app asks the OS for
// any dangerous permissions. Android best practice (and Play Store policy
// for background location) is to explain WHY before the system dialog
// appears, rather than firing a bare permission popup with no context.

type PermissionState = 'unknown' | 'granted' | 'denied';

export default function PermissionsScreen() {
  const navigation = useNavigation<any>();

  const [locationStatus, setLocationStatus] = useState<PermissionState>('unknown');
  const [smsStatus, setSmsStatus] = useState<PermissionState>('unknown');
  const [backgroundLocationStatus, setBackgroundLocationStatus] =
    useState<PermissionState>('unknown');

  const requestLocation = async () => {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    const granted =
      result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED;

    setLocationStatus(granted ? 'granted' : 'denied');

    if (!granted) {
      Alert.alert(
        'Location needed',
        'Smart Route AI can\'t track your journey or detect deviations without location access. You can grant this later from your phone\'s Settings if you change your mind.',
      );
    }
  };

  const requestBackgroundLocation = async () => {
    if (Platform.OS !== 'android' || Platform.Version < 29) {
      // Background location permission only exists as a separate grant on
      // Android 10 (API 29) and up - on older versions foreground location
      // access already covers background use.
      setBackgroundLocationStatus('granted');
      return;
    }

    if (locationStatus !== 'granted') {
      Alert.alert(
        'Grant location access first',
        'Foreground location needs to be allowed before background tracking can be requested - that\'s an Android requirement, not something this app controls.',
      );
      return;
    }

    // On Android 11+, the system often won't show an "Allow all the time"
    // option in this dialog at all - it requires going through Settings
    // directly. Attempt the direct request first (works on Android 10),
    // and fall back to sending the user to Settings otherwise.
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        setBackgroundLocationStatus('granted');
        return;
      }
    } catch (err) {
      // Falls through to the Settings prompt below.
    }

    Alert.alert(
      'Enable "Allow all the time"',
      'To keep monitoring your journey if the app is backgrounded, open Settings and set location access to "Allow all the time" for Smart Route AI.',
      [
        {text: 'Not now', style: 'cancel'},
        {text: 'Open Settings', onPress: () => Linking.openSettings()},
      ],
    );
    setBackgroundLocationStatus('denied');
  };

  const requestSms = async () => {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
    );
    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
    setSmsStatus(granted ? 'granted' : 'denied');

    if (!granted) {
      Alert.alert(
        'SMS needed for SOS',
        'Without SMS permission, Smart Route AI can\'t automatically text your emergency contacts if you deviate from your route or miss a checkpoint. You can grant this later, but SOS won\'t work until you do.',
      );
    }
  };

  const canContinue = locationStatus !== 'unknown' && smsStatus !== 'unknown';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Before you start</Text>
      <Text style={styles.subheading}>
        Smart Route AI needs a couple of permissions to actually keep you
        safe on a journey. Here's exactly what each one is for.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Location</Text>
        <Text style={styles.cardBody}>
          Used to track your journey, detect if you've gone off the planned
          route, and monitor checkpoints in real time.
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            locationStatus === 'granted' && styles.buttonGranted,
          ]}
          onPress={requestLocation}
        >
          <Text style={styles.buttonText}>
            {locationStatus === 'granted' ? '✓ Granted' : 'Allow Location'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🕒 Background Location</Text>
        <Text style={styles.cardBody}>
          Lets journey monitoring keep working if you switch to another app
          or lock your phone mid-journey. Optional, but recommended for
          reliable SOS coverage.
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            backgroundLocationStatus === 'granted' && styles.buttonGranted,
          ]}
          onPress={requestBackgroundLocation}
        >
          <Text style={styles.buttonText}>
            {backgroundLocationStatus === 'granted' ? '✓ Granted' : 'Allow Background Access'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💬 SMS</Text>
        <Text style={styles.cardBody}>
          Needed to automatically text your emergency contacts your live
          location if you deviate from your route, miss a checkpoint, or
          press Emergency SOS.
        </Text>
        <TouchableOpacity
          style={[
            styles.button,
            smsStatus === 'granted' && styles.buttonGranted,
          ]}
          onPress={requestSms}
        >
          <Text style={styles.buttonText}>
            {smsStatus === 'granted' ? '✓ Granted' : 'Allow SMS'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.continueButton, !canContinue && styles.continueDisabled]}
        disabled={!canContinue}
        onPress={() => navigation.replace('Main')}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>

      {!canContinue && (
        <Text style={styles.hint}>
          Respond to each permission above (grant or deny) to continue.
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 10,
    marginBottom: 8,
  },
  subheading: {
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },
  cardBody: {
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonGranted: {
    backgroundColor: '#16A34A',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: '#111827',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  continueDisabled: {
    opacity: 0.4,
  },
  continueText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  hint: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 10,
    fontSize: 13,
  },
});
